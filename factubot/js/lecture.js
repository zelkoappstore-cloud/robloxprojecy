// Atelier de lecture : FactuBot a "lu" des livres et en a retenu UNIQUEMENT des statistiques
// (quels mots se suivent souvent, quels noms vont avec le / la / les). Avec ca il invente ses propres
// phrases en francais. Un JUGE STRICT les corrige ; a chaque faute, le robot apprend a eviter
// l'enchainement de mots fautif. Aucune phrase des livres n'est stockee ni recopiee (controle anti-copie).
// Le modele (statistiques, ~390 Ko) est lu depuis le depot GitHub public, fige sur une version precise.
const SRC = 'zelkoappstore-cloud/robloxprojecy@8ac76b8adc8a65d19cdaa7272716cd93e4f167cf/factubot/js/lecture-modele.json';
export const MODEL_URLS = [`https://cdn.jsdelivr.net/gh/${SRC}`, `https://raw.githubusercontent.com/${SRC.replace('@', '/')}`];
let M = null, V = [], COPY = new Set();
export const lectureReady = () => !!M;
export async function loadLecture(model) {
  if (M) return true;
  if (!model) for (const u of MODEL_URLS) { try { const r = await fetch(u); if (r.ok) { model = await r.json(); break; } } catch { /* source suivante */ } }
  if (!model) return false;
  M = model; V = M.vocab; COPY = new Set(M.copy); BOOKS.books = M.books; BOOKS.words = M.words; BOOKS.vocab = V.length;
  return true;
}
const APOS = '’';
const FIN = new Set(['.', '!', '?']), PONCT = new Set(['.', '!', '?', ',', ';', ':']);
const OUTILS = new Set(['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'à', 'au', 'aux', 'et', 'ou', 'mais', 'que', 'qui', 'dont', 'avec', 'pour',
  'par', 'sur', 'dans', 'en', 'ne', 'se', 'sa', 'son', 'ses', 'ce', 'cet', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'leur', 'leurs', 'notre',
  'votre', 'nos', 'vos', 'il', 'elle', 'ils', 'elles', 'je', 'tu', 'nous', 'vous', 'on', 'sans', 'sous', 'vers', 'chez', 'entre', 'comme', 'si', 'quand', 'lorsque']);
const PL = new Set(['les', 'des', 'ces', 'mes', 'tes', 'ses', 'nos', 'vos', 'leurs', 'aux']);
const SG = new Set(['le', 'la', 'un', 'une', 'ce', 'cet', 'cette', 'mon', 'ma', 'ton', 'ta', 'son', 'sa', 'au', 'du']);
const MASC = new Set(['le', 'un', 'ce', 'cet', 'du', 'au']), FEM = new Set(['la', 'une', 'cette', 'ma', 'ta', 'sa']);
const NEG2 = new Set(['pas', 'plus', 'jamais', 'rien', 'personne', 'point', 'guère', 'que', 'aucun', 'aucune', 'ni']);

export const READ_SECONDS = 5;
export const BOOKS = { books: 0, words: 0, vocab: 0 };
const LR = 1.5, REWARD = .05, MAXB = 6000, KEEP = 30, WIN = 50;

export function newLecture() { return { seq: 0, ok: [], bonus: {}, stop: Array(7).fill(0), phrases: [], best: 0, history: [] }; }
const bucket = n => Math.min(6, Math.floor(n / 4));   // longueur de la phrase en cours, par tranches de 4 mots
export const ensureLecture = st => (st.lecture ||= newLecture());

