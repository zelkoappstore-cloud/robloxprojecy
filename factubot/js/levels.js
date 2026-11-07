// Niveaux, generateur et correcteur. Le robot ne lit JAMAIS ce fichier : il choisit au hasard au debut,
// et seules les corrections du "juge" (issues) lui apprennent ce qui est bon. Tout est FICTIF.
const pick = a => a[Math.floor(Math.random() * a.length)];
const r2 = n => Math.round(n * 100) / 100;
const NAMES = ['Atelier Lumen', 'Brique &amp; Co', 'Nordvent', 'Pixelterre', 'Maison Orme', 'Kobalt Studio', 'Verger Bleu', 'Helix Conseil', 'Papeterie Sable', 'Cuisine Rivage'];
const STREETS = ['Rue des Lilas', 'Avenue du Port', 'Chauss&eacute;e de Namur', 'Rue Haute', 'Boulevard Fictif'];
const CITIES = ['1000 Bruxelles', '4000 Li&egrave;ge', '5000 Namur', '7000 Mons', '1300 Wavre'];
const firm = () => ({ name: `${pick(NAMES)} ${pick(['SRL', 'SA', 'SC'])}`, addr: `${pick(STREETS)} ${1 + Math.floor(Math.random() * 120)}, ${pick(CITIES)}`,
  vat: `BE 0${900 + Math.floor(Math.random() * 99)}.${String(Math.floor(Math.random() * 1e3)).padStart(3, '0')}.${String(Math.floor(Math.random() * 1e3)).padStart(3, '0')}`, rep: pick(['A. Martin', 'L. Peeters', 'S. Dubois', 'K. Janssens']) });
// categories et taux belges reels
export const CATS = { conseil: ['Mission de conseil en organisation', 21], logiciel: ['Licence logicielle annuelle', 21], livre: ['Lot de livres techniques', 6],
  restauration: ['Repas de s&eacute;minaire (service traiteur)', 12], renovation: ['R&eacute;novation salle de bain (logement &gt; 10 ans)', 6] };
const RATES = [0, 6, 12, 21];

export const LEVELS = [
  { n: 1, name: 'Facture simple', kind: 'facture', lines: [1, 1], cats: ['conseil', 'logiciel'] },
  { n: 2, name: 'Facture multi-taux', kind: 'facture', lines: [2, 4], cats: Object.keys(CATS) },
  { n: 3, name: 'Note de cr&eacute;dit', kind: 'credit', lines: [1, 3], cats: Object.keys(CATS) },
  { n: 4, name: 'Contrat de prestation', kind: 'contrat' },
  { n: 5, name: 'Accord de confidentialit&eacute;', kind: 'nda' },
  { n: 6, name: 'Dossier contrat + facture', kind: 'dossier', lines: [1, 1], cats: ['conseil'] },
];

