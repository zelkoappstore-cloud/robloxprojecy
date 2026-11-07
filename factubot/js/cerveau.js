// Cerveau de FactuBot : un mini-GPT (reseau de neurones) entraine sur du francais libre de droits
// (Wikipedia + livres du domaine public Gallica), puis corrige par un juge strict (LanguageTool).
// Ce fichier le fait tourner directement dans le navigateur, sans serveur : lecture des poids
// (int8 -> float32), puis generation mot par mot avec memoire d'attention (cache K/V).

let NET = null;
export const brainReady = () => !!NET;
export const brainInfo = () => NET && { ...NET.cfg, stats: NET.stats, params: NET.params };

// table GPT-2 octet <-> caractere (tokenizer "ByteLevel")
const B2U = (() => {
  const bs = [];
  for (let i = 33; i <= 126; i++) bs.push(i);
  for (let i = 161; i <= 172; i++) bs.push(i);
  for (let i = 174; i <= 255; i++) bs.push(i);
  const cs = bs.slice(); let n = 0;
  for (let b = 0; b < 256; b++) if (!bs.includes(b)) { bs.push(b); cs.push(256 + n++); }
  const m = {}; bs.forEach((b, i) => { m[b] = String.fromCharCode(cs[i]); }); return m;
})();
const U2B = Object.fromEntries(Object.entries(B2U).map(([b, c]) => [c, +b]));

export function loadBrain(buf) {
  const dv = new DataView(buf), magic = new TextDecoder().decode(new Uint8Array(buf, 0, 4));
  if (magic !== 'FBC1') throw new Error('fichier cerveau invalide');
  const hl = dv.getUint32(4, true), head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, hl)));
  const base = 8 + hl, W = {};
  let params = 0;
  for (const t of head.tensors) {
    const n = t.s.reduce((a, b) => a * b, 1); params += n;
    let f;
    if (t.q) {
      const q = new Int8Array(buf, base + t.o, n), sc = new Float32Array(buf, base + t.so, t.s[0]), cols = t.s[1];
      f = new Float32Array(n);
      for (let r = 0; r < t.s[0]; r++) { const s = sc[r]; for (let c = 0; c < cols; c++) f[r * cols + c] = q[r * cols + c] * s; }
    } else f = new Float32Array(buf.slice(base + t.o, base + t.o + n * 4));
    W[t.n] = f;
  }
  const vocab = head.vocab, index = new Map(vocab.map((s, i) => [s, i]));
  NET = { cfg: head.cfg, stats: head.stats || {}, W, vocab, index, params };
  return brainInfo();
}

// ---------- calcul ----------
const matvec = (M, x, rows, cols, out = new Float32Array(rows)) => {
  for (let r = 0; r < rows; r++) { let s = 0; const o = r * cols; for (let c = 0; c < cols; c++) s += M[o + c] * x[c]; out[r] = s; }
  return out;
};
const layerNorm = (x, w, b) => {
  const n = x.length; let m = 0; for (let i = 0; i < n; i++) m += x[i]; m /= n;
  let v = 0; for (let i = 0; i < n; i++) v += (x[i] - m) ** 2; v = 1 / Math.sqrt(v / n + 1e-5);
  const y = new Float32Array(n); for (let i = 0; i < n; i++) y[i] = (x[i] - m) * v * w[i] + b[i]; return y;
};
const gelu = x => .5 * x * (1 + Math.tanh(.7978845608 * (x + .044715 * x * x * x)));

