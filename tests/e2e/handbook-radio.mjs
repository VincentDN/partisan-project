// Verify handbook radio state and shared-player handoff with a predictable YouTube API.
import assert from 'node:assert/strict';
import {launch, startServer} from './browser.mjs';

const server = await startServer(8188),
  browser = await launch();
try {
  const page = await browser.newPage();
  await page.route(/youtube-nocookie\.com\/embed\//, route => route.fulfill({contentType: 'text/html', body: ''}));
  await page.route('https://www.youtube.com/iframe_api', route =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `
        window.YT = {Player: class {
          constructor(frame, {events}) {
            window.video = this;
            this.events = events;
            this.attempts = 0;
          }
          playVideo() {
            if (++this.attempts === 1) this.events.onAutoplayBlocked();
            else this.events.onStateChange({data: 1});
          }
          pauseVideo() {
            this.paused = true;
            this.events.onStateChange({data: 2});
          }
          setVolume(value) { this.volume = value; }
        }};
        window.onYouTubeIframeAPIReady();
      `,
    }),
  );
  await page.goto(server.url + '?p=docs/game-design-master-doc.html');
  const handbook = page.frames().find(frame => frame.parentFrame() === page.mainFrame());
  await handbook.waitForFunction(() => window.video);
  // A gesture before the remote API is ready must not consume the only retry opportunity.
  await handbook.locator('h1').click();
  await handbook.evaluate(() => window.video.events.onReady({target: window.video}));
  assert.equal(await handbook.evaluate(() => window.video.attempts), 1);
  assert.match(await handbook.locator('#saraiman + [role=status]').textContent(), /music menu/);
  await handbook.locator('#music-menu').click();
  assert.equal(await handbook.evaluate(() => window.video.attempts), 2);
  assert.equal(await handbook.locator('#saraiman + [role=status]').textContent(), '');
  assert.equal(await page.evaluate(() => window.parpSound.music.playing), false);
  await handbook.locator('#music-volume').fill('22');
  assert.equal(await handbook.evaluate(() => window.video.volume), 22);

  await handbook.locator('[data-track="duce"]').click();
  assert.equal(await handbook.evaluate(() => window.video.paused), true);
  assert.equal(await page.evaluate(() => window.parpSound.music.track), 'duce');
  await handbook.locator('[data-track="saraiman"]').click();
  assert.equal(await page.evaluate(() => window.parpSound.music.playing), false);
  await handbook.locator('#music-toggle').click();
  assert.equal(await page.evaluate(() => window.parpSound.prefs.on), false);

  await handbook.goto(server.url + 'menu/');
  assert.equal(await page.evaluate(() => window.parpSound.music.playing), false);
  assert.equal(await page.evaluate(() => window.parpSound.prefs.volume), 0.22);
  await handbook.goto(server.url + 'docs/game-design-master-doc.html');
  await handbook.waitForFunction(() => window.video);
  await handbook.evaluate(() => window.video.events.onReady({target: window.video}));
  assert.equal(await handbook.evaluate(() => window.video.attempts), 0);
  console.log('Handbook radio readiness, autoplay recovery, station switching and saved preferences passed.');
} finally {
  await browser.close();
  server.stop();
}
