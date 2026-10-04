// Fetch real recorded sounds for Partisan Tactical from Freesound: CC0 only, the most downloaded recordings for each
// category (heavy, grounded, outdoor). Downloads the high-quality previews, trims the silence, normalises, fades and
// encodes small mono MP3s into assets/audio/shooter/<category>/, and writes assets/audio/shooter/manifest.json
// (category -> files, with the Freesound id, title and author of each).
//   node tools/audio/fetch-shooter-sounds.mjs [--per 3] [--only cat1,cat2]
// Needs ffmpeg. Raw downloads are cached in .cache/freesound/ (git-ignored).
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const OUT = 'assets/audio/shooter',
  CACHE = '.cache/freesound';
const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const PER = Number(arg('--per', 3)),
  ONLY = arg('--only', '')?.split(',').filter(Boolean);

// category: queries tried in order, duration window (s) of the source, how long the clip may be, mono/stereo, and words
// in the title that rule a result out (synths, games, compilations, music)
const SKIP =
  /synth|8.?bit|retro|game ?sound|cartoon|laser|toy|music|beat|loop pack|compilation|pack|bgm|chiptune|nerf|airsoft|cap gun|paintball|voice|mouth|vocal/i;
// Hand-picked (ids) after listening to the search results' titles and authors: real recordings, mostly range and
// field recordings and public-domain military footage (qubodup); the queries are only a fallback for empty categories.
export const CATEGORIES = {
  'shot-rifle': {ids: [855842, 855843, 855841, 855655], q: ['kalashnikov'], dur: [0.3, 6], clip: 1.4},
  'shot-sniper': {ids: [433858, 484036, 411567, 563015], q: ['sniper'], dur: [0.3, 6], clip: 2},
  'rpg-launch': {ids: [840511, 854511, 854476], q: ['rocket launch'], dur: [0.5, 10], clip: 2.6},
  'gl-thump': {ids: [162402, 187542, 184382], q: ['grenade launcher'], dur: [0.2, 6], clip: 1.2},
  'explosion-big': {ids: [182429, 442958, 182431, 855247], q: ['explosion'], dur: [1, 15], clip: 5},
  'explosion-grenade': {ids: [609587, 563010, 189778, 182797], q: ['grenade explosion'], dur: [0.5, 10], clip: 3.5},
  'car-explode': {ids: [523365, 132929, 244394], q: ['vehicle explosion'], dur: [1, 15], clip: 6},
  'impact-dirt': {ids: [789388, 319229], q: ['bullet impact'], dur: [0.05, 2], clip: 0.7},
  'impact-metal': {ids: [812592, 136826], q: ['metal hit'], dur: [0.05, 3], clip: 0.8},
  ricochet: {ids: [30932, 392975, 345413], q: ['ricochet'], dur: [0.1, 3], clip: 1.2},
  flyby: {ids: [855248, 386854, 505238], q: ['flyby'], dur: [0.05, 3], clip: 0.9},
  shells: {ids: [370805, 371199], q: ['bullet shells'], dur: [0.1, 4], clip: 1.4},
  reload: {ids: [674742, 815879, 432141], q: ['rifle reload'], dur: [0.5, 15], clip: 3},
  throw: {ids: [346373, 515625], q: ['throw'], dur: [0.1, 2], clip: 0.7},
  'footstep-gravel': {ids: [530589, 395562, 361072], q: ['footsteps gravel'], dur: [2, 60], clip: 6, loop: true},
  'breath-sprint': {ids: [163383, 321669], q: ['heavy breathing'], dur: [1, 30], clip: 6, loop: true},
  'engine-truck': {ids: [187564, 182793, 128160], q: ['truck idle'], dur: [3, 120], clip: 12, loop: true},
  'fire-burning': {ids: [563765, 563766], q: ['fire crackle'], dur: [3, 120], clip: 10, loop: true},
  'amb-countryside': {ids: [458113, 351609, 165526], q: ['countryside'], dur: [20, 600], clip: 40, loop: true, stereo: true},
  'amb-forest-night': {ids: [333221, 175020, 522299], q: ['night field crickets'], dur: [20, 600], clip: 40, loop: true, stereo: true},
  'amb-distant-battle': {ids: [326442, 150305, 350368, 840492], q: ['warzone'], dur: [8, 600], clip: 40, loop: true, stereo: true},
};

