// Cerveau du redacteur : pour chaque decision, des preferences (logits) qui partent de zero = hasard total.
// Apres chaque document, le juge rend sa copie corrigee ; le robot renforce ce qui etait juste et
// affaiblit ce qui etait faux (gradient de politique avec reference par decision). Puis niveau suivant.
// En parallele il suit un cours de langues (francais + anglais, juge strict) : voir langue.js.
import { LEVELS, CHOICES, makeContext, keysFor, judge } from './levels.js';
import { newLang, ensureLang, simulateLang } from './langue.js';
import { newLecture, ensureLecture, simulateLecture } from './lecture.js';

export const VERSION = 1, DOC_SECONDS = 20, KEEP = 30;
const LR = .12, UNLOCK = 95, WINDOW = 30;

export function newState() {
  return { v: VERSION, version: 0, updatedAt: Date.now(), level: 1, maxLevel: 1, seq: 0, policy: {}, base: {},
    docs: [], recent: [], history: [], best: 0, mistakes: {}, log: [], lang: newLang(), lecture: newLecture() };
}
const softmax = z => { const m = Math.max(...z), e = z.map(v => Math.exp(v - m)), t = e.reduce((a, b) => a + b, 0); return e.map(v => v / t); };
const nOpts = k => CHOICES[k.id].opts.length;

export function addLog(st, txt, cls = '') { st.log.unshift({ txt: `#${st.seq} ${txt}`, cls }); if (st.log.length > 50) st.log.length = 50; }

// choisit le niveau du prochain document : le plus haut debloque, ou une revision une fois tout maitrise
function nextLevel(st) { return st.maxLevel >= LEVELS.length && st.mastered && Math.random() < .5 ? 1 + Math.floor(Math.random() * LEVELS.length) : st.level; }

export function startDoc(st) {
  const ctx = makeContext(nextLevel(st), st.seq + 1), dec = {}, conf = [];
  for (const k of keysFor(ctx)) {
    const p = softmax(st.policy[k.key] || Array(nOpts(k)).fill(0));
    let r = Math.random(), i = 0; while (i < p.length - 1 && (r -= p[i]) > 0) i++;
    dec[k.key] = i; conf.push(p[i]);
  }
  return { ctx, dec, confidence: Math.round(conf.reduce((a, b) => a + b, 0) / conf.length * 100) };
}

export function finishDoc(st, doc) {
  const { ctx, dec } = doc, j = judge(ctx, dec), wrong = new Set(j.issues.map(i => i.key));
  for (const k of keysFor(ctx)) {
    if (!wrong.has(k.key) && !j.good.includes(k.key)) continue;     // decision non evaluee ici
    const r = wrong.has(k.key) ? -1 : 1, b = st.base[k.key] ?? 0, z = st.policy[k.key] || Array(nOpts(k)).fill(0), p = softmax(z);
    st.policy[k.key] = z.map((v, i) => +(v + LR * (r - b) * ((i === dec[k.key] ? 1 : 0) - p[i])).toFixed(4));
    st.base[k.key] = +(.9 * b + .1 * r).toFixed(4);
    if (r < 0) st.mistakes[k.key] = (st.mistakes[k.key] || 0) + 1;
  }
  for (const key in st.mistakes) st.mistakes[key] = +(st.mistakes[key] * .97).toFixed(3);   // oubli progressif
  st.seq++;
  const rec = { seq: st.seq, lv: ctx.lv, ctx, dec, score: j.score, issues: j.issues, t: Date.now(), confidence: doc.confidence };
  st.docs.unshift(rec); if (st.docs.length > KEEP) st.docs.length = KEEP;
  if (ctx.lv === st.level) { st.recent.push(j.score); if (st.recent.length > WINDOW) st.recent.shift(); }
  if (j.score > st.best) st.best = j.score;
  if (st.seq % 10 === 0) { st.history.push(Math.round(st.docs.slice(0, 10).reduce((a, d) => a + d.score, 0) / Math.min(10, st.docs.length))); if (st.history.length > 200) st.history.shift(); }
  let up = false;
  const avg = st.recent.reduce((a, b) => a + b, 0) / (st.recent.length || 1);
  if (st.recent.length >= WINDOW && avg >= UNLOCK) {
    if (st.level < LEVELS.length) { st.level++; st.maxLevel = st.level; st.recent = []; up = true; addLog(st, `Niveau ${st.level} d&eacute;bloqu&eacute; : ${LEVELS[st.level - 1].name} !`, 'ok'); }
    else if (!st.mastered) { st.mastered = true; up = true; addLog(st, 'Tous les niveaux sont ma&icirc;tris&eacute;s. Je r&eacute;vise au hasard pour rester bon.', 'ok'); }
  }
  if (j.score === 100) addLog(st, `${LEVELS[ctx.lv - 1].name} parfait(e) : 100/100`, 'ok');
  else if (j.issues.length) addLog(st, `${LEVELS[ctx.lv - 1].name} : ${j.score}/100 &ndash; ${j.issues[0].msg}`, j.score < 60 ? 'ko' : '');
  return { ...j, up, rec };
}

// erreur la plus frequente en ce moment (pour ses pensees)
export function weakSpot(st) {
  const e = Object.entries(st.mistakes).sort((a, b) => b[1] - a[1])[0];
  if (!e || e[1] < .5) return null;
  const id = e[0].split(':')[0], c = CHOICES[id];
  return typeof c.why === 'function' ? c.why(e[0].split(':')[1]) : c.why;
}

// fait travailler le robot pendant l'absence de tout visiteur : documents ET cours de langues
export function simulate(st, seconds) {
  ensureLang(st); ensureLecture(st);
  const n = Math.min(Math.floor(seconds / DOC_SECONDS), 3000);
  for (let i = 0; i < n; i++) finishDoc(st, startDoc(st));
  const l = simulateLang(st, seconds);
  if (l.n) addLog(st, `${l.n} phrases (fran&ccedil;ais / anglais) &eacute;crites et corrig&eacute;es pendant l&rsquo;absence`, 'ok');
  l.ups.forEach(u => addLog(st, u, 'ok'));
  const r = simulateLecture(st, seconds);
  if (r) addLog(st, `${r} phrases libres invent&eacute;es d&rsquo;apr&egrave;s mes livres`, 'ok');
  return n;
}
