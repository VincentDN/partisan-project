// Accessible campaign event history with a quiet recovery cue; old entries never replay audio on reload.
import {journalEntry} from '../shared/campaign/journal.js';
import {audio} from '../shared/sfx.js';
function recoverySound() {
  try {
    const prefs = JSON.parse(localStorage.getItem('parp-sfx') || '{}');
    if (prefs.on === false || prefs.volume === 0 || document.hidden || !navigator.userActivation?.hasBeenActive) return;
    const {ctx, out} = audio();
    for (const [i, frequency] of [440, 660].entries()) {
      const osc = ctx.createOscillator(),
        gain = ctx.createGain(),
        t = ctx.currentTime + i * 0.12;
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.06 * (prefs.volume ?? 0.8), t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(gain).connect(out);
      osc.start(t);
      osc.stop(t + 0.25);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    }
  } catch {
    /* Audio is optional; the recovery always remains in the log. */
  }
}
export function mountJournal(campaign, names) {
  const host = document.querySelector('.campaign-objective');
  const details = document.createElement('details');
  details.id = 'campaign-journal';
  const summary = document.createElement('summary'),
    list = document.createElement('ol'),
    status = document.createElement('p');
  status.className = 'journal-latest sr-only';
  const recent = document.createElement('ol');
  recent.className = 'journal-recent';
  status.setAttribute('role', 'status');
  summary.textContent = 'Field log';
  details.append(summary, list);
  host.append(status, recent, details);
  let last = campaign.log.at(-1)?.seq || 0,
    signature = '';
  function update() {
    const seq = campaign.log.at(-1)?.seq || 0;
    const filter = details.dataset.filter || '';
    if (signature === `${seq}:${filter}`) return;
    signature = `${seq}:${filter}`;
    const fresh = campaign.log.filter(e => e.seq > last);
    if (fresh.some(e => e.kind === 'healed')) recoverySound();
    last = seq;
    const entries = campaign.log
      .filter(e => !filter || ['rumour', 'counterattack-out'].includes(e.kind))
      .map(e => journalEntry(e, names))
      .filter(Boolean)
      .reverse();
    list.replaceChildren(
      ...entries.map(e => {
        const li = document.createElement('li'),
          label = document.createElement('small'),
          text = document.createElement('p');
        label.textContent = `${e.time} · ${e.source}`;
        text.textContent = e.text;
        li.append(label, text);
        return li;
      }),
    );
    recent.replaceChildren(...[...list.children].slice(0, 3).map(li => li.cloneNode(true)));
    if (!entries.length)
      recent.textContent = filter ? 'No intelligence reports yet.' : 'No reports yet. Recoveries and field intelligence appear here.';
    summary.textContent = `Field log · ${entries.length} reports`;
    status.textContent = entries[0]?.text || 'No reports yet. Recoveries and field intelligence will appear here.';
  }
  update();
  return {update};
}
