// The top bar shared by every PARP page: a strip of Nokia LCD with INDEX and DESIGN DOC buttons, the page name and
// the music player (on/off, track, volume). It replaces each page's own header and music controls.
//
//   import {mountTopBar} from '../shared/topbar.js';
//   mountTopBar({title: 'Weapon Workbench', scene: 'viewer', current: 'workbench'});
import {bindMusicUI} from './music-ui.js';
import {TRACKS} from './music.js';

const root = new URL('../', import.meta.url);
const href = path => new URL(path, root).href;

/**
 * @param {{title?: string, scene?: 'bench'|'viewer', current?: 'index'|'doc'|'intro'|string, overlay?: boolean, sticky?: boolean, replaceHeader?: boolean}} [opts]
 *   current: which button is the page you are on (shown pressed instead of a link)
 */
export function mountTopBar({title = '', scene = 'viewer', current = '', overlay = false, sticky = false, replaceHeader = true} = {}) {
  if (!document.querySelector('link[data-pbar]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href('shared/topbar.css');
    link.dataset.pbar = '';
    document.head.append(link);
  }
  const bar = document.createElement('nav');
  bar.className = 'pbar' + (overlay ? ' overlay' : '') + (sticky ? ' sticky' : '');
  bar.setAttribute('aria-label', 'Partisan Project');
  const link = (id, label, path, cls = '') =>
    current === id ? `<a class="${cls}" aria-current="page">${label}</a>` : `<a class="${cls}" href="${href(path)}">${label}</a>`;
  const brand = '<span class="bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>PARP';
  bar.innerHTML =
    link('intro', brand, 'intro/', 'brand') +
    link('index', 'Index', 'menu/') +
    link('doc', 'Design doc', 'docs/game-design-master-doc.html') +
    `<span class="where">${title}</span><span class="spacer"></span>` +
    `<span class="music" role="group" aria-label="Music"><button id="music-toggle" aria-pressed="false" aria-label="Background music" title="Background music">♪</button>` +
    TRACKS.map(
      (t, i) =>
        `<button data-track="${t.id}" aria-pressed="false" aria-label="${t.label || t.id}" title="${t.label || t.id}">${i + 1}</button>`,
    ).join('') +
    `</span><label class="vol"><span class="sr-only">Volume</span><input id="music-volume" type="range" min="0" max="100" step="1" value="36" aria-label="Music volume"><output id="music-level">36%</output></label>`;
  const old = replaceHeader && document.querySelector('body > header');
  if (old) old.replaceWith(bar);
  else document.body.prepend(bar);
  return bindMusicUI({scene});
}
