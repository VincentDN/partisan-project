// Inspect a GLB: colour every mesh, render four views, print each mesh's bounds, and save a sheet.
//   node tools/assets/inspect-glb.mjs assets/models/weapons/g3.glb [out.png] [--json]
// Used to map the parts of rifles whose meshes are unnamed (see workbench/models.js).
import {chromium} from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [file, out = 'build/inspect.png'] = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!file) {
  console.error('usage: node tools/assets/inspect-glb.mjs <file.glb> [out.png] [--json]');
  process.exit(1);
}
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.glb': 'model/gltf-binary',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
};
const server = http.createServer((req, res) => {
  const p = path.join(process.cwd(), decodeURIComponent(req.url.split('?')[0]));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) return (res.writeHead(404), res.end());
  res.writeHead(200, {'content-type': TYPES[path.extname(p)] || 'application/octet-stream'});
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, r));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({viewport: {width: 1140, height: 900}});
page.on('pageerror', e => console.error('page error:', e.message));
await page.goto(`http://localhost:${server.address().port}/tools/assets/inspect.html?file=${encodeURIComponent('/' + file)}`);
await page.waitForFunction(() => window.INSPECT, null, {timeout: 60000});
const data = await page.evaluate(() => window.INSPECT);
fs.mkdirSync(path.dirname(out), {recursive: true});
await page.screenshot({path: out, fullPage: true});
if (process.argv.includes('--json')) console.log(JSON.stringify(data));
else {
  console.log(`${file}: size ${data.size.map(n => n.toFixed(3)).join(' x ')} m (x y z), ${data.meshes.length} meshes`);
  for (const m of data.meshes)
    console.log(
      `${String(m.i).padStart(2)} ${String(m.parent || m.name)
        .slice(0, 30)
        .padEnd(30)} ${String(m.tris).padStart(5)}t  c(${m.center.join(',')}) s(${m.size.join(',')}) ${m.material}`,
    );
}
await browser.close();
server.close();
