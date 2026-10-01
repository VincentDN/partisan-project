// Guided first run: a short, dismissible tour that steps through a demo's key controls.
// Reuses the page's #first-run callout. Remembered per browser under `key`; Esc or Skip ends it.
import {reduceMotion} from './stage.js';

/** @typedef {{target: string, text: string}} TourStep */

/**
 * @param {TourStep[]} steps  target is a CSS selector of the control to point at
 * @param {{key: string, force?: boolean}} opts
 * @returns {boolean} whether the tour started
 */
export function startTour(steps, {key, force = false}) {
  const box = document.querySelector('#first-run');
  if (!box || !steps.length) return false;
  try {
    if (!force && localStorage.getItem(key)) return false;
  } catch {}
  let i = 0,
    lit = null;
  const body = document.createElement('p'),
    count = document.createElement('small'),
    next = document.createElement('button'),
    skip = document.createElement('button'),
    row = document.createElement('div');
  body.style.margin = '0 0 8px';
  row.style.cssText = 'display:flex;gap:8px;align-items:center';
  next.type = skip.type = 'button';
  skip.textContent = 'Skip tour';
  skip.className = 'tour-skip';
  row.append(next, skip, count);
  box.replaceChildren(body, row);
  box.hidden = false;

  const clear = () => lit?.classList.remove('tour-lit');
  const end = () => {
    clear();
    box.hidden = true;
    removeEventListener('keydown', onKey);
    try {
      localStorage.setItem(key, '1');
    } catch {}
  };
  function show() {
    clear();
    const step = steps[i];
    body.textContent = step.text;
    count.textContent = `${i + 1} / ${steps.length}`;
    next.textContent = i === steps.length - 1 ? 'Done' : 'Next';
    lit = document.querySelector(step.target);
    if (lit) {
      lit.classList.add('tour-lit');
      lit.scrollIntoView({block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth'});
    }
  }
  const onKey = e => {
    if (e.key === 'Escape') end();
  };
  next.onclick = () => (++i < steps.length ? show() : end());
  skip.onclick = end;
  addEventListener('keydown', onKey);
  show();
  next.focus({preventScroll: true});
  return true;
}
