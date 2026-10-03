// Accessible squad picker: timed slow-motion choices, projected buttons and keyboard/touch selection.
import {controlCandidates} from './squad-control.js';
import {WEAPONS} from './weapons.js';

export function createSquadPicker({root, getSim, project, reducedMotion, onOpen, onChange}) {
  const help = root.querySelector('[data-swap-help]');
  const choices = root.querySelector('[data-swap-choices]');
  const cancel = root.querySelector('[data-swap-cancel]');
  let wasOpen = false,
    observedSim = null,
    revision = 0,
    signature = '',
    hovered = null;
  const choose = id => {
    if (!getSim().swapTo(id)) return false;
    sync();
    return true;
  };
  cancel.onclick = () => {
    getSim().cancelSwap();
    sync();
  };

  function sync() {
    const sim = getSim();
    if (sim !== observedSim) {
      observedSim = sim;
      revision = sim.control.revision;
      wasOpen = false;
      signature = '';
      hovered = null;
      choices.replaceChildren();
    }
    const pending = sim.control.pending;
    if (sim.control.revision !== revision) {
      revision = sim.control.revision;
      onChange();
    }
    root.hidden = !pending;
    if (!pending) {
      if (wasOpen) {
        onOpen(false);
      }
      wasOpen = false;
      hovered = null;
      return;
    }
    const candidates = controlCandidates(sim);
    const sig = candidates.map(u => u.id).join('|');
    if (signature !== sig) {
      signature = sig;
      choices.replaceChildren(
        ...candidates.map(u => {
          const button = document.createElement('button');
          button.type = 'button';
          button.dataset.rebel = u.id;
          button.onclick = () => choose(u.id);
          button.onpointerenter = button.onfocus = () => {
            hovered = u.id;
          };
          button.onpointerleave = () => {
            hovered = null;
          };
          return button;
        }),
      );
    }
    help.textContent = `${pending.forced ? 'Rebel down. Take control' : 'Choose a rebel'} · 1–4 or click · ${Math.max(0, pending.remaining).toFixed(1)}s`;
    cancel.hidden = pending.forced;
    for (const [i, u] of candidates.entries()) {
      const b = choices.children[i];
      b.textContent = `${i + 1}. ${u.name} · ${Math.max(0, Math.ceil(u.hp))} HP · ${WEAPONS[u.weapon].label}`;
      const [x, y] = project(u.x, 2, u.z);
      b.style.left = `${Math.max(100, Math.min(root.clientWidth - 100, x))}px`;
      b.style.top = `${Math.max(80, Math.min(root.clientHeight - 95, y))}px`;
    }
    if (!wasOpen) {
      wasOpen = true;
      onOpen(true);
      choices.querySelector('button')?.focus({preventScroll: true});
    }
  }

  return {
    sync,
    get hovered() {
      return hovered;
    },
    get scale() {
      return getSim().control.pending ? (reducedMotion ? 0 : 0.15) : 1;
    },
    open() {
      const ok = getSim().requestSwap();
      sync();
      return ok;
    },
    update(seconds) {
      getSim().advanceSwap(seconds);
      sync();
    },
    key(event) {
      if (!getSim().control.pending) return false;
      const k = event.key.toLowerCase();
      if (/^[1-4]$/.test(k)) {
        event.preventDefault();
        const u = controlCandidates(getSim())[Number(k) - 1];
        if (u && !event.repeat) choose(u.id);
      } else if (k === 'escape' || k === 'q') {
        event.preventDefault();
        if (!event.repeat) {
          getSim().cancelSwap();
          sync();
        }
      } else if (!['tab', 'enter', ' '].includes(k)) event.preventDefault();
      // Native Tab and button activation still work, but nothing reaches weapon, fire or squad-order input.
      return true;
    },
  };
}
