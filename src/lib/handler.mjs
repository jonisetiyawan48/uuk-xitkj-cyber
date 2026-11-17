import { readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { MODULES, META } from './config.mjs';
import { context, identity, canPage, canAction, canStatus, TABLE_MODULE, login, logout, clearSessions, equalSecret, sessionCookie } from './auth.mjs';
import { INSTANCE, DOCROOT, query, execute, records, reset, audit, now } from './db.mjs';
import { PAGE_MAP, layout, dashboard, moduleIndex, page, documentDownloads, card, form, table, badge, esc, searchform, loginScreen } from './views.mjs';
import { linuxFixture } from './lab-files.mjs';
import { exportReport } from './report.mjs';

const STATES = {
  tickets: ['Open','In Progress','Resolved','Closed'], tasks: ['To Do','In Progress','Done'],
  expenses: ['Pending','Approved','Rejected'], projects: ['Planning','Active','Review','Completed'], assets: ['Available','Borrowed','Maintenance'],
};
// Virtual lab fixture: never resolve this payload against the real filesystem.
const DUMMY_PASSWD = [
  'root:x:0:0:root:/root:/bin/bash',
  'daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin',
  'www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin',
  'node:x:1000:1000:Moklet Lab User:/home/node:/bin/sh',
  'moklet-demo:x:1001:1001:Dummy Training Account:/home/moklet-demo:/bin/bash',
  '',
].join('\n');
const json = value => JSON.stringify(value);
export function send(body, status = 200, type = 'text/html; charset=utf-8', extra = {}) {
  return new Response(body, { status, headers: { 'Content-Type':type, 'X-Training-Instance':INSTANCE, 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'same-origin', 'Cache-Control':'no-store', ...extra } });
}
const redirect = (location, headers = {}) => send('',303,undefined,{ Location:location, ...headers });
function forbidden(user, role) {
  return send(layout('403 — Akses ditolak','Role Anda tidak memiliki izin untuk halaman atau aksi ini.',card('Akses dibatasi','<p>Hubungi administrator bila membutuhkan akses tambahan.</p><a href="/">Kembali ke dashboard</a>'),'dashboard',user || '',role || ''),403);
}
const numeric = s => /^\d+$/.test(s);
const notFound = () => send('Not Found',404);
async function get(request, user, role) {
  const url = new URL(request.url), route = url.pathname, q = url.searchParams;
  if (route === '/health') {
    await query('SELECT 1');
    return send(json({status:'ok',instance:INSTANCE,pages:MODULES.reduce((n,m) => n+m[3].length,0)}),200,'application/json');
  }
  if (route === '/login') return send(loginScreen());
  if (route === '/logout') { logout(request); return redirect('/login',{ 'Set-Cookie':'uuk_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax' }); }
  if (!user) return redirect('/login');
  if (route === '/') return send(layout('Dashboard Overview','Your organization at a glance.',(await dashboard()),'dashboard',user,role));
  let match = route.match(/^\/module\/([^/]+)$/);
  if (match) {
    const m = match[1];
    if (!Object.hasOwn(META,m)) return notFound();
    if (!canPage(role,m)) return forbidden(user,role);
    return send(layout(META[m].title,'Explore connected workflows, records, and tools.',(m === 'documents' ? documentDownloads(url.protocol+'//'+(request.headers.get('host') || url.host)) : '')+moduleIndex(m),m,user,role));
  }
  match = route.match(/^\/page\/([^/]+)\/([^/]+)$/);
  if (match) {
    const [,m,slug] = match, key = `${m}/${slug}`;
    if (!Object.hasOwn(PAGE_MAP,key)) return notFound();
    if (!canPage(role,m,slug)) return forbidden(user,role);
    return send(layout(PAGE_MAP[key],`${META[m].title} / ${PAGE_MAP[key]}`,(m === 'documents' ? documentDownloads(url.protocol+'//'+(request.headers.get('host') || url.host)) : '')+(await page(m,slug,q,user,role)),m,user,role));
  }
  match = route.match(/^\/record\/([^/]+)\/(\d+)$/);
  if (match) {
    const [,tbl,id] = match;
    if (!Object.hasOwn(TABLE_MODULE,tbl)) return notFound();
    if (!canPage(role,TABLE_MODULE[tbl])) return forbidden(user,role);
    const [r] = (await records(tbl,'WHERE id=?',[Number(id)]));
    if (!r) return send('Record not found',404);
    let content = '<div class="detailgrid">'+Object.entries(r).map(([k,v]) => `<div class="detailfield"><small>${esc(k.replaceAll('_',' ').replace(/\b\w/g,c => c.toUpperCase()))}</small><strong>${k === 'status' ? badge(v) : esc(v)}</strong></div>`).join('')+'</div>';
    if (Object.hasOwn(STATES,tbl) && canStatus(role,tbl,r,user)) content += form('/action/status',[['status','Update Status','select',STATES[tbl]]],'Save Status',`<input type="hidden" name="table" value="${tbl}"><input type="hidden" name="id" value="${id}">`);
    return send(layout(tbl[0].toUpperCase()+tbl.slice(1)+' Detail',`Record #${id}`,card('Record Information',content),TABLE_MODULE[tbl],user,role));
  }
  if (route === '/search/helpdesk') {
    const term = (q.get('q') || '').slice(0,300);
    const iframe = '<iframe class="labframe" sandbox="allow-scripts allow-modals" referrerpolicy="no-referrer" srcdoc="'+esc('<div style="font:15px system-ui;padding:12px">Search preview: '+term+'</div>')+'"></iframe>';
    return send(layout('Helpdesk Search','Search the knowledge and ticket workspace.',card('Search Results',searchform('/search/helpdesk','q','Search records',term)+iframe+table((await records('tickets')),[['title','Ticket'],['status','Status'],['category','Category']])),'helpdesk',user,role));
  }
  if (route === '/document/download') {
    // Deliberate traversal exercise, restricted to the dummy document tree.
    const filename = q.get('file') || 'employee-handbook.txt';
    if (filename === '../../../../../etc/passwd') {
      return send(DUMMY_PASSWD,200,'text/plain; charset=utf-8',{
        'Content-Disposition':'inline; filename="passwd"',
        'X-UUK-Lab-Fixture':'dummy-etc-passwd',
      });
    }
    const fixture = linuxFixture(filename);
    if (fixture) return send(fixture.body,200,'text/plain; charset=utf-8',{
      'Content-Disposition':`inline; filename="${path.basename(fixture.path)}"`,
      'X-UUK-Lab-Fixture':'dummy-linux-config',
    });
    (await records('documents')); // Lazy database/file initialization for fresh instances.
    const candidate = path.resolve(DOCROOT,'public',filename);
    try {
      const target = realpathSync(candidate), root = realpathSync(DOCROOT);
      if (!target.startsWith(root+path.sep) || !statSync(target).isFile()) return send('Document not found',404);
      return send(readFileSync(target),200,'text/plain; charset=utf-8',{ 'Content-Disposition':`inline; filename="${path.basename(target).replace(/[^a-zA-Z0-9_.-]/g,'_')}"` });
    } catch { return send('Document not found',404); }
  }
  return notFound();
}
async function readBody(request) {
  if (Number(request.headers.get('content-length')) > 16384) return null;
  let total = 0;
  const chunks = [], reader = request.body?.getReader();
  if (reader) try {
    while (true) {
      const {value,done} = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 16384) { await reader.cancel(); return null; }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
}
async function post(request, user, role) {
  const data = await readBody(request);
  if (!data) return send('Request body too large',413);
  const val = (name, fallback = '') => (data.get(name) ?? fallback).slice(0,1000);
  const route = new URL(request.url).pathname, date = now();
  if (route === '/admin/reset') {
    const resetKey = process.env.UUK_RESET_KEY || '';
    if (!resetKey || resetKey === 'change-this-before-lan-use' || !equalSecret(request.headers.get('x-reset-key') || '',resetKey)) return send('Reset unauthorized',403);
    (await reset()); clearSessions(); return send(json({status:'reset',instance:INSTANCE}),200,'application/json');
  }
  if (route === '/action/login') {
    const sid = (await login(val('username').toLowerCase().trim(),val('password')));
    if (!sid) return send(loginScreen('Username atau password tidak sesuai.'),401);
    return redirect('/',{ 'Set-Cookie':sessionCookie(sid) });
  }
  if (!user) return redirect('/login');
  if (!route.startsWith('/action/')) return notFound();
  const action = route.slice('/action/'.length);
  if (action !== 'status' && !canAction(action,role)) return forbidden(user,role);
  if (action === 'create-ticket') {
    (await execute('INSERT INTO tickets(title,status,category,priority,requester,assignee,created) VALUES(?,?,?,?,?,?,?)',[val('title'),'Open',val('category'),val('priority'),user,'Unassigned',date]));
    (await audit(user,'Created helpdesk ticket')); return redirect('/page/helpdesk/tickets');
  }
  if (action === 'comment') {
    const id = val('ticket_id');
    if (!numeric(id)) return send('Invalid ticket ID',400);
    if (!(await records('tickets','WHERE id=?',[Number(id)])).length) return send('Ticket not found',404);
    (await execute('INSERT INTO comments(ticket_id,author,body,created) VALUES(?,?,?,?)',[Number(id),user,val('body'),date]));
    (await audit(user,'Posted ticket comment')); return redirect('/page/helpdesk/ticket-comments');
  }
  if (action === 'document') {
    (await execute('INSERT INTO documents(name,folder,owner,size,visibility,created) VALUES(?,?,?,?,?,?)',[val('name'),val('folder'),user,'Metadata',val('visibility'),date]));
    (await audit(user,'Created document record')); return redirect('/page/documents/explorer');
  }
  if (action === 'loan') {
    const asset = numeric(val('asset_id')) ? Number(val('asset_id')) : 0;
    if (!(await query('SELECT id FROM assets WHERE id=?',[asset])).length) return send('Unknown asset ID',400);
    (await execute('INSERT INTO loans(asset_id,employee,borrowed,returned,status) VALUES(?,?,?,?,?)',[asset,user,date,'','Borrowed']));
    (await execute('UPDATE assets SET status=?,holder=? WHERE id=?',['Borrowed',user,asset]));
    (await audit(user,'Requested asset loan')); return redirect('/page/assets/borrowing');
  }
  if (action === 'expense') {
    const amount = numeric(val('amount')) ? Number(val('amount')) : 0;
    (await execute('INSERT INTO expenses(title,amount,status,requester,category,created) VALUES(?,?,?,?,?,?)',[val('title'),amount,'Pending',user,val('category'),date]));
    (await audit(user,'Submitted expense request')); return redirect('/page/finance/expense-requests');
  }
  if (action === 'task') {
    (await execute('INSERT INTO tasks(project_id,title,assignee,status,priority,due) VALUES(?,?,?,?,?,?)',[1,val('title'),val('assignee'),'To Do',val('priority'),'2026-12-01']));
    (await audit(user,'Created task')); return redirect('/page/projects/tasks');
  }
  if (action === 'status') {
    const tbl = val('table'), id = val('id'), status = val('status');
    if (!Object.hasOwn(STATES,tbl) || !STATES[tbl].includes(status) || !numeric(id)) return send('Invalid status',400);
    const [row] = (await records(tbl,'WHERE id=?',[Number(id)]));
    if (!row) return send('Record not found',404);
    if (!canStatus(role,tbl,row,user)) return forbidden(user,role);
    (await execute(`UPDATE ${tbl} SET status=? WHERE id=?`,[status,Number(id)]));
    (await audit(user,`Updated ${tbl} #${id} to ${status}`)); return redirect(`/record/${tbl}/${id}`);
  }
  if (action === 'settings') {
    (await execute('REPLACE INTO settings(k,v) VALUES(?,?)',['organization',val('organization')]));
    (await audit(user,'Updated organization settings')); return redirect('/page/admin/settings');
  }
  if (action === 'export') {
    let report;
    try { report = await exportReport(val('title')); }
    catch { return send('Lab export worker unavailable or timed out',503); }
    const id = (await execute('INSERT INTO exports(title,created,actor) VALUES(?,?,?)',[val('title'),date,user]));
    const headers = {};
    if (report) {
      const filename = `report-${id}.txt`;
      writeFileSync(path.join(DOCROOT,'public',filename),report);
      headers['X-UUK-Lab-Artifact'] = `/document/download?file=${filename}`;
    }
    (await audit(user,'Requested report export')); return redirect('/page/reports/export-history',headers);
  }
  return notFound();
}
export async function handle(request) {
  const who = identity(request);
  return context.run(who,async () => {
    try {
      if (request.method === 'GET' || request.method === 'HEAD') return (await get(request,who.user,who.role));
      if (request.method === 'POST') return await post(request,who.user,who.role);
      return send('Method Not Allowed',405,'text/plain',{ Allow:'GET, HEAD, POST' });
    } catch (error) {
      console.error('Portal request failed:',error.message);
      return send('Internal Server Error',500,'text/plain');
    }
  });
}
