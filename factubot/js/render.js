// Rendu A4 d'un document FICTIF tel que le robot l'a vraiment ecrit (erreurs comprises).
import { CATS, LEVELS } from './levels.js';

const eur = n => n.toLocaleString('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' &euro;';
const day = (t, plus = 0) => new Date(t + plus * 864e5).toLocaleDateString('fr-BE');
const RATES = [0, 6, 12, 21];
const party = (f, lvl) => [`<b>${f.name}</b>`, lvl >= 1 ? f.addr : '', lvl >= 2 ? `TVA ${f.vat}` : ''].filter(Boolean).join('<br>');

function invoice(ctx, d, credit) {
  const sign = credit && d.signe === 1 ? -1 : 1, title = credit && d.mention === 1 ? 'Note de cr&eacute;dit' : 'Facture';
  const num = d.numero === 2 ? `${new Date(ctx.date).getFullYear()}-${String(ctx.seq).padStart(4, '0')}` : d.numero === 1 ? `X${(ctx.seq * 7919) % 90000}` : '';
  const lines = ctx.lines.map(l => {
    const rate = RATES[d['taux:' + l.cat]], ht = l.qty * l.unit * sign;
    const vat = d.calcul === 1 ? ht * rate / 100 : ht * rate / (100 + rate);
    return { ...l, rate, ht, vat };
  });
  const counted = d.total === 0 && lines.length > 1 ? lines.slice(0, -1) : lines;
  const ht = counted.reduce((a, l) => a + l.ht, 0), vat = counted.reduce((a, l) => a + l.vat, 0);
  const byRate = {}; lines.forEach(l => { byRate[l.rate] = (byRate[l.rate] || 0) + l.vat; });
  return `<header><div>${party(ctx.seller, d.vendeur)}</div><div class="r"><h1>${title}</h1>
    ${num ? `N&deg; ${num}<br>` : ''}${d.date === 1 ? `Date : ${day(ctx.date)}<br>` : ''}
    ${d.echeance === 2 ? `&Eacute;ch&eacute;ance : ${day(ctx.date, 30)}` : d.echeance === 1 ? `&Eacute;ch&eacute;ance : ${day(ctx.date, -5)}` : ''}</div></header>
    <section class="to">Factur&eacute; &agrave; :<br>${party(ctx.buyer, d.client)}</section>
    ${credit && d.reference === 1 ? `<p>Concerne la facture n&deg; ${new Date(ctx.date).getFullYear()}-${String(Math.max(1, ctx.seq - 7)).padStart(4, '0')}</p>` : ''}
    <table><tr><th>Description</th>${d.quantite ? '<th>Qt&eacute;</th><th>P.U. HT</th>' : ''}<th>TVA</th><th>Total HT</th></tr>
    ${lines.map(l => `<tr><td>${d.description ? CATS[l.cat][0] : 'Prestations diverses'}</td>${d.quantite ? `<td>${l.qty}</td><td>${eur(l.unit * sign)}</td>` : ''}<td>${l.rate} %</td><td>${eur(l.ht)}</td></tr>`).join('')}</table>
    <div class="tot">${d.recap === 1 ? Object.entries(byRate).map(([r, v]) => `TVA ${r} % : ${eur(v)}<br>`).join('') : ''}
    Total HT : ${eur(ht)}<br>TVA : ${eur(vat)}<br><b>Total TTC : ${eur(ht + vat)}</b></div>
    ${d.paiement === 1 ? `<p class="pay">Paiement par virement sur BE00 0000 0000 0000 (fictif), communication +++${String(ctx.seq).padStart(3, '0')}/0000/00000+++</p>` : ''}`;
}

function contract(ctx, d, nda) {
  const S = ctx.seller, B = ctx.buyer, art = [];
  const who = f => d.parties === 0 ? f.rep.split(' ')[0] : d.parties === 1 ? f.name : `${f.name}, n&deg; BCE ${f.vat.slice(3)}, ${f.addr}, repr&eacute;sent&eacute;e par ${f.rep}`;
  art.push(['Objet', d.objet ? (nda ? 'Encadrer l&rsquo;&eacute;change d&rsquo;informations confidentielles relatives au projet &laquo; Orion &raquo; (fictif).' : 'Le Prestataire r&eacute;alise une mission de conseil en organisation de 20 jours pour le Client.') : 'Collaboration entre les parties.']);
  if (!nda) {
    if (d.duree) art.push(['Dur&eacute;e', d.duree === 1 ? 'Le contrat est conclu pour 12 mois &agrave; compter de sa signature.' : 'Le contrat est &agrave; dur&eacute;e ind&eacute;termin&eacute;e et prend fin le 31 d&eacute;cembre.']);
    if (d.prix) art.push(['Prix', d.prix === 2 ? `${eur(ctx.amount)} HT, TVA 21 % en sus, payable &agrave; 30 jours fin de mois.` : `${eur(ctx.amount)}.`]);
  }
  art.push(['Obligations', d.obligations ? 'Chaque partie ex&eacute;cute de bonne foi ses engagements, le Client fournit les informations n&eacute;cessaires.' : 'Le Prestataire s&rsquo;engage &agrave; ex&eacute;cuter la mission.']);
  if (d.confid) art.push(['Confidentialit&eacute;', 'Les parties gardent confidentielles les informations &eacute;chang&eacute;es' + (d.dureeconf ? ', pendant 5 ans apr&egrave;s la fin du contrat' : '') + (d.exceptions ? ', hors informations d&eacute;j&agrave; publiques.' : '.')]);
  if (!nda) {
    if (d.responsabilite) art.push(['Responsabilit&eacute;', d.responsabilite === 2 ? 'La responsabilit&eacute; du Prestataire est plafonn&eacute;e au montant du contrat.' : 'Le Prestataire est responsable de tout dommage, sans limite.']);
    if (d.resiliation) art.push(['R&eacute;siliation', 'Chaque partie peut r&eacute;silier moyennant un pr&eacute;avis de 30 jours.']);
    if (d.forcemaj) art.push(['Force majeure', 'Aucune partie n&rsquo;est responsable d&rsquo;un manquement d&ucirc; &agrave; la force majeure.']);
  }
  if (d.droit) art.push(['Droit applicable', d.droit === 2 ? 'Le pr&eacute;sent contrat est r&eacute;gi par le droit belge.' : 'Le pr&eacute;sent contrat est r&eacute;gi par le droit fran&ccedil;ais.']);
  if (d.tribunal) art.push(['Litiges', `Tout litige rel&egrave;ve des tribunaux de ${d.tribunal === 2 ? 'Bruxelles' : 'Paris'}.`]);
  if (d.doublon === 0 && art.length > 2) art.push(art[1]);
  if (d.ordre === 0) art.reverse();
  return `<h1 class="c">${nda ? 'Accord de confidentialit&eacute;' : 'Contrat de prestation de services'}</h1>
    <p>Entre <b>${who(S)}</b>, ci-apr&egrave;s &laquo; ${nda ? 'la Partie divulgatrice' : 'le Prestataire'} &raquo;,<br>et <b>${who(B)}</b>, ci-apr&egrave;s &laquo; ${nda ? 'la Partie r&eacute;ceptrice' : 'le Client'} &raquo;.</p>
    ${art.map(([t, x], i) => `<h3>Article ${i + 1} &ndash; ${t}</h3><p>${x}</p>`).join('')}
    ${d.signatures ? `<div class="sig"><div>Fait &agrave; Bruxelles le ${day(ctx.date)}<br>en deux exemplaires.<br><br>Pour ${S.name}<br>__________</div><div><br><br><br>Pour ${B.name}<br>__________</div></div>` : ''}`;
}

export function renderDoc(rec) {
  const { ctx, dec } = rec, L = LEVELS[rec.lv - 1];
  let body;
  if (ctx.kind === 'contrat' || ctx.kind === 'nda') body = contract(ctx, dec, ctx.kind === 'nda');
  else if (ctx.kind === 'dossier') {
    const inv = { ...ctx, buyer: dec.memesparties ? ctx.buyer : { ...ctx.seller, name: 'Autre Client SRL' }, lines: [{ cat: 'conseil', qty: 1, unit: dec.coherence ? ctx.amount : ctx.amount + 750 }] };
    body = contract(ctx, dec, false) + '<div class="break"></div>' + invoice(inv, dec, false);
  } else body = invoice(ctx, dec, ctx.kind === 'credit');
  return `<article class="a4"><div class="wm">FICTIF &ndash; ENTRA&Icirc;NEMENT IA</div>
    <div class="meta">Document n&deg;${rec.seq} &middot; Niveau ${rec.lv} &middot; ${L.name} &middot; confiance ${rec.confidence} %</div>${body}</article>`;
}
