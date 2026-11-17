import { prepareTestDatabase } from './database.mjs';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = mkdtempSync(path.join(tmpdir(),'moklet-node-test-'));
process.env.UUK_DATA_DIR = root;
process.env.UUK_INSTANCE = 'TRAINING-01';
process.env.UUK_DEMO_PASSWORD = 'test-password';
process.env.UUK_RESET_KEY = 'test-only-reset-key-123456';
delete process.env.UUK_ENABLE_RCE_LAB;
const { handle } = await import('../src/lib/handler.mjs');
const { closeDatabase, query, reset } = await import('../src/lib/db.mjs');
const { MODULES, DEMO_USERS } = await import('../src/lib/config.mjs');
const { canPage, context } = await import('../src/lib/auth.mjs');
const { slugify } = await import('../src/lib/views.mjs');
await prepareTestDatabase();
const cookies = {};
async function request(route, username, data, headers = {}) {
  const options = { headers: { ...headers } };
  if (cookies[username]) options.headers.Cookie = cookies[username];
  if (data !== undefined) { options.method = 'POST'; options.body = new URLSearchParams(data); }
  return handle(new Request('http://localhost:1992'+route,options));
}
for (const username of Object.keys(DEMO_USERS)) {
  const response = await request('/action/login',null,{username,password:'test-password'});
  assert.equal(response.status,303);
  cookies[username] = response.headers.get('set-cookie').split(';')[0];
}
after(async () => { (await closeDatabase());rmSync(root,{recursive:true,force:true}); });

