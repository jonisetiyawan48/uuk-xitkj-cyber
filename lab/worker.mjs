// Intentionally vulnerable command-injection target for the isolated RCE lab.
// Never run this service on the host or publish its port.
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const scratch = '/tmp/uuk-rce';
const outputLimit = 32768;
mkdirSync(scratch,{recursive:true});
let busy = false;
export function runExport(title) {
  return new Promise(resolve => {
    // CWE-78, intentional: shell interpolation of the report title is the lesson.
    const child = spawn('/bin/sh',['-c',`printf '%s\\n' "${title}"`],{
      cwd:scratch, detached:true,
      env:{ PATH:'/usr/local/bin:/usr/bin:/bin', HOME:scratch, TMPDIR:scratch },
      stdio:['ignore','pipe','pipe'],
    });
    const stdout = [], stderr = [];
    let bytes = 0, timedOut = false, finished = false;
    const kill = () => { try { process.kill(-child.pid,'SIGKILL'); } catch {} };
    const timer = setTimeout(() => { timedOut = true;kill(); },2000);
    const collect = target => chunk => {
      const remaining = outputLimit-bytes;
      if (remaining > 0) { target.push(chunk.subarray(0,remaining)); bytes += Math.min(chunk.length,remaining); }
      if (bytes >= outputLimit) kill();
    };
    const finish = code => {
      if (finished) return;
      finished = true; clearTimeout(timer); kill();
      resolve({stdout:Buffer.concat(stdout).toString(),stderr:Buffer.concat(stderr).toString(),code,timedOut});
    };
    child.stdout.on('data',collect(stdout));child.stderr.on('data',collect(stderr));
    child.once('error',error => { stderr.push(Buffer.from(error.message));finish(-1); });
    child.once('close',code => finish(code));
  });
}
export const server = http.createServer(async (req,res) => {
  if (req.method !== 'POST' || req.url !== '/export') { res.writeHead(404);return res.end(); }
  if (busy) { res.writeHead(429);return res.end('Worker busy'); }
  busy = true;
  try {
    const chunks = [];let length = 0;
    for await (const chunk of req) {
      length += chunk.length;
      if (length > 4096) { res.writeHead(413);return res.end(); }
      chunks.push(chunk);
    }
    const {title} = JSON.parse(Buffer.concat(chunks).toString());
    if (typeof title !== 'string' || title.length > 1000) { res.writeHead(400);return res.end(); }
    const result = await runExport(title);
    res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(result));
  } catch { res.writeHead(400);res.end('Invalid request'); }
  finally { busy = false; }
});
server.requestTimeout = 5000;server.headersTimeout = 5000;
if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) server.listen(9000,'0.0.0.0');
