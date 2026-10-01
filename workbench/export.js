import {STATS} from './stats.js';
import {buildSummary} from './summary.js';

// Loadout card: the current view on the left, stats and parts on the right.
export function saveCard({renderer, scene, camera, rifle, buildBox}) {
  renderer.render(scene, camera);
  const W = 1600,
    H = 900,
    panel = 560,
    out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const g = out.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#3a454b');
  grad.addColorStop(1, '#1b2226');
  g.fillStyle = grad;
  g.fillRect(0, 0, W - panel, H);
  // Cover-fit the render into the picture area.
  const src = renderer.domElement,
    area = W - panel,
    scale = Math.max(area / src.width, H / src.height),
    sw = area / scale,
    sh = H / scale;
  g.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, area, H);
  g.fillStyle = '#161d21';
  g.fillRect(area, 0, panel, H);
  g.fillStyle = '#ef8f39';
  g.fillRect(area, 0, 4, H);
  const x = area + 44;
  let y = 70;
  const text = (t, size, color = '#eceeea', weight = 400, font = 'system-ui,sans-serif') => {
    g.fillStyle = color;
    g.font = `${weight} ${size}px ${font}`;
    g.fillText(t, x, y);
  };
  text('PARP · WEAPON WORKBENCH', 16, '#ef8f39', 600, 'ui-monospace,monospace');
  y += 48;
  text(rifle.config.title, 34, '#eceeea', 650);
  y += 34;
  const summary = buildSummary(rifle, rifle.build);
  text(
    `${Math.round((buildBox.max.x - buildBox.min.x) * 1000)} mm · ${(summary.grams / 1000).toFixed(2)} kg · ${summary.rounds} rds`,
    17,
    '#9aa9b0',
  );
  y += 36;
  for (const stat of STATS) {
    text(stat.label, 15, '#9aa9b0');
    g.fillStyle = '#eceeea';
    g.font = '600 15px ui-monospace,monospace';
    g.fillText(String(summary[stat.id]), x + panel - 110, y);
    y += 10;
    g.fillStyle = '#ffffff18';
    g.fillRect(x, y, panel - 88, 6);
    g.fillStyle = '#c9cfd2';
    g.fillRect(x, y, ((panel - 88) * summary[stat.id]) / 100, 6);
    y += 26;
  }
  y += 8;
  text('BUILD', 13, '#9aa9b0', 600, 'ui-monospace,monospace');
  y += 26;
  for (const slot of Object.values(rifle.slots)) {
    const o = slot.options.find(o => o.id === rifle.build[slot.spec.id]);
    text(`${slot.spec.label}: ${o.label}${slot.offset ? ` (${slot.offset > 0 ? '+' : ''}${Math.round(slot.offset * 1000)} mm)` : ''}`, 16);
    y += 25;
  }
  y = H - 40;
  text(location.href.replace(/^https?:\/\//, '').slice(0, 64), 12, '#6f7f86', 400, 'ui-monospace,monospace');
  const a = document.createElement('a');
  a.download = `parp-loadout-${rifle.id}.png`;
  a.href = out.toDataURL('image/png');
  a.click();
}

// Photo: render the current view and stamp a caption strip, then download a PNG.
export function savePhoto({renderer, scene, camera, rifle}) {
  renderer.render(scene, camera);
  const src = renderer.domElement,
    out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const g = out.getContext('2d'),
    scale = src.width / 1400;
  // The stage's own CSS backdrop isn't in the WebGL canvas, so paint a matching base first.
  const grad = g.createRadialGradient(out.width / 2, out.height * 0.42, 0, out.width / 2, out.height * 0.42, out.width * 0.7);
  grad.addColorStop(0, '#3a454b');
  grad.addColorStop(1, '#1b2226');
  g.fillStyle = grad;
  g.fillRect(0, 0, out.width, out.height);
  g.drawImage(src, 0, 0);
  const bar = Math.round(64 * scale);
  g.fillStyle = '#0f1417d9';
  g.fillRect(0, out.height - bar, out.width, bar);
  g.fillStyle = '#ef8f39';
  g.font = `600 ${Math.round(22 * scale)}px ui-monospace,monospace`;
  g.fillText('PARP', Math.round(24 * scale), out.height - bar / 2 + Math.round(8 * scale));
  g.fillStyle = '#eceeea';
  g.font = `${Math.round(18 * scale)}px system-ui,sans-serif`;
  g.fillText(
    `${rifle.config.title} · ${new Date().toISOString().slice(0, 10)}`,
    Math.round(170 * scale),
    out.height - bar / 2 + Math.round(7 * scale),
  );
  const a = document.createElement('a');
  a.download = `parp-${rifle.id}.png`;
  a.href = out.toDataURL('image/png');
  a.click();
}
