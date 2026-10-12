// The named fighters in the band screen (WP-W15): the people you deploy in the campaign, each with their own class,
// experience and wounds, shown above the troop stacks and promoted one at a time with their own experience and the
// stash's kit. Only in campaign mode (band/band-state.js); the drawing helpers come from band/band.js.
import {TROOPS, GEAR} from './troops.js';
import {NAMES} from '../convoy/roster.js';
import {fighterProgress, fighterMissing, canPromoteFighter} from './band-state.js';

export const FIGHTER = 'f:'; // selection ids: 'f:mila'
export const fighterId = sel => (typeof sel === 'string' && sel.startsWith(FIGHTER) ? sel.slice(FIGHTER.length) : null);
export const nameOf = id => NAMES[id] || id;

/** The fighters' group for the right-hand column: one card each, ready ones marked. */
export function fighterGroup(S, {el, seg, drawPawn, selected, choose}) {
  const ids = Object.keys(S.fighters || {});
  if (!ids.length) return null;
  return el(
    'section',
    {class: 'group fighters', 'aria-label': 'Your fighters'},
    el('h3', {}, 'Your fighters'),
    el('div', {class: 'roman', 'aria-hidden': 'true'}, '★', el('small', {}, String(ids.length))),
    el(
      'div',
      {class: 'cards'},
      ...ids.map(id => {
        const f = S.fighters[id],
          t = TROOPS[f.class],
          p = fighterProgress(S, id);
        const ready = p.need > 0 && p.xp >= p.need,
          can = ready && t.to.some(to => canPromoteFighter(S, id, to));
        const cv = el('canvas', {width: 236, height: 112, 'aria-hidden': 'true'});
        drawPawn(cv, f.class, {size: 150, cy: 70});
        return el(
          'button',
          {
            class: 'card' + (f.wounded ? ' wounded' : ''),
            type: 'button',
            'data-fighter': id,
            'aria-pressed': String(selected === FIGHTER + id),
            'aria-label': `${nameOf(id)}, ${t.label}${f.wounded ? ', wounded' : ''}${ready ? ', ready to promote' : ''}`,
            onclick: () => choose(FIGHTER + id),
          },
          cv,
          el('span', {class: 'name'}, nameOf(id)),
          el('span', {class: 'count'}, t.label),
          p.need ? seg(p.frac) : null,
          el('span', {class: 'tier'}, 'T' + t.tier),
          ready
            ? el('span', {class: 'ready', title: can ? 'Ready to promote' : 'Ready, but the stash lacks the kit'}, can ? '▲' : '△')
            : null,
          f.wounded ? el('span', {class: 'hurt', title: `Wounded: ${Math.ceil(f.healIn)}h to heal`}, '✚') : null,
        );
      }),
    ),
  );
}

/** The centre for a selected fighter: who, progress, abilities, and the promotions with what each needs. */
export function fighterDetail(S, id, {el, seg, drawPawn, abilityList, onPromote}) {
  const f = S.fighters[id],
    t = TROOPS[f.class],
    p = fighterProgress(S, id);
  const sub = `${t.label} · tier ${t.tier}${f.wounded ? ` · wounded, ${Math.ceil(f.healIn)}h to heal` : ''}`;
  const detail = [
    el(
      'div',
      {class: 'skills'},
      el('span', {}, 'Experience'),
      p.need ? seg(p.frac, '#e9c46a') : el('span', {}, '—'),
      el('span', {}, p.need ? `${Math.floor(p.xp)} / ${p.need} xp` : 'Top of its path'),
    ),
    el('p', {class: 'note'}, 'Experience comes from missions. A promotion spends it, and the new class carries kit from the stash.'),
    abilityList(f.class),
  ];
  const ups = t.to.map(to => {
    const T = TROOPS[to],
      missing = Object.fromEntries(fighterMissing(S, to)),
      ok = canPromoteFighter(S, id, to);
    const cv = el('canvas', {width: 128, height: 128, 'aria-hidden': 'true'});
    drawPawn(cv, to, {size: 150, cy: 70});
    const needs = Object.entries(T.needs).map(([g, n]) =>
      el('li', {class: missing[g] ? 'no' : 'ok'}, `${n} × ${GEAR[g].label} (${S.stash[g] || 0})`),
    );
    const why = p.xp < p.need ? `${Math.ceil(p.need - p.xp)} more xp` : Object.keys(missing).length ? 'Not enough kit' : '';
    return el(
      'div',
      {class: 'up'},
      cv,
      el(
        'div',
        {},
        el('h3', {}, `→ ${T.label}`, el('small', {}, `  tier ${T.tier}`)),
        el('ul', {class: 'needs', 'aria-label': 'Needs'}, ...(needs.length ? needs : [el('li', {class: 'ok'}, 'No equipment needed')])),
        el(
          'div',
          {class: 'row'},
          el('button', {type: 'button', class: 'go', disabled: ok ? null : '', onclick: () => onPromote(id, to)}, 'Promote'),
          why ? el('span', {class: 'note'}, why) : null,
        ),
        el('p', {class: 'note', style: 'text-align:left'}, T.note),
      ),
    );
  });
  return {who: nameOf(id), sub, detail, ups};
}
