// Cours de langues de FactuBot : il apprend a FORMER des phrases en francais et en anglais.
// On lui donne un SENS (qui fait quoi, a quel temps, affirmatif / negatif / question) ; il doit ecrire la
// phrase mot par mot. Chaque petite decision (genre d'un nom, article, conjugaison, accord, elision,
// place de l'adjectif, ponctuation...) part du hasard total. Le JUGE STRICT compare a la phrase exacte :
// une seule faute = phrase refusee (60/100 max), et il explique chaque faute ; le robot apprend de ces
// corrections et recommence aussitot la phrase ratee. Le robot ne lit jamais les bonnes reponses ci-dessous.

const pick = a => a[Math.floor(Math.random() * a.length)];
const uniq = a => [...new Set(a)];
const VOY_FR = /^[aeiouyàâäéèêëîïôöûüœh]/i, VOY_EN = /^[aeiou]/i;

// ---------- lexique (concepts communs aux deux langues) ----------
const N = {
  chat: { fr: ['chat', 'm'], en: ['cat'] }, chien: { fr: ['chien', 'm'], en: ['dog'] }, fille: { fr: ['fille', 'f'], en: ['girl'] },
  garcon: { fr: ['garçon', 'm'], en: ['boy'] }, ami: { fr: ['ami', 'm'], en: ['friend'] }, femme: { fr: ['femme', 'f'], en: ['woman', 'women'] },
  homme: { fr: ['homme', 'm'], en: ['man', 'men'] }, oiseau: { fr: ['oiseau', 'm', 'oiseaux'], en: ['bird'] },
  pomme: { fr: ['pomme', 'f'], en: ['apple'] }, gateau: { fr: ['gâteau', 'm', 'gâteaux'], en: ['cake'] }, livre: { fr: ['livre', 'm'], en: ['book'] },
  journal: { fr: ['journal', 'm', 'journaux'], en: ['newspaper'] }, lettre: { fr: ['lettre', 'f'], en: ['letter'] }, fleur: { fr: ['fleur', 'f'], en: ['flower'] },
  maison: { fr: ['maison', 'f'], en: ['house'] }, voiture: { fr: ['voiture', 'f'], en: ['car'] }, orange: { fr: ['orange', 'f'], en: ['orange'] },
  arbre: { fr: ['arbre', 'm'], en: ['tree'] }, boite: { fr: ['boîte', 'f'], en: ['box', 'boxes'] }, histoire: { fr: ['histoire', 'f'], en: ['story', 'stories'] },
};
const ANIMES = ['chat', 'chien', 'fille', 'garcon', 'ami', 'femme', 'homme', 'oiseau'];
const ADJ = {
  petit: { fr: [['petit', 'petite', 'petits', 'petites'], 0], en: 'small' }, grand: { fr: [['grand', 'grande', 'grands', 'grandes'], 0], en: 'big' },
  bon: { fr: [['bon', 'bonne', 'bons', 'bonnes'], 0], en: 'good' }, joli: { fr: [['joli', 'jolie', 'jolis', 'jolies'], 0], en: 'pretty' },
  rouge: { fr: [['rouge', 'rouge', 'rouges', 'rouges'], 1], en: 'red' }, noir: { fr: [['noir', 'noire', 'noirs', 'noires'], 1], en: 'black' },
  vert: { fr: [['vert', 'verte', 'verts', 'vertes'], 1], en: 'green' }, blanc: { fr: [['blanc', 'blanche', 'blancs', 'blanches'], 1], en: 'white' },
};
// fr : infinitif, present (je tu il nous vous ils), participe, auxiliaire ; en : base, 3e pers., passe
const V = {
  manger: { fr: ['manger', 'mange manges mange mangeons mangez mangent', 'mangé', 'avoir'], en: ['eat', 'eats', 'ate'], obj: ['pomme', 'gateau', 'orange'] },
  regarder: { fr: ['regarder', 'regarde regardes regarde regardons regardez regardent', 'regardé', 'avoir'], en: ['watch', 'watches', 'watched'], obj: ['oiseau', 'arbre', 'voiture', 'fleur', 'chat'] },
  aimer: { fr: ['aimer', 'aime aimes aime aimons aimez aiment', 'aimé', 'avoir'], en: ['like', 'likes', 'liked'], obj: ['pomme', 'fleur', 'livre', 'histoire', 'gateau', 'maison'] },
  finir: { fr: ['finir', 'finis finis finit finissons finissez finissent', 'fini', 'avoir'], en: ['finish', 'finishes', 'finished'], obj: ['livre', 'lettre', 'gateau', 'histoire'] },
  prendre: { fr: ['prendre', 'prends prends prend prenons prenez prennent', 'pris', 'avoir'], en: ['take', 'takes', 'took'], obj: ['pomme', 'livre', 'fleur', 'boite', 'voiture'] },
  voir: { fr: ['voir', 'vois vois voit voyons voyez voient', 'vu', 'avoir'], en: ['see', 'sees', 'saw'], obj: ['oiseau', 'maison', 'arbre', 'chien', 'voiture'] },
  lire: { fr: ['lire', 'lis lis lit lisons lisez lisent', 'lu', 'avoir'], en: ['read', 'reads', 'read'], obj: ['livre', 'journal', 'lettre', 'histoire'] },
  acheter: { fr: ['acheter', 'achète achètes achète achetons achetez achètent', 'acheté', 'avoir'], en: ['buy', 'buys', 'bought'], obj: ['pomme', 'livre', 'journal', 'fleur', 'voiture', 'maison', 'boite', 'orange'] },
  ecrire: { fr: ['écrire', 'écris écris écrit écrivons écrivez écrivent', 'écrit', 'avoir'], en: ['write', 'writes', 'wrote'], obj: ['lettre', 'livre', 'histoire'] },
  dormir: { fr: ['dormir', 'dors dors dort dormons dormez dorment', 'dormi', 'avoir'], en: ['sleep', 'sleeps', 'slept'] },
  courir: { fr: ['courir', 'cours cours court courons courez courent', 'couru', 'avoir'], en: ['run', 'runs', 'ran'] },
  arriver: { fr: ['arriver', 'arrive arrives arrive arrivons arrivez arrivent', 'arrivé', 'être'], en: ['arrive', 'arrives', 'arrived'] },
  partir: { fr: ['partir', 'pars pars part partons partez partent', 'parti', 'être'], en: ['leave', 'leaves', 'left'] },
  tomber: { fr: ['tomber', 'tombe tombes tombe tombons tombez tombent', 'tombé', 'être'], en: ['fall', 'falls', 'fell'] },
};
const AUX = { avoir: 'ai as a avons avez ont'.split(' '), 'être': 'suis es est sommes êtes sont'.split(' ') };
const TRANS = Object.keys(V).filter(v => V[v].obj), INTRANS = Object.keys(V).filter(v => !V[v].obj);
const PRO_FR = ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles'], PRO_EN = ['I', 'you', 'he', 'she', 'we', 'they', 'it'];
const proFr = (p, g) => [p === 0 ? 'je' : p === 1 ? 'tu' : p === 2 ? (g === 'f' ? 'elle' : 'il') : p === 3 ? 'nous' : p === 4 ? 'vous' : g === 'f' ? 'elles' : 'ils'];
const proEn = (p, g) => p === 0 ? 'I' : p === 1 || p === 4 ? 'you' : p === 2 ? (g === 'f' ? 'she' : 'he') : p === 3 ? 'we' : 'they';
const PERS = ['1re sing.', '2e sing.', '3e sing.', '1re plur.', '2e plur.', '3e plur.'];
const GN = { msg: 'masculin singulier', fsg: 'féminin singulier', mpl: 'masculin pluriel', fpl: 'féminin pluriel' };

