import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Robot } from './robot.js';
import { LEVELS } from './levels.js';
import { VERSION, DOC_SECONDS, newState, startDoc, finishDoc, simulate, weakSpot, addLog } from './writer.js';
import { LANG_LEVELS, LANGS, LANG_SECONDS, ensureLang, lessonStep } from './langue.js';
import { READ_SECONDS, BOOKS, ensureLecture, readStep, acceptRate, loadLecture } from './lecture.js';
import { renderDoc } from './render.js';

const KEY = 'factubot-v1';
const plain = s => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* prive */ } } };

// ---------- etat : le serveur l'a fait travailler pendant l'absence ----------
async function load() {
  try { const r = await fetch('/api/state', { cache: 'no-store' }); if (r.ok) { const s = await r.json(); if (s.v === VERSION) { ensureLang(s); ensureLecture(s); return [s, true]; } } } catch { /* local */ }
  let s = null; try { s = JSON.parse(store.get(KEY) || 'null'); } catch { /* corrompu */ }
  if (s?.v !== VERSION) return [newState(), false];
  ensureLang(s); ensureLecture(s);
  const away = (Date.now() - s.updatedAt) / 1000;
  if (away > 30) { const n = simulate(s, away); if (n) addLog(s, `${n} documents r&eacute;dig&eacute;s pendant votre absence`, 'ok'); }
  return [s, false];
}
await loadLecture();
let [st, online] = await load();

