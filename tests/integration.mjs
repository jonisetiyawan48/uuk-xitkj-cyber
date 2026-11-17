import { prepareTestDatabase } from './database.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import net from 'node:net';
import http from 'node:http';
import dgram from 'node:dgram';
import { startAuxiliaryServices } from '../src/lib/services.mjs';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/legacy-pages.json',import.meta.url),'utf8'));
test('production Next.js serves every original page, assets, RBAC and persisted database', {timeout:60000},async () => {
  const data = mkdtempSync(path.join(tmpdir(),'moklet-next-http-'));
  let child;
  const start = () => new Promise((resolve,reject) => {
    child = spawn(process.execPath,['server.mjs'],{env:{...process.env,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',PORT_WEB:'0',UUK_ENABLE_AUXILIARY:'false',UUK_ENABLE_RCE_LAB:'false',UUK_DATA_DIR:data,UUK_INSTANCE:'TRAINING-01',UUK_DEMO_PASSWORD:'test-password'},stdio:['ignore','pipe','pipe']});
    let log = '';
    const timer = setTimeout(() => reject(new Error('Server startup timed out: '+log)),20000);
    child.stdout.on('data',chunk => {
      log += chunk;
      const match = log.match(/listening on (\d+)/);
      if (match) { clearTimeout(timer);resolve('http://127.0.0.1:'+match[1]); }
    });
    child.stderr.on('data',chunk => {log += chunk;if (String(chunk).includes('Portal request failed')) process.stderr.write(chunk);});
    child.once('exit',code => { clearTimeout(timer);reject(new Error(`Server exited ${code}: ${log}`)); });
    child.once('error',reject);
  });
  const stop = () => new Promise(resolve => { if (!child || child.exitCode !== null) return resolve(); child.once('exit',resolve);child.kill('SIGTERM'); });
  try {
    await prepareTestDatabase();
    let base = await start();
    const request = (route, cookie, data) => fetch(base+route,{redirect:'manual',method:data ? 'POST' : 'GET',headers:cookie ? {Cookie:cookie} : {},body:data ? new URLSearchParams(data) : undefined});
    const cookies = {};
    for (const username of ['employee','manager','hr','admin']) {
      const response = await request('/action/login',null,{username,password:'test-password'});
      assert.equal(response.status,303);
      cookies[username] = response.headers.get('set-cookie').split(';')[0];
    }
    for (const {username,path:route,sha256} of fixture) {
      const response = await request(route,cookies[username]);
      assert.equal(response.status,200,route);
      const html = await response.text();
      if (route === '/page/helpdesk/ticket-comments') continue;
      if (route === '/module/documents' || route.startsWith('/page/documents/')) {
        assert.ok(html.includes('Download Dokumen'));
        assert.ok(html.includes('/document/download?file=employee-handbook.txt</code>'));
        continue;
      }
      assert.equal(createHash('sha256').update(html.replaceAll('allow-scripts allow-modals','allow-scripts').replace(/\s+/g,'')).digest('hex'),sha256,`${username}: ${route}`);
    }
    const lanHTML = await new Promise((resolve,reject) => {
      http.get(base+'/module/documents',{headers:{Cookie:cookies.employee,Host:'192.0.2.10:3000'}},response => {
        let html = '';response.setEncoding('utf8');
        response.on('data',chunk => {html += chunk;});response.on('end',() => resolve(html));
      }).on('error',reject);
    });
    assert.ok(lanHTML.includes('http://192.0.2.10:3000/document/download?file=employee-handbook.txt</code>'));
    for (const file of ['style.css','logo.svg','hero.svg','avatar.svg']) {
      const response = await request('/static/'+file);
      assert.equal(response.status,200);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()),readFileSync(new URL('../public/static/'+file,import.meta.url)));
    }
    assert.equal((await request('/module/admin',cookies.employee)).status,403);
    assert.equal((await request('/record/tickets/2',cookies.employee)).status,404);
    assert.equal((await request('/action/expense',cookies.employee,{title:'Persist after restart',amount:'1000',category:'IT'})).status,303);
    await stop();
    base = await start();
    assert.equal((await request('/',cookies.employee)).status,303,'memory sessions expire on restart');
    const login = await request('/action/login',null,{username:'employee',password:'test-password'});
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const persisted = await request('/page/finance/expense-requests',cookie);
    const persistedHTML = await persisted.text();
    assert.ok(persistedHTML.includes('Persist after restart'),`Persisted response ${persisted.status}: ${persistedHTML.slice(-2500)}`);
  } finally { await stop();rmSync(data,{recursive:true,force:true}); }
});

test('Node auxiliary FTP, DNS and HTTP preserve the original protocol responses', {timeout:10000},async () => {
  const reserve = async udp => new Promise(resolve => {
    const s = udp ? dgram.createSocket('udp4') : net.createServer();
    const ready = () => { const port = s.address().port;s.close(() => resolve(port)); };
    if (udp) s.bind(0,'127.0.0.1',ready);else s.listen(0,'127.0.0.1',ready);
  });
  process.env.PORT_FTP = String(await reserve(false));
  process.env.PORT_DNS = String(await reserve(true));
  process.env.PORT_ALT = String(await reserve(false));
  const close = await startAuxiliaryServices();
  try {
    assert.equal(await (await fetch('http://127.0.0.1:'+process.env.PORT_ALT)).text(),'Moklet Digital Solutions - Auxiliary Service OK\n');
    const ftp = await new Promise((resolve,reject) => {
      const s = net.connect(Number(process.env.PORT_FTP),'127.0.0.1');let result = '';
      s.on('data',chunk => {result += chunk;if (result.includes('220 ') && !result.includes('215 ')) s.write('SYST\r\nQUIT\r\n');});
      s.on('end',() => resolve(result));s.on('error',reject);
    });
    assert.ok(ftp.includes('220 (vsFTPd 2.3.4)'));
    assert.ok(ftp.includes('215 UNIX Type: L8'));
    const packet = Buffer.from('1234010000010000000000000000010001','hex');
    const response = await new Promise((resolve,reject) => {
      const socket = dgram.createSocket('udp4');
      socket.on('message',msg => {socket.close();resolve(msg);});socket.on('error',reject);
      socket.send(packet,Number(process.env.PORT_DNS),'127.0.0.1');
    });
    assert.equal(response.subarray(0,4).toString('hex'),'12348180');
  } finally { close(); }
});
