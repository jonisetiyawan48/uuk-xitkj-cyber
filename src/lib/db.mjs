import mariadb from 'mariadb';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { scope } from './auth.mjs';

export const DATA_ROOT = path.resolve(/* turbopackIgnore: true */ process.env.UUK_DATA_DIR || '.data');
export const DOCROOT = path.join(DATA_ROOT, 'documents');
export const INSTANCE = process.env.UUK_INSTANCE || 'TRAINING-01';
export const now = () => new Intl.DateTimeFormat('sv-SE', { timeZone:'Asia/Jakarta', dateStyle:'short', timeStyle:'short' }).format(new Date());
let pool, initializing;
const allowed = new Set(['employees','projects','tasks','milestones','tickets','comments','assets','loans','expenses','documents','attendance','leave_requests','notifications','activity','exports']);
const schema = readFileSync(process.cwd() + '/src/lib/schema.sql', 'utf8').split(';').map(s => s.trim()).filter(Boolean);
const tables = schema.map(s => s.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1]);
function database() {
  if (!pool) pool = mariadb.createPool({
    host: process.env.UUK_DB_HOST || '127.0.0.1',
    port: Number(process.env.UUK_DB_PORT || 3306),
    user: process.env.UUK_DB_USER || 'moklet',
    password: process.env.UUK_DB_PASSWORD || 'MokletDatabase2026!',
    database: process.env.UUK_DB_NAME || 'moklet_uuk',
    connectionLimit: 8, acquireTimeout: 10000, connectTimeout: 5000,
    multipleStatements: false, bigIntAsNumber: true, insertIdAsNumber: true,
  });
  return pool;
}
function initializeFiles() {
  for (const dir of ['public','internal']) mkdirSync(path.join(DOCROOT, dir), { recursive:true });
  const files = {
    'public/employee-handbook.txt': 'Moklet Digital Solutions - Employee Handbook (dummy training data).\n',
    'public/security-policy.txt': 'Internal security policy - demo content only.\n',
    'internal/audit-marker.txt': `UUK-PATH-TRAVERSAL-PROOF: ${INSTANCE}\nSandbox file only.\n`,
  };
  for (const [file, text] of Object.entries(files)) if (!existsSync(path.join(DOCROOT,file))) writeFileSync(path.join(DOCROOT,file),text);
}
async function seed(connection) {
  const data = JSON.parse(readFileSync(process.cwd() + '/src/lib/seed.json', 'utf8'));
  for (const [table, rows] of Object.entries(data)) for (const row of rows) {
    const columns = Object.keys(row);
    await connection.query(`REPLACE INTO \`${table}\` (${columns.map(c => '`'+c+'`').join(',')}) VALUES (${columns.map(() => '?').join(',')})`, Object.values(row));
  }
}
export async function initializeDatabase() {
  if (!initializing) initializing = (async () => {
    const connection = await database().getConnection();
    let locked = false;
    try {
      const [lock] = await connection.query("SELECT GET_LOCK(CONCAT(DATABASE(), ':initialize'), 30) AS acquired");
      if (lock.acquired !== 1) throw new Error('Database initialization lock unavailable');
      locked = true;
      for (const sql of schema) await connection.query(sql);
      await connection.beginTransaction();
      const [count] = await connection.query('SELECT count(*) AS n FROM employees');
      if (!count.n) await seed(connection);
      await connection.commit();
      initializeFiles();
    } catch (error) { await connection.rollback(); throw error; }
    finally {
      if (locked) await connection.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':initialize'))");
      connection.release();
    }
  })().catch(error => { initializing = undefined; throw error; });
  return initializing;
}
export async function query(sql, args = []) {
  await initializeDatabase();
  return (await database().query(sql,args)).map(row => ({ ...row }));
}
export async function execute(sql, args = []) {
  await initializeDatabase();
  return Number((await database().query(sql,args)).insertId || 0);
}
export async function records(table, where = '', params = []) {
  if (!allowed.has(table)) return [];
  const [condition, values] = scope(table);
  return query(`SELECT * FROM (SELECT * FROM \`${table}\` WHERE ${condition}) AS scoped ${where}${/LIMIT/i.test(where) ? '' : ' LIMIT 120'}`, [...values,...params]);
}
export async function reset() {
  await initializeDatabase();
  const connection = await database().getConnection();
  try {
    await connection.beginTransaction();
    for (const name of tables) await connection.query(`DELETE FROM \`${name}\``);
    await seed(connection);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
export const audit = (actor, action) => execute('INSERT INTO activity(actor,action,created) VALUES(?,?,?)',[actor,action,now()]);
// Deliberate SQLi exercises execute a single SELECT inside a read-only transaction.
export async function trainingSelect(sql, args = []) {
  if (!/^\s*SELECT\b/i.test(sql)) return [];
  await initializeDatabase();
  const connection = await database().getConnection();
  try {
    await connection.query('START TRANSACTION READ ONLY');
    return (await connection.query(sql,args)).map(row => ({ ...row }));
  } catch { return []; }
  finally { await connection.rollback(); connection.release(); }
}
export async function closeDatabase() {
  if (pool) await pool.end();
  pool = undefined;
  initializing = undefined;
}
