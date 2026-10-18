// Campaign journal formatting and deterministic daily rumours; no positions or hidden enemy strengths are exposed.
import {logEvent} from './state.js';
export function rumour(c) {
  const {day, hour} = c.world.clock;
  if (hour < 8 || c.world.rumourDay >= day) return false;
  c.world.rumourDay = day;
  const reports = [
    'Travellers report military trucks on the main roads. Their destination is unknown.',
    'A local contact heard engines after dark. This may be a supply convoy; the report is unconfirmed.',
    'Villagers say occupation patrols have been asking about the resistance. No route has been confirmed.',
  ];
  logEvent(c, {kind: 'rumour', text: reports[((c.seed >>> 0) + day) % reports.length], source: 'Local contacts'});
  return true;
}
export function journalEntry(e, names = {}) {
  const name = id => names[id] || id || 'Unknown';
  let text,
    source = 'Band report';
  if (e.kind === 'healed') text = `${(e.fighters || []).map(name).join(', ')} recovered and ready for duty.`;
  else if (e.kind === 'rumour') {
    text = e.text;
    source = 'Rumour · unconfirmed';
  } else if (e.kind === 'counterattack-out') {
    text = `An occupation column has orders to retake ${name(e.target)}. Its current position is unknown.`;
    source = 'Intercepted orders';
  } else if (e.kind === 'retaken') text = `${name(e.target)} has fallen to the occupier.`;
  else if (e.kind === 'rest') text = `Rested ${e.hours} hours at ${name(e.settlement)}.`;
  else if (e.kind === 'result')
    text = `${e.outcome === 'won' ? 'Victory' : e.outcome === 'lost' ? 'Defeat' : 'Withdrawal'} at ${name(e.source)}.`;
  else return null;
  return {
    seq: e.seq,
    kind: e.kind,
    source,
    text: String(text || ''),
    time: `Day ${e.day || 1} · ${String(Math.floor(e.hour || 0)).padStart(2, '0')}:00`,
  };
}