export const LANG_LEVELS = [
  { n: 1, name: 'Groupe nominal' }, { n: 2, name: 'Sujet + verbe' }, { n: 3, name: 'Phrase complète' },
  { n: 4, name: 'Négation' }, { n: 5, name: 'Passé' }, { n: 6, name: 'Questions' },
];
export const LANGS = { fr: 'Français', en: 'Anglais' };

// ---------- generateur de sens ----------
const np = (id, adj) => ({ id, def: Math.random() < .5, pl: Math.random() < .4, adj: adj || null });
export function makeMeaning(lv) {
  const m = { lv, neg: false, past: false, q: false };
  if (lv === 1) { m.subj = np(pick(Object.keys(N)), Math.random() < .5 ? pick(Object.keys(ADJ)) : null); return m; }
  const trans = lv >= 3 && (lv < 5 || Math.random() < .6);
  m.verb = pick(trans ? TRANS : INTRANS);
  m.subj = Math.random() < .45 ? { pro: true, p: Math.floor(Math.random() * 6), g: Math.random() < .5 ? 'm' : 'f' } : np(pick(ANIMES));
  if (trans) m.obj = np(pick(V[m.verb].obj));
  if (lv >= 3 && Math.random() < .7) { const t = m.obj && Math.random() < .5 ? m.obj : !m.subj.pro ? m.subj : m.obj; if (t) t.adj = pick(t === m.subj ? ['petit', 'grand', 'bon', 'joli'] : Object.keys(ADJ)); }
  if (lv === 4) m.neg = true;
  if (lv === 5) { m.past = true; m.neg = Math.random() < .3; }
  if (lv === 6) { m.q = true; m.past = Math.random() < .4; }
  return m;
}
const person = s => s.pro ? s.p : s.pl ? 5 : 2;
export function describe(m) {
  const g = x => x.pro ? `${PERS[x.p]} ${x.g === 'f' ? 'fém.' : 'masc.'}` :
    `${x.id.toUpperCase()}${x.adj ? ' + ' + x.adj.toUpperCase() : ''} (${x.def ? 'défini' : 'indéfini'}, ${x.pl ? 'pluriel' : 'singulier'})`;
  const parts = [`sujet : ${g(m.subj)}`];
  if (m.verb) parts.push(`verbe : ${m.verb.toUpperCase()} (${m.past ? 'passé' : 'présent'}${m.neg ? ', négatif' : ''}${m.q ? ', question' : ''})`);
  if (m.obj) parts.push(`objet : ${g(m.obj)}`);
  return parts.join(' · ');
}

