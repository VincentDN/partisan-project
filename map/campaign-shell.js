// Paper campaign frame: reuse live management, reports and clock controls without changing the island renderer.
export function mountCampaignShell({toggleBand, setSpeed, getSpeed}) {
  const $ = s => document.querySelector(s);
  const main = $('main');
  const side = document.createElement('aside');
  side.className = 'command-panel hud';
  side.id = 'campaign-management';
  side.setAttribute('aria-label', 'Resistance command');
  side.innerHTML = '<header><h2>PARTISAN</h2><p>RESISTANCE COMMAND</p></header><nav class="command-nav" aria-label="Management"></nav>';
  main.append(side);
  const nav = side.querySelector('nav');
  const button = (id, icon, label, action) => {
    const b = document.createElement('button');
    b.id = id;
    b.innerHTML = `<span aria-hidden="true">${icon}</span><span>${label}</span>`;
    b.onclick = action;
    return b;
  };
  const select = b => {
    for (const item of nav.querySelectorAll('button')) item.removeAttribute('aria-current');
    b.setAttribute('aria-current', 'page');
  };
  const focus = node => {
    node.tabIndex = -1;
    node.focus({preventScroll: true});
    node.scrollIntoView({block: 'nearest'});
  };
  const overview = button('command-overview', '◈', 'Overview', () => {
    select(overview);
    focus($('.party-card'));
  });
  nav.append(overview);
  select(overview);
  const party = $('[data-label="Party"]');
  party.innerHTML = '<span aria-hidden="true">♟</span><span>Rebel band</span>';
  nav.append(party);
  const stash = button('command-stash', '▣', 'Stash', () => {
    toggleBand(true);
    $('.band-jumps button:last-child')?.click();
  });
  const operations = button('command-operations', '⚑', 'Operations', () => {
    select(operations);
    const progress = $('.campaign-objective details');
    progress.open = true;
    document.body.classList.add('reports-open');
    focus($('.campaign-objective'));
  });
  const journal = button('command-journal', '▤', 'Journal', () => {
    select(journal);
    document.body.classList.add('reports-open');
    $('#campaign-journal').open = true;
    focus($('#campaign-journal summary'));
  });
  const intelligence = button('command-intelligence', '⌁', 'Intelligence', () => {
    journal.click();
    select(intelligence);
    $('#campaign-journal').dataset.filter = 'intel';
  });
  const showJournal = journal.onclick;
  journal.onclick = () => {
    $('#campaign-journal').dataset.filter = '';
    showJournal();
  };
  nav.append(stash, operations, intelligence, journal);
  side.querySelector('header').after($('.party-card'));
  side.append($('.campaign-route'), $('.legend'));
  const utilities = document.createElement('div');
  utilities.className = 'command-utilities';
  utilities.append($('.campaign-help'));
  if ($('#campaign-sfx')) utilities.append($('#campaign-sfx'));
  side.append(utilities);
  const reports = document.createElement('aside');
  reports.className = 'campaign-reports';
  reports.setAttribute('aria-label', 'Objectives and field reports');
  const events = document.createElement('section');
  events.className = 'field-reports hud';
  events.innerHTML = '<h2>Field reports</h2>';
  events.append($('.journal-latest'), $('.journal-recent'), $('#campaign-journal'));
  reports.append($('.campaign-objective'), events);
  main.append(reports);
  const bar = $('.timebar');
  const controls = document.createElement('div');
  controls.className = 'command-controls';
  const play = button('campaign-play', '▶︎', 'Play', () => setSpeed(getSpeed() ? 0 : 1));
  play.title = 'Play or pause the campaign (Space)';
  controls.append($('#centre-band'), $('#stop-march'), $('[data-speed="0"]'), play, $('.speeds'));
  bar.prepend(controls);
  $('.menu-bar').remove();
  const drawer = button('command-toggle', '☰', 'Command', () => {
    document.body.classList.remove('reports-open');
    reportToggle.setAttribute('aria-expanded', 'false');
    const on = document.body.classList.toggle('command-open');
    drawer.setAttribute('aria-expanded', String(on));
  });
  drawer.setAttribute('aria-controls', side.id);
  drawer.setAttribute('aria-expanded', 'false');
  const reportToggle = button('reports-toggle', '▤', 'Reports', () => {
    const on = document.body.classList.toggle('reports-open');
    reportToggle.setAttribute('aria-expanded', String(on));
  });
  reports.id = 'campaign-reports';
  reportToggle.setAttribute('aria-controls', reports.id);
  reportToggle.setAttribute('aria-expanded', 'false');
  main.append(drawer, reportToggle);
  $('#centre-band').textContent = '⌖ Centre';
  $('#stop-march').textContent = 'Stop travel';
  $('.legend').open = false;
  let previous;
  return {
    update() {
      const running = !!getSpeed();
      if (running === previous) return;
      previous = running;
      play.querySelector('span').textContent = '';
      play.dataset.running = String(running);
      play.querySelector('span:last-child').textContent = running ? 'Pause' : 'Play';
      play.setAttribute('aria-label', running ? 'Pause campaign' : 'Play campaign');
    },
  };
}
