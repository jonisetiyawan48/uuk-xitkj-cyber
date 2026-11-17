import http from 'node:http';
import next from 'next';
import { startAuxiliaryServices } from './src/lib/services.mjs';

const port = Number(process.env.PORT_WEB || 1992);
const app = next({ dev:process.env.NODE_ENV === 'development', hostname:'0.0.0.0', port });
await app.prepare();
const requestHandler = app.getRequestHandler();
const server = http.createServer((req,res) => requestHandler(req,res));
server.requestTimeout = 30000;
server.headersTimeout = 15000;
let closeAuxiliary = () => {};
if (process.env.UUK_ENABLE_AUXILIARY !== 'false') closeAuxiliary = await startAuxiliaryServices();
await new Promise((resolve,reject) => {
  server.once('error',reject);server.listen(port,'0.0.0.0',resolve);
});
console.log(`Moklet Internal Portal (Next.js / Node ${process.versions.node}) listening on ${server.address().port}`);
for (const signal of ['SIGTERM','SIGINT']) process.on(signal,() => {
  closeAuxiliary();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0),3000).unref();
});