// ---------- ecriture d'une phrase ----------
// choose(key, options, bonneOption, poids, explication) -> indice choisi. Le robot tire selon sa politique ;
// le juge (oracle) repond juste. Le meme code ecrit donc la phrase du robot ET la correction.
function frNP(x, ch) {
  const [w, g, irr] = N[x.id].fr, n = x.pl ? 'pl' : 'sg';
  const gi = ch(`fr:genre:${x.id}`, ['masculin', 'féminin'], g === 'm' ? 0 : 1, 2, `« ${w} » est ${g === 'm' ? 'masculin' : 'féminin'}`), G = gi ? 'f' : 'm';
  const arts = ['le', 'la', 'les', 'un', 'une', 'des'], good = x.def ? (x.pl ? 'les' : G === 'm' ? 'le' : 'la') : (x.pl ? 'des' : G === 'm' ? 'un' : 'une');
  let art = arts[ch(`fr:article:${x.def ? 'déf' : 'indéf'}:${G}:${n}`, arts, arts.indexOf(good), 2, `article ${x.def ? 'défini' : 'indéfini'} ${G === 'm' ? 'masculin' : 'féminin'} ${x.pl ? 'pluriel' : 'singulier'} : « ${good} »`)];
  if (x.negDe) art = ch('fr:pas-de', ['un/une/des', 'de'], 1, 2, 'après une négation, « un / une / des » devient « de »') ? 'de' : art;
  let noun = w;
  if (x.pl) { const f = uniq([w + 's', w + 'x', w.replace(/al$/, 'aux')]), ok = irr || w + 's'; noun = f[ch(`fr:pluriel:${x.id}`, f, f.indexOf(ok), 1, `pluriel de « ${w} » : « ${ok} »`)]; }
  const out = [art, noun];
  if (x.adj) {
    const [forms, after] = ADJ[x.adj].fr, f = uniq(forms), k = (G === 'f' ? 1 : 0) + (x.pl ? 2 : 0);
    const a = f[ch(`fr:accord:${x.adj}:${G}${n}`, f, f.indexOf(forms[k]), 1, `« ${forms[0]} » au ${GN[G + n]} : « ${forms[k]} »`)];
    const pos = ch(`fr:place:${x.adj}`, ['avant le nom', 'après le nom'], after, 1, `« ${forms[0]} » se place ${after ? 'après' : 'avant'} le nom`);
    pos ? out.push(a) : out.splice(1, 0, a);
  }
  return { toks: out, G };
}
function enNP(x, ch) {
  const [w, irr] = N[x.id].en, n = x.pl ? 'pl' : 'sg';
  const arts = ['the', 'a', '(rien)', 'some'], good = x.def ? 0 : x.pl ? 2 : 1;
  const ai = ch(`en:article:${x.def ? 'déf' : 'indéf'}:${n}`, arts, good, 2, x.def ? 'article défini : « the »' : x.pl ? 'indéfini pluriel : pas d’article (« cats »)' : 'indéfini singulier : « a / an »');
  let noun = w;
  if (x.pl) { const ok = irr || w + 's', f = uniq([w + 's', w + 'es', ok]); noun = f[ch(`en:plural:${x.id}`, f, f.indexOf(ok), 1, `pluriel de « ${w} » : « ${ok} »`)]; }
  const out = ai === 2 ? [noun] : [arts[ai], noun];
  if (x.adj) {
    const a = ADJ[x.adj].en, pos = ch(`en:place:${x.adj}`, ['before the noun', 'after the noun'], 0, 1, `en anglais l’adjectif « ${a} » se place avant le nom`);
    pos ? out.push(a) : out.splice(out.length - 1, 0, a);
  }
  return { toks: out };
}

