// The campaign on the map (?campaign): the loop's map half. Meeting an Invader party or marching on an Invader
// settlement opens the encounter panel (Attack or Leave); Attack deploys the fit fighters into the mission
// (convoy/?campaign&encounter, shared/campaign/encounter.js). Coming back, the map reports each result once, takes
// destroyed parties off the map and gives taken settlements to the Resistance. The campaign clock runs with the map
// clock and heals the wounded. The Party button opens the band: promotions paid with experience and stolen kit.
import {
  fitFighters,
  encounterFor,
  missionName,
  settlementSource,
  readResults,
  isGone,
  ownerOf,
  passTime,
  SOURCES,
  ACTIONS,
} from '../shared/campaign/contacts.js';
import {SQUAD_MIN} from '../convoy/roster.js';
import {rest, safeHaven, operation} from '../shared/campaign/operations.js';
import {deploy} from '../shared/campaign/encounter.js';
import {TROOPS, GEAR} from '../band/troops.js';
import {createCamp, NAMES} from '../convoy/camp.js';
import {SETTLEMENTS, byId} from './island.js';
import {groundAt} from '../shared/campaign/nav.js';
import {createKitScreen} from './kit-screen.js';

const CONTACT = 12, // map units: close enough to fight
  RAID = 22, // around a settlement's centre
  CLEAR = 34; // after Leave, a contact is ignored until the band is this far away
const HOURS_PER_SECOND = 0.6; // as the map clock (map/map.js)
const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
const MISSION_URL = new URL('../convoy/', import.meta.url);

const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs))
    if (v === null || v === undefined || v === false) continue;
    else if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  e.append(...kids.flat().filter(k => k !== null && k !== undefined && k !== false));
  return e;
};

