// Campaign audio replaces the shell's demo source, preserves preferences and renders a bounded ambient score.
import assert from 'node:assert/strict';
import {launch, open, startServer} from './browser.mjs';
const server = await startServer(8216),
  browser = await launch();
try {
  const p = await open(browser, server.url + '?p=menu/');
  const frame = () => p.frames().find(f => f.parentFrame() === p.mainFrame());
  await p.waitForFunction(() => !!window.parpSound);
  await p.mouse.click(20, 20);
  await p.evaluate(async () => {
    const s = window.parpSound;
    s.prefs.on = true;
    s.setTrack('duce');
    s.setVolume(0.25);
    s.save();
    await s.start(0.1);
  });
  await p.waitForFunction(() => window.parpSound.music.audio && !window.parpSound.music.audio.paused);
  await frame().goto(server.url + 'map/?campaign=music', {waitUntil: 'domcontentloaded'});
  await frame().waitForFunction(() => window.PARP_MAP?.ready, null, {timeout: 180000});
  await p.waitForFunction(() => window.parpSound.music.track === 'campaign' && window.parpSound.music.graph);
  const state = () =>
    p.evaluate(() => {
      const s = window.parpSound;
      return {
        track: s.music.track,
        saved: s.prefs.track,
        volume: s.prefs.volume,
        oldPaused: s.music.audio.paused,
        playing: s.music.playing,
      };
    });
  assert.deepEqual(await state(), {track: 'campaign', saved: 'duce', volume: 0.25, oldPaused: true, playing: true});
  assert.equal(await frame().locator('[data-track="duce"]').count(), 0, 'campaign offers its own score');
  await frame().evaluate(async () => {
    const {deploy} = await import('../shared/campaign/encounter.js');
    const m = window.PARP_MAP;
    m.setSpeed(0);
    deploy(m.travel.campaign, {id: 'music-raid', level: 'roadblock', seed: 7, fighters: ['player', 'mila'], kit: {}});
    m.travel.save();
  });
  await frame().goto(server.url + 'convoy/?campaign=music&encounter=music-raid', {waitUntil: 'domcontentloaded'});
  await frame().waitForFunction(() => window.PARP_SPRITES?.ready, null, {timeout: 180000});
  assert.equal((await state()).track, 'campaign');
  // Rapid transitions cannot resurrect a delayed recorded source.
  await p.evaluate(() => {
    const s = window.parpSound;
    s.scene('viewer');
    s.scene('campaign');
    s.scene('viewer');
    s.scene('campaign');
  });
  await p.waitForTimeout(650);
  assert.equal((await state()).oldPaused, true);
  await p.evaluate(() => {
    const s = window.parpSound;
    s.prefs.on = false;
    s.setVolume(0);
    s.stop();
    s.save();
  });
  await frame().goto(server.url + 'band/?campaign=music', {waitUntil: 'domcontentloaded'});
  await frame().waitForFunction(() => window.PARP_BAND?.ready, null, {timeout: 180000});
  assert.equal((await state()).playing, false, 'campaign navigation preserves mute');
  assert.equal((await state()).volume, 0);
  await frame().goto(server.url + 'menu/', {waitUntil: 'domcontentloaded'});
  await p.waitForFunction(() => window.parpSound.music.track === 'duce');
  assert.equal((await state()).playing, false, 'returning to demos does not unmute');
  const rendered = await p.evaluate(async () => {
    const {createGraph} = await import('./shared/music.js');
    const {CAMPAIGN_BAR, scheduleCampaignBar} = await import('./shared/campaign-score.js');
    const ctx = new OfflineAudioContext(2, 24000 * 24, 24000),
      graph = createGraph(ctx, ctx.destination);
    for (let i = 0; i < 4; i++) scheduleCampaignBar(graph, i, i * CAMPAIGN_BAR);
    const buffer = await ctx.startRendering();
    const data = buffer.getChannelData(0);
    let peak = 0,
      sum = 0;
    for (const n of data) {
      peak = Math.max(peak, Math.abs(n));
      sum += n * n;
    }
    return {peak, rms: Math.sqrt(sum / data.length), finite: data.every(Number.isFinite)};
  });
  assert.ok(rendered.finite && rendered.rms > 0.001 && rendered.peak < 0.95, JSON.stringify(rendered));
  console.log('PASS campaign shell/map/combat/band music, mute, volume, rapid transitions and offline score', rendered);
  await p.close();
} finally {
  await browser.close();
  server.stop();
}
