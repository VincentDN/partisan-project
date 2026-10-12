// Partisan Tactical camp: between missions the squad sits at camp. It shows the three missions (with their record),
// what the last mission brought home, the rebels (experience, abilities, and what each promotion costs in experience
// and equipment), the stash, and the trader (sell trade goods for scrip, buy equipment). The campaign state lives in
// convoy/progression.js and convoy/loot.js; this module only draws it and calls back with a new state.
import {TROOPS, GEAR} from '../band/troops.js';
import {activesFor} from './abilities.js';
import {canPromote, missingFor, progress, promote} from './progression.js';
import {sellGoods, buy, priceOf, scripFor} from './loot.js';

import {NAMES} from './roster.js';
export {NAMES};
const KEYS = ['Z', 'X', 'V'];
const KIND_ORDER = ['weapon', 'attachment', 'ammo', 'gear', 'drone'];
const KIND_LABEL = {weapon: 'Weapons', attachment: 'Attachments', ammo: 'Ammunition and explosives', gear: 'Gear', drone: 'Drones'};

export function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs))
    if (v === null || v === undefined || v === false) continue;
    else if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  e.append(...kids.flat(Infinity).filter(k => k !== null && k !== undefined && k !== false));
  return e;
}
const rarityClass = r => 'r-' + String(r).replace(' ', '-');

/**
 * @param {{get: () => object, set: (squad: object, why: string) => void}} opts
 *   get: the campaign state; set: store a new state (the page saves it and redraws)
 */