const UA = {'User-Agent': 'Mozilla/5.0 (partisan-project sound fetch)'};
// a download that stops answering must not hang the whole run
const get = url => fetch(url, {headers: UA, redirect: 'follow', signal: AbortSignal.timeout(60000)});
async function search(q, [lo, hi]) {
  const f = `license:"Creative Commons 0" duration:[${lo} TO ${hi}]`;
  const url = `https://freesound.org/search/?q=${encodeURIComponent(q)}&f=${encodeURIComponent(f)}&s=${encodeURIComponent('Downloads (most first)')}`;
  const html = await (await get(url)).text();
  const out = [];
  const re = /<a[^>]*href="\/people\/([^/]+)\/sounds\/(\d+)\/"[^>]*title="([^"]*)"/g;
  const mp3 = new Map(
    [...html.matchAll(/previews\/(\d+)\/(\d+)_(\d+)-lq\.mp3/g)].map(m => [
      m[2],
      `https://cdn.freesound.org/previews/${m[1]}/${m[2]}_${m[3]}-hq.mp3`,
    ]),
  );
  for (const m of html.matchAll(re)) {
    const [, user, id, title] = m;
    if (out.some(o => o.id === id) || !mp3.has(id)) continue;
    out.push({
      id,
      user: decodeURIComponent(user),
      title: title
        .replace(/&amp;/g, '&')
        .replace(/&#x27;|&#39;/g, "'")
        .replace(/ by [^ ]+$/, ''),
      url: mp3.get(id),
    });
  }
  return out;
}
/** A sound's page: its title, author and preview URL. */
async function byId(id) {
  const html = await (await get(`https://freesound.org/s/${id}/`)).text();
  const m = html.match(/previews\/(\d+)\/(\d+)_(\d+)-(?:lq|hq)\.mp3/);
  if (!m) return null;
  const title = ((html.match(/<meta property="og:title" content="([^"]*)"/) || [])[1] || String(id)).replace(/ by [^ ]+$/, '');
  const user = (html.match(/\/people\/([^/"]+)\//) || [])[1] || '';
  return {
    id: String(id),
    user: decodeURIComponent(user),
    title: title.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'"),
    url: `https://cdn.freesound.org/previews/${m[1]}/${m[2]}_${m[3]}-hq.mp3`,
  };
}
const ff = args => execFileSync('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', ...args], {timeout: 60000});
const probe = file => {
  try {
    return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());
  } catch {
    return 0; // a broken output is dropped
  }
};

async function fetchCategory(cat, spec) {
  const seen = new Set(),
    picks = [];
  const max = spec.ids?.length || PER;
  const batches = [
    async () => (await Promise.all((spec.ids || []).map(id => byId(id).catch(() => null)))).filter(Boolean),
    ...spec.q.map(q => () => search(q, spec.dur)),
  ];
  for (const batch of batches) {
    if (picks.length >= max) break;
    let results = [];
    try {
      results = await batch();
    } catch (e) {
      console.warn(`  ${cat}: lookup failed: ${e.message}`);
    }
    const picked = spec.ids?.length && batch === batches[0];
    for (const r of results) {
      if (picks.length >= max) break;
      if (seen.has(r.id) || (!picked && SKIP.test(r.title))) continue;
      seen.add(r.id);
      const raw = path.join(CACHE, `${r.id}.mp3`);
      if (!fs.existsSync(raw)) {
        try {
          const res = await get(r.url);
          if (!res.ok) continue;
          fs.writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
        } catch (e) {
          console.warn(`  ${cat}: download failed for ${r.id}: ${e.message}`);
          continue;
        }
      }
      const file = `${cat}-${picks.length + 1}.mp3`,
        dest = path.join(OUT, cat, file);
      fs.mkdirSync(path.dirname(dest), {recursive: true});
      // trim the leading silence, cut to length, fade the tail, normalise loudness, small mono MP3 (stereo for beds)
      // two passes (silenceremove followed by loudnorm in one chain can stall ffmpeg): trim and fade to a WAV, then
      // normalise loudness and encode
      const cut = [
        'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.01',
        `atrim=0:${spec.clip}`,
        `afade=t=out:st=${Math.max(0, spec.clip - (spec.loop ? 1.5 : 0.25))}:d=${spec.loop ? 1.5 : 0.25}`,
      ].join(',');
      const tmp = path.join(CACHE, `${r.id}-cut.wav`);
      try {
        ff(['-t', String(spec.clip + 20), '-i', raw, '-af', cut, '-ar', '44100', tmp]);
        ff([
          '-i',
          tmp,
          '-af',
          spec.loop ? 'loudnorm=I=-24:TP=-3' : 'loudnorm=I=-14:TP=-1',
          '-ar',
          '44100',
          '-ac',
          spec.stereo ? '2' : '1',
          '-b:a',
          spec.stereo ? '128k' : '96k',
          dest,
        ]);
      } catch (e) {
        console.warn(`  ${cat}: could not process ${r.id}: ${e.message.split('\n')[0]}`);
        continue;
      }
      const d = probe(dest);
      if (!(d > 0.05)) {
        fs.rmSync(dest);
        continue;
      }
      picks.push({
        file: `${cat}/${file}`,
        id: Number(r.id),
        title: r.title,
        author: r.user,
        seconds: +d.toFixed(2),
        source: `https://freesound.org/s/${r.id}/`,
      });
      console.log(`  ${cat}: ${r.id} "${r.title}" by ${r.user} (${d.toFixed(1)} s)`);
    }
  }
  return picks;
}

fs.mkdirSync(CACHE, {recursive: true});
const manifestPath = path.join(OUT, 'manifest.json');
const manifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  : {source: 'Freesound, CC0 only', categories: {}};
for (const [cat, spec] of Object.entries(CATEGORIES)) {
  if (ONLY?.length && !ONLY.includes(cat)) continue;
  if (fs.existsSync(path.join(OUT, cat))) fs.rmSync(path.join(OUT, cat), {recursive: true});
  manifest.categories[cat] = {loop: !!spec.loop, files: await fetchCategory(cat, spec)};
  if (!manifest.categories[cat].files.length) console.warn(`  ${cat}: nothing found`);
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n');
const n = Object.values(manifest.categories).reduce((s, c) => s + c.files.length, 0);
console.log(`${n} sounds in ${Object.keys(manifest.categories).length} categories -> ${manifestPath}`);