function frSentence(m, ch) {
  if (m.lv === 1) return elideFr(frNP(m.subj, ch).toks, ch).join(' ').replace(/’ /g, '’');
  const s = m.subj, p = person(s), v = V[m.verb].fr;
  let subj, G;
  if (s.pro) { const ok = proFr(s.p, s.g)[0]; subj = [PRO_FR[ch(`fr:pronom:${s.p}${s.g}`, PRO_FR, PRO_FR.indexOf(ok), 2, `${PERS[s.p]}${s.g === 'f' ? ' féminin' : ''} : « ${ok} »`)]]; G = s.g; }
  else ({ toks: subj, G } = frNP(s, ch));
  let verb;
  if (!m.past) { const f = uniq([...v[1].split(' '), v[0]]), ok = v[1].split(' ')[p]; verb = [f[ch(`fr:conj:${m.verb}:présent:${p}`, f, f.indexOf(ok), 2, `${v[0]} au présent, ${PERS[p]} : « ${ok} »`)]]; }
  else {
    const ai = ch(`fr:auxiliaire:${m.verb}`, ['avoir', 'être'], v[3] === 'avoir' ? 0 : 1, 2, `« ${v[0]} » se conjugue avec ${v[3]}`), aux = ai ? 'être' : 'avoir';
    const af = AUX[aux], a = af[ch(`fr:conj:${aux}:présent:${p}`, af, p, 2, `${aux} au présent, ${PERS[p]} : « ${af[p]} »`)];
    const stem = v[0].replace(/(er|ir|re)$/, ''), f = uniq([v[2], stem + 'é', stem + 'i', stem + 'u', v[0]]);
    let pp = f[ch(`fr:participe:${m.verb}`, f, f.indexOf(v[2]), 2, `participe passé de « ${v[0]} » : « ${v[2]} »`)];
    if (aux === 'être') { const pl = s.pro ? s.p >= 3 : s.pl, k = (G === 'f' ? 1 : 0) + (pl ? 2 : 0), e = ['', 'e', 's', 'es'];
      pp += e[ch(`fr:accord-pp:${G}${pl ? 'pl' : 'sg'}`, ['aucun', '+e', '+s', '+es'], k, 1, `avec être, le participe s’accorde avec le sujet : ${['aucun accord', '+e', '+s', '+es'][k]}`)]; }
    verb = [a, pp];
  }
  if (m.neg) {
    const ni = ch('fr:négation', ['ne … pas', 'pas seul', 'ne seul'], 0, 2, 'la négation s’écrit « ne … pas » autour du verbe conjugué');
    verb = ni === 0 ? ['ne', verb[0], 'pas', ...verb.slice(1)] : ni === 1 ? [verb[0], 'pas', ...verb.slice(1)] : ['ne', ...verb];
  }
  let obj = [];
  if (m.obj) obj = frNP({ ...m.obj, negDe: m.neg && !m.obj.def }, ch).toks;
  let toks = [...subj, ...verb, ...obj];
  if (m.obj) { const o = ch('fr:ordre', ['sujet-verbe-objet', 'sujet-objet-verbe', 'verbe-sujet-objet'], 0, 1, 'ordre de la phrase : sujet – verbe – objet');
    toks = o === 0 ? toks : o === 1 ? [...subj, ...obj, ...verb] : [...verb, ...subj, ...obj]; }
  if (m.q) { const qi = ch('fr:question', ['Est-ce que + phrase', 'phrase sans marque'], 0, 2, 'question : « Est-ce que … ? »'); if (!qi) toks = ['est-ce', 'que', ...toks]; }
  toks = elideFr(toks, ch);
  let txt = toks.join(' ').replace(/’ /g, '’');
  txt = ch('fr:majuscule', ['minuscule', 'majuscule'], 1, 1, 'une phrase commence par une majuscule') ? txt[0].toUpperCase() + txt.slice(1) : txt;
  if (m.q) txt += ch('fr:point-question', ['« ? » collé', 'espace + « ? »'], 1, 1, 'en français, on met une espace avant « ? »') ? ' ?' : '?';
  else txt += ['', '.', ' !'][ch('fr:point', ['rien', '.', '!'], 1, 1, 'une phrase affirmative se termine par un point')];
  return txt;
}
const ELIDE = { le: 'l’', la: 'l’', je: 'j’', ne: 'n’', de: 'd’', que: 'qu’' };
function elideFr(toks, ch) {
  return toks.map((t, i) => {
    if (!ELIDE[t] || i === toks.length - 1) return t;
    const v = VOY_FR.test(toks[i + 1]);
    return ch(`fr:élision:${t}:${v ? 'voyelle' : 'consonne'}`, ['sans élision', 'élision'], v ? 1 : 0, 1,
      v ? `« ${t} » devant une voyelle devient « ${ELIDE[t]} »` : `pas d’élision de « ${t} » devant une consonne`) ? ELIDE[t] : t;
  });
}

