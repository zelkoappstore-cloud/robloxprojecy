// FactuBot analyse un site web : il lit la page, en extrait le texte et la structure, detecte la langue,
// trouve les mots-cles, resume la page (3 phrases cles), et fait verifier l'orthographe / la grammaire
// d'un extrait par son juge strict (LanguageTool). Protections : http(s) seulement, pas d'adresse
// interne ou privee (anti-SSRF), 3 redirections max, 8 s max, 1,5 Mo max.
import dns from 'node:dns/promises';
import net from 'node:net';

const MAX = 1.5e6, TIMEOUT = 8000;
const STOP = {
  fr: 'le la les un une des de du et à au aux en que qui dans pour par sur est sont pas ne se ce cette ces il elle ils elles nous vous on son sa ses leur leurs plus avec mais ou donc car comme être avoir a été fait tout tous très aussi entre sans sous vers chez dont où si y je tu me te lui mon ma mes notre votre nos vos même déjà encore peut cela ça'.split(' '),
  en: 'the a an and or of to in on for with is are was were be been it this that these those as at by from not but they he she we you i his her their our your its can will would has have had do does did so if about into than then there which who what when'.split(' '),
};
const STOPSET = new Set([...STOP.fr, ...STOP.en]);

function privateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const s = ip.toLowerCase();
  return s === '::1' || s === '::' || s.startsWith('fc') || s.startsWith('fd') || s.startsWith('fe80') || s.startsWith('::ffff:') && privateIp(s.slice(7));
}
async function safeUrl(raw) {
  let u; try { u = new URL(raw); } catch { throw new Error('adresse invalide'); }
  if (!/^https?:$/.test(u.protocol)) throw new Error('seules les adresses http(s) sont acceptées');
  if (u.username || u.password || (u.port && !['80', '443'].includes(u.port))) throw new Error('adresse non autorisée');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) throw new Error('adresse interne refusée');
  const ips = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map(r => r.address);
  if (!ips.length || ips.some(privateIp)) throw new Error('adresse interne refusée');
  return u;
}
async function fetchPage(raw) {
  let u = await safeUrl(raw);
  for (let hop = 0; hop < 4; hop++) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), TIMEOUT);
    try {
      const r = await fetch(u, { redirect: 'manual', signal: ctl.signal, headers: { 'user-agent': 'FactuBot/1.0 (analyse de page)', accept: 'text/html,text/plain;q=0.9' } });
      if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { u = await safeUrl(new URL(r.headers.get('location'), u).href); continue; }
      if (!r.ok) throw new Error(`le site a répondu ${r.status}`);
      const type = r.headers.get('content-type') || '';
      if (!/text\/html|text\/plain|xhtml/.test(type)) throw new Error('ce n’est pas une page web (' + type.split(';')[0] + ')');
      const reader = r.body.getReader(), parts = []; let size = 0;
      for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > MAX) { ctl.abort(); break; } parts.push(value); }
      return { url: u.href, html: new TextDecoder(/charset=([\w-]+)/i.exec(type)?.[1] || 'utf-8', { fatal: false }).decode(Buffer.concat(parts)) };
    } finally { clearTimeout(t); }
  }
  throw new Error('trop de redirections');
}

