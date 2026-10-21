// Quiet recorded map ambience: countryside, moving-band footsteps, distant radio and brief command acknowledgements.
import {audio} from '../shared/sfx.js';
const FILES = {
  country: '../assets/audio/shooter/amb-countryside/amb-countryside-1.mp3',
  feet: '../assets/audio/shooter/footstep-gravel/footstep-gravel-1.mp3',
  radio: '../assets/audio/warehouse/radio-chatter/radio-chatter-1.mp3',
  walla: '../assets/audio/warehouse/voices/voices-1.mp3',
};
export function campaignAmbience() {
  let ctx,
    out,
    bus,
    loading,
    enabled = true,
    volume = 0.8,
    allowed = false,
    disposed = false;
  let radioAt = 20,
    ackAt = -Infinity;
  const buffers = {},
    loops = new Map(),
    voices = new Set();
  const stats = {feet: 0, radio: 0, walla: 0};
  const button = document.createElement('button');
  button.id = 'campaign-sfx';
  button.type = 'button';
  document.querySelector('.timebar').append(button);
  function preferences(detail) {
    try {
      const p = detail || JSON.parse(localStorage.getItem('parp-sfx') || '{}');
      enabled = p.on !== false;
      volume = Number.isFinite(p.volume) ? Math.max(0, Math.min(1, p.volume)) : 0.8;
    } catch {}
    button.textContent = enabled ? 'Ambience on' : 'Ambience off';
    button.setAttribute('aria-pressed', String(enabled));
    if (bus) bus.gain.value = enabled ? volume : 0;
    if (!enabled) stop();
  }
  function stop() {
    for (const s of voices) {
      try {
        s.stop();
      } catch {}
    }
    voices.clear();
    loops.clear();
  }
  async function warm() {
    if (disposed || !enabled) return;
    try {
      ({ctx, out} = audio());
      if (!bus) {
        bus = ctx.createGain();
        bus.gain.value = volume;
        bus.connect(out);
      }
      loading ||= Promise.all(
        Object.entries(FILES).map(async ([key, path]) => {
          try {
            const r = await fetch(new URL(path, import.meta.url));
            if (r.ok) buffers[key] = await ctx.decodeAudioData(await r.arrayBuffer());
          } catch {}
        }),
      );
      await loading;
    } catch {}
  }
  function play(key, level, loop = false, duration = 0, offset = 0) {
    if (!allowed || disposed || !enabled || volume <= 0 || !ctx || !buffers[key] || document.hidden || voices.size >= 5) return null;
    const s = ctx.createBufferSource(),
      g = ctx.createGain(),
      filter = ctx.createBiquadFilter();
    s.buffer = buffers[key];
    s.loop = loop;
    filter.type = 'lowpass';
    filter.frequency.value = key === 'radio' ? 1700 : key === 'walla' ? 1000 : 5500;
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(level, ctx.currentTime + 0.08);
    s.connect(filter).connect(g).connect(bus);
    voices.add(s);
    s.onended = () => {
      voices.delete(s);
      s.disconnect();
      filter.disconnect();
      g.disconnect();
    };
    s.start(0, offset % s.buffer.duration);
    if (duration) {
      g.gain.setTargetAtTime(0, ctx.currentTime + Math.max(0.1, duration - 0.2), 0.07);
      s.stop(ctx.currentTime + duration);
    }
    if (stats[key] !== undefined) stats[key]++;
    return s;
  }
  function loop(key, on, level) {
    if (on && !loops.has(key)) {
      const s = play(key, level, true);
      if (s) loops.set(key, s);
    } else if (!on && loops.has(key)) {
      loops.get(key).stop();
      loops.delete(key);
    }
  }
  function acknowledge() {
    if (!ctx || ctx.currentTime - ackAt < 2) return;
    if (play('walla', 0.22, false, 1.3, Math.random() * 20)) ackAt = ctx.currentTime;
  }
  const changed = e => preferences(e.detail);
  const storage = e => {
    if (e.key === 'parp-sfx' || e.key === null) preferences();
  };
  const hidden = () => {
    if (document.hidden) stop();
  };
  const click = e => {
    if (e.target.closest('button') && !e.target.closest('#campaign-sfx, .pbar')) acknowledge();
  };
  const leaving = e => {
    if (e.persisted) {
      allowed = false;
      stop();
    } else dispose();
  };
  function dispose() {
    disposed = true;
    stop();
    bus?.disconnect();
    removeEventListener('pointerdown', warm, true);
    removeEventListener('keydown', warm, true);
    removeEventListener('parp-sfx-change', changed);
    removeEventListener('storage', storage);
    removeEventListener('visibilitychange', hidden);
    removeEventListener('click', click);
    removeEventListener('pagehide', leaving);
  }
  button.onclick = () => {
    enabled = !enabled;
    const p = {on: enabled, volume};
    try {
      localStorage.setItem('parp-sfx', JSON.stringify(p));
    } catch {}
    dispatchEvent(new CustomEvent('parp-sfx-change', {detail: p}));
    if (enabled) warm();
  };
  preferences();
  addEventListener('pointerdown', warm, true);
  addEventListener('keydown', warm, true);
  addEventListener('parp-sfx-change', changed);
  addEventListener('storage', storage);
  addEventListener('visibilitychange', hidden);
  addEventListener('click', click);
  addEventListener('pagehide', leaving);
  return {
    acknowledge,
    update(dt, {moving = false, active = true} = {}) {
      allowed = active && !document.hidden && !disposed;
      if (!allowed || !enabled || volume <= 0) {
        stop();
        return;
      }
      loop('country', true, 0.1);
      loop('feet', moving, 0.22);
      radioAt -= dt;
      if (radioAt <= 0 && buffers.radio) {
        play('radio', 0.1, false, 4);
        radioAt = 24 + Math.random() * 16;
      }
    },
    get status() {
      return {...stats, loaded: Object.keys(buffers).length, loops: [...loops.keys()], active: voices.size, enabled, volume};
    },
  };
}