// ---------- scene : bureau sur plateforme blanche ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xeef0f3); scene.fog = new THREE.Fog(0xeef0f3, 14, 40);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
const camera = new THREE.PerspectiveCamera(40, 1, .1, 100); camera.position.set(4.2, 3.4, 5.2);
const controls = new OrbitControls(camera, canvas); controls.target.set(0, 1.1, 0); controls.enableDamping = true;
controls.maxPolarAngle = 1.4; controls.minDistance = 2.5; controls.maxDistance = 14; controls.autoRotate = true; controls.autoRotateSpeed = .25;
scene.add(new THREE.HemisphereLight(0xffffff, 0xcfd6df, .9));
const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(5, 9, 4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.normalBias = .02;
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 }); scene.add(sun);
const mat = (c, r = .4) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, clearcoat: .4 });
const add = (g, m, x, y, z, p = scene) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; p.add(o); return o; };
add(new THREE.CylinderGeometry(5, 5.2, .5, 80), mat(0xffffff, .35), 0, -.25, 0);
const rim = add(new THREE.TorusGeometry(5, .04, 8, 120), new THREE.MeshStandardMaterial({ color: 0xd0452f, emissive: 0xd0452f, emissiveIntensity: 1.2 }), 0, 0, 0); rim.rotation.x = Math.PI / 2;
add(new THREE.CylinderGeometry(2.2, 2.2, .02, 64), new THREE.MeshStandardMaterial({ color: 0xd9cfc2, roughness: .95 }), 0, .01, .2);
// bureau
const wood = mat(0xc89b6d, .55), dark = mat(0x2b313a);
add(new RoundedBoxGeometry(2.2, .07, 1, 3, .03), wood, 0, .9, -.35);
[[-1, -.75], [1, -.75], [-1, .05], [1, .05]].forEach(([x, z]) => add(new THREE.BoxGeometry(.06, .88, .06), dark, x, .44, z));
// PC
add(new THREE.BoxGeometry(.08, .3, .06), dark, 0, 1.08, -.6);
add(new RoundedBoxGeometry(1, .62, .05, 2, .02), dark, 0, 1.5, -.6);
const scr = document.createElement('canvas'); scr.width = 512; scr.height = 320;
const sctx = scr.getContext('2d'), stex = new THREE.CanvasTexture(scr); stex.colorSpace = THREE.SRGBColorSpace;
add(new THREE.PlaneGeometry(.93, .56), new THREE.MeshBasicMaterial({ map: stex, toneMapped: false }), 0, 1.5, -.57).castShadow = false;
add(new RoundedBoxGeometry(.55, .03, .18, 2, .01), mat(0xdfe3e8), 0, .95, -.18);
// imprimante + pile de feuilles
add(new RoundedBoxGeometry(.5, .25, .4, 3, .05), mat(0xf4f5f7), .82, 1.06, -.45);
const paperMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9 });
const sheet = add(new THREE.BoxGeometry(.3, .005, .4), paperMat, .82, 1.19, -.45); sheet.visible = false;
const pile = add(new THREE.BoxGeometry(.32, 1, .42), paperMat, -.8, .935, -.45);
// lampe, plante, etagere de classeurs (un par niveau)
add(new THREE.CylinderGeometry(.1, .12, .03, 20), dark, -.55, .95, -.7);
const arm = add(new THREE.CylinderGeometry(.015, .015, .5, 8), dark, -.55, 1.2, -.7);
add(new THREE.ConeGeometry(.12, .16, 20, 1, true), mat(0xd0452f), -.5, 1.45, -.62).rotation.x = .6;
const bulb = new THREE.PointLight(0xffd9a0, 1.2, 3); bulb.position.set(-.48, 1.38, -.55); scene.add(bulb);
add(new THREE.CylinderGeometry(.18, .14, .35, 20), mat(0xffffff), 1.9, .18, -1.3);
for (let i = 0; i < 7; i++) add(new THREE.SphereGeometry(.2, 14, 10), mat(0x3f9b5a, .8), 1.9 + Math.sin(i * 2.4) * .14, .5 + i * .07, -1.3 + Math.cos(i * 2.4) * .14);
add(new RoundedBoxGeometry(1.8, .06, .4, 2, .02), wood, -1.6, 1.6, -1.5);
const binders = LEVELS.map((L, i) => add(new RoundedBoxGeometry(.16, .4, .3, 2, .02), mat([0xd0452f, 0xf29a2e, 0xe8c547, 0x3f9b5a, 0x2f7cf6, 0x7a5cff][i]), -2.3 + i * .25, 1.83, -1.5));
// tableau de langues : ce que le robot ecrit en francais / anglais, avec la correction du juge
const board = document.createElement('canvas'); board.width = 640; board.height = 360;
const bctx = board.getContext('2d'), btex = new THREE.CanvasTexture(board); btex.colorSpace = THREE.SRGBColorSpace;
const BX = 1.2, BZ = -2.4, BR = -.3;
add(new RoundedBoxGeometry(2.3, 1.36, .06, 2, .03), mat(0x8a5a35, .6), BX, 1.9, BZ).rotation.y = BR;
const boardFace = add(new THREE.PlaneGeometry(2.16, 1.22), new THREE.MeshBasicMaterial({ map: btex, toneMapped: false }), BX + Math.sin(BR) * .035, 1.9, BZ + Math.cos(BR) * .035);
boardFace.rotation.y = BR; boardFace.castShadow = false;
[-.9, .9].forEach(dx => add(new THREE.CylinderGeometry(.025, .025, 1.25, 8), dark, BX + dx * Math.cos(BR), .62, BZ - dx * Math.sin(BR)));
// chaise + robot assis
const chair = new THREE.Group(); chair.position.set(0, 0, .55); scene.add(chair);
const cushion = new THREE.MeshStandardMaterial({ color: 0xd0452f, roughness: .8 });
add(new RoundedBoxGeometry(.66, .1, .62, 3, .04), cushion, 0, .5, .05, chair); add(new RoundedBoxGeometry(.66, .8, .1, 3, .04), cushion, 0, 1, -.3, chair);
chair.rotation.y = Math.PI;
add(new THREE.CylinderGeometry(.05, .05, .45, 10), dark, 0, .25, 0, chair);
for (let k = 0; k < 5; k++) { const leg = add(new THREE.BoxGeometry(.05, .04, .36), dark, Math.sin(k * 1.257) * .18, .04, Math.cos(k * 1.257) * .18, chair); leg.rotation.y = k * 1.257; }
const bot = new Robot('Scribe', 0xd0452f, 0xffb199);
bot.root.position.set(0, 0, .55); bot.root.rotation.y = Math.PI; bot.mode = 'sit'; scene.add(bot.root);
const bubble = document.createElement('div'); bubble.className = 'bubble'; document.getElementById('labels').appendChild(bubble);
const resize = () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
addEventListener('resize', resize); resize();

