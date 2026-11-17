import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const docker = async (...args) => (await exec('docker',args,{timeout:240000,maxBuffer:4*1024*1024})).stdout.trim();

test('Node 22 Docker deployment and real RCE stay inside the isolated worker', {timeout:300000},async () => {
  const suffix = `${process.pid}-${Date.now()}`;
  const network = 'moklet-test-'+suffix, portal = network+'-portal', worker = network+'-worker', db = network+'-db';
  const image = 'moklet-uuk-next:verify', workerImage = 'moklet-uuk-rce:verify';
  console.log('Building Node 22 portal and isolated RCE worker images...');
  await docker('build','-t',image,'.');
  await docker('build','-t',workerImage,'lab');
  try {
    await docker('network','create','--internal',network);
    await docker('run','-d','--name',db,'--network',network,'--network-alias','db','--env','MARIADB_ROOT_PASSWORD=test-root-password','--env','MARIADB_DATABASE=moklet_uuk','--env','MARIADB_USER=moklet','--env','MARIADB_PASSWORD=test-database-password','mariadb:11.4');
    let ready = false;
    for (let i=0;i<90;i++) {
      try { await docker('exec',db,'healthcheck.sh','--connect','--innodb_initialized');ready = true;break; } catch {}
      await new Promise(resolve => setTimeout(resolve,1000));
    }
    assert.ok(ready,'MariaDB did not become ready');
    await docker('run','-d','--name',worker,'--network',network,'--network-alias','rce-lab','--read-only','--tmpfs','/tmp:size=16m,mode=1777','--cap-drop','ALL','--security-opt','no-new-privileges:true','--pids-limit','32','--memory','96m','--cpus','0.5','--init',workerImage);
    await docker('run','-d','--name',portal,'--network',network,'--read-only','--tmpfs','/data:size=16m,uid=1000,gid=1000,mode=0700','--tmpfs','/tmp:size=64m,mode=1777','--cap-drop','ALL','--cap-add','NET_BIND_SERVICE','--security-opt','no-new-privileges:true','--env','UUK_DB_HOST=db','--env','UUK_DB_PASSWORD=test-database-password','--env','UUK_ENABLE_RCE_LAB=true','--env','UUK_DEMO_PASSWORD=test-password',image);
    const result = await docker('exec',portal,'node','--input-type=module','-e',`
      import assert from 'node:assert/strict';
      const base = 'http://127.0.0.1:1992';
      for(let i=0;i<50;i++) { try { const r = await fetch(base+'/health'); if(r.ok) break; } catch {} await new Promise(r=>setTimeout(r,200)); }
      const post = (route,cookie,data) => fetch(base+route,{method:'POST',redirect:'manual',headers:cookie?{Cookie:cookie}:{},body:new URLSearchParams(data)});
      const login = async username => {const r = await post('/action/login',null,{username,password:'test-password'});assert.equal(r.status,303);return r.headers.get('set-cookie').split(';')[0];};
      for (const username of ['employee','manager','hr','admin']) {
        const injected = await post('/action/login',null,{username,password:"' OR 1=1 -- "});
        assert.equal(injected.status,303,'MariaDB SQLi login '+username);
      }
      const employee = await login('employee'), hr = await login('hr');
      assert.equal((await fetch(base+'/module/admin',{headers:{Cookie:employee}})).status,403);
      assert.equal((await post('/action/export',employee,{title:'Employee Report $(id)'})).status,403);
      const exported = await post('/action/export',hr,{title:'Employee Report $(id)'});
      assert.equal(exported.status,303);
      const artifact = exported.headers.get('x-uuk-lab-artifact');assert.ok(artifact);
      const evidence = await (await fetch(base+artifact,{headers:{Cookie:hr}})).text();
      assert.match(evidence,/uid=1000\\(node\\)/);assert.match(evidence,/Exit: 0/);
      const timeout = await post('/action/export',hr,{title:'Employee Report $(sleep 10)'});
      assert.equal(timeout.status,303);
      const timed = await (await fetch(base+timeout.headers.get('x-uuk-lab-artifact'),{headers:{Cookie:hr}})).text();
      assert.match(timed,/Timed out: true/);
      const normal = await post('/action/export',hr,{title:'Normal Employee Report'});
      assert.equal(normal.status,303);
      const text = await (await fetch(base+normal.headers.get('x-uuk-lab-artifact'),{headers:{Cookie:hr}})).text();
      assert.match(text,/Normal Employee Report/);
      assert.ok(process.versions.node.startsWith('22.'));
      console.log('Node 22, RBAC, real id execution in worker, timeout and subsequent export passed.');
    `);
    console.log(result);
    const [inspection] = JSON.parse(await docker('inspect',worker));
    assert.equal(inspection.HostConfig.ReadonlyRootfs,true);
    assert.equal(inspection.Config.User,'node');
    assert.equal(Object.keys(inspection.HostConfig.PortBindings || {}).length,0);
    assert.ok(inspection.Mounts.every(m => m.Type === 'tmpfs'));
    assert.ok(!inspection.Config.Env.some(v => v.startsWith('UUK_DEMO_PASSWORD=') || v.startsWith('UUK_RESET_KEY=')));
    const [net] = JSON.parse(await docker('network','inspect',network));
    assert.equal(net.Internal,true);
  } catch (error) {
    try { console.error(await docker('logs',portal)); } catch {}
    throw error;
  } finally {
    for (const container of [portal,worker,db]) try { await docker('rm','-f','-v',container); } catch {}
    try { await docker('network','rm',network); } catch {}
  }
});
