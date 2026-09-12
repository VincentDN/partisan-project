/**
 * PARTISAN · site-wide password gate
 * ---------------------------------------------------------------------------
 * Runs as Cloudflare Pages middleware, so it sits in front of EVERY request:
 * index.html, robots.txt, assets, everything. Nothing is served until the
 * password is accepted.
 *
 * The password itself is never in this repo. It is read from the
 * SITE_PASSWORD environment variable set on the Cloudflare Pages project
 * (Settings -> Environment variables, type Secret). See .dev.vars.example
 * for local development with `wrangler pages dev`.
 *
 * Session: on success we set an HttpOnly, Secure, SameSite=Lax cookie holding
 * an expiry timestamp plus an HMAC-SHA256 signature keyed on SITE_PASSWORD.
 * Nothing derived from the password is recoverable from the cookie, and
 * changing SITE_PASSWORD invalidates every outstanding session immediately.
 *
 * Fails closed: if SITE_PASSWORD is unset, the site serves a 500 rather than
 * falling through to the content.
 */

const COOKIE = 'partisan_session';
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

const enc = new TextEncoder();

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Length-independent constant-time comparison. */
async function safeEqual(a, b) {
  const salt = crypto.randomUUID();
  return (await hmac(salt, a)) === (await hmac(salt, b));
}

async function issueCookie(secret) {
  const exp = Date.now() + MAX_AGE * 1000;
  const sig = await hmac(secret, String(exp));
  return `${COOKIE}=${exp}.${sig}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}

async function cookieValid(request, secret) {
  const raw = request.headers.get('Cookie') || '';
  const hit = raw.split(/;\s*/).find(c => c.startsWith(`${COOKIE}=`));
  if (!hit) return false;
  const [exp, sig] = hit.slice(COOKIE.length + 1).split('.');
  if (!exp || !sig) return false;
  if (!Number(exp) || Number(exp) < Date.now()) return false;
  return await safeEqual(sig, await hmac(secret, exp));
}

function loginPage(error) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
<title>PARTISAN</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=Source+Serif+4:opsz,wght@8..60,400&display=swap" rel="stylesheet">
<style>
:root{
  --night:#0e1a24; --night-2:#152431; --night-3:#081119;
  --chalk:#f1f3ef; --chalk-dim:#9aa9b4;
  --cobalt:#1f5f9e; --crimson:#a8232e; --sand:#c2a171;
  --display:'Archivo','Helvetica Neue',Arial,sans-serif;
  --body:'Source Serif 4',Georgia,serif;
}
*{box-sizing:border-box}
body{
  margin:0;min-height:100vh;display:grid;place-items:center;padding:1.5rem;
  background:var(--night);color:var(--chalk);font-family:var(--body);line-height:1.7;
  -webkit-font-smoothing:antialiased;
}
body::before{
  content:"";position:fixed;inset:0;pointer-events:none;opacity:.75;
  background-image:
    radial-gradient(circle at 22% 34%,rgba(241,243,239,.10) 0 1px,transparent 1.6px),
    radial-gradient(circle at 72% 68%,rgba(0,0,0,.22) 0 1px,transparent 1.7px),
    repeating-linear-gradient(96deg,rgba(241,243,239,.018) 0 1px,transparent 1px 7px);
  background-size:33px 31px,47px 41px,auto;
}
main{position:relative;width:100%;max-width:27rem;text-align:center}
svg.flag{width:132px;height:88px;margin:0 auto 1.8rem;border:1px solid rgba(241,243,239,.24);box-shadow:0 16px 40px rgba(0,0,0,.5);display:block}
h1{font-family:var(--display);font-weight:800;font-size:2.9rem;letter-spacing:.04em;margin:0 0 .4rem;line-height:1}
p.sub{font-family:var(--display);font-weight:600;font-size:.84rem;letter-spacing:.06em;color:var(--sand);margin:0 0 2rem}
label{display:block;font-family:var(--display);font-weight:600;font-size:.8rem;letter-spacing:.05em;color:var(--chalk-dim);text-align:left;margin-bottom:.5rem}
input{
  width:100%;padding:.92rem 1.05rem;border:1px solid rgba(241,243,239,.28);
  background:var(--night-2);color:var(--chalk);font:400 1rem/1.4 var(--body);
}
input::placeholder{color:#5d6f7c}
input:focus-visible,button:focus-visible{outline:3px solid var(--sand);outline-offset:3px}
button{
  width:100%;margin-top:.9rem;padding:.92rem 1.5rem;border:2px solid var(--cobalt);
  background:var(--cobalt);color:#fff;font-family:var(--display);font-weight:700;
  font-size:.94rem;cursor:pointer;
}
button:hover{background:#18507f;border-color:#18507f}
.err{
  margin:0 0 1.2rem;padding:.75rem 1rem;border-left:4px solid var(--crimson);
  background:rgba(168,35,46,.14);color:#e8b9bd;font-size:.94rem;text-align:left;
}
.fine{margin:2rem 0 0;font-size:.82rem;color:#5d6f7c;font-family:var(--display);font-weight:500;letter-spacing:.04em}
</style>
</head>
<body>
<main>
  <svg class="flag" viewBox="0 0 900 600" role="img" aria-label="Provisional flag of the Free State of Yantis">
    <rect width="900" height="600" fill="#f1f3ef"/>
    <rect width="138" height="600" fill="#a8232e"/>
    <rect x="138" y="246" width="762" height="108" fill="#1f5f9e"/>
    <rect x="438" width="108" height="600" fill="#1f5f9e"/>
  </svg>
  <h1>PARTISAN</h1>
  <p class="sub">Internal working document</p>
  ${error ? `<p class="err">${error}</p>` : ''}
  <form method="POST" autocomplete="off">
    <label for="pw">Passphrase</label>
    <input id="pw" name="password" type="password" required autofocus
           placeholder="Speak, friend" autocapitalize="off" autocorrect="off" spellcheck="false">
    <button type="submit">Unlock</button>
  </form>
  <p class="fine">Kaiser Cat Collective</p>
</main>
</body>
</html>`;
}

const NO_STORE = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
  'Referrer-Policy': 'no-referrer',
};

export async function onRequest(context) {
  const { request, env, next } = context;
  const secret = env.SITE_PASSWORD;

  if (!secret) {
    return new Response(
      'SITE_PASSWORD is not configured on this Pages project. Refusing to serve.',
      { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // Already signed in.
  if (await cookieValid(request, secret)) return next();

  // Submitting the passphrase.
  if (request.method === 'POST') {
    let supplied = '';
    try {
      const form = await request.formData();
      supplied = String(form.get('password') ?? '');
    } catch { /* malformed body, treat as a failed attempt */ }

    if (supplied && await safeEqual(supplied, secret)) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: new URL(request.url).pathname,
          'Set-Cookie': await issueCookie(secret),
          'Cache-Control': 'no-store',
        },
      });
    }

    // Blunt the obvious online guessing loop without locking anyone out.
    await new Promise(r => setTimeout(r, 900));
    return new Response(loginPage('That is not the passphrase.'), {
      status: 401, headers: NO_STORE,
    });
  }

  return new Response(loginPage(null), { status: 401, headers: NO_STORE });
}