function enSentence(m, ch) {
  const aan = toks => toks.map((t, i) => {
    if (t !== 'a' && t !== 'an' || i === toks.length - 1) return t;
    const v = VOY_EN.test(toks[i + 1]);
    return ['a', 'an'][ch(`en:a-an:${v ? 'voyelle' : 'consonne'}`, ['a', 'an'], v ? 1 : 0, 1, v ? '« a » devient « an » devant une voyelle' : '« a » (et non « an ») devant une consonne')];
  });
  if (m.lv === 1) return aan(enNP(m.subj, ch).toks).join(' ');
  const s = m.subj, p = person(s), v = V[m.verb].en;
  let subj;
  if (s.pro) { const ok = proEn(s.p, s.g); subj = [PRO_EN[ch(`en:pronoun:${s.p}${s.g}`, PRO_EN, PRO_EN.indexOf(ok), 2, `${PERS[s.p]}${s.g === 'f' ? ' féminin' : ''} : « ${ok} »`)]]; }
  else subj = enNP(s, ch).toks;
  let verb = [], aux = null;
  if (m.neg || m.q) {
    const ok = m.past ? 2 : p === 2 ? 1 : 0, dos = ['do', 'does', 'did'];
    aux = dos[ch(`en:do:${m.past ? 'passé' : 'présent'}:${p}`, dos, ok, 2, `auxiliaire ${m.past ? 'au passé : « did »' : `au présent, ${PERS[p]} : « ${dos[ok]} »`}`)];
    const f = uniq([v[0], v[1], v[2]]);
    verb = [f[ch(`en:base-après-do:${m.verb}`, f, 0, 2, `après do / does / did, le verbe reste à la base : « ${v[0]} »`)]];
  } else if (m.past) { const f = uniq([v[2], v[0] + 'ed', v[0]]); verb = [f[ch(`en:past:${m.verb}`, f, 0, 2, `passé de « ${v[0]} » : « ${v[2]} »`)]]; }
  else { const ok = p === 2 ? v[1] : v[0], f = uniq([v[0], v[1], v[0] + 'ing']); verb = [f[ch(`en:conj:${m.verb}:présent:${p}`, f, f.indexOf(ok), 2, `présent, ${PERS[p]} : « ${ok} »`)]]; }
  if (m.neg) { const ni = ch('en:négation', ['do + not + verbe', 'not seul', 'no + verbe'], 0, 2, 'négation : « do / does / did + not + verbe »'); verb = ni === 0 ? [aux, 'not', ...verb] : ni === 1 ? ['not', ...verb] : ['no', ...verb]; }
  const obj = m.obj ? enNP(m.obj, ch).toks : [];
  let toks;
  if (m.q) { const qi = ch('en:question', ['auxiliaire en tête', 'phrase sans auxiliaire'], 0, 2, 'question : l’auxiliaire passe devant le sujet (Do / Does / Did …?)'); toks = qi ? [...subj, ...verb, ...obj] : [aux, ...subj, ...verb, ...obj]; }
  else { toks = [...subj, ...verb, ...obj];
    if (m.obj) { const o = ch('en:order', ['subject-verb-object', 'subject-object-verb', 'verb-subject-object'], 0, 1, 'ordre : sujet – verbe – objet'); toks = o === 0 ? toks : o === 1 ? [...subj, ...obj, ...verb] : [...verb, ...subj, ...obj]; } }
  toks = aan(toks).map((t, i) => t === 'I' && i > 0 ? ['i', 'I'][ch('en:I-majuscule', ['i', 'I'], 1, 1, '« I » s’écrit toujours en majuscule')] : t);
  let txt = toks.join(' ');
  txt = ch('en:capital', ['minuscule', 'majuscule'], 1, 1, 'une phrase commence par une majuscule') ? txt[0].toUpperCase() + txt.slice(1) : txt;
  if (m.q) txt += ch('en:point-question', ['« ? » collé', 'espace + « ? »'], 0, 1, 'en anglais, pas d’espace avant « ? »') ? ' ?' : '?';
  else txt += ['', '.', ' !'][ch('en:point', ['rien', '.', '!'], 1, 1, 'une phrase affirmative se termine par un point')];
  return txt;
}

