import net from 'node:net';
import dgram from 'node:dgram';
import http from 'node:http';

export async function startAuxiliaryServices() {
  const ftp = net.createServer(socket => {
    socket.setTimeout(30000,() => socket.destroy());
    socket.write('220 (vsFTPd 2.3.4)\r\n');
    let buffer = '', count = 0;
    socket.on('data',chunk => {
      buffer += chunk.toString('utf8');
      if (buffer.length > 4096) return socket.destroy();
      while (buffer.includes('\n')) {
        const idx = buffer.indexOf('\n'), command = buffer.slice(0,idx).trim().toUpperCase();
        buffer = buffer.slice(idx+1);
        if (++count > 12) return socket.end();
        if (command.startsWith('QUIT')) return socket.end('221 Goodbye.\r\n');
        if (command.startsWith('SYST')) socket.write('215 UNIX Type: L8\r\n');
        else if (command.startsWith('FEAT')) socket.write('211-Features:\r\n UTF8\r\n211 End\r\n');
        else socket.write('530 Training simulator: authentication disabled.\r\n');
      }
    });
    socket.on('error',() => {});
  });
  const dns = dgram.createSocket('udp4');
  dns.on('message',(message,remote) => {
    if (message.length < 12) return;
    const response = Buffer.concat([message.subarray(0,2),Buffer.from([0x81,0x80]),message.subarray(4,6),Buffer.alloc(6),message.subarray(12)]);
    dns.send(response,remote.port,remote.address);
  });
  const alt = http.createServer((req,res) => {
    const body = 'Moklet Digital Solutions - Auxiliary Service OK\n';
    res.writeHead(200,{'Content-Length':Buffer.byteLength(body)});res.end(body);
  });
  const bindTCP = (server,port) => new Promise((resolve,reject) => {
    server.once('error',reject);server.listen(port,'0.0.0.0',resolve);
  });
  const closers = [ftp,dns,alt];
  try {
    await bindTCP(ftp,Number(process.env.PORT_FTP || 21));
    await new Promise((resolve,reject) => { dns.once('error',reject);dns.bind(Number(process.env.PORT_DNS || 53),'0.0.0.0',resolve); });
    await bindTCP(alt,Number(process.env.PORT_ALT || 8080));
    return () => { for (const server of closers) try { server.close(); } catch {} };
  } catch (error) {
    for (const server of closers) try { server.close(); } catch {}
    throw error;
  }
}
