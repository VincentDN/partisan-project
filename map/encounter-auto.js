// Auto-resolve preview and button: update odds whenever the selected squad changes, before committing a fight.
import {autoPreview} from '../shared/campaign/auto-resolve.js';

export function autoChoice({el, campaign, encounter, onResolve}) {
  const text = el('p', {id: 'enc-auto-odds', 'aria-live': 'polite'});
  const button = el('button', {id: 'enc-auto', 'aria-describedby': 'enc-auto-odds', onclick: onResolve}, 'Auto-resolve');
  const node = el('div', {class: 'enc-auto', hidden: true}, text, button);
  function sync() {
    const p = autoPreview(campaign, encounter);
    node.hidden = !p.eligible && !(p.validEncounter && !p.supplied);
    button.disabled = !p.eligible;
    text.textContent = p.eligible
      ? `Auto-resolve: ${Math.round(p.odds * 100)}% chance of victory; about ${p.expectedWounds.toFixed(1)} wounded. ` +
        `Selected strength ${p.strength.toFixed(1)} against ${p.enemy}. Recover 25% less loot (rounded down); no rare bonus cargo. ` +
        `${p.ammunition} carried rounds will be spent on either outcome. ` +
        'Wounds and rewards are applied immediately. Playing the mission gives better recovery opportunities.'
      : `Auto-resolve unavailable: ${p.equipment.filter(f => f.ready).length}/${p.equipment.length} fighters supplied. ${p.reason}`;
  }
  return {node, sync};
}
