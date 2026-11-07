// Etat partage de FactuBot. A chaque appel (visite ou cron quotidien), le serveur fait travailler le robot
// pendant tout le temps ecoule depuis la derniere sauvegarde : documents ET cours de langues.
// Il continue donc d'apprendre meme quand personne n'est sur le site.
import { put, head, list, del } from '@vercel/blob';
import { VERSION, newState, simulate, addLog } from '../js/writer.js';
import { ensureLang } from '../js/langue.js';
import { ensureLecture, loadLecture } from '../js/lecture.js';

// Chaque sauvegarde va dans un NOUVEAU fichier (factubot/v/000000042.json) : une adresse jamais lue
// n'a pas de copie en cache sur le CDN, donc on relit toujours la vraie derniere version.
const DIR = 'factubot/v/', LEGACY = 'factubot/state.json';
const pad = n => String(n).padStart(9, '0');
async function read() {
  try {
    const { blobs } = await list({ prefix: DIR, limit: 1000 });
    let url = blobs.sort((a, b) => a.pathname < b.pathname ? 1 : -1)[0]?.url;
    if (!url) url = (await head(LEGACY)).url;                        // ancien format, lu une seule fois
    const s = await (await fetch(url, { cache: 'no-store' })).json();
    return s.v === VERSION ? s : null;
  } catch { return null; }
}
async function write(s) {
  const opts = { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' };
  await put(DIR + pad(s.version) + '.json', JSON.stringify(s), opts);
  try {                                                               // menage : on garde les 3 dernieres
    const { blobs } = await list({ prefix: DIR, limit: 1000 });
    const old = blobs.sort((a, b) => a.pathname < b.pathname ? 1 : -1).slice(3).map(b => b.url);
    if (old.length) await del(old);
  } catch { /* pas grave */ }
}
// rattrape le temps ecoule
function catchUp(s) {
  ensureLang(s); ensureLecture(s);
  const away = (Date.now() - (s.updatedAt || Date.now())) / 1000;
  if (away > 30) { const n = simulate(s, away); if (n) addLog(s, `${n} documents r&eacute;dig&eacute;s pendant votre absence`, 'ok'); }
  s.updatedAt = Date.now();
  return away > 30;
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  await loadLecture();                                                // modele de lecture (une fois par instance)
  try {
    if (req.method === 'POST') {
      let s = req.body; if (typeof s === 'string') s = JSON.parse(s);
      if (!s || s.v !== VERSION) return res.status(400).json({ error: 'etat invalide' });
      const cur = await read();
      if (cur && cur.version > (s.version || 0)) {                   // quelqu'un d'autre a sauvegarde entre-temps
        if (catchUp(cur)) { cur.version++; await write(cur); }
        return res.status(409).json({ state: cur });
      }
      ensureLang(s); ensureLecture(s);
      s.version = (cur?.version || 0) + 1; s.updatedAt = Date.now();
      await write(s);
      return res.status(200).json({ version: s.version });
    }
    const s = (await read()) || newState();
    if (catchUp(s) || !s.version) { s.version = (s.version || 0) + 1; await write(s); }
    return res.status(200).json(s);
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
