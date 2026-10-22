// The campaign on the map (?campaign): the loop's map half. Meeting an Invader party or marching on an Invader
// settlement opens the encounter panel (Attack or Leave); Attack deploys the fit fighters into the mission
// (convoy/?campaign&encounter, shared/campaign/encounter.js). Coming back, the map reports each result once, takes
// destroyed parties off the map and gives taken settlements to the Resistance. The campaign clock runs with the map
// clock and heals the wounded. The Party button opens the band: promotions paid with experience and stolen kit.
import {mountCampaignShell} from './campaign-shell.js';
import {mountJournal} from './campaign-journal.js';
import {mountCampaignHud, organiseBand, kitRounds} from './campaign-hud.js';
import {
  fitFighters,
  sourceFor,
  encounterFor,
  missionName,
  settlementSource,
  readResults,
  isGone,
  ownerOf,
  SOURCES,
  ACTIONS,
} from '../shared/campaign/contacts.js';
import {response} from '../shared/campaign/response.js';
import {villageServices} from './village-services.js';
import {counterSource, provisions} from '../shared/campaign/territory.js';
import {SQUAD_MIN} from '../convoy/roster.js';
import {squadPicker} from './encounter-squad.js';
import {rest, safeHaven, operation} from '../shared/campaign/operations.js';
import {deploy} from '../shared/campaign/encounter.js';
import {mountWorld} from './campaign-world.js';
import {wornLook} from '../shared/campaign/looks.js';
import {TROOPS, GEAR} from '../band/troops.js';
import {createCamp, NAMES} from '../convoy/camp.js';
import {SETTLEMENTS, byId} from './island.js';
import {groundAt} from '../shared/campaign/nav.js';
import {createKitScreen} from './kit-screen.js';
import {rememberFocus, trapTab} from '../shared/modal.js';
import {describeManifest, describeProvenance, provenance, recordIn, FIRST_CACHE} from '../shared/campaign/cargo.js';
import {AMBUSHES} from '../convoy/levels/columns.js';
import {campOf, rebuildingFor, CAMP_RANGE, FIRST_CAMP} from '../shared/campaign/defence.js';
import {prepare, withdrawWithRearguard, stancesFor, caughtBy} from '../shared/campaign/stances.js';
import {lootReport} from '../shared/campaign/loot-report.js';
import {resolveAuto} from '../shared/campaign/auto-resolve.js';
import {autoChoice} from './encounter-auto.js';
import {sidesLine, actionRow} from './encounter-actions.js';

const CONTACT = 12, // map units: close enough to fight
  RAID = 22, // around a settlement's centre
  CLEAR = 34; // after Leave, a contact is ignored until the band is this far away
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

/** Replace a panel's content; empty parts (a null for "nothing to show") are left out instead of printed. */
const fill = (node, ...kids) => node.replaceChildren(...kids.flat().filter(k => k !== null && k !== undefined && k !== false && k !== ''));

