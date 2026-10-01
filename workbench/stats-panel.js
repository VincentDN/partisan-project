// Stats panel: tiles plus stat bars, with a delta preview for a hovered part.
import {STATS} from './stats.js';
import {buildSummary} from './summary.js';

/** @param {HTMLElement} panel @param {any} rifle @param {import('three').Box3} buildBox @param {Record<string,string>} [preview] */
export function renderStatsPanel(panel, rifle, buildBox, preview) {
  const now = buildSummary(rifle, rifle.build),
    next = preview ? buildSummary(rifle, preview) : now;
  const delta = (a, b, better) => {
    if (a === b) return '';
    const good = better === 'low' ? b < a : b > a;
    return `<em class="${good ? 'up' : 'down'}">${b > a ? '+' : ''}${b - a}</em>`;
  };
  const kg = g => (g / 1000).toFixed(2);
  const tiles = [
    ['Overall length', `${Math.round((buildBox.max.x - buildBox.min.x) * 1000)} mm`, ''],
    [
      'Weight, empty',
      `${kg(next.grams)} kg`,
      next.grams !== now.grams
        ? `<em class="${next.grams < now.grams ? 'up' : 'down'}">${next.grams > now.grams ? '+' : ''}${kg(next.grams - now.grams)}</em>`
        : '',
    ],
    ['Capacity', `${next.rounds} rds`, delta(now.rounds, next.rounds, 'high')],
  ];
  panel.innerHTML =
    tiles.map(([k, v, d]) => `<div class="tile">${k}<strong>${v}${d}</strong></div>`).join('') +
    '<div class="bars">' +
    STATS.map(s => {
      const a = now[s.id],
        b = next[s.id],
        lo = Math.min(a, b),
        hi = Math.max(a, b),
        good = s.better === 'low' ? b < a : b > a;
      return `<div class="bar" title="${s.hint}${s.better === 'low' ? ' Lower is better.' : ''}"><span>${s.label}</span><b>${b}${delta(a, b, s.better)}</b><i><u style="width:${lo}%"></u>${hi > lo ? `<s class="${good ? 'up' : 'down'}" style="left:${lo}%;width:${hi - lo}%"></s>` : ''}</i></div>`;
    }).join('') +
    '</div>';
}
