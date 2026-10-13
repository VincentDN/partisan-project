// The encounter panel's choices (WP-W8): what both sides bring and the ground, then Attack, Prepare an ambush (two hours
// digging in, then the attack), Withdraw leaving a rearguard (hunters only: they have caught the band) and Leave (not
// from hunters). The rules are in shared/campaign/stances.js; this only draws the buttons. Keyboard: they are plain
// buttons and a select, in reading order.
import {stancesFor, PREPARE_HOURS, HUNTER_REST_HOURS} from '../shared/campaign/stances.js';

const GROUND = {road: 'on the road', plain: 'open country', forest: 'forest', mountain: 'mountains', steep: 'steep ground', snow: 'snow'};

/** "Your band: 7 of 8 fighters fit · 52 troops · forest" */
export function sidesLine(el, {campaign, fit, ground}) {
  const all = Object.keys(campaign.band.fighters).length,
    troops = Object.values(campaign.band.troops).reduce((a, t) => a + t.count, 0);
  return el(
    'p',
    {class: 'enc-sides'},
    `Your band: ${fit.length} of ${all} fighters fit · ${troops} troops · ${GROUND[ground] || ground || 'open country'}`,
  );
}

/**
 * The action row. opts: {el, kind, caught (hunters on the hunt), verb, canAttack, fit: [ids], names: {id: name}, onAttack, onPrepare,
 * onRearguard(id), onLeave}.
 */
export function actionRow({el, kind, caught, verb, canAttack, fit, names, onAttack, onPrepare, onRearguard, onLeave}) {
  const can = stancesFor(kind, {caught});
  const pick = can.rearguard
    ? el(
        'select',
        {id: 'enc-rearguard-who', 'aria-label': 'Who holds the rear'},
        fit.map(id => el('option', {value: id}, names[id] || id)),
      )
    : null;
  return el(
    'div',
    {class: 'enc-actions'},
    el('button', {class: 'primary', id: 'enc-attack', disabled: !canAttack, onclick: onAttack}, verb),
    can.prepare
      ? el(
          'button',
          {
            id: 'enc-prepare',
            disabled: !canAttack,
            title: `${PREPARE_HOURS} hours to dig in: the fight starts behind sandbags`,
            onclick: onPrepare,
          },
          `Prepare an ambush (${PREPARE_HOURS} h)`,
        )
      : null,
    can.rearguard
      ? el(
          'span',
          {class: 'enc-rearguard'},
          pick,
          el(
            'button',
            {
              id: 'enc-rearguard',
              disabled: !fit.length,
              title: `The band gets away; the rearguard comes back wounded; the hunters go home for ${HUNTER_REST_HOURS} hours`,
              onclick: () => onRearguard(pick.value),
            },
            'Withdraw, leaving a rearguard',
          ),
        )
      : null,
    el(
      'button',
      {
        id: 'enc-leave',
        disabled: !can.leave,
        title: can.leave ? null : 'They have caught you: fight, or leave a rearguard',
        onclick: onLeave,
      },
      'Leave',
    ),
  );
}
