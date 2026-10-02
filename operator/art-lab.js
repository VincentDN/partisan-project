// Art Style Lab: the Operator Customiser with a style switcher on top (operator/?lab). Every style from
// shared/art-styles.js applies to the operator and the carried rifle; the rest of the customiser keeps working
// underneath, and the style is re-applied whenever the look, kit or weapon changes.
import {STYLES, createStyler} from '../shared/art-styles.js';

/** @param {any} op window.PARP_OPERATOR */
export function mountArtLab(op) {
  const params = new URLSearchParams(location.search);
  document.querySelector('aside .eyebrow').textContent = 'PARTISAN PROJECT · ART STYLE LAB';
  const section = document.createElement('section');
  section.className = 'art-lab';
  section.innerHTML =
    '<h2>ART STYLE</h2><div class="tools" id="styles" role="group" aria-label="Art style"></div><p id="style-detail" class="pose-note" aria-live="polite"></p>';
  document.querySelector('#roster').previousElementSibling.before(section);

  const styler = createStyler(op.stage, op.pivot.parent);
  const buttons = STYLES.map(s => {
    const b = document.createElement('button');
    b.textContent = s.label;
    b.dataset.style = s.id;
    b.onclick = () => choose(s.id);
    return b;
  });
  section.querySelector('#styles').replaceChildren(...buttons);

  function choose(id) {
    styler.use(id);
    const s = STYLES.find(x => x.id === styler.current);
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.style === s.id));
    section.querySelector('#style-detail').textContent = s.detail;
    // Remember the style in the address (?lab=<id>) without touching the customiser's hash.
    const url = new URL(location.href);
    url.searchParams.set('lab', s.id);
    history.replaceState(null, '', url);
  }
  choose(params.get('lab') || 'pbr');

  // The customiser swaps meshes and repaints materials as you go: re-apply the style when anything changes.
  let seen = '';
  op.stage.onFrame(() => {
    const key = [location.hash, op.base?.id, op.weapon?.rifle?.model?.uuid, op.meshes.length].join('|');
    if (key !== seen) {
      seen = key;
      styler.refresh();
    }
  });
  return styler;
}
