// The notice a campaign page shows when another tab has saved the same campaign (WP-W24): this tab's copy is out of
// date, so it stops writing (shared/campaign/store.js refuses) and asks the player to reload, which picks up the
// other tab's progress. Shown once, over everything, until the page reloads.
export const STALE_TEXT = 'This campaign changed in another tab. Reload to carry on from there; nothing more is saved from this tab.';

/** Show the notice (once). Does nothing outside a browser page. */
export function showStale() {
  if (typeof document === 'undefined' || document.getElementById('campaign-stale')) return;
  const box = Object.assign(document.createElement('div'), {id: 'campaign-stale', className: 'campaign-stale'});
  box.setAttribute('role', 'alertdialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-labelledby', 'campaign-stale-text');
  const text = Object.assign(document.createElement('p'), {id: 'campaign-stale-text', textContent: STALE_TEXT});
  const reload = Object.assign(document.createElement('button'), {type: 'button', textContent: 'Reload'});
  reload.onclick = () => location.reload();
  box.append(text, reload);
  // its own look, so it reads the same on every page whatever that page's stylesheet
  Object.assign(box.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '10000',
    display: 'grid',
    placeContent: 'center',
    justifyItems: 'center',
    gap: '1rem',
    padding: '1.5rem',
    background: 'rgba(12, 14, 10, 0.88)',
    color: '#f2ead3',
    font: '600 1.05rem/1.4 system-ui, sans-serif',
    textAlign: 'center',
  });
  Object.assign(text.style, {maxWidth: '32rem', margin: '0'});
  Object.assign(reload.style, {
    font: 'inherit',
    padding: '0.6rem 1.6rem',
    background: '#f2ead3',
    color: '#15170f',
    border: '0',
    borderRadius: '4px',
    cursor: 'pointer',
  });
  document.body.append(box);
  reload.focus();
}
