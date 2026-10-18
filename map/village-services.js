// Accessible village barter preview and recruitment controls backed by the campaign's saved services.
import {villageDialogue} from './village-dialogue.js';
import {GEAR} from '../band/troops.js';
import {scripFor} from '../convoy/loot.js';
import {ownerOf} from '../shared/campaign/contacts.js';
import {provisions} from '../shared/campaign/territory.js';
import {
  villageAvailable,
  villageStock,
  barterQuote,
  barter,
  recruit,
  villageTransaction,
  ROSTER_LIMIT,
} from '../shared/campaign/village.js';
export function villageServices({el, campaign: c, settlement: s, save, refresh, toast}) {
  if (!villageAvailable(c, s)) return el('p', {class: 'note'}, 'Barter at neutral or liberated villages. There is no trader at camp.');
  const stock = villageStock(c, s),
    supplies = provisions(c, s),
    friendly = ownerOf(c, s) === 'resistance';
  const selection = {offer: {}, goods: [], take: {}};
  const summary = el('p', {id: 'barter-preview', 'aria-live': 'polite'}, 'Choose supplies and items to offer.');
  const commit = el(
    'button',
    {id: 'village-barter', disabled: true, onclick: () => transact(next => barter(next, s, selection), 'Barter completed.')},
    'Exchange items',
  );
  const name = id => (id === 'food' ? 'Recovery meal' : GEAR[id].label);
  function sync() {
    try {
      const q = barterQuote(c, s, selection);
      summary.textContent = `Offer value ${q.value}; supplies value ${q.cost}. ${q.affordable ? `${q.excess} excess value is donated; no currency or change.` : 'Offer more items.'}`;
      commit.disabled = !q.affordable;
    } catch (err) {
      summary.textContent = err.message;
      commit.disabled = true;
    }
  }
  function transact(action, message) {
    try {
      villageTransaction(c, save, action);
      refresh();
      toast(message);
    } catch (err) {
      toast(err.message);
    }
  }
  const quantities = (items, part) =>
    Object.entries(items)
      .filter(([, n]) => n > 0)
      .map(([id, n]) =>
        el(
          'label',
          {},
          `${name(id)} (${n} available) `,
          el('input', {
            type: 'number',
            min: 0,
            max: n,
            step: 1,
            value: 0,
            'aria-label': `${part === 'take' ? 'Receive' : 'Offer'} ${name(id)}`,
            oninput: e => {
              const n = Number(e.target.value);
              if (n === 0) delete selection[part][id];
              else selection[part][id] = n;
              sync();
            },
          }),
        ),
      );
  return el(
    'section',
    {id: 'village-services'},
    el('h3', {}, `${s.name}: village services`),
    el(
      'button',
      {id: 'village-talk', onclick: () => villageDialogue({el, campaign: c, settlement: s, save, refresh})},
      'Talk to village representative',
    ),
    el(
      'p',
      {},
      `Stock refreshes weekly. ${friendly ? 'Liberated villages offer 15% better rates and larger weekly stocks.' : 'Neutral village rates.'} Meals add six recovery hours per 12 hours of rest.`,
    ),
    friendly
      ? el(
          'p',
          {},
          `${supplies.recruits} volunteers and ${supplies.food} meals remain this week. Band capacity: ${Object.keys(c.band.fighters).length}/${ROSTER_LIMIT}.`,
        )
      : null,
    friendly
      ? el(
          'button',
          {
            id: 'village-recruit',
            disabled: supplies.recruits < 1 || supplies.food < 1 || Object.keys(c.band.fighters).length >= ROSTER_LIMIT,
            onclick: () => transact(next => recruit(next, s), 'A healthy village volunteer joined the band.'),
          },
          'Recruit volunteer · 1 meal',
        )
      : null,
    el('fieldset', {}, el('legend', {}, 'Supplies to receive'), ...quantities(stock, 'take')),
    el('fieldset', {}, el('legend', {}, 'Equipment to offer'), ...quantities(c.stash, 'offer')),
    el(
      'fieldset',
      {},
      el('legend', {}, 'Recovered valuables to offer'),
      ...(c.goods.length
        ? c.goods.map((g, i) =>
            el(
              'label',
              {},
              el('input', {
                type: 'checkbox',
                onchange: e => {
                  selection.goods = e.target.checked ? [...selection.goods, i] : selection.goods.filter(x => x !== i);
                  sync();
                },
              }),
              `${g.name} · value ${scripFor(g)}`,
            ),
          )
        : [el('p', {}, 'No recovered valuables.')]),
    ),
    summary,
    commit,
  );
}
