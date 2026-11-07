// Fait tourner le cerveau dans un fil separe : la scene 3D reste fluide pendant qu'il ecrit.
import { loadBrain, generate } from './cerveau.js';
self.onmessage = async ({ data }) => {
  try {
    if (data.urls) {                                   // CDN d'abord, GitHub en secours
      let buf = null;
      for (const u of data.urls) { try { const r = await fetch(u); if (r.ok) { buf = await r.arrayBuffer(); break; } } catch { /* suivant */ } }
      if (!buf) throw new Error('cerveau introuvable');
      self.postMessage({ info: loadBrain(buf) });
    }
    if (data.gen) self.postMessage({ id: data.id, text: generate(data.opts || {}) });
  } catch (e) { self.postMessage({ id: data.id, error: String(e.message || e) }); }
};