const decodeEnt = s => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;|&rsquo;/g, '’')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&[a-z]+;/gi, ' ');
const strip = h => decodeEnt(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const cut = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;

function analyse(url, html) {
  const host = new URL(url).hostname;
  const title = strip(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || '');
  const desc = decodeEnt(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)/i.exec(html)?.[1] || /<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description/i.exec(html)?.[1] || '');
  const langAttr = /<html[^>]*\slang=["']?([\w-]+)/i.exec(html)?.[1] || '';
  const heads = [...html.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi)].map(m => ({ n: +m[1], t: cut(strip(m[2]), 90) })).filter(h => h.t).slice(0, 12);
  const links = [...html.matchAll(/<a\s[^>]*href=["']([^"'#]+)/gi)].map(m => { try { return new URL(m[1], url); } catch { return null; } }).filter(Boolean);
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map(m => m[0]);
  const body = html.replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, ' ').replace(/<(nav|footer|header|form|aside)[\s\S]*?<\/\1>/gi, ' ');
  const text = strip(body);
  const words = text.toLowerCase().match(/[a-zà-öø-ÿœ’'-]{2,}/g) || [];
  const fr = words.filter(w => STOP.fr.includes(w)).length, en = words.filter(w => STOP.en.includes(w)).length;
  const lang = words.length < 20 ? '?' : fr > en * 1.2 ? 'fr' : en > fr * 1.2 ? 'en' : (langAttr.slice(0, 2) || '?');
  const freq = {}; for (const w of words) if (w.length > 3 && !STOPSET.has(w)) freq[w] = (freq[w] || 0) + 1;
  const keywords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([w, n]) => ({ w, n }));
  const sents = (text.match(/[^.!?]{40,300}[.!?]/g) || []).map(s => s.trim()).filter(s => s.split(' ').length >= 7);
  const kw = new Map(keywords.map((k, i) => [k.w, 12 - i]));
  const scored = sents.map((s, i) => ({ s, i, sc: (s.toLowerCase().match(/[a-zà-öø-ÿœ’'-]{4,}/g) || []).reduce((a, w) => a + (kw.get(w) || 0), 0) / Math.sqrt(s.length) }));
  const summary = scored.sort((a, b) => b.sc - a.sc).slice(0, 3).sort((a, b) => a.i - b.i).map(x => cut(x.s, 220));
  const avgLen = sents.length ? Math.round(sents.reduce((a, s) => a + s.split(' ').length, 0) / sents.length) : 0;
  return {
    url, host, title: cut(title, 140), description: cut(desc, 300), langAttr, lang, words: words.length, sentences: sents.length, avgLen,
    readingMin: Math.max(1, Math.round(words.length / 230)), heads, keywords, summary,
    links: { total: links.length, internes: links.filter(l => l.hostname === host).length, externes: links.filter(l => l.hostname !== host).length },
    images: { total: imgs.length, sansAlt: imgs.filter(i => !/\salt=["'][^"']+["']/i.test(i)).length },
    https: url.startsWith('https:'), _sample: sents.slice(0, 12).join(' ').slice(0, 1500),
  };
}

async function grammar(text, lang) {
  if (!text || !['fr', 'en'].includes(lang)) return null;
  try {
    const body = new URLSearchParams({ text, language: lang === 'fr' ? 'fr' : 'en-US' });
    const r = await fetch('https://api.languagetool.org/v2/check', { method: 'POST', body, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const m = (await r.json()).matches.filter(x => !/WHITESPACE|APOS|TYPOGRAPH|NBSP/i.test(x.rule.id));
    return { checked: text.length, errors: m.length, per1000: Math.round(m.length / text.split(' ').length * 1000),
      list: m.slice(0, 6).map(x => ({ msg: x.message, extrait: cut(x.context.text.slice(Math.max(0, x.context.offset - 25), x.context.offset + x.context.length + 25), 90), propose: x.replacements.slice(0, 2).map(r => r.value) })) };
  } catch { return null; }
}

// avis du robot, en francais correct
function verdict(a, g) {
  const out = [];
  out.push(`Cette page ${a.lang === 'fr' ? 'est écrite en français' : a.lang === 'en' ? 'est écrite en anglais' : 'est dans une langue que je ne reconnais pas encore'} et contient ${a.words.toLocaleString('fr-BE')} mots (${a.readingMin} min de lecture).`);
  if (a.keywords.length) out.push(`Elle parle surtout de : ${a.keywords.slice(0, 4).map(k => k.w).join(', ')}.`);
  if (g) out.push(g.errors === 0 ? 'Mon juge n’a trouvé aucune faute dans l’extrait vérifié.' : `Mon juge a trouvé ${g.errors} faute${g.errors > 1 ? 's' : ''} possible${g.errors > 1 ? 's' : ''} dans l’extrait vérifié.`);
  const tips = [];
  if (!a.title) tips.push('il manque un titre');
  if (!a.description) tips.push('il manque une description pour les moteurs de recherche');
  if (!a.heads.some(h => h.n === 1)) tips.push('il n’y a pas de grand titre (h1)');
  if (a.images.sansAlt) tips.push(`${a.images.sansAlt} image${a.images.sansAlt > 1 ? 's' : ''} sans texte alternatif`);
  if (!a.https) tips.push('le site n’est pas sécurisé (pas de https)');
  if (a.avgLen > 28) tips.push('les phrases sont longues en moyenne');
  out.push(tips.length ? `À améliorer : ${tips.join(', ')}.` : 'La structure de la page est propre.');
  return out;
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  const raw = String(req.query.url || '').trim();
  if (!raw) return res.status(400).json({ error: 'donne une adresse : /api/analyse?url=https://…' });
  try {
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw)) throw new Error('seules les adresses http(s) sont acceptées');
    const { url, html } = await fetchPage(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw);
    const a = analyse(url, html), g = await grammar(a._sample, a.lang);
    delete a._sample;
    return res.status(200).json({ ...a, grammar: g, verdict: verdict(a, g), t: Date.now() });
  } catch (e) {
    return res.status(422).json({ error: e.name === 'AbortError' ? 'le site met trop de temps à répondre' : String(e.message || e) });
  }
}
