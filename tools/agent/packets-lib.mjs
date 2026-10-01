// Work-packet model: load, validate, rank and render docs/agent-ops/packets.json.
import fs from 'node:fs';

export const FILE = 'docs/agent-ops/packets.json';
export const STATUSES = ['done', 'ready', 'planned', 'blocked'];
export const SIZES = {XS: 3, S: 8, M: 20};
export const MILESTONE_ORDER = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'TD', 'D', 'H27'];
export const load = (file = FILE) => JSON.parse(fs.readFileSync(file, 'utf8'));

/** Structural problems. An empty array means the plan is sound. */
export function validate(data) {
  const problems = [],
    ids = new Set();
  for (const p of data.packets) {
    if (ids.has(p.id)) problems.push(`${p.id}: duplicate id`);
    ids.add(p.id);
    if (!(p.size in SIZES)) problems.push(`${p.id}: size "${p.size}" must be XS, S or M (split larger work)`);
    else if (p.bu !== SIZES[p.size]) problems.push(`${p.id}: bu ${p.bu} does not match size ${p.size}`);
    if (!STATUSES.includes(p.status)) problems.push(`${p.id}: unknown status ${p.status}`);
    if (!data.milestones[p.milestone]) problems.push(`${p.id}: unknown milestone ${p.milestone}`);
    if (!p.acceptance) problems.push(`${p.id}: missing acceptance criteria`);
  }
  const byId = new Map(data.packets.map(p => [p.id, p]));
  for (const p of data.packets) {
    for (const d of p.deps) if (!byId.has(d)) problems.push(`${p.id}: unknown dependency ${d}`);
    if (p.status === 'done')
      for (const d of p.deps)
        if (byId.get(d) && byId.get(d).status !== 'done') problems.push(`${p.id}: done but depends on unfinished ${d}`);
  }
  // cycle check (DFS)
  const state = new Map();
  const visit = (id, trail) => {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) {
      problems.push(`dependency cycle: ${[...trail, id].join(' > ')}`);
      return;
    }
    state.set(id, 1);
    for (const d of byId.get(id)?.deps || []) if (byId.has(d)) visit(d, [...trail, id]);
    state.set(id, 2);
  };
  for (const p of data.packets) visit(p.id, []);
  return problems;
}

export const isDone = p => p.status === 'done';
/** Not done, not blocked, and every dependency is done. */
export function available(data) {
  const done = new Set(data.packets.filter(isDone).map(p => p.id));
  return data.packets.filter(p => !isDone(p) && p.status !== 'blocked' && p.deps.every(d => done.has(d)));
}

/**
 * Packets that fit `budget` BU and the agent's capabilities, best first:
 * earliest milestone, 'ready' before 'planned', then the biggest that fits (fills the window).
 */
export function next(data, {budget = 20, agent = 'any', can = ['browser', 'bpy', 'net']} = {}) {
  const caps = new Set(can);
  return available(data)
    .filter(p => p.bu <= budget)
    .filter(p => p.agent === 'any' || p.agent === agent)
    .filter(p => p.agent !== 'human' && p.needs.every(n => n !== 'human' && caps.has(n)))
    .sort(
      (a, b) =>
        MILESTONE_ORDER.indexOf(a.milestone) - MILESTONE_ORDER.indexOf(b.milestone) ||
        (a.status === 'ready' ? 0 : 1) - (b.status === 'ready' ? 0 : 1) ||
        b.bu - a.bu ||
        a.id.localeCompare(b.id),
    );
}

export function progress(data) {
  const out = {};
  for (const [id, m] of Object.entries(data.milestones)) {
    const ps = data.packets.filter(p => p.milestone === id);
    if (!ps.length) continue;
    const total = ps.reduce((s, p) => s + p.bu, 0),
      done = ps.filter(isDone).reduce((s, p) => s + p.bu, 0);
    out[id] = {...m, packets: ps.length, done: ps.filter(isDone).length, bu: total, buDone: done, pct: Math.round((done / total) * 100)};
  }
  return out;
}

export function toMarkdown(data) {
  const prog = progress(data);
  const lines = [];
  lines.push('| Milestone | Target | Packets | Budget | Progress |', '|---|---|---|---|---|');
  for (const [id, p] of Object.entries(prog))
    lines.push(`| **${id}** ${p.name} | ${p.version ? 'v' + p.version : '—'} | ${p.done}/${p.packets} | ${p.bu} BU | ${p.pct}% |`);
  for (const id of MILESTONE_ORDER) {
    const ps = data.packets.filter(p => p.milestone === id);
    if (!ps.length) continue;
    lines.push(
      '',
      `### ${id} · ${data.milestones[id].name}`,
      '',
      '| ID | Packet | Size | Status | Needs | Depends on |',
      '|---|---|---|---|---|---|',
    );
    for (const p of ps)
      lines.push(
        `| \`${p.id}\` | ${p.title} | ${p.size} (${p.bu}) | ${p.status} | ${[p.agent === 'human' ? 'owner' : '', ...p.needs.filter(n => n !== 'human')].filter(Boolean).join(', ') || '—'} | ${p.deps.map(d => '`' + d + '`').join(', ') || '—'} |`,
      );
  }
  return lines.join('\n');
}
