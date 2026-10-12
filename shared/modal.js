// Stacked dialogs (WP-QA8): the encounter, band, kit and search panels are modal dialogs that can sit on top of each
// other and of a page that listens to the keyboard (map panning, the clock, the fight). The rules they share:
// the page ignores its keys while a dialog is open (so Space presses the dialog's focused button), Tab stays in the
// top dialog, and closing a dialog puts focus back where it was when the dialog opened.

const MODAL = '[aria-modal="true"]:not([hidden])';
const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])';

/** The dialog on top (the last open one in the document), or null. */
function topModal() {
  const open = document.querySelectorAll(MODAL);
  return open.length ? open[open.length - 1] : null;
}

/** Is any dialog open? Page-level keys (pan, clock, hotkeys) should wait. */
export const modalOpen = () => !!document.querySelector(MODAL);

/** Call when a dialog opens: returns a function that puts focus back on what had it, if it is still there. */
export function rememberFocus(fallback = null) {
  const was = document.activeElement;
  return () => {
    const to = was && was !== document.body && was.isConnected && !was.closest('[hidden]') ? was : fallback?.();
    to?.focus?.();
  };
}

let trapped = false;
/** Tab and Shift+Tab cycle inside the top dialog instead of wandering to the page behind it (installed once). */
export function trapTab() {
  if (trapped) return;
  trapped = true;
  addEventListener(
    'keydown',
    e => {
      if (e.key !== 'Tab') return;
      const top = topModal();
      if (!top) return;
      const all = [...top.querySelectorAll(FOCUSABLE)].filter(x => !x.closest('[hidden]'));
      if (!all.length) return;
      const i = all.indexOf(document.activeElement);
      // outside the dialog, or at either end: wrap round
      if (i < 0 || (e.shiftKey && i === 0) || (!e.shiftKey && i === all.length - 1)) {
        e.preventDefault();
        all[e.shiftKey ? all.length - 1 : 0].focus();
      }
    },
    true,
  );
}
