// Download the chosen Sketchfab sources (tools/assets/sketchfab-sources.json) into assets-incoming/<id>/.
//   SKETCHFAB_TOKEN=... node tools/assets/sketchfab-fetch.mjs            (everything not yet downloaded)
//   SKETCHFAB_TOKEN=... node tools/assets/sketchfab-fetch.mjs g3 m16     (just these)
// Uses curl so the session's HTTPS proxy and CA bundle apply. Each model arrives as glTF (scene.gltf + bin + textures);
// the import step (optimize-glb.mjs, glTF-Transform) normalises scale and budgets afterwards.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const token = process.env.SKETCHFAB_TOKEN;
if (!token) {
  console.error('SKETCHFAB_TOKEN is not set. Add it in the environment settings (it reaches new sessions).');
  process.exit(1);
}
const {sources} = JSON.parse(fs.readFileSync(new URL('./sketchfab-sources.json', import.meta.url), 'utf8'));
const wanted = process.argv.slice(2);
const list = wanted.length ? sources.filter(s => wanted.includes(s.id)) : sources;
const curl = (...args) => execFileSync('curl', ['-sSfL', '--retry', '3', '-m', '300', ...args], {maxBuffer: 1 << 30});

let ok = 0;
for (const s of list) {
  const dir = path.join('assets-incoming', s.id);
  if (fs.existsSync(path.join(dir, 'scene.gltf')) || fs.existsSync(path.join(dir, 'scene.glb'))) {
    console.log(`skip  ${s.id} (already here)`);
    ok++;
    continue;
  }
  try {
    const info = JSON.parse(
      curl('-H', `Authorization: Token ${token}`, `https://api.sketchfab.com/v3/models/${s.uid}/download`).toString(),
    );
    const pick = info.glb || info.gltf;
    if (!pick?.url) throw new Error('no glTF download offered');
    fs.mkdirSync(dir, {recursive: true});
    const file = path.join(dir, info.glb ? 'scene.glb' : 'download.zip');
    fs.writeFileSync(file, curl(pick.url));
    if (!info.glb) {
      execFileSync('unzip', ['-oq', file, '-d', dir]);
      fs.rmSync(file);
    }
    fs.writeFileSync(path.join(dir, 'source.json'), JSON.stringify(s, null, 1) + '\n');
    console.log(`ok    ${s.id}  ${s.name}`);
    ok++;
  } catch (e) {
    console.log(`FAIL  ${s.id}  ${String(e.message).split('\n')[0]}`);
  }
}
console.log(`${ok}/${list.length} sources in assets-incoming/`);
process.exitCode = ok === list.length ? 0 : 1;
