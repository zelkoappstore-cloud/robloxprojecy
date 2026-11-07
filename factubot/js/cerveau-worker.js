// Fait tourner le cerveau dans un fil separe : la scene 3D reste fluide pendant qu'il ecrit.
import { loadBrain, generate } from './cerveau.js';
self.onmessage = async ({ data }) => {
  try {
    if (data.url) { const r = await fetch(data.url); if (!r.ok) throw new Error(r.status); self.postMessage({ info: loadBrain(await r.arrayBuffer()) }); }
    if (data.gen) self.postMessage({ id: data.id, text: generate(data.opts || {}) });
  } catch (e) { self.postMessage({ id: data.id, error: String(e.message || e) }); }
};