// chaque choix : options possibles, bonne(s) reponse(s), poids dans la note, correction donnee par le juge
const C = {
  numero: { opts: ['aucun', 'al&eacute;atoire', 's&eacute;quentiel'], ok: 2, w: 3, why: 'num&eacute;ro de facture absent ou non s&eacute;quentiel' },
  date: { opts: ['absente', 'pr&eacute;sente'], ok: 1, w: 3, why: 'date d&rsquo;&eacute;mission absente' },
  echeance: { opts: ['absente', 'avant la date', '+30 jours'], ok: 2, w: 1, why: '&eacute;ch&eacute;ance absente ou incoh&eacute;rente' },
  vendeur: { opts: ['nom seul', 'nom + adresse', 'nom + adresse + TVA'], ok: 2, w: 3, why: 'identification du vendeur incompl&egrave;te (TVA obligatoire)' },
  client: { opts: ['nom seul', 'nom + adresse', 'nom + adresse + TVA'], ok: 2, w: 2, why: 'identification du client incompl&egrave;te' },
  description: { opts: ['vague', 'pr&eacute;cise'], ok: 1, w: 2, why: 'description trop vague' },
  quantite: { opts: ['absente', 'pr&eacute;sente'], ok: 1, w: 1, why: 'quantit&eacute; absente' },
  taux: { opts: RATES.map(r => r + ' %'), ok: ctx => RATES.indexOf(CATS[ctx][1]), w: 3, why: ctx => `mauvais taux de TVA pour &laquo; ${CATS[ctx][0]} &raquo;` },
  calcul: { opts: ['TVA sur le TTC', 'TVA sur le HT'], ok: 1, w: 3, why: 'TVA mal calcul&eacute;e (elle se calcule sur le HT)' },
  total: { opts: ['oublie une ligne', 'somme compl&egrave;te'], ok: 1, w: 3, why: 'total faux : une ligne oubli&eacute;e' },
  recap: { opts: ['absent', 'par taux'], ok: 1, w: 2, why: 'r&eacute;capitulatif de TVA par taux absent' },
  paiement: { opts: ['absent', 'IBAN + communication'], ok: 1, w: 1, why: 'modalit&eacute;s de paiement absentes' },
  mention: { opts: ['titre &laquo; Facture &raquo;', 'titre &laquo; Note de cr&eacute;dit &raquo;'], ok: 1, w: 3, why: 'le document n&rsquo;est pas intitul&eacute; note de cr&eacute;dit' },
  reference: { opts: ['absente', 'facture d&rsquo;origine cit&eacute;e'], ok: 1, w: 2, why: 'la facture d&rsquo;origine n&rsquo;est pas r&eacute;f&eacute;renc&eacute;e' },
  signe: { opts: ['montants positifs', 'montants n&eacute;gatifs'], ok: 1, w: 2, why: 'une note de cr&eacute;dit doit avoir des montants n&eacute;gatifs' },
  parties: { opts: ['pr&eacute;noms seuls', 'd&eacute;nominations', 'd&eacute;nominations + BCE + repr&eacute;sentant'], ok: 2, w: 3, why: 'parties mal identifi&eacute;es' },
  objet: { opts: ['vague', 'pr&eacute;cis'], ok: 1, w: 2, why: 'objet du contrat trop vague' },
  duree: { opts: ['absente', 'd&eacute;termin&eacute;e (12 mois)', 'ind&eacute;termin&eacute;e mais avec date de fin'], ok: 1, w: 2, why: 'dur&eacute;e absente ou contradictoire' },
  prix: { opts: ['absent', 'montant seul', 'montant HT + TVA + modalit&eacute;s'], ok: 2, w: 3, why: 'prix ou modalit&eacute;s de paiement manquants' },
  obligations: { opts: ['une seule partie', 'les deux parties'], ok: 1, w: 2, why: 'obligations d&rsquo;une seule partie' },
  responsabilite: { opts: ['absente', 'illimit&eacute;e', 'plafonn&eacute;e au montant du contrat'], ok: 2, w: 1, why: 'clause de responsabilit&eacute; absente ou d&eacute;s&eacute;quilibr&eacute;e' },
  resiliation: { opts: ['absente', 'pr&eacute;avis de 30 jours'], ok: 1, w: 2, why: 'aucune clause de r&eacute;siliation' },
  forcemaj: { opts: ['absente', 'pr&eacute;sente'], ok: 1, w: 1, why: 'force majeure non pr&eacute;vue' },
  droit: { opts: ['absent', 'droit fran&ccedil;ais', 'droit belge'], ok: 2, w: 2, why: 'droit applicable absent ou inadapt&eacute; (parties belges)' },
  tribunal: { opts: ['absent', 'tribunaux de Paris', 'tribunaux de Bruxelles'], ok: 2, w: 2, why: 'juridiction absente ou incoh&eacute;rente avec le droit belge' },
  signatures: { opts: ['absentes', 'date, lieu et signatures'], ok: 1, w: 3, why: 'pas de bloc de signatures' },
  doublon: { opts: ['clause r&eacute;p&eacute;t&eacute;e', 'sans doublon'], ok: 1, w: 1, why: 'une clause est r&eacute;p&eacute;t&eacute;e' },
  ordre: { opts: ['d&eacute;sordonn&eacute;', 'logique'], ok: 1, w: 1, why: 'articles dans un ordre illogique' },
  confid: { opts: ['absente', 'pr&eacute;sente'], ok: 1, w: 3, why: 'clause de confidentialit&eacute; absente' },
  dureeconf: { opts: ['absente', '5 ans apr&egrave;s la fin'], ok: 1, w: 2, why: 'dur&eacute;e de confidentialit&eacute; non pr&eacute;cis&eacute;e' },
  exceptions: { opts: ['absentes', 'informations publiques exclues'], ok: 1, w: 1, why: 'exceptions &agrave; la confidentialit&eacute; absentes' },
  coherence: { opts: ['prix diff&eacute;rent du contrat', 'prix identique au contrat'], ok: 1, w: 3, why: 'la facture ne correspond pas au prix du contrat' },
  memesparties: { opts: ['autre client', 'm&ecirc;mes parties'], ok: 1, w: 3, why: 'la facture n&rsquo;est pas adress&eacute;e au cocontractant' },
};
export const CHOICES = C;
const INV = ['numero', 'date', 'echeance', 'vendeur', 'client', 'description', 'quantite', 'calcul', 'total', 'recap', 'paiement'];
const CON = ['parties', 'objet', 'duree', 'prix', 'obligations', 'responsabilite', 'resiliation', 'forcemaj', 'droit', 'tribunal', 'signatures', 'doublon', 'ordre'];
const SET = { facture: INV, credit: [...INV, 'mention', 'reference', 'signe'], contrat: [...CON, 'confid'],
  nda: ['parties', 'objet', 'confid', 'dureeconf', 'exceptions', 'obligations', 'droit', 'tribunal', 'signatures', 'doublon', 'ordre'],
  dossier: [...CON, ...INV, 'coherence', 'memesparties'] };

