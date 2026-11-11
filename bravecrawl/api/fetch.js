// Va chercher une page web pour BraveCrawl : vérifie robots.txt, refuse les adresses internes, limite la taille.
const dns = require('dns').promises;
const net = require('net');

const AGENT = 'BraveCrawl/1.0 (+https://bravecrawl.vercel.app)';
const MAX_BYTES = 2_000_000;
const TYPES = /text\/html|application\/xhtml\+xml|text\/plain|application\/json|application\/ld\+json/i;

function isPrivate(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith('::ffff:')) return isPrivate(v.slice(7));
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80');
}

async function checkHost(url) {
  if (!/^https?:$/.test(url.protocol)) throw new Error('seules les adresses http et https sont acceptées');
  if (url.username || url.password) throw new Error('adresse avec identifiants refusée');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw new Error('adresse interne refusée');
  const ips = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => []);
  if (!ips.length) throw new Error('site introuvable');
  if (ips.some(x => isPrivate(x.address))) throw new Error('adresse interne refusée');
}

function timeoutSignal(ms) {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

// Règles robots.txt : le groupe « bravecrawl » s'il existe, sinon « * » ; la règle la plus longue gagne
function robotsAllows(txt, path) {
  const groups = [];
  let cur = null, lastUA = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const i = line.indexOf(':');
    if (i < 0) continue;
    const k = line.slice(0, i).trim().toLowerCase(), v = line.slice(i + 1).trim();
    if (k === 'user-agent') {
      if (!cur || !lastUA) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(v.toLowerCase());
      lastUA = true;
    } else {
      lastUA = false;
      if (cur && (k === 'allow' || k === 'disallow')) cur.rules.push({ allow: k === 'allow', p: v });
    }
  }
  const own = groups.filter(g => g.agents.some(a => a !== '*' && 'bravecrawl'.includes(a)));
  const chosen = own.length ? own : groups.filter(g => g.agents.includes('*'));
  let best = null;
  for (const g of chosen) {
    for (const r of g.rules) {
      if (!r.p) continue;
      const end = r.p.endsWith('$');
      const body = (end ? r.p.slice(0, -1) : r.p).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      if (!new RegExp('^' + body + (end ? '$' : '')).test(path)) continue;
      if (!best || r.p.length > best.p.length || (r.p.length === best.p.length && r.allow)) best = r;
    }
  }
  return !best || best.allow;
}

async function robotsOk(url) {
  try {
    const r = await fetch(url.origin + '/robots.txt', { headers: { 'user-agent': AGENT }, signal: timeoutSignal(5000), redirect: 'follow' });
    if (r.status >= 500) return false;
    if (!r.ok) return true;
    return robotsAllows((await r.text()).slice(0, 500_000), url.pathname + url.search);
  } catch {
    return true;
  }
}

async function readLimited(res) {
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_BYTES) { reader.cancel(); break; }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

module.exports = async (req, res) => {
  const send = (status, body) => {
    res.statusCode = status;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('cache-control', status === 200 ? 's-maxage=300' : 'no-store');
    res.end(JSON.stringify(body));
  };
  try {
    const raw = new URL(req.url, 'http://x').searchParams.get('url');
    if (!raw) return send(400, { ok: false, error: 'aucune adresse donnée' });
    let url = new URL(raw);
    await checkHost(url);
    if (!(await robotsOk(url))) return send(403, { ok: false, error: `${url.hostname} interdit aux robots de lire cette page (robots.txt)` });

    let r;
    for (let hop = 0; ; hop++) {
      r = await fetch(url, {
        headers: { 'user-agent': AGENT, accept: 'text/html,application/xhtml+xml,text/plain,application/json;q=0.9,*/*;q=0.5', 'accept-language': 'fr,en;q=0.8' },
        redirect: 'manual',
        signal: timeoutSignal(10000)
      });
      if (r.status < 300 || r.status >= 400 || !r.headers.get('location')) break;
      if (hop >= 4) return send(502, { ok: false, error: 'trop de redirections' });
      url = new URL(r.headers.get('location'), url);
      await checkHost(url);
      if (!(await robotsOk(url))) return send(403, { ok: false, error: `${url.hostname} interdit aux robots de lire cette page (robots.txt)` });
    }
    if (!r.ok) return send(502, { ok: false, error: `le site a répondu ${r.status}${r.status === 403 || r.status === 429 ? ' (il bloque les robots)' : ''}` });
    const type = r.headers.get('content-type') || '';
    if (type && !TYPES.test(type)) return send(415, { ok: false, error: 'ce n’est pas une page web (type ' + type.split(';')[0] + ')' });
    const html = await readLimited(r);
    return send(200, { ok: true, url: url.href, status: r.status, type, html });
  } catch (e) {
    const msg = e.name === 'AbortError' || e.name === 'TimeoutError' ? 'le site met trop de temps à répondre' : e instanceof TypeError && /Invalid URL/.test(e.message) ? 'adresse invalide' : e.message;
    return send(400, { ok: false, error: msg });
  }
};