function hash(seq) {
  let x = 2166136261;
  const s = seq.join('\u0001');
  for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; }
  return x;
}
// tirage du mot suivant : frequence dans les livres x ce que le robot a appris (bonus / malus)
function next(R, a, b, len) {
  const tri = M.tri[`${a},${b}`], cand = tri && tri.length ? tri : (M.bi[String(b)] || M.bi['-1']);
  const key = (c) => `${a},${b},${c}`;
  const sb = R.stop[bucket(len)] || 0;   // envie apprise de terminer la phrase a cette longueur
  const w = cand.map(([c, n]) => n * Math.exp((R.bonus[key(c)] || 0) + (FIN.has(V[c]) ? sb : 0)));
  const t = w.reduce((x, y) => x + y, 0);
  let r = Math.random() * t, i = 0; while (i < w.length - 1 && (r -= w[i]) > 0) i++;
  return cand[i][0];
}
const fmt = toks => {
  let s = toks[0] || '';
  for (const w of toks.slice(1)) s += w === ',' || w === '.' ? w : /^[;:!?]$/.test(w) ? '\u202f' + w : s.endsWith(APOS) ? w : ' ' + w;
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// le juge strict : chaque faute est rattachee a l'enchainement de mots qui l'a causee
function judge(ids) {
  const w = ids.map(i => V[i]), errs = [], n = w.filter(x => !PONCT.has(x)).length;
  const at = (k, msg) => errs.push({ k, msg });
  const last = w.length - 1;
  if (n < 5) at(last, 'phrase trop courte (au moins 5 mots)');
  if (n > 24) at(last, 'phrase trop longue (24 mots maximum)');
  if (!FIN.has(w[last])) at(last, 'la phrase ne se termine pas par un point');
  if (w.length > 1 && (OUTILS.has(w[last - 1]) || w[last - 1].endsWith(APOS))) at(last, `la phrase ne peut pas finir par « ${w[last - 1]} »`);
  if (PONCT.has(w[0])) at(0, 'la phrase commence par une ponctuation');
  for (let i = 1; i < w.length; i++) {
    if (PONCT.has(w[i]) && PONCT.has(w[i - 1])) at(i, 'deux ponctuations collées');
    if (w[i] === w[i - 1]) at(i, `mot répété : « ${w[i]} ${w[i]} »`);
    if (FIN.has(w[i]) && i < last) at(i, 'point au milieu de la phrase');
    const nb = M.num[ids[i]], gn = M.gen[ids[i]];
    if (nb !== undefined && PL.has(w[i - 1]) && nb === 0) at(i, `« ${w[i - 1]} ${w[i]} » : déterminant pluriel devant un nom singulier`);
    if (nb !== undefined && SG.has(w[i - 1]) && nb === 1) at(i, `« ${w[i - 1]} ${w[i]} » : déterminant singulier devant un nom pluriel`);
    if (gn !== undefined && MASC.has(w[i - 1]) && gn === 1) at(i, `« ${w[i - 1]} ${w[i]} » : « ${w[i]} » est féminin`);
    if (gn !== undefined && FEM.has(w[i - 1]) && gn === 0) at(i, `« ${w[i - 1]} ${w[i]} » : « ${w[i]} » est masculin`);
    if (w[i - 1] === 'ne' || w[i - 1] === 'n' + APOS) {
      if (!w.slice(i, i + 5).some(x => NEG2.has(x))) at(i - 1, 'négation incomplète : « ne » sans « pas / plus / jamais… »');
    }
  }
  if (COPY.has(hash(['<S>', ...w]))) at(last, 'recopie une phrase du livre : il faut inventer');
  const seq = ['<s>', '<s>', ...w];
  for (let i = 2; i + 7 <= seq.length; i++) if (COPY.has(hash(seq.slice(i, i + 7)))) { at(i - 2 + 3, 'recopie un passage du livre : il faut inventer'); break; }
  return errs;
}

// le robot invente une phrase, le juge la corrige, le robot apprend
export function readStep(st) {
  if (!M) return null;
  const R = ensureLecture(st), ids = [];
  R.stop ||= Array(7).fill(0);
  let a = -1, b = -1;
  for (let k = 0; k < 30; k++) { const c = next(R, a, b, ids.filter(i => !PONCT.has(V[i])).length); ids.push(c); a = b; b = c; if (FIN.has(V[c])) break; }
  const errs = judge(ids), ok = !errs.length;
  const ctx = i => `${i >= 2 ? ids[i - 2] : -1},${i >= 1 ? ids[i - 1] : -1},${ids[i]}`;
  if (ok) ids.forEach((_, i) => { const k = ctx(i); R.bonus[k] = Math.min(2, +((R.bonus[k] || 0) + REWARD).toFixed(3)); });
  else for (const e of errs) { const k = ctx(Math.max(0, Math.min(ids.length - 1, e.k))); R.bonus[k] = Math.max(-8, +((R.bonus[k] || 0) - LR).toFixed(3)); }
  // longueur : il apprend quand s'arreter
  if (errs.some(e => e.msg.startsWith('phrase trop longue') || e.msg.startsWith('la phrase ne se termine'))) for (let b = 3; b < 7; b++) R.stop[b] = Math.min(6, +(R.stop[b] + .3).toFixed(3));
  if (errs.some(e => e.msg.startsWith('phrase trop courte'))) R.stop[0] = Math.max(-6, +(R.stop[0] - .3).toFixed(3)), R.stop[1] = Math.max(-6, +(R.stop[1] - .15).toFixed(3));
  const keys = Object.keys(R.bonus);
  if (keys.length > MAXB * 1.25) keys.sort((x, y) => Math.abs(R.bonus[x]) - Math.abs(R.bonus[y])).slice(0, keys.length - MAXB).forEach(k => delete R.bonus[k]);
  R.seq++; R.ok.push(ok ? 1 : 0); if (R.ok.length > WIN) R.ok.shift();
  const score = ok ? 100 : Math.max(0, 60 - 20 * (errs.length - 1));
  if (score > R.best) R.best = score;
  const rec = { seq: R.seq, lang: 'livre', lv: 0, out: fmt(ids.map(i => V[i])), score, errs: [...new Set(errs.map(e => e.msg))], t: Date.now() };
  R.phrases.unshift(rec); if (R.phrases.length > KEEP) R.phrases.length = KEEP;
  if (R.seq % 50 === 0) { R.history.push(acceptRate(R)); if (R.history.length > 200) R.history.shift(); }
  return rec;
}
export const acceptRate = R => R.ok.length ? Math.round(R.ok.reduce((a, b) => a + b, 0) / R.ok.length * 100) : 0;
export function simulateLecture(st, seconds) {
  if (!M) return 0;
  const n = Math.min(Math.floor(seconds / READ_SECONDS), 4000);
  for (let i = 0; i < n; i++) readStep(st);
  return n;
}
