// The handbook gets its own opening station while sharing the site's radio controls and preferences.
import {soundLayer} from './sound-layer.js';

const station = 'saraiman';

export function handbookRadio(frame) {
  const base = soundLayer();
  let selected = station;
  let player;
  let ready = false;
  let playing = false;
  let unavailable = false;
  let active = true;
  let tuneOnPlay = true;
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  frame.after(status);

  function wantsVideo() {
    return active && selected === station && base.prefs.on;
  }

  function playVideo() {
    if (!wantsVideo() || !ready || unavailable || playing) return;
    player.setVolume(Math.round(base.prefs.volume * 100));
    player.playVideo();
  }

  function pauseVideo() {
    playing = false;
    if (ready) player.pauseVideo();
  }

  function fail() {
    unavailable = true;
    playing = false;
    status.textContent = 'Saraiman is unavailable in this player. ';
  }

  const squelch = new Audio(new URL('../assets/audio/warehouse/radio-squelch/radio-squelch-1.mp3', import.meta.url));
  squelch.preload = 'none';
  function tune() {
    squelch.volume = base.prefs.volume;
    squelch.currentTime = 0;
    squelch.play().catch(() => {});
  }

  function connect() {
    if (player) return;
    player = new window.YT.Player(frame, {
      events: {
        onReady({target}) {
          player = target;
          ready = true;
          if (wantsVideo()) playVideo();
          else pauseVideo();
        },
        onStateChange({data}) {
          playing = data === 1;
          if (!playing) return;
          if (!wantsVideo()) {
            pauseVideo();
            return;
          }
          status.textContent = '';
          if (tuneOnPlay) {
            tune();
            tuneOnPlay = false;
          }
        },
        onAutoplayBlocked() {
          if (wantsVideo()) status.textContent = 'Use the music menu or interact with the page to hear Saraiman. ';
        },
        onError: fail,
      },
    });
  }
  if (base.music.playing) base.stop();
  if (window.YT?.Player) connect();
  else {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        previous?.();
      } finally {
        connect();
      }
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = fail;
    document.head.append(script);
  }

  addEventListener('pagehide', () => {
    active = false;
    squelch.pause();
    pauseVideo();
  });
  addEventListener('pageshow', event => {
    if (!event.persisted) return;
    active = true;
    if (selected === station) {
      base.stop();
      playVideo();
    } else if (base.prefs.on) {
      base.setTrack(selected);
      base.start();
    }
  });

  return {
    ...base,
    TRACKS: [{id: station, label: 'LADANIVA — Saraiman'}, ...base.TRACKS],
    music: {
      get track() {
        return selected;
      },
      audible: () => (selected === station ? playing : base.music.audible()),
      get retryGesture() {
        return selected === station && !unavailable;
      },
      get retryToggle() {
        return selected !== station || !unavailable;
      },
    },
    async start(fade) {
      if (selected !== station) return base.start(fade);
      playVideo();
      return playing;
    },
    stop() {
      squelch.pause();
      tuneOnPlay = true;
      pauseVideo();
      if (!unavailable) status.textContent = '';
      base.stop();
    },
    setTrack(id) {
      const changed = selected !== id;
      selected = id;
      if (id === station) {
        if (changed) {
          base.stop();
          tuneOnPlay = true;
        }
        playVideo();
      } else {
        pauseVideo();
        if (!unavailable) status.textContent = '';
        base.setTrack(id);
        if (base.prefs.on) base.start();
      }
      if (changed && id !== station) tune();
    },
    setVolume(value) {
      squelch.volume = value;
      base.setVolume(value);
      if (ready) player.setVolume(Math.round(value * 100));
    },
  };
}
