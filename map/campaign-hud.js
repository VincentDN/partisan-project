// Campaign overview: durable objectives, current travel state and concise next-step guidance without demo statistics.
import {operation} from '../shared/campaign/operations.js';
import {provinceAt} from './island.js';
import {ARMS} from '../shared/inventory/arms.js';
import {kitCounts} from '../shared/campaign/loot-report.js';

export function kitRounds(kit) {
  const counts = kitCounts({fighter: kit});
  return [...new Set(Object.values(ARMS).map(a => a.round))].reduce((n, slug) => n + (counts[slug] || 0), 0);
}
export function mountCampaignHud({campaign, travel, getSpeed, blocked, refresh}) {
  document.body.classList.add('campaign-active');
  const objective = document.createElement('section');
  objective.className = 'campaign-objective hud';
  objective.setAttribute('aria-label', 'Campaign objective');
  objective.innerHTML =
    '<p class="eyebrow">CAMPAIGN · OPERATION 01</p><h2>Establish a foothold</h2><p class="objective-next"></p><details><summary>Operation progress <span></span></summary><ul></ul></details>';
  document.querySelector('main').append(objective);
  const route = document.createElement('section');
  route.className = 'campaign-route hud';
  route.setAttribute('aria-label', 'Travel status');
  route.innerHTML = '<strong></strong><p></p>';
  document.querySelector('main').append(route);
  const menu = document.querySelector('.menu-bar');
  const button = (id, text, action) => {
    const b = document.createElement('button');
    b.id = id;
    b.textContent = text;
    b.onclick = action;
    menu.append(b);
    return b;
  };
  button('centre-band', 'Find band · F', () => travel.focus());
  const stop = button('stop-march', 'Stop travel', () => {
    if (!blocked()) travel.stop();
  });
  stop.title = 'Cancel the route. The campaign clock keeps running.';
  const help = document.createElement('details');
  help.className = 'campaign-help';
  help.innerHTML =
    '<summary>Controls</summary><div><strong>Move your band</strong><p>Click land to travel. Drag to move the map. Scroll to zoom.</p><p><kbd>F</kbd> find band · <kbd>P</kbd> band and supplies<br><kbd>Space</kbd> pause · <kbd>1</kbd>–<kbd>3</kbd> speed<br><kbd>WASD</kbd> pan · <kbd>Q</kbd> / <kbd>E</kbd> rotate</p><p>Map key: green is Resistance, red is Invader, gold is independent.</p><p>Reach a friendly or independent settlement to rest. Loot bodies after combat to find ammunition and better equipment.</p></div>';
  menu.append(help);
  const partyButton = menu.querySelector('[data-label="Party"]');
  if (partyButton) partyButton.textContent = 'Band & supplies · P';
  const title = document.querySelector('.party-card h2');
  if (title) title.textContent = 'Your band';
  let signature = '',
    nextAt = 0;
  function update() {
    if (performance.now() < nextAt) return;
    nextAt = performance.now() + 200;
    refresh();
    const op = operation(campaign),
      fighters = Object.values(campaign.band.fighters);
    const fit = fighters.filter(f => !f.wounded).length;
    const rounds = fighters.reduce((n, f) => n + kitRounds(f.kit), 0);
    const goal = travel.party.route?.points?.at(-1),
      speed = getSpeed();
    const state = JSON.stringify([op, fit, rounds, goal, speed, blocked()]);
    if (state === signature) return;
    signature = state;
    const steps = [
      [op.convoy, 'Intercept a convoy'],
      [op.victories >= 3, `Win three battles (${Math.min(3, op.victories)}/3)`],
      [op.fort, 'Liberate Fort Orion'],
    ];
    objective.querySelector('summary span').textContent = `${steps.filter(([done]) => done).length}/3`;
    const list = objective.querySelector('ul');
    list.replaceChildren(
      ...steps.map(([done, text]) => {
        const li = document.createElement('li');
        li.textContent = `${done ? '✓' : '○'} ${text}`;
        li.classList.toggle('complete', done);
        return li;
      }),
    );
    objective.querySelector('.objective-next').textContent = op.complete
      ? 'Foothold secured. Keep building your resistance.'
      : fit < 6
        ? 'Recover your wounded at a safe settlement. You need six fit fighters.'
        : rounds === 0
          ? 'Check your kits: no carried ammunition. Equip recovered supplies before fighting.'
          : !op.convoy
            ? 'Next: intercept a convoy. Loot its escort for weapons and ammunition.'
            : op.victories < 3
              ? 'Next: win more battles, recover supplies and prepare your band.'
              : 'Next: liberate Fort Orion to secure your foothold.';
    route.querySelector('strong').textContent = goal
      ? `${speed ? 'Travelling' : 'Travel paused'} · ${provinceAt(goal.x, goal.z).name}`
      : 'No travel order';
    route.querySelector('p').textContent = goal
      ? 'Route marked on the map. Stop travel cancels this order.'
      : 'Click land to set a route. The clock starts when you move.';
    stop.disabled = !goal || blocked();
  }
  update();
  return {update};
}

/** Put each fighter's kit/build actions beside their readiness, rather than in two separate repeated lists. */
export function organiseBand(panel, campaign) {
  for (const card of panel.querySelectorAll('[data-squad]')) {
    const id = card.dataset.squad,
      f = campaign.band.fighters[id];
    const ready = document.createElement('p');
    ready.className = 'fighter-readiness';
    ready.textContent = `${f.wounded ? `Recovering · ${Math.ceil(f.healIn)}h` : 'Fit for deployment'} · ${kitRounds(f.kit)} carried rounds`;
    card.prepend(ready);
    const actions = document.createElement('div');
    actions.className = 'fighter-actions';
    for (const selector of ['.kit-open', '.gun-open']) {
      const b = panel.querySelector(`${selector}[data-id="${id}"]`);
      if (!b) continue;
      b.setAttribute('aria-label', b.textContent);
      b.textContent = selector === '.kit-open' ? 'Kit & ammunition' : 'Weapon build';
      actions.append(b);
    }
    card.append(actions);
  }
  for (const box of panel.querySelectorAll('.kit-buttons'))
    if (!box.children.length) {
      box.previousElementSibling?.remove();
      box.remove();
    }
  const stash = panel.querySelector('.stash-list');
  if (stash && !stash.children.length) {
    const li = document.createElement('li');
    li.className = 'empty-stash';
    li.textContent = 'No reserve equipment. Each fighter carries their own kit. Recover supplies from combat to build your stash.';
    stash.append(li);
  }
  const roster = panel.querySelector('.squad-cards');
  const recovery = [...panel.querySelectorAll('h3')].find(h => h.textContent === 'Recovery and resupply');
  const reserve = stash?.previousElementSibling;
  const jumps = document.createElement('nav');
  jumps.className = 'band-jumps';
  jumps.setAttribute('aria-label', 'Band sections');
  for (const [label, target] of [
    ['Fighters', roster],
    ['Recovery & trade', recovery],
    ['Reserve stash', reserve],
  ]) {
    if (!target) continue;
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = () => {
      target.scrollIntoView({block: 'start'});
      target.focus({preventScroll: true});
    };
    jumps.append(b);
    target.tabIndex = -1;
    target.setAttribute('aria-label', label);
    target.classList.add('band-section');
  }
  panel.querySelector('#band-title')?.after(jumps);
  const footer = panel.querySelector(':scope > .enc-actions');
  if (footer) footer.classList.add('panel-footer');
}