// contexte d'un document : qui, quoi, combien
export function makeContext(lv, seq) {
  const L = LEVELS[lv - 1], n = L.lines ? L.lines[0] + Math.floor(Math.random() * (L.lines[1] - L.lines[0] + 1)) : 0;
  return { lv, seq, kind: L.kind, seller: firm(), buyer: firm(), date: Date.now(), amount: 500 * (1 + Math.floor(Math.random() * 20)),
    lines: Array.from({ length: n }, () => { const cat = pick(L.cats); return { cat, qty: 1 + Math.floor(Math.random() * 5), unit: 50 + Math.floor(Math.random() * 40) * 25 }; }) };
}
// decisions a prendre pour ce document (une par choix, + un taux par categorie presente)
export function keysFor(ctx) {
  const k = SET[ctx.kind].map(id => ({ key: id, id }));
  if (ctx.lines.length) [...new Set(ctx.lines.map(l => l.cat))].forEach(cat => k.push({ key: 'taux:' + cat, id: 'taux', ctx: cat }));
  if (ctx.kind === 'contrat') k.find(x => x.id === 'confid').optional = true;
  return k;
}

// le juge : note sur 100 + corrections rattachees a chaque decision
export function judge(ctx, dec) {
  let tot = 0, got = 0; const issues = [], good = [];
  for (const k of keysFor(ctx)) {
    const c = C[k.id], ok = typeof c.ok === 'function' ? c.ok(k.ctx) : c.ok, w = k.optional ? .5 : c.w;
    if (ctx.lines.length === 1 && (k.id === 'total' || k.id === 'recap')) { if (dec[k.key] === ok) got += 0; continue; }
    tot += w;
    if (dec[k.key] === ok || (k.optional && dec[k.key] === 0)) { got += w; good.push(k.key); }
    else issues.push({ key: k.key, msg: typeof c.why === 'function' ? c.why(k.ctx) : c.why });
  }
  return { score: Math.round(got / tot * 100), issues, good };
}
