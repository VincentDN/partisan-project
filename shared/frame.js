// Keeps the music playing across pages: every Partisan Project page lives inside the shell (index.html), which owns the sound
// layer. A page opened on its own is sent into the shell at the same address, so deep links keep working and the
// music never restarts on navigation. Automated browsers (tests) and `?standalone` skip the redirect.
//
//   import '../shared/frame.js';   // first import of each page's module script
const standalone = new URLSearchParams(location.search).has('standalone') || navigator.webdriver;
if (window.parent === window && !standalone) {
  // This module lives in <root>/shared/; the shell is <root>/index.html.
  const root = new URL('../', import.meta.url);
  const here = location.pathname.slice(root.pathname.length);
  const target = new URL(root);
  target.searchParams.set('p', here + location.search);
  target.hash = location.hash;
  location.replace(target);
}
// External links leave the frame; everything else stays inside it so the music keeps playing.
addEventListener('click', e => {
  const a = /** @type {any} */ (e.target)?.closest?.('a[href]');
  if (a && /^https?:/.test(a.getAttribute('href')) && new URL(a.href).origin !== location.origin) a.target = '_top';
});
