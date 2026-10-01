// Weapon loadout codec shared by the Workbench and the Operator Customiser.
//
// Three equivalent forms of one loadout object {rifle, build:{slot:option}, offsets:{slot:mm}, finish:{target:id}, wear:0-100}:
//   legacy hash   "rifle=ak15k&muzzle=brake&optic=scope@-20&stock-finish=fde&wear=35"     (what the Workbench URL holds)
//   versioned code "P1.<base64url of compact JSON>"                                          (one paste-able token)
// decode() accepts both, so every link ever shared keeps working; unknown future versions return null instead of throwing.
// Pure functions: no DOM, no three.js.

export const CODE_VERSION = 'P1';
const empty = () => ({rifle: 'ak74m', build: {}, offsets: {}, finish: {}, wear: 0});
const RESERVED = new Set(['rifle', 'wear', 'mode', 'pose']); // 'mode' and 'pose' were part of the retired Field screens: ignored

/** Parse the Workbench URL hash (with or without the leading #). Unknown keys become slot choices; consumers validate them. */
export function parseLegacy(hash) {
  const out = empty();
  for (const [k, v] of new URLSearchParams(String(hash || '').replace(/^#/, ''))) {
    if (k === 'rifle') out.rifle = v;
    else if (k === 'wear') out.wear = Math.min(100, Math.max(0, Math.round(Number(v)) || 0));
    else if (k.endsWith('-finish')) out.finish[k.slice(0, -7)] = v;
    else if (RESERVED.has(k) || k.startsWith('o.'))
      continue; // retired operator keys (o.headgear=…) are dropped
    else {
      const [option, mm] = v.split('@');
      out.build[k] = option;
      if (mm !== undefined && Number.isFinite(Number(mm)) && Number(mm) !== 0) out.offsets[k] = Math.round(Number(mm));
    }
  }
  return out;
}

/** The inverse of parseLegacy (no leading #). Keys are emitted in a stable order. */
export function toLegacy(l) {
  const parts = [];
  if (l.rifle && l.rifle !== 'ak74m') parts.push('rifle=' + l.rifle);
  for (const k of Object.keys(l.build).sort()) parts.push(`${k}=${l.build[k]}${l.offsets[k] ? '@' + l.offsets[k] : ''}`);
  for (const k of Object.keys(l.finish).sort()) parts.push(`${k}-finish=${l.finish[k]}`);
  if (l.wear) parts.push('wear=' + l.wear);
  return parts.join('&');
}

const b64 = {
  enc: s =>
    btoa(unescape(encodeURIComponent(s)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, ''),
  dec: s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)))),
};

/** Versioned token. Compact keys: r rifle, b build, o offsets (mm), f finishes, w wear. */
export function encode(l) {
  const c = {
    r: l.rifle,
    b: l.build,
    ...(Object.keys(l.offsets).length ? {o: l.offsets} : {}),
    ...(Object.keys(l.finish).length ? {f: l.finish} : {}),
    ...(l.wear ? {w: l.wear} : {}),
  };
  return `${CODE_VERSION}.${b64.enc(JSON.stringify(c))}`;
}

/** Accepts a P1 code, a legacy hash, or a full URL containing either. Returns null when it cannot be understood. */
export function decode(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  const hash = t.includes('#') ? t.slice(t.indexOf('#') + 1) : t;
  const m = hash.match(/^(P\d+)\.([A-Za-z0-9_-]+)$/);
  if (m) {
    if (m[1] !== CODE_VERSION) return null; // a newer app made this code
    try {
      const c = JSON.parse(b64.dec(m[2]));
      if (typeof c.r !== 'string' || typeof c.b !== 'object' || c.b === null) return null;
      return {
        rifle: c.r,
        build: {...c.b},
        offsets: {...(c.o || {})},
        finish: {...(c.f || {})},
        wear: Math.min(100, Math.max(0, Number(c.w) || 0)),
      };
    } catch {
      return null;
    }
  }
  return hash.includes('=') ? parseLegacy(hash) : null;
}