export function createCamp({get, set}) {
  /** What a mission brought home: equipment (to the stash) and trade goods, rarity-coloured, Tarkov names. */
  function lootList(loot) {
    if (!loot?.length) return el('p', {class: 'note'}, 'Nothing brought home.');
    return el(
      'ul',
      {class: 'loot-list', 'aria-label': 'Loot'},
      loot.map(e =>
        el(
          'li',
          {class: rarityClass(e.rarity)},
          el('span', {class: 'nm'}, e.name),
          el('span', {class: 'to'}, e.gear ? `→ ${GEAR[e.gear].label}` : `trade goods · ${scripFor(e)} scrip`),
          e.salvage ? el('em', {}, 'salvage') : null,
        ),
      ),
    );
  }

  /** What class `to` costs, each item ticked when the stash has it. */
  function needs(squad, to) {
    const items = Object.entries(TROOPS[to].needs);
    if (!items.length) return el('small', {class: 'needs'}, 'No equipment needed');
    return el(
      'small',
      {class: 'needs'},
      items.map(([g, n], i) => {
        const have = squad.stash[g] || 0;
        return [
          i ? ' · ' : '',
          el('span', {class: have >= n ? 'ok' : 'no'}, `${have >= n ? '✓' : '✗'} ${n > 1 ? n + '× ' : ''}${GEAR[g].label} (${have})`),
        ];
      }),
    );
  }

  /** One card per rebel: class, XP bar, the abilities on the bar, and every promotion with its equipment. */
  function squadCards({earned = null, compact = false, onPromote = null} = {}) {
    const squad = get();
    return el(
      'div',
      {class: 'squad-cards'},
      Object.keys(squad.classes).map(id => {
        const t = TROOPS[squad.classes[id]],
          pr = progress(squad, id),
          gain = earned?.[id],
          xpReady = canPromote(squad, id);
        const actives = activesFor(squad.classes[id])
          .map((a, i) => `${KEYS[i]} ${a.name}`)
          .join(' · ');
        const paths = t.to.map(to => {
          const ok = canPromote(squad, id, to),
            missing = missingFor(squad, to);
          const why = !xpReady
            ? `needs ${pr.need - pr.xp} more XP`
            : missing.length
              ? `missing ${missing.map(([g, n]) => `${n}× ${GEAR[g].label}`).join(', ')}`
              : '';
          return el(
            'div',
            {class: 'path' + (ok ? ' ready' : '')},
            el(
              'button',
              {
                type: 'button',
                'data-promote': `${id}:${to}`,
                disabled: !ok,
                title: ok ? `Promote ${NAMES[id]} to ${TROOPS[to].label}` : why,
                onclick: () => {
                  const next = promote(get(), id, to);
                  if (!next) return;
                  set(next, `${NAMES[id]} is now a ${TROOPS[to].label}.`);
                  onPromote?.(id, to);
                },
              },
              ok ? `Promote: ${TROOPS[to].label}` : TROOPS[to].label,
            ),
            compact ? null : needs(squad, to),
          );
        });
        return el(
          'div',
          {class: 'squad-card', 'data-squad': id},
          el('b', {}, NAMES[id]),
          el('span', {class: 'cls'}, ` ${t.label} · tier ${t.tier}`),
          gain
            ? el(
                'span',
                {class: 'gain'},
                ` +${gain.total} XP (${gain.parts.map(([l, n]) => `${l} ${n}`).join(', ')}${gain.mult !== 1 ? `, ×${gain.mult}` : ''})`,
              )
            : null,
          el(
            'div',
            {
              class: 'xpbar',
              role: 'meter',
              'aria-label': `${NAMES[id]} experience`,
              'aria-valuemin': 0,
              'aria-valuemax': pr.need || 1,
              'aria-valuenow': Math.min(pr.xp, pr.need || 1),
            },
            el('i', {style: `width:${Math.round(pr.frac * 100)}%`}),
          ),
          el('small', {}, pr.need ? `${pr.xp} / ${pr.need} XP to promote` : `${pr.xp} XP · top of the path`),
          actives ? el('small', {class: 'acts'}, actives) : null,
          paths.length ? el('div', {class: 'paths', role: 'group', 'aria-label': `${NAMES[id]}: next classes`}, paths) : null,
        );
      }),
    );
  }

  /** The stash by kind, each item marked when a rebel's next class needs it. */
  function stashView() {
    const squad = get();
    const wanted = new Set(Object.values(squad.classes).flatMap(c => TROOPS[c].to.flatMap(to => Object.keys(TROOPS[to].needs))));
    const ids = Object.keys(squad.stash).filter(g => squad.stash[g] > 0);
    if (!ids.length) return el('p', {class: 'note'}, 'The stash is empty. Missions bring loot home.');
    return el(
      'div',
      {class: 'stash'},
      KIND_ORDER.filter(k => ids.some(g => GEAR[g].kind === k)).map(k =>
        el(
          'div',
          {class: 'stash-kind'},
          el('h4', {}, KIND_LABEL[k]),
          el(
            'ul',
            {},
            ids
              .filter(g => GEAR[g].kind === k)
              .map(g => el('li', {class: wanted.has(g) ? 'wanted' : null, 'data-gear': g}, `${squad.stash[g]}× ${GEAR[g].label}`)),
          ),
        ),
      ),
    );
  }

  /** The trader: sells trade goods for scrip; sells the equipment the squad's next classes need, then the rest. */
  function traderView() {
    const squad = get();
    const goods = squad.goods || [],
      worth = goods.reduce((s, g) => s + scripFor(g), 0);
    const wanted = [...new Set(Object.values(squad.classes).flatMap(c => TROOPS[c].to.flatMap(to => Object.keys(TROOPS[to].needs))))];
    const rest = Object.keys(GEAR).filter(g => !wanted.includes(g));
    const offer = g =>
      el(
        'button',
        {
          type: 'button',
          class: wanted.includes(g) ? 'wanted' : null,
          'data-buy': g,
          disabled: (squad.scrip || 0) < priceOf(g),
          onclick: () => {
            const next = buy(get(), g);
            if (next) set(next, `Bought ${GEAR[g].label}.`);
          },
        },
        `${GEAR[g].label} · ${priceOf(g)}`,
      );
    return el(
      'div',
      {class: 'trader'},
      el(
        'p',
        {},
        el('b', {}, `${squad.scrip || 0} scrip`),
        ` · ${goods.length} trade goods worth ${worth}`,
        ' ',
        el(
          'button',
          {
            type: 'button',
            'data-sell': '',
            disabled: !goods.length,
            onclick: () => set(sellGoods(get()), `Sold ${goods.length} trade goods for ${worth} scrip.`),
          },
          'Sell trade goods',
        ),
      ),
      goods.length
        ? el(
            'p',
            {class: 'note goods'},
            goods
              .slice(-8)
              .map(g => g.name)
              .join(' · ') + (goods.length > 8 ? ' …' : ''),
          )
        : null,
      el('h4', {}, 'For the next promotions'),
      el('div', {class: 'offers'}, wanted.map(offer)),
      el('details', {}, el('summary', {}, 'Everything else'), el('div', {class: 'offers'}, rest.map(offer))),
    );
  }

  return {lootList, squadCards, stashView, traderView, needs};
}
