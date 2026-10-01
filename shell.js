// The shell: creates the shared sound layer, shows pages in the frame and keeps the address bar in step with them
// (?p=<page path>#<page hash>), so reloads and copied links come back to the same screen and build.
import {soundLayer} from './shared/sound-layer.js';

soundLayer(); // created here, before the frame's pages ask for it
const view = /** @type {HTMLIFrameElement} */ (document.querySelector('#view'));
const base = new URL('./', location.href);
const DEFAULT = 'intro/';

/** A page path inside this site, or null. Rejects other origins, scripts and anything that climbs out of the site. */
export function safePath(p) {
  if (!p) return null;
  try {
    const u = new URL(p, base);
    return u.origin === base.origin && u.pathname.startsWith(base.pathname) ? u : null;
  } catch {
    return null;
  }
}

const wanted = safePath(new URLSearchParams(location.search).get('p')) || new URL(DEFAULT, base);
view.src = wanted.pathname + wanted.search + location.hash;

function sync() {
  let inner;
  try {
    inner = view.contentWindow.location;
  } catch {
    return;
  }
  if (!inner.href || inner.href === 'about:blank') return;
  const rel = inner.pathname.slice(base.pathname.length);
  const want = base.pathname + (rel && rel !== DEFAULT ? '?p=' + rel + encodeURIComponent(inner.search) : '') + inner.hash;
  if (location.pathname + location.search + location.hash !== want) history.replaceState(null, '', want);
  const title = view.contentDocument?.title;
  if (title && document.title !== title) document.title = title;
}
view.addEventListener('load', () => {
  sync();
  view.focus();
});
setInterval(sync, 1000); // pages rewrite their hash as the build changes
