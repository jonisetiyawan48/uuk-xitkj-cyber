import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, timingSafeEqual, randomBytes } from 'node:crypto';
import { DEMO_USERS } from './config.mjs';
import { trainingSelect } from './db.mjs';

export const context = new AsyncLocalStorage();
export const current = () => context.getStore() ?? { user: null, role: null };
export const ROLE_MODULES = {
  Employee: ['dashboard','projects','documents','helpdesk','assets','finance','account'],
  Manager: ['dashboard','projects','documents','helpdesk','assets','finance','reports','account'],
  HR: ['dashboard','hr','projects','documents','helpdesk','assets','finance','reports','account'],
  Administrator: ['dashboard','hr','projects','documents','helpdesk','assets','finance','reports','admin','account'],
};
export const TABLE_MODULE = { employees:'hr', projects:'projects', tasks:'projects', tickets:'helpdesk', assets:'assets', expenses:'finance' };
const everyone = Object.keys(ROLE_MODULES);
const ACTION_ROLES = {
  'create-ticket': everyone, comment: everyone, document: everyone, loan: everyone, expense: everyone,
  task: ['Manager','Administrator'], settings: ['Administrator'], export: ['Manager','HR','Administrator'],
};
export function canPage(role, module, slug) {
  if (!ROLE_MODULES[role]?.includes(module)) return false;
  if (module === 'finance' && ['approval-queue','payment-history'].includes(slug)) return ['Manager','Administrator'].includes(role);
  if (module === 'reports' && slug === 'report-builder') return ['HR','Administrator'].includes(role);
  return true;
}
export function canAction(action, role = current().role) { return ACTION_ROLES[action]?.includes(role) ?? false; }
export function canStatus(role, table, row, user) {
  if (role === 'Administrator') return true;
  if (['projects','expenses'].includes(table)) return role === 'Manager' && (table !== 'expenses' || row.requester !== user);
  return table === 'tasks' && (role === 'Manager' || row.assignee === user);
}
export function scope(table) {
  const { user, role } = current();
  if (role === 'Administrator' || (table === 'expenses' && role === 'Manager')) return ['1=1', []];
  const owner = { tickets:'requester', comments:'author', loans:'employee', expenses:'requester', activity:'actor', exports:'actor' }[table];
  if (owner) return [`${owner}=?`, [user]];
  if (table === 'tasks' && role !== 'Manager') return ['assignee=?', [user]];
  return ['1=1', []];
}
const sessions = new Map();
const sessionTTL = 8 * 60 * 60 * 1000;
export function equalSecret(a, b) {
  const digest = value => createHash('sha256').update(String(value)).digest();
  return timingSafeEqual(digest(a), digest(b));
}
export async function login(username, password) {
  const account = Object.hasOwn(DEMO_USERS, username) && DEMO_USERS[username];
  if (!account) return null;
  // Deliberate lab SQLi: only the selected demo account participates in the query.
  const rows = await trainingSelect("SELECT 1 AS authenticated FROM (SELECT ? AS password) AS login_account WHERE BINARY password = BINARY '" + password + "'", [process.env.UUK_DEMO_PASSWORD || 'MokletLab2026!']);
  if (!rows.length) return null;
  const now = Date.now();
  for (const [key, entry] of sessions) if (entry.expires <= now) sessions.delete(key);
  const sid = randomBytes(16).toString('hex');
  sessions.set(sid, { user: account[0], role: account[1], expires: now + sessionTTL });
  return sid;
}
export function sessionId(request) { return request.headers.get('cookie')?.match(/(?:^|;\s*)uuk_session=([a-f0-9]{32})(?:;|$)/)?.[1]; }
export function identity(request) {
  const sid = sessionId(request), entry = sessions.get(sid);
  if (entry && entry.expires > Date.now()) return { user: entry.user, role: entry.role };
  if (sid) sessions.delete(sid);
  return { user: null, role: null };
}
export const logout = request => sessions.delete(sessionId(request));
export const clearSessions = () => sessions.clear();
export const sessionCookie = sid => `uuk_session=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionTTL / 1000}`;
