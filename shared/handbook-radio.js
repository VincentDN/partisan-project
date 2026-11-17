// The handbook gets its own opening station while sharing the site's radio controls and preferences.
import {soundLayer} from './sound-layer.js';

const station = 'saraiman';

export function handbookRadio(frame) {
  const base = soundLayer();
  let selected = station;
  let player;
  let ready = false;
  let playing = false;
  let active = true;
  let tuneOnPlay = true;
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  frame.after(status);

  function playVideo() {
    if (!active || selected !== station || !base.prefs.on || !ready) return;
    player.setVolume(Math.round(base.prefs.volume * 100));
    player.playVideo();
  }

  const squelch = new Audio(new URL('../assets/audio/warehouse/radio-squelch/radio-squelch-1.mp3', import.meta.url));
  squelch.preload = 'none';
  function tune() {
    squelch.volume = base.prefs.volume;
    squelch.currentTime = 0;
    squelch.play().catch(() => {});
  }

  function connect() {
    player = new window.YT.Player(frame, {
      events: {
        onReady() {
          ready = true;
          playVideo();
        },
        onStateChange({data}) {
          playing = data === 1;
          if (playing) {
            status.textContent = '';
            if (!active || !base.prefs.on || selected !== station) player.pauseVideo();
            else if (tuneOnPlay) {
              tune();
              tuneOnPlay = false;
            }
          }
        },
        onAutoplayBlocked() {
          status.textContent = 'Press play to hear Saraiman. ';
        },
        onError() {
          status.textContent = 'Saraiman is unavailable in this player. ';
        },
      },
    });
  }
  if (base.music.playing) base.stop();
  if (window.YT?.Player) connect();
  else {
    window.onYouTubeIframeAPIReady = connect;
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => { status.textContent = 'Open Saraiman on YouTube to listen. '; };
    document.head.append(script);
  }

  addEventListener('pagehide', () => {
    active = false;
    squelch.pause();
    if (ready) player.pauseVideo();
  });
  addEventListener('pageshow', event => {
    if (event.persisted) {
      active = true;
      if (selected === station) {
        base.stop();
        playVideo();
      }
    }
  });

  return {
    ...base,
    TRACKS: [{id: station, label: 'LADANIVA — Saraiman'}, ...base.TRACKS],
    music: {
      get track() { return selected; },
      audible: () => selected === station ? playing : base.music.audible(),
    },
    async start(fade) {
      if (selected !== station) return base.start(fade);
      playVideo();
      return playing;
    },
    stop() {
      squelch.pause();
      tuneOnPlay = true;
      if (ready) player.pauseVideo();
      base.stop();
    },
    setTrack(id) {
      const changed = selected !== id;
      selected = id;
      if (id === station) {
        if (changed) base.stop();
        tuneOnPlay = changed;
        playVideo();
      } else {
        if (ready) player.pauseVideo();
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
