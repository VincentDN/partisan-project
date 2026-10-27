// Campaign audio replaces the shell's demo source, preserves preferences and plays the local acoustic recording.
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
  await p.waitForFunction(() => window.parpSound.music.track === 'campaign' && window.parpSound.music.audio?.currentTime > 0);
  const state = () =>
    p.evaluate(() => {
      const s = window.parpSound;
      return {
        track: s.music.track,
        saved: s.prefs.track,
        volume: s.prefs.volume,
        paused: s.music.audio.paused,
        playing: s.music.playing,
      };
    });
  assert.deepEqual(await state(), {track: 'campaign', saved: 'duce', volume: 0.25, paused: false, playing: true});
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
  await p.waitForFunction(() => !window.parpSound.music.audio.paused);
  assert.equal((await state()).paused, false);
  assert.match(await p.evaluate(() => window.parpSound.music.audio.currentSrc), /campaign-acoustic-guitars\.mp3$/);
  assert.equal(await p.evaluate(() => window.parpSound.music.graph), null, 'campaign uses no synth graph');
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
  const decoded = await p.evaluate(async () => {
    const {TRACKS} = await import('./shared/music.js');
    const ctx = new AudioContext();
    try {
      const bytes = await fetch(TRACKS.find(t => t.id === 'campaign').src).then(r => r.arrayBuffer());
      const buffer = await ctx.decodeAudioData(bytes);
      const data = buffer.getChannelData(0);
      let peak = 0,
        sum = 0;
      for (const n of data) {
        peak = Math.max(peak, Math.abs(n));
        sum += n * n;
      }
      return {duration: buffer.duration, peak, rms: Math.sqrt(sum / data.length), finite: data.every(Number.isFinite)};
    } finally {
      await ctx.close();
    }
  });
  assert.ok(decoded.duration > 88 && decoded.duration < 90, JSON.stringify(decoded));
  assert.ok(decoded.finite && decoded.rms > 0.01 && decoded.peak < 0.6, JSON.stringify(decoded));
  // A standalone campaign page must also use the recording, and its actual media loop must wrap.
  const solo = await browser.newPage();
  try {
    await solo.goto(server.url + 'band/?campaign=music');
    await solo.waitForFunction(() => window.PARP_BAND?.ready);
    await solo.keyboard.press('Shift');
    await solo.evaluate(async () => {
      const s = window.parpSound;
      s.prefs.on = true;
      await s.start(0.1);
    });
    await solo.waitForFunction(() => window.parpSound.music.audio?.currentTime > 0);
    assert.match(await solo.evaluate(() => window.parpSound.music.audio.currentSrc), /campaign-acoustic-guitars\.mp3$/);
    await solo.evaluate(() => {
      const a = window.parpSound.music.audio;
      a.currentTime = a.duration - 0.2;
    });
    await solo.waitForFunction(() => window.parpSound.music.audio.currentTime < 2 && !window.parpSound.music.audio.paused);
    await solo.evaluate(() => window.parpSound.stop());
    await solo.waitForFunction(() => window.parpSound.music.audio.paused);
  } finally {
    await solo.close();
  }
  console.log('PASS campaign recording, shell/map/combat/band, mute, volume, rapid transitions, standalone and loop', decoded);
  await p.close();
} finally {
  await browser.close();
  server.stop();
}