test('all legacy page markup and content remains identical for every role',async () => {
  const fixtures = JSON.parse(readFileSync(new URL('./fixtures/legacy-pages.json',import.meta.url),'utf8'));
  for (const { username, path:route, sha256 } of fixtures) {
    const response = await request(route,username);
    assert.equal(response.status,200,`${username}: ${route}`);
    const body = await response.text();
    if (route === '/page/helpdesk/ticket-comments') continue;
    if (route === '/module/documents' || route.startsWith('/page/documents/')) {
      assert.ok(body.includes('Download Dokumen'));
      assert.ok(body.includes('/document/download?file=employee-handbook.txt</code>'));
      continue;
    }
    const actual = createHash('sha256').update(body.replaceAll('allow-scripts allow-modals','allow-scripts').replace(/\s+/g,'')).digest('hex');
    assert.equal(actual,sha256,`HTML parity: ${username}: ${route}`);
  }
});
test('comment dropdown lists only accessible tickets and handles an empty ticket list',async () => {
  for (const [username,ownId,otherId] of [['employee',1,2],['manager',2,1],['hr',4,1],['admin',1,null]]) {
    const html = await (await request('/page/helpdesk/ticket-comments',username)).text();
    const options = html.match(/<select name="ticket_id">([\s\S]*?)<\/select>/)?.[1];
    assert.ok(options);
    assert.ok(options.includes(`value="${ownId}"`));
    if (otherId) assert.ok(!options.includes(`value="${otherId}"`));
    else assert.ok(options.includes('value="2"'));
    assert.ok(!html.includes('type="number" name="ticket_id"'));
  }
  const { execute } = await import('../src/lib/db.mjs');
  await execute('UPDATE tickets SET requester=? WHERE requester=?',['No visible owner',DEMO_USERS.employee[0]]);
  try {
    const html = await (await request('/page/helpdesk/ticket-comments','employee')).text();
    assert.ok(html.includes('Buat tiket terlebih dahulu'));
    assert.ok(!html.includes('action="/action/comment"'));
  } finally {
    await execute('UPDATE tickets SET requester=? WHERE requester=?',[DEMO_USERS.employee[0],'No visible owner']);
  }
});
test('module and page authorization blocks direct URLs for every role',async () => {
  for (const [username,[,role]] of Object.entries(DEMO_USERS)) for (const [module,,,pages] of MODULES) {
    assert.equal((await request('/module/'+module,username)).status,canPage(role,module) ? 200 : 403);
    for (const p of pages) {
      const slug = slugify(p);
      assert.equal((await request(`/page/${module}/${slug}`,username)).status,canPage(role,module,slug) ? 200 : 403);
    }
  }
  const html = await (await request('/','employee')).text();
  assert.ok(!html.includes('href="/module/admin"'));
  assert.equal((await request('/module/admin')).status,303);
  assert.equal((await request('/module/constructor','admin')).status,404);
  assert.equal((await request('/record/toString/1','admin')).status,404);
});
test('ownership, approvals, role forgery and task authorization',async () => {
  assert.equal((await request('/record/tickets/2','employee')).status,404);
  assert.equal((await request('/record/tickets/1','employee')).status,200);
  assert.equal((await request('/action/status','employee',{table:'expenses',id:'1',status:'Approved'})).status,403);
  assert.equal((await request('/action/status','manager',{table:'expenses',id:'2',status:'Approved'})).status,403);
  assert.equal((await request('/action/status','manager',{table:'expenses',id:'1',status:'Approved'})).status,303);
  assert.equal((await query('SELECT status FROM expenses WHERE id=1'))[0].status,'Approved');
  assert.equal((await request('/action/status','employee',{table:'tasks',id:'2',status:'Done'})).status,404);
  assert.equal((await request('/action/status','employee',{table:'tasks',id:'1',status:'Done'})).status,303);
  assert.equal((await request('/action/settings','employee',{organization:'Hacked',role:'Administrator'})).status,403);
  assert.equal((await request('/action/task','hr',{title:'Forbidden'})).status,403);
  assert.equal((await request('/action/export','employee',{title:'Forbidden'})).status,403);
  assert.equal((await request('/action/status','admin',{table:'constructor',id:'1',status:'Done'})).status,400);
});
test('forms persist data with server-derived identities',async () => {
  assert.equal((await request('/action/create-ticket','employee',{title:'New ticket',category:'Network',priority:'High',requester:'Forged'})).status,303);
  assert.equal((await query('SELECT requester FROM tickets ORDER BY id DESC LIMIT 1'))[0].requester,DEMO_USERS.employee[0]);
  assert.equal((await request('/action/comment','employee',{ticket_id:'2',body:'Denied'})).status,404);
  assert.equal((await request('/action/comment','employee',{ticket_id:'1',body:'<b>lab</b>'})).status,303);
  const commentPage = await (await request('/page/helpdesk/ticket-comments','employee')).text();
  assert.ok(commentPage.includes('sandbox="allow-scripts allow-modals"'));
  assert.ok(commentPage.includes('&lt;b&gt;lab&lt;/b&gt;'));
  assert.equal((await request('/action/loan','employee',{asset_id:'1',employee:'Forged'})).status,303);
  assert.equal((await query('SELECT employee FROM loans ORDER BY id DESC LIMIT 1'))[0].employee,DEMO_USERS.employee[0]);
  assert.equal((await request('/action/document','hr',{name:'Test.pdf',folder:'HR',visibility:'Internal'})).status,303);
  assert.equal((await request('/action/expense','employee',{title:'Test expense',amount:'1000',category:'IT'})).status,303);
  assert.equal((await request('/action/task','manager',{title:'Test task',assignee:DEMO_USERS.employee[0],priority:'High'})).status,303);
  assert.equal((await request('/action/settings','admin',{organization:'Test company'})).status,303);
  const exportResponse = await request('/action/export','hr',{title:'Employee Department Report'});
  assert.equal(exportResponse.status,303);
  assert.equal(exportResponse.headers.get('x-uuk-lab-artifact'),null);
});
test('password SQLi preserves selected role and employee search treats payload as text',async () => {
  const payload = "' OR 1=1 -- ";
  for (const [username,[user,role]] of Object.entries(DEMO_USERS)) {
    const response = await request('/action/login',null,{username,password:payload});
    assert.equal(response.status,303);
    const home = await handle(new Request('http://localhost/',{headers:{Cookie:response.headers.get('set-cookie').split(';')[0]}}));
    const html = await home.text();
    assert.ok(html.includes(role+' · Demo account'));
    assert.ok(html.includes(user));
  }
  for (const username of ['unknown',"admin' OR 1=1 -- ",'constructor']) {
    assert.equal((await request('/action/login',null,{username,password:payload})).status,401);
  }
  assert.equal((await request('/action/login',null,{username:'admin',password:"'"})).status,401);
});
test('remaining lab exercises stay confined to read-only dummy SQL, iframe and document tree',async () => {
  const response = await request('/page/hr/employees?q='+encodeURIComponent("' OR 1=1 --"),'hr');
  const text = await response.text();
  assert.ok(text.includes('No matching records.'));
  const { trainingSelect } = await import('../src/lib/db.mjs');
  (await trainingSelect('DELETE FROM employees'));
  assert.equal((await query('SELECT count(*) AS n FROM employees'))[0].n,24);
  assert.equal((await request('/document/download?file=../internal/audit-marker.txt','employee')).status,200);
  assert.equal((await request('/document/download?file=../../../etc/passwd','employee')).status,404);
  assert.equal((await request('/document/download?file=../../../../../etc/shadow','employee')).status,404);
  assert.equal((await request('/document/download?file=/etc/passwd','employee')).status,404);
  const xss = await (await request('/search/helpdesk?q='+encodeURIComponent('<script>test</script>'),'employee')).text();
  assert.ok(xss.includes('sandbox="allow-scripts allow-modals"'));
  assert.ok(xss.includes('&lt;script&gt;test&lt;/script&gt;'));
});
test('requested passwd traversal returns only the authenticated dummy fixture',async () => {
  const route = '/document/download?file=../../../../../etc/passwd';
  assert.equal((await request(route)).status,303);
  const response = await request(route,'employee');
  assert.equal(response.status,200);
  assert.equal(response.headers.get('x-uuk-lab-fixture'),'dummy-etc-passwd');
  assert.equal(response.headers.get('content-disposition'),'inline; filename="passwd"');
  assert.equal(response.headers.get('content-type'),'text/plain; charset=utf-8');
  const body = await response.text();
  assert.ok(body.includes('root:x:0:0:root:/root:/bin/bash\n'));
  assert.ok(body.includes('moklet-demo:x:1001:1001:Dummy Training Account:'));
  const encoded = await request('/document/download?file='+encodeURIComponent('../../../../../etc/passwd'),'employee');
  assert.equal(await encoded.text(),body);
});
test('all beginner Linux configuration paths resolve to authenticated dummy fixtures',async () => {
  const { LINUX_FIXTURES } = await import('../src/lib/lab-files.mjs');
  for (const target of Object.keys(LINUX_FIXTURES)) {
    for (const file of [target,'../../../../..'+target]) {
      const route = '/document/download?'+new URLSearchParams({file});
      assert.equal((await request(route)).status,303);
      const response = await request(route,'employee');
      assert.equal(response.status,200);
      assert.equal(response.headers.get('x-uuk-lab-fixture'),'dummy-linux-config');
      assert.ok((await response.text()).includes('UUK-LFI-DEMO: '+target));
    }
  }
  for (const file of ['/etc/shadow','../../../../../etc/shadow','/proc/self/environ','../../../../../.env']) {
    assert.equal((await request('/document/download?'+new URLSearchParams({file}),'employee')).status,404);
  }
});
test('request identity remains isolated across concurrent roles',async () => {
  const responses = await Promise.all(Array.from({length:24},(_,i) => request('/record/tickets/2',i % 2 ? 'admin' : 'employee')));
  responses.forEach((response,i) => assert.equal(response.status,i % 2 ? 200 : 404));
});
test('MariaDB reconnects without reseeding existing data',async () => {
  (await executeForReopen());
  async function executeForReopen() {
    const before = (await query('SELECT count(*) AS n FROM expenses'))[0].n;
    (await closeDatabase());
    assert.equal((await query('SELECT count(*) AS n FROM expenses'))[0].n,before);
  }
});
test('body limit, invalid login, reset key and logout',async () => {
  assert.equal((await request('/action/login',null,{username:'admin',password:'bad'})).status,401);
  assert.equal((await request('/action/login',null,{username:'constructor',password:'test-password'})).status,401);
  assert.equal((await request('/action/settings','admin',{organization:'x'.repeat(20000)})).status,413);
  assert.equal((await request('/admin/reset',null,{}, {'X-Reset-Key':'wrong'})).status,403);
  assert.equal((await request('/logout','employee')).status,303);
  assert.equal((await request('/','employee')).status,303);
  assert.equal((await request('/admin/reset',null,{}, {'X-Reset-Key':process.env.UUK_RESET_KEY})).status,200);
  assert.equal((await query('SELECT count(*) AS n FROM tickets'))[0].n,25);
  assert.equal((await request('/','admin')).status,303);
});
