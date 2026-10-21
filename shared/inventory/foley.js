// Prominent inventory handling from the shared gun Foley bank; lazy audio, bounded voices and tactical SFX preferences.
import {audio} from '../sfx.js';
const base = new URL('../../assets/audio/foley/', import.meta.url);
const cues = {
  open: 'handle',
  close: 'hit',
  pickup: 'handle',
  drop: 'clunk',
  rotate: 'slide',
  reject: 'click',
  use: 'handle',
  eject: 'long',
  unload: 'ratchet',
};
let livePreferences = null;
let bank = null,
  loading = null,
  bus = null,
  lastAt = -Infinity;
const voices = new Set();
const stats = {played: 0, recorded: 0, fallback: 0, lastAction: null};
function preferences() {
  try {
    const p = livePreferences || JSON.parse(localStorage.getItem('parp-sfx') || '{}');
    return {on: p.on !== false, volume: Number.isFinite(p.volume) ? Math.max(0, Math.min(1, p.volume)) : 0.8};
  } catch {
    return {on: true, volume: 0.8};
  }
}
function output() {
  const a = audio();
  if (!bus) {
    bus = a.ctx.createGain();
    bus.connect(a.out);
  }
  const p = preferences();
  bus.gain.value = p.on ? p.volume * 1.6 : 0;
  return {...a, bus};
}
/** Warm on an actual user gesture, before a hold-to-search or asynchronous kit opening finishes. */
export function warmInventoryFoley() {
  if (!preferences().on) return;
  try {
    const {ctx} = output();
    loading ||= fetch(new URL('manifest.json', base))
      .then(r => {
        if (!r.ok) throw Error('Foley unavailable');
        return r.json();
      })
      .then(async manifest => {
        const entries = await Promise.all(
          Object.entries(manifest).map(async ([kind, files]) => {
            const buffers = await Promise.all(
              files.slice(0, 2).map(async file => {
                try {
                  const r = await fetch(new URL(`${kind}/${file}`, base));
                  if (!r.ok) return null;
                  return await ctx.decodeAudioData(await r.arrayBuffer());
                } catch {
                  return null;
                }
              }),
            );
            return [kind, buffers.filter(Boolean)];
          }),
        );
        bank = Object.fromEntries(entries);
      })
      .catch(() => {});
    return loading;
  } catch {
    /* Audio support must never block inventory use. */
  }
}
export function inventoryFoley(action, kind = '', {recordedOnly = false} = {}) {
  const p = preferences();
  if (!p.on || p.volume <= 0) return;
  try {
    warmInventoryFoley();
    const {ctx, bus, noise} = output();
    // No pointer-motion sounds; this limit also bounds keyboard repeat and rapid transfers.
    if (ctx.currentTime - lastAt < 0.045) return;
    lastAt = ctx.currentTime;
    const cue = action === 'drop' && kind === 'magazine' ? 'click' : action === 'drop' && kind === 'ammo' ? 'ratchet' : cues[action];
    if (!cue) return;
    const takes = bank?.[cue];
    const source = ctx.createBufferSource(),
      gain = ctx.createGain();
    const sample = takes?.length ? takes[Math.floor(Math.random() * takes.length)] : null;
    if (!sample && recordedOnly) return;
    source.buffer = sample || noise;
    source.playbackRate.value = kind === 'weapon' ? 0.88 : 1;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(action === 'reject' ? 0.3 : 1, t);
    if (!sample) gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    source.connect(gain).connect(bus);
    while (voices.size >= 4) {
      const first = voices.values().next().value;
      first.stop();
      voices.delete(first);
    }
    voices.add(source);
    source.onended = () => {
      voices.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    source.start();
    source.stop(t + Math.min(sample ? sample.duration / source.playbackRate.value : 0.14, 1.6));
    stats.played++;
    stats[sample ? 'recorded' : 'fallback']++;
    stats.lastAction = action;
  } catch {
    /* Silent failure preserves mouse/keyboard transfers and saves. */
  }
}
export const inventoryFoleyStatus = () => ({...stats, loaded: !!bank, active: voices.size, gain: bus?.gain.value || 0, ...preferences()});
if (typeof addEventListener === 'function') {
  // Repeated gestures only resume the context; buffers load once per page.
  for (const type of ['pointerdown', 'keydown']) addEventListener(type, warmInventoryFoley, {capture: true});
  addEventListener('storage', e => {
    if (e.key !== 'parp-sfx' && e.key !== null) return;
    livePreferences = null;
    if (bus) output();
  });
  addEventListener('parp-sfx-change', e => {
    livePreferences = e.detail || null;
    if (bus) output();
  });
}
