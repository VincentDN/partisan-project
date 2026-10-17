// Who goes in (WP-W12): the encounter panel lists every fit fighter with their class, the first nine ticked; six to
// nine may go, the rest stay with the band as reserves, and the wounded are shown healing. The count line says how
// many are picked; Attack and Prepare wait until it is six to nine. Plain checkboxes, in reading order.
import {SQUAD_MIN, SQUAD_MAX} from '../convoy/roster.js';
import {TROOPS} from '../band/troops.js';

/**
 * opts: {el, campaign, names: {id: name}, fit: [fit ids, in band order], first: [ids ticked at the start], onPick([ids])}.
 * Returns {nodes: [heading, list, count or note], sync(panel)}: sync enables the actions for the current pick.
 */
export function squadPicker({el, campaign, names, fit, first, onPick, min = SQUAD_MIN, max = SQUAD_MAX}) {
  const selected = new Set(first);
  const enough = fit.length >= min;
  const count = el('p', {class: 'enc-count', 'aria-live': 'polite'});
  let panel = null;
  function sync(p = panel) {
    panel = p;
    const ids = fit.filter(id => selected.has(id)),
      ok = ids.length >= min && ids.length <= max;
    onPick(ids);
    for (const b of panel?.querySelectorAll('#enc-attack, #enc-prepare') || []) b.disabled = !ok;
    count.textContent = `Deploying ${ids.length} fighters · choose ${min}–${max}${ok ? '' : ' to continue'}.`;
    count.classList.toggle('bad', !ok);
  }
  const hurt = Object.entries(campaign.band.fighters).filter(([, f]) => f.wounded);
  const nodes = [
    el('h3', {}, enough ? 'Going in' : 'The band needs to recover'),
    el(
      'ul',
      {class: 'enc-fighters'},
      fit.map(id =>
        el(
          'li',
          {},
          el(
            'label',
            {},
            el('input', {
              type: 'checkbox',
              checked: selected.has(id),
              value: id,
              onchange: event => {
                if (event.target.checked) selected.add(id);
                else selected.delete(id);
                sync();
              },
            }),
            `${names[id] || id}, ${TROOPS[campaign.band.fighters[id].class].label}`,
          ),
        ),
      ),
      hurt.map(([id, f]) => el('li', {class: 'hurt'}, `${names[id] || id}: wounded, ${Math.ceil(f.healIn)}h to heal`)),
    ),
    enough ? count : el('p', {class: 'note'}, `At least ${min} fit fighters are needed. Rest at a friendly settlement until they heal.`),
  ];
  return {nodes, sync};
}