// ---------- travail : rediger -> imprimer -> se faire corriger -> apprendre ----------
let doc = null, phase = 'write', timer = 0, said = '', lines = [];
const WRITE = DOC_SECONDS * .75;
function begin() {
  doc = startDoc(st); phase = 'write'; timer = WRITE;
  const L = LEVELS[doc.ctx.lv - 1], weak = weakSpot(st);
  said = `Document n&deg;${st.seq + 1} : ${L.name} pour ${doc.ctx.buyer.name}.` + (weak ? `<br>Je fais attention : ${weak}.` : '<br>Je r&eacute;dige...');
  const d = document.createElement('div'); d.innerHTML = renderDoc({ ...doc, seq: st.seq + 1, lv: doc.ctx.lv });
  lines = d.innerText.split('\n').map(s => s.trim()).filter(Boolean).slice(1, 40);
}
function step(dt) {
  timer -= dt;
  if (phase === 'write' && timer <= 0) { phase = 'print'; timer = 1.6; sheet.visible = true; sheet.position.z = -.45; said = 'J imprime...'; }
  else if (phase === 'print') { sheet.position.z = -.45 + (1.6 - timer) * .25; if (timer <= 0) { sheet.visible = false; judged(); } }
  else if (phase === 'judge' && timer <= 0) begin();
}
function judged() {
  const j = finishDoc(st, doc); phase = 'judge'; timer = DOC_SECONDS * .25;
  said = `<b>Note : ${j.score}/100</b>` + (j.issues.length ? `Corrig&eacute; : ${j.issues.slice(0, 2).map(i => i.msg).join(' ; ')}.<br>J ajuste ma m&eacute;thode.` : 'Parfait, je garde cette m&eacute;thode.');
  if (j.up) said += `<br><b>${st.mastered ? 'Tout est ma&icirc;tris&eacute; !' : 'Niveau ' + st.level + ' d&eacute;bloqu&eacute; : ' + LEVELS[st.level - 1].name}</b>`;
  ui(); if (!document.getElementById('drawer').hidden && mode === 'docs') list();
}
// cours de langues : une phrase toutes les LANG_SECONDS, en alternant francais et anglais
let langT = 0, readT = 1.2;
const last = { fr: null, en: null, livre: null };
function langStep(dt) {
  if ((langT -= dt) > 0) return;
  langT = LANG_SECONDS;
  const r = lessonStep(st); last[r.lang] = r;
  if (r.up) { addLog(st, r.up, 'ok'); said = `<b>${esc(r.up)}</b>`; ui(); }
  langUI(); drawBoard();
  if (!document.getElementById('drawer').hidden && mode === 'lang') list();
}
// atelier de lecture : une phrase libre inventee d'apres les livres, corrigee par le juge strict
function readTick(dt) {
  if ((readT -= dt) > 0) return;
  readT = READ_SECONDS;
  const r = readStep(st); if (!r) return;
  last.livre = r; langUI(); drawBoard();
  if (!document.getElementById('drawer').hidden && mode === 'lang') list();
}
function drawScreen() {
  const W = scr.width, H = scr.height; sctx.fillStyle = '#f7f8fa'; sctx.fillRect(0, 0, W, H);
  sctx.fillStyle = '#d0452f'; sctx.fillRect(0, 0, W, 28); sctx.fillStyle = '#fff'; sctx.font = 'bold 15px system-ui';
  sctx.fillText(`FactuBot - doc #${st.seq + (phase === 'judge' ? 0 : 1)} - ${plain(LEVELS[(doc?.ctx.lv || 1) - 1].name)}`, 10, 19);
  const shown = phase === 'write' ? Math.floor(lines.length * (1 - timer / WRITE)) : lines.length;
  sctx.font = '13px Georgia'; sctx.fillStyle = '#222';
  lines.slice(Math.max(0, shown - 17), shown).forEach((l, i) => sctx.fillText(l.slice(0, 62), 12, 50 + i * 16));
  if (phase === 'write' && Math.floor(performance.now() / 400) % 2) sctx.fillRect(12, 40 + Math.min(shown, 17) * 16, 8, 14);
  if (phase === 'judge') { const s = st.docs[0].score; sctx.fillStyle = s >= 90 ? '#1c7a43' : s >= 60 ? '#9a6700' : '#b42318'; sctx.font = 'bold 64px system-ui'; sctx.fillText(`${s}/100`, W - 250, H - 30); }
  stex.needsUpdate = true;
}
function wrap(ctx, text, x, y, w, lh, max = 2) {
  const words = text.split(' '); let line = '', n = 0;
  for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (ctx.measureText(t).width > w && line) { ctx.fillText(line, x, y + n * lh); line = wd; if (++n >= max) return; } else line = t; }
  ctx.fillText(line, x, y + n * lh);
}
function drawBoard() {
  const W = board.width, H = board.height; bctx.fillStyle = '#23412f'; bctx.fillRect(0, 0, W, H);
  bctx.fillStyle = 'rgba(255,255,255,.85)'; bctx.font = 'bold 22px system-ui'; bctx.fillText('Cours de langues - juge strict', 20, 34);
  ['fr', 'en'].forEach((l, k) => {
    const r = last[l], y0 = 66 + k * 100, T = st.lang[l];
    bctx.fillStyle = '#f2d36b'; bctx.font = 'bold 17px system-ui';
    bctx.fillText(`${LANGS[l]} - niveau ${T.maxLevel}/6${T.mastered ? ' (maitrise)' : ''}`, 20, y0);
    if (!r) return;
    bctx.font = '24px Georgia'; bctx.fillStyle = r.exact ? '#bff0c9' : '#ffb4a8';
    wrap(bctx, (r.exact ? '' : 'x ') + r.out, 20, y0 + 30, W - 40, 26, 1);
    if (!r.exact) { bctx.fillStyle = '#ffffff'; bctx.font = '19px Georgia'; wrap(bctx, 'v ' + r.ref, 20, y0 + 58, W - 40, 22, 1); }
  });
  const b = last.livre; bctx.fillStyle = '#f2d36b'; bctx.font = 'bold 17px system-ui';
  bctx.fillText(`Lecture libre - ${acceptRate(st.lecture)} % acceptées`, 20, 270);
  if (b) { bctx.font = '20px Georgia'; bctx.fillStyle = b.score === 100 ? '#bff0c9' : '#ffb4a8'; wrap(bctx, (b.score === 100 ? '' : 'x ') + b.out, 20, 300, W - 40, 24, 2); }
  btex.needsUpdate = true;
}

