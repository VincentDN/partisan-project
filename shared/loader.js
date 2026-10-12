// The one loader (shared/loader.css): what a page does with it while it loads. Pages write the markup in their HTML
// (it shows before any script) and call these with the loader, or the cover round it.
const card = el => (el?.classList.contains('nk-loader') ? el : el?.querySelector('.nk-loader'));

/** Change the message (without dots; the loader adds them). */
export function setLoader(el, text) {
  const c = card(el);
  if (!c) return;
  delete c.dataset.state;
  c.querySelector('.nk-text').textContent = text;
  el.hidden = false;
}

/** Show how far along it is, 0..1 (a battery bar under the message); null hides the bar. */
export function loaderProgress(el, p) {
  const c = card(el);
  if (!c) return;
  let bar = c.querySelector('.nk-bar');
  if (!bar) {
    bar = document.createElement('span');
    bar.className = 'nk-bar';
    bar.setAttribute('aria-hidden', 'true');
    bar.append(document.createElement('i'));
    c.append(bar);
  }
  bar.hidden = p == null;
  bar.firstChild.style.setProperty('--p', String(Math.max(0, Math.min(1, p ?? 0))));
}

/** Loading failed: the spinner stops and the message says what to do. */
export function loaderError(el, text) {
  const c = card(el);
  if (!c) return;
  c.dataset.state = 'error';
  c.setAttribute('role', 'alert');
  c.querySelector('.nk-text').textContent = text;
  el.hidden = false;
}

/** Loaded. */
export function hideLoader(el) {
  if (el) el.hidden = true;
}