export function mountCampaign({travel, parties, townLabels, setSpeed, toast}) {
  const campaign = travel.campaign;
  if (!campaign) return null;
  const save = () => travel.save();
  for (const p of parties.parties) {
    if (!p.state) continue;
    const stored = campaign.world.parties.find(s => s.id === p.id && s.motion);
    if (stored) Object.assign(p.state, stored.motion);
    else campaign.world.parties.push({id: p.id, motion: p.state});
    if (stored) stored.motion = p.state;
    p.update(0, 0);
  }
  const names = Object.fromEntries(SETTLEMENTS.map(s => [s.id, s.name]));

  // ---------- what happened while we were away ----------
  const lines = readResults(campaign, names);
  save();
  if (lines.length) toast(lines.join(' '), 7000);
  function refreshWorld() {
    for (const p of parties.parties) if (p.id && isGone(campaign, p.id)) p.hide();
    for (const l of townLabels) {
      const owner = ownerOf(campaign, l.s);
      l.el.classList.remove('invader', 'neutral', 'resistance');
      l.el.classList.add(owner);
      l.el
        .querySelector('.shield')
        .style.setProperty('--c', owner === 'resistance' ? '#3f8a4a' : owner === 'invader' ? '#b0473c' : '#c9a24a');
    }
  }
  refreshWorld();

  // ---------- the encounter panel ----------
  const panel = el('div', {class: 'encounter hud', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'enc-title', hidden: true});
  document.body.append(panel);
  let open = null, // {id, source, at: {x, z}}
    ignored = null; // the contact the player chose to leave
  function showEncounter(c) {
    open = c;
    travel.party.route = null;
    travel.drawRoute();
    setSpeed(0);
    const src = c.source,
      act = ACTIONS[src.kind],
      fit = fitFighters(campaign),
      hurt = Object.entries(campaign.band.fighters).filter(([, f]) => f.wounded);
    // where it happens sets the map and the conditions: the ground under the band, and whether its camp is near
    const camp = byId('oros-camp');
    const e = encounterFor(campaign, c.id, src, {
      ground: groundAt(travel.nav, travel.party.x, travel.party.z),
      nearCamp: Math.hypot(travel.party.x - camp.x, travel.party.z - camp.z) < 90,
    });
    const v = e.variant,
      cond = [v.time === 'day' ? 'by day' : v.time, v.weather === 'clear' ? '' : v.weather, v.ground === 'plain' ? '' : v.ground]
        .filter(Boolean)
        .join(', ');
    const selected = new Set(fit);
    const syncSelection = () => {
      e.fighters = [...selected];
      panel.querySelector('#enc-attack').disabled = selected.size < SQUAD_MIN || selected.size > 9;
    };
    panel.replaceChildren(
      el('h2', {id: 'enc-title', class: 'plate'}, src.name),
      el('p', {class: 'enc-mission'}, `${missionName(e.level)} · ${src.strength} enemy · ${cond}`),
      el('h3', {}, fit.length >= SQUAD_MIN ? 'Going in' : 'The band needs to recover'),
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
                checked: true,
                onchange: event => {
                  if (event.target.checked) selected.add(id);
                  else selected.delete(id);
                  syncSelection();
                },
              }),
              `${NAMES[id] || id}, ${TROOPS[campaign.band.fighters[id].class].label}`,
            ),
          ),
        ),
        hurt.map(([id, f]) => el('li', {class: 'hurt'}, `${NAMES[id] || id}: wounded, ${Math.ceil(f.healIn)}h to heal`)),
      ),
      fit.length >= SQUAD_MIN
        ? null
        : el('p', {class: 'note'}, 'At least six fit fighters are needed. Rest at a friendly settlement until they heal.'),
      el(
        'div',
        {class: 'enc-actions'},
        el('button', {class: 'primary', id: 'enc-attack', disabled: fit.length < SQUAD_MIN, onclick: () => attack(e)}, act.verb),
        el('button', {id: 'enc-leave', onclick: leave}, 'Leave'),
      ),
    );
    panel.hidden = false;
    (fit.length ? panel.querySelector('#enc-attack') : panel.querySelector('#enc-leave')).focus();
  }
  function leave() {
    if (!open) return;
    ignored = open;
    open = null;
    panel.hidden = true;
    setSpeed(1);
  }
  function attack(e) {
    try {
      deploy(campaign, e);
    } catch (err) {
      toast(`Cannot attack: ${err.message}`);
      return;
    }
    if (!save()) {
      // No navigation until the deployment is durable; retrying must not reserve kit a second time.
      for (const [id, kit] of Object.entries(campaign.deployment.kits)) campaign.band.fighters[id].kit = kit;
      campaign.deployment = null;
      campaign.log.pop();
      toast('Cannot launch: campaign storage is unavailable. Free browser storage and try again.');
      return;
    }
    const url = new URL(MISSION_URL);
    url.searchParams.set('campaign', campaign.id);
    url.searchParams.set('encounter', e.id);
    location.href = url.href;
  }

  // ---------- contacts: enemy parties near the band, Invader settlements it marches into ----------
  const near = (a, b, r) => Math.hypot(a.x - b.x, a.z - b.z) < r;
  function contactAt(at) {
    for (const p of parties.parties) {
      if (!p.id || !SOURCES[p.id] || isGone(campaign, p.id)) continue;
      const pos = {x: p.root.position.x, z: p.root.position.z};
      if (near(at, pos, CONTACT)) return {id: p.id, source: SOURCES[p.id], at: pos};
    }
    for (const s of SETTLEMENTS)
      if (ownerOf(campaign, s) === 'invader' && near(at, s, RAID)) return {id: s.id, source: settlementSource(s), at: {x: s.x, z: s.z}};
    return null;
  }

  // ---------- the clock: campaign time, healing ----------
  function clockText() {
    const k = campaign.world.clock,
      season = SEASONS[Math.floor((k.day - 1) / 30) % 4];
    return `${season} ${((k.day - 1) % 30) + 1}, Year 3 of the Occupation · ${String(Math.floor(k.hour)).padStart(2, '0')}:00`;
  }

  // ---------- the band: fighters, promotions, the stash ----------
  const bandPanel = el('div', {
    class: 'band-panel hud',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'band-title',
    hidden: true,
  });
  document.body.append(bandPanel);
  const kitScreen = createKitScreen({campaign, save, names: NAMES, onClose: () => bandPanel.querySelector('.kit-buttons button')?.focus()});
  // the camp's cards (convoy/camp.js) work on a squad: the campaign's fighters and stash seen as one
  const asSquad = () => ({
    classes: Object.fromEntries(Object.entries(campaign.band.fighters).map(([id, f]) => [id, f.class])),
    xp: Object.fromEntries(Object.entries(campaign.band.fighters).map(([id, f]) => [id, f.xp])),
    stash: campaign.stash,
    goods: campaign.goods,
    scrip: campaign.scrip,
  });
  const camp = createCamp({
    get: asSquad,
    set: (next, why) => {
      for (const [id, f] of Object.entries(campaign.band.fighters)) {
        if (next.classes[id] && next.classes[id] !== f.class) toast(`${NAMES[id] || id} is now a ${TROOPS[next.classes[id]].label}.`);
        f.class = next.classes[id] ?? f.class;
        f.xp = next.xp[id] ?? f.xp;
      }
      campaign.stash = next.stash;
      campaign.goods = next.goods;
      campaign.scrip = next.scrip;
      save();
      if (why) toast(why);
      renderBand();
      bandPanel.querySelector('.path.ready button, button')?.focus();
    },
  });
  function renderBand() {
    const hurt = Object.entries(campaign.band.fighters).filter(([, f]) => f.wounded);
    const gear = Object.entries(campaign.stash).filter(([g]) => GEAR[g]);
    bandPanel.replaceChildren(
      el('h2', {id: 'band-title', class: 'plate'}, 'The band: fighters and stash'),
      el('p', {}, operation(campaign).text),
      operation(campaign).complete
        ? el(
            'p',
            {class: 'note'},
            'Foothold secured. Your band has broken the local supply route and liberated Fort Orion. Continue the campaign with your survivors and equipment.',
          )
        : null,
      el(
        'p',
        {class: 'note'},
        'Promote a fighter with the experience their class asks and the kit the new class carries; the kit comes out of the stash.',
      ),
      hurt.length
        ? el('p', {class: 'hurt'}, hurt.map(([id, f]) => `${NAMES[id] || id} is wounded (${Math.ceil(f.healIn)}h)`).join(' · '))
        : null,
      camp.squadCards({}),
      el('h3', {}, 'Recovery and resupply'),
      el(
        'p',
        {class: 'note'},
        safeHaven(campaign, SETTLEMENTS, travel.party)
          ? 'Safe haven: rest, sell recovered valuables, and buy promotion equipment.'
          : 'Reach a friendly or independent settlement to rest and trade.',
      ),
      ...[12, 24, 48].map(hours =>
        el(
          'button',
          {
            disabled: !safeHaven(campaign, SETTLEMENTS, travel.party),
            onclick: () => {
              try {
                campaign.world.party = {x: travel.party.x, z: travel.party.z};
                rest(campaign, SETTLEMENTS, hours);
                save();
                renderBand();
                renderCard();
                toast(`Rested ${hours} hours.`);
              } catch (err) {
                toast(err.message);
              }
            },
          },
          `Rest ${hours}h`,
        ),
      ),
      safeHaven(campaign, SETTLEMENTS, travel.party) ? camp.traderView() : null,
      el('h3', {}, 'Kit: magazines and rounds'),
      el(
        'div',
        {class: 'kit-buttons'},
        Object.keys(campaign.band.fighters).map(id =>
          el('button', {class: 'kit-open', onclick: () => kitScreen.open(id)}, `${NAMES[id] || id}'s kit`),
        ),
      ),
      el('h3', {}, `Stash · ${gear.reduce((a, [, n]) => a + n, 0)} items`),
      el(
        'ul',
        {class: 'stash-list'},
        gear.map(([g, n]) => el('li', {}, `${GEAR[g].label}${n > 1 ? ` × ${n}` : ''}`)),
      ),
      el('div', {class: 'enc-actions'}, el('button', {onclick: () => toggleBand(false)}, 'Close')),
    );
  }
  function toggleBand(on = bandPanel.hidden) {
    bandPanel.hidden = !on;
    if (on) {
      renderBand();
      setSpeed(0);
      bandPanel.querySelector('button')?.focus();
    }
  }
  // Escape closes whichever panel is open (focus may have left it: a promotion redraws the band panel)
  addEventListener('keydown', e => {
    if (kitScreen.isOpen) {
      if (e.key === 'Escape') kitScreen.close();
      return; // the kit screen's keys are its own
    }
    if (e.key === 'Escape') {
      if (!bandPanel.hidden) toggleBand(false);
      else if (!panel.hidden) leave();
      return;
    }
    if (e.target.closest?.('input, select, textarea')) return;
    if (e.key.toLowerCase() === 'p' && panel.hidden) toggleBand();
  });
  const partyButton = document.querySelector('.menu-bar [data-label="Party"]');
  if (partyButton) partyButton.onclick = () => toggleBand(true);

  // the party card: the band's real numbers
  function renderCard() {
    const f = Object.values(campaign.band.fighters);
    const troops = Object.values(campaign.band.troops).reduce((a, t) => a + t.count, 0);
    const card = document.querySelector('.party-card dl');
    if (!card) return;
    card.replaceChildren(
      ...[
        ['Fighters', `${f.filter(x => !x.wounded).length} / ${f.length}`],
        ['Wounded', f.filter(x => x.wounded).length],
        ['Troops', troops],
        ['Stash', Object.values(campaign.stash).reduce((a, n) => a + n, 0)],
        ['Scrip', campaign.scrip.toLocaleString('en')],
        ['Fought', campaign.settled.length],
      ].flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, String(v))]),
    );
  }
  renderCard();
  document.querySelector('.party-card')?.append(el('p', {class: 'note'}, operation(campaign).text));

  // ---------- each frame ----------
  let sinceCard = 0;
  function update(dt) {
    if (open || !bandPanel.hidden || kitScreen.isOpen) return;
    const healed = passTime(campaign, dt * HOURS_PER_SECOND);
    if (healed.length) {
      toast(`${healed.map(id => NAMES[id] || id).join(' and ')} ${healed.length > 1 ? 'are' : 'is'} fit again.`);
      save();
    }
    if ((sinceCard += dt) > 1) {
      sinceCard = 0;
      renderCard();
    }
    if (open || !panel.hidden || !bandPanel.hidden) return;
    const at = {x: travel.party.x, z: travel.party.z};
    if (ignored && !near(at, ignored.at, CLEAR)) ignored = null;
    const c = contactAt(at);
    if (c && c.id !== ignored?.id) showEncounter(c);
  }
  return {
    update,
    get blocked() {
      return !!open || !bandPanel.hidden || kitScreen.isOpen;
    },
    clockText,
    showEncounter,
    contactAt,
    toggleBand,
    get open() {
      return open;
    },
    sources: () => parties.parties.filter(p => p.id && SOURCES[p.id] && !isGone(campaign, p.id)).map(p => p.id),
    byId,
  };
}