export const writeSentence = (lang, m, ch) => (lang === 'fr' ? frSentence : enSentence)(m, ch);

// ---------- apprentissage ----------
const LR = .45, BAD = -2, UNLOCK_AVG = 97, UNLOCK_PERFECT = .92, WINDOW = 40, KEEP = 40, DRILL = 2;
export const LANG_SECONDS = 2.5;
const softmax = z => { const mx = Math.max(...z), e = z.map(v => Math.exp(v - mx)), t = e.reduce((a, b) => a + b, 0); return e.map(v => v / t); };
const track = () => ({ level: 1, maxLevel: 1, recent: [], perfect: [], mastered: false, seq: 0, best: 0, history: [] });
export function newLang() { return { seq: 0, turn: 0, policy: {}, base: {}, mistakes: {}, fr: track(), en: track(), sentences: [], retry: null }; }
export const ensureLang = st => (st.lang ||= newLang());

const nextLevel = t => t.mastered && Math.random() < .5 ? 1 + Math.floor(Math.random() * LANG_LEVELS.length) : t.level;

// le robot ecrit, le juge strict corrige, le robot apprend
export function lessonStep(st) {
  const L = ensureLang(st);
  let lang, m, retry = 0;
  if (L.retry) ({ lang, m, retry } = L.retry);                       // il recommence la phrase ratee
  else { lang = L.turn++ % 2 ? 'en' : 'fr'; m = makeMeaning(nextLevel(L[lang])); }
  const T = L[lang], dec = [];
  const robot = (key, opts, ok, w, why) => {
    const z = L.policy[key] && L.policy[key].length === opts.length ? L.policy[key] : Array(opts.length).fill(0), p = softmax(z);
    let r = Math.random(), i = 0; while (i < p.length - 1 && (r -= p[i]) > 0) i++;
    dec.push({ key, i, ok, w, why, n: opts.length, conf: p[i] }); return i;
  };
  const out = writeSentence(lang, m, robot), ref = writeSentence(lang, m, (k, o, ok) => ok);
  // juge strict
  let tot = 0, got = 0; const errs = [];
  for (const d of dec) { tot += d.w; if (d.i === d.ok) got += d.w; else errs.push(d.why); }
  const exact = out === ref && !errs.length;
  const score = exact ? 100 : Math.min(60, Math.round(got / tot * 60));
  for (const d of dec) {
    const r = d.i === d.ok ? 1 : BAD, b = L.base[d.key] ?? 0;
    const z = L.policy[d.key] && L.policy[d.key].length === d.n ? L.policy[d.key] : Array(d.n).fill(0), p = softmax(z);
    L.policy[d.key] = z.map((v, i) => +Math.max(-30, Math.min(30, v + LR * (r - b) * ((i === d.i ? 1 : 0) - p[i]))).toFixed(3));
    L.base[d.key] = +(.85 * b + .15 * r).toFixed(3);
    if (r < 0) L.mistakes[d.key] = (L.mistakes[d.key] || 0) + 1;
  }
  for (const k in L.mistakes) { L.mistakes[k] = +(L.mistakes[k] * .98).toFixed(3); if (L.mistakes[k] < .05) delete L.mistakes[k]; }
  L.seq++; T.seq++;
  L.retry = !exact && retry < DRILL ? { lang, m, retry: retry + 1 } : null;
  const conf = Math.round(dec.reduce((a, d) => a + d.conf, 0) / dec.length * 100);
  const rec = { seq: L.seq, lang, lv: m.lv, sens: describe(m), out, ref, score, errs: uniq(errs), retry, conf, t: Date.now() };
  L.sentences.unshift(rec); if (L.sentences.length > KEEP) L.sentences.length = KEEP;
  if (score > T.best) T.best = score;
  let up = null;
  if (m.lv === T.level && !retry) {
    T.recent.push(score); T.perfect.push(exact ? 1 : 0);
    if (T.recent.length > WINDOW) { T.recent.shift(); T.perfect.shift(); }
    const avg = T.recent.reduce((a, b) => a + b, 0) / T.recent.length, pr = T.perfect.reduce((a, b) => a + b, 0) / T.perfect.length;
    if (T.recent.length >= WINDOW && avg >= UNLOCK_AVG && pr >= UNLOCK_PERFECT) {
      if (T.level < LANG_LEVELS.length) { T.level++; T.maxLevel = T.level; T.recent = []; T.perfect = []; up = `${LANGS[lang]} : niveau ${T.level} débloqué (${LANG_LEVELS[T.level - 1].name})`; }
      else if (!T.mastered) { T.mastered = true; up = `${LANGS[lang]} : toutes les leçons sont maîtrisées, je révise au hasard`; }
    }
  }
  if (T.seq % 25 === 0) { T.history.push(Math.round(L.sentences.filter(s => s.lang === lang).slice(0, 25).reduce((a, s) => a + s.score, 0) / Math.min(25, L.sentences.filter(s => s.lang === lang).length))); if (T.history.length > 200) T.history.shift(); }
  return { ...rec, exact, up };
}

// erreur de langue la plus frequente en ce moment
export function langWeakSpot(st) {
  const L = ensureLang(st), e = Object.entries(L.mistakes).sort((a, b) => b[1] - a[1])[0];
  return e && e[1] >= .5 ? e[0] : null;
}
export function simulateLang(st, seconds) {
  const n = Math.min(Math.floor(seconds / LANG_SECONDS), 25000), ups = [];
  for (let i = 0; i < n; i++) { const r = lessonStep(st); if (r.up) ups.push(r.up); }
  return { n, ups };
}
