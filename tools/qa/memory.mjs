// Memory hunt (WP-QA10): repeat what a long session repeats, and see whether anything is kept that should not be.
//   CHROMIUM=… node tools/qa/memory.mjs [--quick]
// Each cycle runs a warm-up, then a few rounds, and reports the JavaScript heap (after forced garbage collection),
// the window and document listeners added but not removed, and the page's DOM node count, after each round. A leak
// grows round on round; noise does not. Cycles:
//   restarts   the mission restarted 125 times (new Sim, renderer snap, search attach, banter), a frame each
//   search     the mission's search opened and closed 100 times
//   kit        the map's kit screen opened and closed 100 times over the band panel
//   trips      map -> mission -> map trips while there is something to attack (10 at most): the save's size, the
//              map's heap and its three.js geometries and textures after each return
// It exits 1 when a cycle grows by more than its allowance; the numbers go in docs/quality-roadmap.md (QA10).
import {launch, open, startServer, frames} from '../../tests/e2e/browser.mjs';

const quick = process.argv.includes('--quick');
const MB = 1024 * 1024;

/** Count listeners added to and removed from window and document (installed before the page's own scripts). */
function probe() {
  const n = (window.__listeners = {add: 0, remove: 0});
  for (const t of [window, document]) {
    const add = t.addEventListener.bind(t),
      remove = t.removeEventListener.bind(t);
    t.addEventListener = (...a) => (n.add++, add(...a));
    t.removeEventListener = (...a) => (n.remove++, remove(...a));
  }
}

async function measure(page) {
  const cdp = (page.cdp ||= await page.context().newCDPSession(page));
  for (let i = 0; i < 3; i++) await cdp.send('HeapProfiler.collectGarbage');
  const {usedSize} = await cdp.send('Runtime.getHeapUsage');
  const dom = await cdp.send('Memory.getDOMCounters').catch(() => ({nodes: NaN, jsEventListeners: NaN}));
  const l = await page.evaluate(() => window.__listeners);
  return {heap: usedSize / MB, listeners: l.add - l.remove, nodes: dom.nodes, jsListeners: dom.jsEventListeners};
}

async function probed(browser, url, ready) {
  const page = await open(browser, url);
  await page.addInitScript(probe);
  await page.reload();
  await page.waitForFunction(ready, null, {timeout: 180000});
  return page;
}

const results = [];
/** Run `step` `per` times a round for `rounds` rounds after one warm-up round; growth is last round minus first. */
async function cycle(name, page, step, per, rounds, allow) {
  await step(per); // warm-up: caches, lazy modules, first allocations
  const rows = [await measure(page)];
  for (let r = 0; r < rounds; r++) {
    await step(per);
    rows.push(await measure(page));
  }
  const growth = k => rows.at(-1)[k] - rows[0][k];
  const out = {
    name,
    per,
    rounds,
    heap: rows.map(r => r.heap.toFixed(1)),
    listeners: rows.map(r => r.listeners),
    nodes: rows.map(r => r.nodes),
    grew: {heap: +growth('heap').toFixed(2), listeners: growth('listeners'), nodes: growth('nodes')},
  };
  out.ok = out.grew.heap <= allow.heap && out.grew.listeners <= 0 && out.grew.nodes <= allow.nodes;
  results.push(out);
  console.log(
    `${out.ok ? 'ok  ' : 'GROW'} ${name}: heap ${out.heap.join(' → ')} MB · listeners ${out.listeners.join(' → ')} · nodes ${out.nodes.join(' → ')}`,
  );
}

const server = await startServer(8191),
  browser = await launch();