export function mountCampaign({travel, parties, townLabels, setSpeed, getSpeed = () => 1, toast, rings = null, dressBand = null}) {
  const campaign = travel.campaign;
  if (!campaign) return null;
  const save = () => travel.save();
  const names = Object.fromEntries(SETTLEMENTS.map(s => [s.id, s.name]));

  // ---------- what happened while we were away ----------
  const wasAt = {...campaign.world.party};
  const lines = readResults(campaign, names, {settlements: SETTLEMENTS});
  // an overrun camp moves the band to the settlement it fell back to (shared/campaign/defence.js, WP-W11)
  if (campaign.world.party && (campaign.world.party.x !== wasAt.x || campaign.world.party.z !== wasAt.z)) {
    Object.assign(travel.party, {x: campaign.world.party.x, z: campaign.world.party.z, route: null});
    travel.place();
  }
  // the world in motion and its news on the map (map/campaign-world.js, WP-W5, W6, W7)
  const {world, stepHunters, news} = mountWorld({campaign, travel, parties, toast, save, rings});
  stepHunters(0);
  save();
  if (lines.length) toast(lines.join(' '), 7000);
  function refreshWorld() {
    for (const p of parties.parties) if (p.id && isGone(campaign, p.id)) p.hide();
    for (const l of townLabels) {
      const owner = ownerOf(campaign, l.s);
      l.el.classList.remove('invader', 'neutral', 'resistance');
      l.el.classList.add(owner);
      l.el.classList.toggle('burnt', !!campaign.world.burnt?.includes(l.s.id)); // an overrun camp (WP-W11)
      l.el
        .querySelector('.shield')
        .style.setProperty('--c', owner === 'resistance' ? '#3f8a4a' : owner === 'invader' ? '#b0473c' : '#c9a24a');
    }
  }
  refreshWorld();

  // ---------- the encounter panel ----------
  const panel = el('div', {class: 'encounter hud', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'enc-title', hidden: true});
  document.body.append(panel);
  trapTab();
  let backFromEncounter = () => {},
    backFromBand = () => {}; // put focus back where it was when a panel opened (shared/modal.js)
  let open = null, // {id, source, at: {x, z}}
    ignored = null,
    resumeSpeed = 1; // the contact the player chose to leave
  function showEncounter(c) {
    if (open) return;
    resumeSpeed = getSpeed();
    open = c;
    travel.party.route = null;
    travel.drawRoute();
    setSpeed(0);
    const src = c.source,
      act = ACTIONS[src.kind],
      fit = Object.keys(campaign.band.fighters).filter(id => !campaign.band.fighters[id].wounded); // every fit fighter
    // where it happens sets the map and the conditions: the ground under the band, and whether its camp is near
    // the cave is Oros Camp's own defence; a camp the band fell back to is defended in the open (WP-W11)
    const camp = campOf(campaign, SETTLEMENTS);
    const e = encounterFor(campaign, c.id, src, {
      ground: groundAt(travel.nav, travel.party.x, travel.party.z),
      nearCamp: camp.id === FIRST_CAMP && Math.hypot(travel.party.x - camp.x, travel.party.z - camp.z) < CAMP_RANGE,
    });
    const v = e.variant,
      cond = [v.time === 'day' ? 'by day' : v.time, v.weather === 'clear' ? '' : v.weather, v.ground === 'plain' ? '' : v.ground]
        .filter(Boolean)
        .join(', ');
    // who goes in (WP-W12, map/encounter-squad.js): six to nine of the fit fighters; the rest stay with the band
    const auto = autoChoice({el, campaign, encounter: e, onResolve: () => autoFight(e)});
    const picker = squadPicker({
      el,
      campaign,
      names: NAMES,
      fit,
      first: fitFighters(campaign).slice(0, src.kind === 'roadblock' ? 3 : 9),
      min: src.kind === 'roadblock' ? 2 : SQUAD_MIN,
      max: src.kind === 'roadblock' ? 4 : 9,
      onPick: ids => {
        e.fighters = ids;
        auto.sync();
      },
    });
    fill(
      panel,
      el('h2', {id: 'enc-title', class: 'plate'}, src.name),
      el('p', {class: 'enc-mission'}, `${missionName(e.level)} · ${src.strength} enemy · ${cond}`),
      el('p', {class: 'enc-response'}, `Occupation response: ${response(campaign).label} · tier ${e.variant.response.tier}`),
      sidesLine(el, {campaign, fit, ground: e.ground}), // both sides and the ground (WP-W8)
      // a convoy's manifest: what a won ambush brings home, less what burns (shared/campaign/cargo.js, WP-W14)
      e.cargo ? el('p', {class: 'enc-cargo'}, `Cargo: ${describeManifest(e.cargo)}.`) : null,
      // how the ambush starts (WP-W9): the roadblock, or a road charge that costs a demolition charge from the stash
      e.variant?.convoy
        ? el(
            'fieldset',
            {class: 'enc-ambush'},
            el('legend', {}, 'Ambush start'),
            Object.entries(AMBUSHES).map(([id, a]) => {
              const short = Object.entries(a.spend || {}).some(([g, n]) => (campaign.stash[g] || 0) < n);
              return el(
                'label',
                {},
                el('input', {
                  type: 'radio',
                  name: 'ambush',
                  value: id,
                  checked: id === e.variant.ambush,
                  disabled: short,
                  onchange: () => {
                    e.variant.ambush = id;
                    e.spend = a.spend || {};
                  },
                }),
                el('b', {}, ` ${a.label}`),
                el(
                  'small',
                  {},
                  ` ${a.text}${a.spend ? ` Uses ${describeManifest(a.spend)} from the stash${short ? '; there is none' : ''}.` : ''}`,
                ),
              );
            }),
          )
        : null,
      e.variant.settlement
        ? el(
            'label',
            {},
            'Operation ',
            el(
              'select',
              {
                id: 'enc-intent',
                'aria-label': 'Settlement operation',
                onchange: event => {
                  e.variant.settlement.intent = event.target.value;
                },
              },
              el('option', {value: 'capture'}, 'Liberate the settlement'),
              el('option', {value: 'raid'}, 'Raid supplies and leave'),
            ),
          )
        : null,
      ...picker.nodes,
      auto.node,
      // attack, prepare an ambush, withdraw leaving a rearguard, leave (map/encounter-actions.js, WP-W8)
      actionRow({
        el,
        kind: src.kind,
        caught: caughtBy(campaign, c.id),
        verb: act.verb,
        canAttack: fit.length >= (src.kind === 'roadblock' ? 2 : SQUAD_MIN),
        fit,
        names: NAMES,
        onAttack: () => attack(e),
        onPrepare: () => {
          prepare(campaign, e); // two hours pass: the clock, healing
          attack(e);
        },
        onRearguard: id => rearguard(c, id),
        onLeave: leave,
      }),
    );
    picker.sync(panel);
    if (panel.hidden) backFromEncounter = rememberFocus();
    panel.hidden = false;
    panel.querySelector('.enc-actions button:not([disabled])')?.focus();
  }
  /** Resolve on a copy: a failed storage write leaves the original encounter available for a safe retry. */
  function autoFight(e) {
    const before = structuredClone(campaign),
      next = structuredClone(campaign);
    let lines, result;
    try {
      ({result} = resolveAuto(next, {...e, at: open?.at || null}));
      lines = readResults(next, Object.fromEntries(SETTLEMENTS.map(s => [s.id, s.name])), {settlements: SETTLEMENTS});
    } catch (err) {
      toast(err.message);
      return;
    }
    Object.assign(campaign, next);
    if (!save()) {
      Object.assign(campaign, before);
      toast('Cannot resolve: campaign storage is unavailable. Free browser storage and try again.');
      return;
    }
    refreshWorld();
    renderCard();
    fill(
      panel,
      el('h2', {id: 'enc-title'}, 'Combat result'),
      lootReport(result),
      el('button', {id: 'enc-report-close', onclick: closeEncounter}, 'Return to the map'),
    );
    panel.querySelector('#enc-report-close').focus();
    toast(lines.join(' '), 7000);
  }
  /** Hunters caught the band: one fighter holds them while the rest get away (shared/campaign/stances.js). */
  function rearguard(c, id) {
    const home = parties.parties.find(p => p.id === c.id)?.home || [c.at.x, c.at.z];
    try {
      withdrawWithRearguard(campaign, c.id, id, home);
    } catch (err) {
      toast(err.message);
      return;
    }
    stepHunters(0);
    save();
    toast(`${NAMES[id] || id} holds the rear while the band gets away. ${c.source.name} fall back to their post.`);
    closeEncounter();
  }
  function leave() {
    if (!open) return;
    if (!stancesFor(open.source.kind, {caught: caughtBy(campaign, open.id)}).leave) return; // caught: fight, or leave a rearguard
    closeEncounter();
  }
  /** Close the panel and let the world run on; this contact is ignored until the band has moved off. */
  function closeEncounter() {
    if (!open) return;
    ignored = open;
    open = null;
    panel.hidden = true;
    setSpeed(resumeSpeed);
    backFromEncounter();
  }
  function attack(e) {
    try {
      // where it happens (the aftermath is left there, WP-W13): hunters fight the band where they catch it, at the band
      // (so a fight at the camp is the camp's defence, WP-W11); everyone else where they stand
      const at = open?.source?.kind === 'hunters' ? {x: travel.party.x, z: travel.party.z} : open?.at || null;
      deploy(campaign, {...e, at});
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
      const source = sourceFor(campaign, p.id) || counterSource(campaign, p.id);
      if (!p.id || !source || !p.root.visible || isGone(campaign, p.id)) continue;
      const pos = {x: p.root.position.x, z: p.root.position.z};
      if (near(at, pos, CONTACT)) return {id: p.id, source, at: pos};
    }
    for (const s of SETTLEMENTS)
      if (ownerOf(campaign, s) === 'invader' && near(at, s, RAID))
        return {id: s.id, source: settlementSource(s, campaign), at: {x: s.x, z: s.z}};
    return null;
  }

  // ---------- the clock: campaign time, healing ----------
  function clockText() {
    const k = campaign.world.clock,
      season = SEASONS[Math.floor((k.day - 1) / 30) % 4];
    return `${season} ${((k.day - 1) % 30) + 1}, Year ${6 + Math.floor((k.day - 1) / 120)} of the Occupation · ${String(Math.floor(k.hour)).padStart(2, '0')}:00`;
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
  // closing a kit goes back to that fighter's button (the band panel may have been redrawn meanwhile)
  const kitScreen = createKitScreen({
    campaign,
    save,
    names: NAMES,
    onClose: id => {
      dress(); // a helmet or a vest put on shows on the map (WP-W17)
      (bandPanel.querySelector(`.kit-open[data-id="${id}"]`) || bandPanel.querySelector('.kit-open'))?.focus();
    },
  });
  /** The band figure on the map: its first three fighters as they look (class outfit and worn kit, WP-W17). */
  function dress() {
    dressBand?.(
      Object.entries(campaign.band.fighters)
        .slice(0, 3)
        .map(([id, f]) => ({id, cls: f.class, wear: wornLook(f.kit)})),
    );
  }
  dress();
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
      // what the trader sold the band is labelled as such (WP-W14)
      const bought = Object.fromEntries(
        Object.entries(next.stash)
          .map(([g, n]) => [g, n - (campaign.stash[g] || 0)])
          .filter(([, d]) => d > 0),
      );
      campaign.stash = next.stash;
      recordIn(campaign, bought, 'the trader');
      campaign.goods = next.goods;
      campaign.scrip = next.scrip;
      save();
      dress(); // a promotion changes the outfit (WP-W17)
      if (why) toast(why);
      renderBand();
      renderCard();
      bandPanel.querySelector('.path.ready button, button')?.focus();
    },
  });
  function renderBand() {
    campaign.world.party = {...travel.party};
    const occupation = response(campaign);
    const rebuilding = rebuildingFor(campaign);
    const haven = safeHaven(campaign, SETTLEMENTS, travel.party);
    const food = haven && haven.kind !== 'camp' ? provisions(campaign, haven).food : 0;
    const hurt = Object.entries(campaign.band.fighters).filter(([, f]) => f.wounded);
    const gear = Object.entries(campaign.stash).filter(([g]) => GEAR[g]);
    fill(
      bandPanel,
      el('h2', {id: 'band-title', class: 'plate'}, 'Band & supplies'),
      el('p', {}, operation(campaign).text),
      el(
        'p',
        {id: 'campaign-response'},
        `Occupation response: ${occupation.label} (tier ${occupation.tier}). Strength ${occupation.score}: ${occupation.fighters} from fighters + ${occupation.seats * 12} from liberated seats. ${occupation.next ? `Next tier at ${occupation.next}.` : 'Highest tier.'} Heat ${Math.round(campaign.world.heat)} controls hunter deployment.`,
      ),
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
      // the full Rebel Band screen on this campaign's save: fighters, troop stacks, class tree and stash (WP-W15)
      el('a', {class: 'band-screen', href: `../band/?campaign=${encodeURIComponent(campaign.id)}`}, 'Open the band screen'),
      hurt.length
        ? el('p', {class: 'hurt'}, hurt.map(([id, f]) => `${NAMES[id] || id} is wounded (${Math.ceil(f.healIn)}h)`).join(' · '))
        : null,
      camp.squadCards({}),
      el('h3', {}, 'Recovery and resupply'),
      el(
        'p',
        {class: 'note'},
        safeHaven(campaign, SETTLEMENTS, travel.party)
          ? 'Safe haven: rest here. Neutral and liberated villages offer barter; liberated villages also offer volunteers.'
          : 'Reach a friendly or independent settlement to rest and trade.',
      ),
      food
        ? el(
            'p',
            {class: 'territory-food'},
            `Recovery supplies: ${food} meals this week. Each 12 hours of rest uses one meal for six extra hours of wound recovery.`,
          )
        : null,
      ...[12, 24, 48].map(hours =>
        el(
          'button',
          {
            disabled: !safeHaven(campaign, SETTLEMENTS, travel.party),
            onclick: () => {
              try {
                campaign.world.party = {x: travel.party.x, z: travel.party.z};
                // the world runs on meanwhile (WP-W5): hunters close in, convoys come and go
                rest(campaign, SETTLEMENTS, hours, h => {
                  const r = world.skip(h);
                  news(r);
                  refreshWorld();
                  stepHunters(0);
                  return r.healed;
                });
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
      // a camp the band fell back to is rebuilding for three days: no trade, no kit changes (TAC-K-03, WP-W11)
      rebuilding
        ? el(
            'p',
            {class: 'note rebuilding'},
            `The new camp at ${campOf(campaign, SETTLEMENTS).name} is rebuilding: ${Math.ceil(rebuilding)} h left. No trade or kit changes until then.`,
          )
        : null,
      villageServices({
        el,
        campaign,
        settlement: haven,
        save,
        refresh: () => {
          renderBand();
          renderCard();
          bandPanel.querySelector('#village-recruit:not([disabled]), #village-services input')?.focus();
        },
        toast,
      }),
      el('h3', {}, 'Kit: magazines and rounds'),
      el(
        'div',
        {class: 'kit-buttons'},
        Object.keys(campaign.band.fighters).map(id =>
          el(
            'button',
            {class: 'kit-open', 'data-id': id, disabled: !!rebuilding, onclick: () => kitScreen.open(id)},
            `${NAMES[id] || id}'s kit`,
          ),
        ),
      ),
      // the Weapon Modder for each fighter: only the band's own parts, and the build they carry (WP-W16)
      el('h3', {}, 'Guns: the Weapon Modder'),
      el(
        'div',
        {class: 'kit-buttons'},
        Object.keys(campaign.band.fighters).map(id =>
          el(
            'a',
            {
              class: 'gun-open',
              'data-id': id,
              href: `../workbench/?campaign=${encodeURIComponent(campaign.id)}&fighter=${encodeURIComponent(id)}`,
            },
            `${NAMES[id] || id}'s gun${campaign.band.fighters[id].build ? ` (${campaign.band.fighters[id].build.rifle.toUpperCase()})` : ''}`,
          ),
        ),
      ),
      el('h3', {}, `Stash · ${gear.reduce((a, [, n]) => a + n, 0)} items`),
      el(
        'ul',
        {class: 'stash-list'},
        // each with where it came from (WP-W14)
        gear.map(([g, n]) =>
          el(
            'li',
            {},
            `${GEAR[g].label}${n > 1 ? ` × ${n}` : ''}`,
            el('small', {class: 'from'}, describeProvenance(provenance(campaign, g).filter(p => p.from !== FIRST_CACHE))),
          ),
        ),
      ),
      el('div', {class: 'enc-actions'}, el('button', {onclick: () => toggleBand(false)}, 'Close')),
    );
    organiseBand(bandPanel, campaign);
  }
  function toggleBand(on = bandPanel.hidden) {
    if (on && bandPanel.hidden) backFromBand = rememberFocus(() => partyButton);
    const was = !bandPanel.hidden;
    bandPanel.hidden = !on;
    if (!on && was) backFromBand();
    if (on) {
      renderBand();
      setSpeed(0);
      bandPanel.querySelector('button:not([disabled]), a[href]')?.focus();
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
  if (partyButton) {
    partyButton.hidden = false; // only a campaign has a band to show
    partyButton.onclick = () => toggleBand(true);
  }

  // the party card: the band's real numbers
  let lastCard = '';
  function renderCard() {
    const f = Object.values(campaign.band.fighters);
    const card = document.querySelector('.party-card dl');
    if (!card) return;
    const rows = [
      ['Fit fighters', `${f.filter(x => !x.wounded).length} / ${f.length}`],
      ['Wounded', f.filter(x => x.wounded).length],
      ['Carried rounds', f.reduce((n, x) => n + kitRounds(x.kit), 0)],
      ['Reserve items', Object.values(campaign.stash).reduce((a, n) => a + n, 0)],
      ['Response', response(campaign).label],
      ['Heat', Math.round(campaign.world.heat)],
    ];
    const signature = JSON.stringify(rows);
    if (signature === lastCard) return;
    lastCard = signature;
    const count = parties.parties.find(p => p.kind === 'player')?.plate.querySelector('.pcount');
    if (count) count.textContent = String(f.filter(x => !x.wounded).length);
    card.replaceChildren(...rows.flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, String(v))]));
  }
  renderCard();
  const hud = mountCampaignHud({
    campaign,
    travel,
    getSpeed,
    refresh: renderCard,
    blocked: () => !!open || !bandPanel.hidden || kitScreen.isOpen,
  });

  const journal = mountJournal(campaign, {
    ...names,
    ...NAMES,
    ...Object.fromEntries(Object.entries(SOURCES).map(([id, s]) => [id, s.name])),
  });

  const shell = mountCampaignShell({toggleBand, setSpeed, getSpeed});

  // ---------- each frame ----------
  let sinceCard = 0;
  function update(dt) {
    hud.update();
    shell.update();
    journal.update();
    if (open || !bandPanel.hidden || kitScreen.isOpen) return;
    const step = world.step(dt), // time, the convoys, the band's march, the hunters (WP-W5, W6, W11)
      healed = step.healed;
    stepHunters(0);
    news(step);
    if (step.territory.length) refreshWorld();
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
    world, // the fixed-step world simulation (shared/campaign/world.js)
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
