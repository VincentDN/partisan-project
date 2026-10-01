// Zero-dependency static dev server: `npm run serve` -> http://localhost:8123/  (PORT=… to change; ROOT=_site to serve a build)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(process.env.ROOT || '.');
const port = +process.env.PORT || 8123;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.glb': 'model/gltf-binary',
  '.hdr': 'application/octet-stream',
  '.mp3': 'audio/mpeg',
  '.md': 'text/markdown; charset=utf-8',
};
http
  .createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(root, p);
    if (!file.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) {
      res.writeHead(404, {'content-type': 'text/plain'}).end('404');
      return;
    }
    res.writeHead(200, {'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store'});
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`PARP dev server: http://localhost:${port}/  (root ${root})`));
