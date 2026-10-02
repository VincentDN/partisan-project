// Combined share card: operator render on the left; look, carried weapon and its stats on the right.
import {STATS} from '../workbench/stats.js';
import {buildSummary} from '../workbench/summary.js';

/**
 * @param {object} o
 * @param {HTMLCanvasElement} o.canvas  the live WebGL canvas (already rendered this frame)
 * @param {{label: string}} o.base
 * @param {string} o.poseLabel
 * @param {{label: string, choice: string}[]} o.equipment  one line per slot
 * @param {any} [o.rifle]  carried weapon instance from the Workbench, if any
 * @returns {string} PNG data URL
 */
export function shareCardDataUrl({canvas, base, poseLabel, equipment, rifle}) {
  const W = 1600,
    H = 900,
    panel = 560,
    area = W - panel,
    out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const g = out.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#46563a');
  grad.addColorStop(1, '#1e2717');
  g.fillStyle = grad;
  g.fillRect(0, 0, area, H);
  const scale = Math.max(area / canvas.width, H / canvas.height),
    sw = area / scale,
    sh = H / scale;
  g.drawImage(canvas, (canvas.width - sw) / 2, (canvas.height - sh) / 2, sw, sh, 0, 0, area, H);
  g.fillStyle = '#192013';
  g.fillRect(area, 0, panel, H);
  g.fillStyle = '#ef8f39';
  g.fillRect(area, 0, 4, H);
  const x = area + 44;
  let y = 66;
  const text = (t, size, color = '#dbe5c3', weight = 400, font = 'system-ui,sans-serif', dx = 0) => {
    g.fillStyle = color;
    g.font = `${weight} ${size}px ${font}`;
    g.fillText(t, x + dx, y);
  };
  const mono = 'ui-monospace,monospace';
  text('PARTISAN PROJECT · OPERATOR CUSTOMISER', 16, '#ef8f39', 600, mono);
  y += 46;
  text(base.label, 34, '#dbe5c3', 650);
  y += 30;
  text(poseLabel, 17, '#98a97e');
  y += 34;
  text('LOOK', 13, '#98a97e', 600, mono);
  y += 24;
  for (const e of equipment) {
    text(`${e.label}: ${e.choice}`, 15);
    y += 22;
  }
  if (rifle) {
    const s = buildSummary(rifle, rifle.build);
    y += 14;
    text('CARRIED WEAPON', 13, '#98a97e', 600, mono);
    y += 26;
    text(rifle.config.title, 21, '#dbe5c3', 600);
    y += 22;
    text(`${(s.grams / 1000).toFixed(2)} kg · ${s.rounds} rds`, 14, '#98a97e');
    y += 24;
    for (const stat of STATS) {
      text(stat.label, 13, '#98a97e');
      text(String(s[stat.id]), 13, '#dbe5c3', 600, mono, panel - 130);
      y += 8;
      g.fillStyle = '#ffffff18';
      g.fillRect(x, y, panel - 88, 5);
      g.fillStyle = '#c0cfa6';
      g.fillRect(x, y, ((panel - 88) * s[stat.id]) / 100, 5);
      y += 20;
    }
  }
  y = H - 34;
  text(location.href.replace(/^https?:\/\//, '').slice(0, 64), 12, '#6f7f86', 400, mono);
  return out.toDataURL('image/png');
}