function newCache() { const { n_layer, block, n_embd } = NET.cfg; return Array.from({ length: n_layer }, () => ({ k: new Float32Array(block * n_embd), v: new Float32Array(block * n_embd) })); }
// un pas : avale le morceau `tok` a la position `pos`, renvoie les scores du morceau suivant
export function step(tok, pos, cache) {
  const { n_layer, n_embd: C, n_head: H, V } = NET.cfg, W = NET.W, hd = C / H;
  let x = new Float32Array(C);
  for (let i = 0; i < C; i++) x[i] = W['wte.weight'][tok * C + i] + W['wpe.weight'][pos * C + i];
  const att = new Float32Array(pos + 1), y = new Float32Array(C);
  for (let l = 0; l < n_layer; l++) {
    const p = `blocks.${l}.`, L = cache[l];
    const qkv = matvec(W[p + 'attn.weight'], layerNorm(x, W[p + 'ln1.weight'], W[p + 'ln1.bias']), 3 * C, C);
    L.k.set(qkv.subarray(C, 2 * C), pos * C); L.v.set(qkv.subarray(2 * C), pos * C);
    for (let h = 0; h < H; h++) {
      const o = h * hd; let mx = -1e30;
      for (let t = 0; t <= pos; t++) { let s = 0; for (let i = 0; i < hd; i++) s += qkv[o + i] * L.k[t * C + o + i]; att[t] = s / Math.sqrt(hd); if (att[t] > mx) mx = att[t]; }
      let sum = 0; for (let t = 0; t <= pos; t++) { att[t] = Math.exp(att[t] - mx); sum += att[t]; }
      for (let i = 0; i < hd; i++) { let s = 0; for (let t = 0; t <= pos; t++) s += att[t] * L.v[t * C + o + i]; y[o + i] = s / sum; }
    }
    const pr = matvec(W[p + 'proj.weight'], y, C, C); for (let i = 0; i < C; i++) x[i] += pr[i];
    const f = matvec(W[p + 'fc.weight'], layerNorm(x, W[p + 'ln2.weight'], W[p + 'ln2.bias']), 4 * C, C);
    for (let i = 0; i < f.length; i++) f[i] = gelu(f[i]);
    const f2 = matvec(W[p + 'fc2.weight'], f, C, 4 * C); for (let i = 0; i < C; i++) x[i] += f2[i];
  }
  return matvec(W['wte.weight'], layerNorm(x, W['lnf.weight'], W['lnf.bias']), V, C);
}

// ---------- texte <-> morceaux ----------
export function decode(ids) {
  const bytes = []; for (const i of ids) for (const ch of NET.vocab[i]) if (U2B[ch] !== undefined) bytes.push(U2B[ch]);
  return new TextDecoder().decode(new Uint8Array(bytes));
}
// decoupage glouton (plus long morceau connu d'abord) : suffisant pour amorcer une phrase
export function encode(text) {
  const s = Array.from(new TextEncoder().encode(text), b => B2U[b]).join(''), ids = [];
  for (let i = 0; i < s.length;) {
    let j = Math.min(s.length, i + 24);
    while (j > i + 1 && !NET.index.has(s.slice(i, j))) j--;
    const id = NET.index.get(s.slice(i, j)); if (id === undefined) { i++; continue; }
    ids.push(id); i = j;
  }
  return ids;
}

// ecrit une phrase (en option a partir d'un debut impose)
export function generate({ prompt = '', temp = .8, topk = 40, maxlen = 60, rnd = Math.random } = {}) {
  if (!NET) return null;
  const { bos, nl, block } = NET.cfg, cache = newCache(), ids = [bos, ...encode(prompt)];
  let logits;
  for (let i = 0; i < ids.length; i++) logits = step(ids[i], i, cache);
  const out = ids.slice(1);
  for (let n = 0; n < maxlen && ids.length < block; n++) {
    const sc = Array.from(logits, (v, i) => [v / temp, i]).sort((a, b) => b[0] - a[0]).slice(0, topk);
    const mx = sc[0][0]; let tot = 0; for (const s of sc) { s[0] = Math.exp(s[0] - mx); tot += s[0]; }
    let r = rnd() * tot, k = 0; while (k < sc.length - 1 && (r -= sc[k][0]) > 0) k++;
    const t = sc[k][1]; if (t === nl) break;
    out.push(t); ids.push(t); logits = step(t, ids.length - 1, cache);
  }
  return decode(out).trim();
}