// ---------- interface ----------
const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0;
function ui() {
  const recent = st.docs.slice(0, 20).map(d => d.score), L = st.lang;
  const lv = t => `${t.maxLevel}/6${t.mastered ? ' &#10003;' : ''}`;
  document.getElementById('stats').innerHTML = [['Documents', st.seq], ['Niveau', `${st.maxLevel}/6${st.mastered ? ' &#10003;' : ''}`], ['Moyenne (20 dern.)', avg(recent) + '/100'], ['Record', st.best + '/100'],
    ['Fran&ccedil;ais', lv(L.fr)], ['Anglais', lv(L.en)], ['Phrases', L.seq], ['Lecture', acceptRate(st.lecture) + ' %'], ['Serveur', online ? 'en continu' : 'local']]
    .map(([k, v]) => `<div class="stat"><small>${k}</small><strong>${v}</strong></div>`).join('');
  const c = document.getElementById('curve'), x = c.getContext('2d'), h = st.history;
  x.clearRect(0, 0, c.width, c.height); x.fillStyle = '#6a7686'; x.font = '10px system-ui'; x.fillText('Qualite moyenne (par 10 documents)', 8, 12);
  if (h.length > 1) { x.strokeStyle = '#d0452f'; x.lineWidth = 2; x.beginPath(); h.forEach((v, i) => { const px = 8 + i / (h.length - 1) * (c.width - 16), py = c.height - 6 - v / 100 * (c.height - 22); i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke(); }
  document.getElementById('log').innerHTML = st.log.slice(0, 14).map(l => `<li class="${l.cls}">${l.txt}</li>`).join('');
  pile.scale.y = Math.min(.5, .004 + Math.log10(1 + st.seq) * .12); pile.position.y = .935 + pile.scale.y / 2;
  binders.forEach((b, i) => { b.visible = i < st.maxLevel; });
}
function langUI() {
  const L = st.lang, perfect = t => t.perfect.length ? Math.round(t.perfect.reduce((a, b) => a + b, 0) / t.perfect.length * 100) : 0;
  const card = l => {
    const r = last[l] || L.sentences.find(s => s.lang === l), T = L[l];
    const meter = `<div class="meter" title="Progression vers le niveau suivant"><i style="width:${T.mastered ? 100 : Math.round(T.recent.length / 40 * perfect(T))}%"></i></div>`;
    if (!r) return `<div class="lc"><h5><span>${LANGS[l]}</span><span>niv. ${T.maxLevel}/6</span></h5><div class="sens">Premi&egrave;re le&ccedil;on...</div>${meter}</div>`;
    const ok = r.score === 100;
    return `<div class="lc"><h5><span>${LANGS[l]} &middot; ${LANG_LEVELS[r.lv - 1].name}${r.retry ? ` &middot; essai ${r.retry + 1}` : ''}</span><span>${r.score}/100</span></h5>
      <div class="sens">${esc(r.sens)}</div><div class="out ${ok ? 'ok' : 'ko'}">${esc(r.out)}</div>
      ${ok ? '' : `<div class="ref">${esc(r.ref)}</div><ul>${r.errs.slice(0, 2).map(e => `<li>${esc(e)}</li>`).join('')}</ul>`}${meter}</div>`;
  };
  const b = last.livre || st.lecture.phrases[0];
  const C = ensureCerveau(st), cb = C.phrases[0], info = brainInfo(), rate = C.ok.length ? Math.round(C.ok.reduce((a, b) => a + b, 0) / C.ok.length * 100) : 0;
  const cerveau = `<div class="lc"><h5><span>Cerveau neuronal${info ? ` &middot; ${(info.params / 1e6).toFixed(1)} M neurones` : ''}</span><span>${cb ? cb.score + '/100' : ''}</span></h5>
    <div class="sens">Juge LanguageTool &middot; parfaites : ${rate} %${info?.stats?.tours?.length ? ` &middot; entra&icirc;nement : ${info.stats.tours.join(' &rarr; ')} %` : ''}${brainState ? ' &middot; ' + esc(brainState) : ''}</div>
    ${cb ? `<div class="out ${cb.score === 100 ? 'ok' : 'ko'}">${esc(cb.out)}</div>${cb.errs.length ? `<ul>${cb.errs.slice(0, 2).map(e => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}` : ''}</div>`;
  const livre = `<div class="lc"><h5><span>Lecture libre &middot; ${BOOKS.books} livres lus (${BOOKS.words.toLocaleString('fr-BE')} mots, ${BOOKS.vocab.toLocaleString('fr-BE')} mots diff&eacute;rents)</span><span>${b ? b.score + '/100' : ''}</span></h5>
    <div class="sens">Il invente ses propres phrases d&rsquo;apr&egrave;s ses lectures &middot; accept&eacute;es par le juge : ${acceptRate(st.lecture)} %</div>
    ${b ? `<div class="out ${b.score === 100 ? 'ok' : 'ko'}">${esc(b.out)}</div>${b.errs.length ? `<ul>${b.errs.slice(0, 2).map(e => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}` : '<div class="sens">Premi&egrave;re lecture...</div>'}</div>`;
  document.getElementById('lang').innerHTML = `<div class="top"><b>Cours de langues &middot; juge strict</b><small>une faute = phrase refus&eacute;e &middot; parfaites : FR ${perfect(L.fr)} % &middot; EN ${perfect(L.en)} %</small></div>
    <div class="two">${card('fr')}${card('en')}${livre}${cerveau}</div>`;
}
const sentences = () => [...st.lang.sentences, ...st.lecture.phrases, ...ensureCerveau(st).phrases].sort((a, b) => b.t - a.t);
// ---------- cerveau neuronal (mini-GPT) + juge strict LanguageTool ----------
const BRAIN_URL = 'https://cdn.jsdelivr.net/gh/zelkoappstore-cloud/robloxprojecy@967bb57cea45555c33cde05874b962c417ed5bbe/factubot/cerveau/cerveau.bin';
const BRAIN_SECONDS = 8, LT = 'https://api.languagetool.org/v2/check';
const ensureCerveau = s => (s.cerveau ||= { seq: 0, ok: [], phrases: [] });
let brainBusy = false, brainT = 3, brainState = 'chargement du cerveau...';
let brain = null, brainInfoV = null, reqId = 0;
const pending = new Map(), brainInfo = () => brainInfoV, brainReady = () => !!brainInfoV;
try {
  brain = new Worker(new URL('./cerveau-worker.js', import.meta.url), { type: 'module' });
  brain.onmessage = ({ data }) => {
    if (data.info) { brainInfoV = data.info; brainState = ''; langUI(); }
    else if (pending.has(data.id)) { pending.get(data.id)(data); pending.delete(data.id); }
    else if (data.error) { brainState = 'cerveau pas encore disponible'; langUI(); }
  };
  brain.postMessage({ urls: [BRAIN_URL, BRAIN_URL.replace('https://cdn.jsdelivr.net/gh/', 'https://raw.githubusercontent.com/').replace('@', '/')] });
} catch { brainState = 'cerveau non support&eacute; par ce navigateur'; }
const generate = () => new Promise((ok, ko) => { const id = ++reqId; pending.set(id, d => d.error ? ko(new Error(d.error)) : ok(d.text)); brain.postMessage({ gen: 1, id }); });
async function judgeLT(s) {
  const errs = [], n = s.split(/\s+/).length;
  if (n < 5) errs.push('phrase trop courte (au moins 5 mots)'); if (n > 30) errs.push('phrase trop longue (30 mots maximum)');
  if (!/^[A-ZÀÂÉÈÊÎÔŒ]/.test(s)) errs.push('pas de majuscule au début'); if (!/[.!?]$/.test(s)) errs.push('pas de point à la fin');
  const rep = /\b(\p{L}{4,})\b.*\b\1\b/iu.exec(s); if (rep) errs.push(`mot répété : « ${rep[1]} »`);
  if (st.cerveau.phrases.some(p => p.out === s)) errs.push('phrase déjà dite : il faut inventer');
  const r = await fetch(LT, { method: 'POST', body: new URLSearchParams({ text: s, language: 'fr' }) });
  if (!r.ok) throw new Error('juge indisponible');
  for (const m of (await r.json()).matches) if (!/WHITESPACE|APOS|TYPOGRAPH|NBSP/i.test(m.rule.id)) errs.push(`${m.message} (« ${s.slice(m.offset, m.offset + m.length)} »)`);
  return errs;
}
async function brainTick(dt) {
  if ((brainT -= dt) > 0 || brainBusy || !brainReady() || document.hidden) return;
  brainT = BRAIN_SECONDS; brainBusy = true;
  try {
    const out = await generate(), errs = await judgeLT(out), C = ensureCerveau(st), ok = !errs.length;
    C.seq++; C.ok.push(ok ? 1 : 0); if (C.ok.length > 50) C.ok.shift();
    C.phrases.unshift({ seq: C.seq, lang: 'cerveau', out, score: ok ? 100 : Math.max(0, 60 - 20 * (errs.length - 1)), errs: errs.slice(0, 4), t: Date.now() });
    if (C.phrases.length > 30) C.phrases.length = 30;
    brainState = ''; langUI();
    if (!document.getElementById('drawer').hidden && mode === 'lang') list();
  } catch { brainState = 'juge occupé, je réessaie'; brainT = 30; langUI(); }
  brainBusy = false;
}
const cls = s => s >= 90 ? 'g' : s >= 60 ? 'm' : 'b';
let mode = 'docs';
function list() {
  document.getElementById('list').innerHTML = mode === 'docs'
    ? st.docs.map((d, i) => `<li data-i="${i}"><span>#${d.seq} ${LEVELS[d.lv - 1].name}</span><span class="sc ${cls(d.score)}">${d.score}</span></li>`).join('')
    : sentences().map((s, i) => `<li data-i="${i}"><span>#${s.seq} ${s.lang.toUpperCase()} &middot; ${esc(s.out.slice(0, 24))}</span><span class="sc ${cls(s.score)}">${s.score}</span></li>`).join('');
}
function show(i) {
  document.querySelectorAll('#list li').forEach(li => li.classList.toggle('on', +li.dataset.i === i));
  if (mode === 'lang') {
    const s = sentences()[i]; if (!s) return;
    if (s.lang === 'cerveau') { document.getElementById('view').innerHTML = `<div class="sheet"><div class="sens">Cerveau neuronal (mini-GPT entra&icirc;n&eacute; sur Wikip&eacute;dia et des livres du domaine public)</div><small>Phrase du robot</small><p class="${s.score === 100 ? 'ok' : 'ko'}">${esc(s.out)}</p></div>
      <div class="notes"><div class="big">${s.score}/100</div><h4>Juge strict (LanguageTool)</h4>${s.errs.length ? '<ul>' + s.errs.map(x => `<li class="bad">${esc(x)}</li>`).join('') + '</ul>' : '<p>Aucune faute.</p>'}<h4>Comment il apprend</h4><p>Il a lu des centaines de milliers de phrases en devinant chaque mot suivant. Ensuite, ses phrases ont &eacute;t&eacute; corrig&eacute;es par LanguageTool et seules les parfaites ont servi &agrave; le r&eacute;-entra&icirc;ner.</p></div>`; return; }
    if (s.lang === 'livre') { document.getElementById('view').innerHTML = `<div class="sheet"><div class="sens">Lecture libre &middot; phrase invent&eacute;e d&rsquo;apr&egrave;s ${BOOKS.books} livres</div><small>Phrase du robot</small><p class="${s.score === 100 ? 'ok' : 'ko'}">${esc(s.out)}</p></div>
      <div class="notes"><div class="big">${s.score}/100</div><h4>Fautes relev&eacute;es</h4>${s.errs.length ? '<ul>' + s.errs.map(x => `<li class="bad">${esc(x)}</li>`).join('') + '</ul>' : '<p>Aucune faute.</p>'}
      <h4>Comment il apprend</h4><p>Des livres, il n&rsquo;a gard&eacute; que des statistiques : quels mots se suivent, quels noms vont avec le / la / les. Il invente une phrase mot par mot. Le juge strict refuse toute phrase trop courte ou trop longue, mal termin&eacute;e, avec un mauvais accord, une n&eacute;gation incompl&egrave;te ou recopi&eacute;e du livre ; le robot affaiblit alors l&rsquo;encha&icirc;nement de mots fautif.</p></div>`; return; }
    document.getElementById('view').innerHTML = `<div class="sheet"><div class="sens">${LANGS[s.lang]} &middot; niveau ${s.lv} (${LANG_LEVELS[s.lv - 1].name}) &middot; confiance ${s.conf} %${s.retry ? ` &middot; essai n&deg;${s.retry + 1}` : ''}<br>Sens demand&eacute; : ${esc(s.sens)}</div>
      <small>Phrase du robot</small><p class="${s.score === 100 ? 'ok' : 'ko'}">${esc(s.out)}</p>${s.score === 100 ? '' : `<small>Correction du juge</small><p class="ok">${esc(s.ref)}</p>`}</div>
      <div class="notes"><div class="big">${s.score}/100</div><h4>Fautes relev&eacute;es</h4>${s.errs.length ? '<ul>' + s.errs.map(x => `<li class="bad">${esc(x)}</li>`).join('') + '</ul>' : '<p>Aucune faute.</p>'}
      <h4>Juge strict</h4><p>La phrase doit &ecirc;tre exactement juste (genre, accords, conjugaison, &eacute;lisions, ponctuation). Une seule faute : 60/100 maximum, la faute est punie deux fois plus fort qu&rsquo;un bon choix n&rsquo;est r&eacute;compens&eacute;, et le robot recommence aussit&ocirc;t la phrase. Pour passer au niveau suivant : 97/100 de moyenne et 92 % de phrases parfaites sur 40 phrases.</p></div>`;
    return;
  }
  const d = st.docs[i];
  document.getElementById('view').innerHTML = renderDoc(d) + `<div class="notes"><div class="big ${''}">${d.score}/100</div>
    <h4>Corrections du juge</h4>${d.issues.length ? '<ul>' + d.issues.map(x => `<li class="bad">${x.msg}</li>`).join('') + '</ul>' : '<p>Aucune erreur.</p>'}
    <h4>Comment il apprend</h4><p>Au d&eacute;but il choisit chaque &eacute;l&eacute;ment au hasard. Apr&egrave;s chaque correction, il renforce les choix jug&eacute;s bons et abandonne les mauvais. Confiance pour ce document : ${d.confidence} %.</p></div>`;
}
function openDrawer(m) {
  mode = m; document.getElementById('dtitle').innerHTML = m === 'docs' ? 'Documents g&eacute;n&eacute;r&eacute;s' : 'Cahier de langues (fran&ccedil;ais / anglais)';
  document.getElementById('drawer').hidden = false; document.getElementById('list').style.display = ''; list();
  if ((m === 'docs' ? st.docs : sentences()).length) show(0); else document.getElementById('view').innerHTML = '<p class="hint">Rien pour l&rsquo;instant.</p>';
}
document.getElementById('open').onclick = () => openDrawer('docs');
document.getElementById('openLang').onclick = () => openDrawer('lang');
// ---------- analyse de sites web ----------
const webHist = () => { try { return JSON.parse(localStorage.getItem('factubot-web') || '[]'); } catch { return []; } };
function webView(r, err) {
  const g = r?.grammar;
  return `<div class="web"><form id="wf"><input id="wu" type="url" inputmode="url" placeholder="https://exemple.com" value="${esc(r?.url || '')}" required><button id="wb">Analyser</button></form>
    ${err ? `<div class="card err">${esc(err)}</div>` : ''}${!r ? '<p class="muted">FactuBot lit la page, d&eacute;tecte la langue, trouve les mots-cl&eacute;s, r&eacute;sume, v&eacute;rifie la grammaire d&rsquo;un extrait avec son juge strict et donne son avis.</p>' : `
    <div class="card"><h4>${esc(r.title || r.host)}</h4><p class="muted">${esc(r.url)}</p>${r.description ? `<p>${esc(r.description)}</p>` : ''}</div>
    <div class="card"><h4>L&rsquo;avis de FactuBot</h4>${r.verdict.map(v => `<p>${esc(v)}</p>`).join('')}</div>
    <div class="card kv"><div><small>Langue</small>${{ fr: 'fran&ccedil;ais', en: 'anglais' }[r.lang] || '?'}</div><div><small>Mots</small>${r.words.toLocaleString('fr-BE')}</div><div><small>Lecture</small>${r.readingMin} min</div>
      <div><small>Phrases</small>${r.sentences} (moy. ${r.avgLen} mots)</div><div><small>Liens</small>${r.links.internes} int. / ${r.links.externes} ext.</div><div><small>Images sans alt</small>${r.images.sansAlt} / ${r.images.total}</div><div><small>S&eacute;curis&eacute;</small>${r.https ? 'oui (https)' : 'non'}</div></div>
    ${r.keywords.length ? `<div class="card chips"><h4>Mots-cl&eacute;s</h4>${r.keywords.map(k => `<span>${esc(k.w)} &middot; ${k.n}</span>`).join('')}</div>` : ''}
    ${r.summary.length ? `<div class="card"><h4>R&eacute;sum&eacute; (phrases cl&eacute;s)</h4><ul>${r.summary.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''}
    ${g ? `<div class="card"><h4>Juge strict : ${g.errors} faute${g.errors > 1 ? 's' : ''} possible${g.errors > 1 ? 's' : ''} sur un extrait de ${g.checked} caract&egrave;res</h4>${g.list.length ? `<ul>${g.list.map(x => `<li><b>${esc(x.msg)}</b><br><span class="muted">&hellip;${esc(x.extrait)}&hellip;${x.propose.length ? ' &rarr; ' + esc(x.propose.join(' / ')) : ''}</span></li>`).join('')}</ul>` : '<p>Rien &agrave; signaler.</p>'}</div>` : ''}
    ${r.heads.length ? `<div class="card"><h4>Structure des titres</h4><ul>${r.heads.map(h => `<li style="margin-left:${(h.n - 1) * 14}px">h${h.n} &middot; ${esc(h.t)}</li>`).join('')}</ul></div>` : ''}`}
    ${webHist().length ? `<div class="card"><h4>Mes derni&egrave;res analyses</h4><ul>${webHist().map(h => `<li><a href="#" data-u="${esc(h.url)}">${esc(h.title || h.url)}</a> <span class="muted">${h.words} mots</span></li>`).join('')}</ul></div>` : ''}</div>`;
}
function openWeb(r, err) {
  mode = 'web'; document.getElementById('dtitle').innerHTML = 'Analyse de site web';
  document.getElementById('drawer').hidden = false; document.getElementById('list').innerHTML = ''; document.getElementById('list').style.display = 'none';
  const v = document.getElementById('view'); v.innerHTML = webView(r, err);
  v.querySelectorAll('[data-u]').forEach(a => a.onclick = e => { e.preventDefault(); analyseSite(a.dataset.u); });
  document.getElementById('wf').onsubmit = e => { e.preventDefault(); analyseSite(document.getElementById('wu').value); };
}
async function analyseSite(url) {
  const b = document.getElementById('wb'); if (b) { b.disabled = true; b.textContent = 'Lecture...'; }
  said = 'Je lis un site web...';
  try {
    const r = await fetch('/api/analyse?url=' + encodeURIComponent(url)), j = await r.json();
    if (!r.ok) return openWeb(null, j.error || 'analyse impossible');
    try { localStorage.setItem('factubot-web', JSON.stringify([{ url: j.url, title: j.title, words: j.words }, ...webHist().filter(h => h.url !== j.url)].slice(0, 8))); } catch { /* prive */ }
    said = esc(j.verdict[0]); openWeb(j);
  } catch { openWeb(null, 'analyse impossible (r&eacute;seau)'); }
}
document.getElementById('openWeb').onclick = () => openWeb();
document.getElementById('close').onclick = () => { document.getElementById('drawer').hidden = true; };
document.getElementById('list').onclick = e => { const li = e.target.closest('li'); if (li) show(+li.dataset.i); };

// ---------- sauvegarde ----------
function snapshot() { st.updatedAt = Date.now(); return st; }
function save() { store.set(KEY, JSON.stringify(snapshot())); }
async function push() {
  if (!online) return;
  try {
    const r = await fetch('/api/state', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(snapshot()) });
    const j = await r.json(); if (r.status === 409) { st = j.state; ensureLang(st); ensureLecture(st); ensureCerveau(st); ui(); langUI(); begin(); } else if (j.version) st.version = j.version;
  } catch { /* reessai plus tard */ }
}
setInterval(save, 5000); setInterval(push, 180000);
addEventListener('pagehide', () => { save(); if (online) navigator.sendBeacon('/api/state', new Blob([JSON.stringify(snapshot())], { type: 'application/json' })); });
if (!st.seq) addLog(st, 'Premier jour. Je ne sais pas encore ce qu&rsquo;est une facture correcte.', 'ok');
if (!st.lang.seq) addLog(st, 'Je commence aussi le fran&ccedil;ais et l&rsquo;anglais : je ne connais encore aucun mot.', 'ok');

const v = new THREE.Vector3(), clock = new THREE.Clock(); let scrT = 0;
function update(dt) { step(dt); langStep(dt); readTick(dt); brainTick(dt); bot.update(dt); }
function loop() {
  const dt = Math.min(clock.getDelta(), .05); update(dt);
  if ((scrT -= dt) < 0) { drawScreen(); scrT = .15; }
  bot.head.getWorldPosition(v); v.y += .6; v.project(camera);
  bubble.style.left = `${(v.x + 1) / 2 * innerWidth}px`; bubble.style.top = `${(1 - v.y) / 2 * innerHeight}px`;
  bubble.innerHTML = `<b>FactuBot</b>${said}`;
  controls.update(); renderer.render(scene, camera); requestAnimationFrame(loop);
}
window.FB = { get st() { return st; }, update };   // inspection / tests
ensureCerveau(st);
begin(); ui(); langUI(); drawBoard(); loop();