try {
  // ---------- the mission ----------
  const m = await probed(browser, server.url + 'convoy/?seed=7', () => window.PARP_SPRITES?.ready);
  await cycle(
    'restarts',
    m,
    async n => {
      for (let i = 0; i < n; i++) {
        await m.evaluate(() => {
          window.PARP_SPRITES.newGame();
          window.PARP_SPRITES.start();
        });
        await frames(m, 1);
      }
    },
    quick ? 5 : 25,
    quick ? 2 : 4,
    // the renderer kept every mission's soldiers (sightFade) at 5 KB a restart: 0.5 MB over these 100; now ~0.13
    {heap: quick ? 1 : 0.3, nodes: 200},
  );
  await m.evaluate(() => {
    window.PARP_SPRITES.newGame();
    window.PARP_SPRITES.start();
    const {sim} = window.PARP_SPRITES,
      p = sim.player,
      u = sim.units.find(o => o.side === 'army');
    Object.assign(u, {state: 'idle', alive: false, x: p.x + 1, z: p.z});
  });
  await cycle(
    'search',
    m,
    async n => {
      await m.evaluate(n => {
        const {search, sim} = window.PARP_SPRITES;
        for (let i = 0; i < n; i++) {
          search.show(search.ammo.near(sim.player.x, sim.player.z));
          search.close();
        }
      }, n);
      await frames(m, 2);
    },
    quick ? 10 : 25,
    quick ? 2 : 4,
    {heap: 1, nodes: 200},
  );
  await m.close();

  // ---------- the campaign map ----------
  const w = await open(browser, server.url + 'map/?campaign=memory');
  await w.evaluate(() => ['parp-campaign-v1', 'parp-squad-v1', 'parp-band-v2'].forEach(k => localStorage.removeItem(k)));
  await w.close();
  const map = await probed(browser, server.url + 'map/?campaign=memory', () => window.PARP_MAP?.ready);
  await map.evaluate(() => window.PARP_MAP.setSpeed(0));
  await map.evaluate(() => window.PARP_MAP.campaign.toggleBand(true));
  await cycle(
    'kit',
    map,
    async n => {
      for (let i = 0; i < n; i++) {
        await map
          .locator('.kit-open')
          .nth(i % 2)
          .click();
        // a boolean, not an element: a returned handle would keep the old screen alive and look like a leak
        await map.waitForFunction(() => !!document.querySelector('.kit-screen:not([hidden]) .inv-item'));
        await map.keyboard.press('Escape');
      }
    },
    quick ? 10 : 25,
    quick ? 2 : 4,
    {heap: 1, nodes: 200},
  );
  await map.close();

  // ---------- map -> mission -> map ----------
  const page = await probed(browser, server.url + 'map/?campaign=memory', () => window.PARP_MAP?.ready);
  const trips = [];
  for (let t = 0; t < (quick ? 3 : 10); t++) {
    const src = await page.evaluate(() => {
      window.PARP_MAP.setSpeed(0);
      const c = window.PARP_MAP.campaign;
      const id = c.sources()[0];
      const p = id && window.PARP_MAP.parties.parties.find(q => q.id === id);
      const contact = p && c.contactAt({x: p.root.position.x, z: p.root.position.z});
      if (contact) c.showEncounter(contact);
      return id && !document.querySelector('#enc-attack')?.disabled ? id : null;
    });
    if (!src) break;
    await Promise.all([page.waitForURL(/convoy\//), page.locator('#enc-attack').click()]);
    await page.waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 60000});
    await page.locator('#start').click();
    await page.evaluate(() => (window.PARP_SPRITES.sim.outcome = 'won'));
    await page.waitForFunction(() => !document.querySelector('#card').hidden, null, {timeout: 10000});
    await Promise.all([page.waitForURL(/map\//), page.locator('#start').click()]);
    await page.waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 180000});
    const save = await page.evaluate(() => (localStorage.getItem('parp-campaign-v1') || '').length);
    const gpu = await page.evaluate(() => ({...window.PARP_MAP.renderer.info.memory}));
    trips.push({src, save, gpu, ...(await measure(page))});
  }
  const grewKB = trips.length > 1 ? (trips.at(-1).save - trips[0].save) / 1024 : 0;
  const perTrip = trips.length > 1 ? grewKB / (trips.length - 1) : 0;
  const tripsOk = trips.length >= 2 && perTrip < 8; // a settled encounter, a log entry, kits: a few KB, not more
  results.push({name: 'trips', trips, perTripKB: +perTrip.toFixed(2), ok: tripsOk});
  console.log(
    `${tripsOk ? 'ok  ' : 'GROW'} trips (${trips.length}): save ${trips.map(t => (t.save / 1024).toFixed(1)).join(' → ')} KB · map heap ${trips
      .map(t => t.heap.toFixed(1))
      .join(
        ' → ',
      )} MB · three.js ${trips.map(t => `${t.gpu.geometries}/${t.gpu.textures}`).join(' → ')} geometries/textures · ${perTrip.toFixed(2)} KB a trip`,
  );
  await page.close();
} finally {
  await browser.close();
  server.stop();
}
if (process.argv.includes('--json')) console.log(JSON.stringify(results, null, 1));
if (results.some(r => !r.ok)) process.exitCode = 1;
