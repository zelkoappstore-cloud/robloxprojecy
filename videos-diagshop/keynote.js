// Pub DiagShop style « keynote » — 1080x1920, 18 s, 30 i/s, avec musique (audio.py).
// Usage : node keynote.js   |   PREVIEW=3,7,12 node keynote.js (images fixes)
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');

const W = 1080, H = 1920, FPS = 30, DUR = 18;
const EASE = 'cubic-bezier(.16,1,.3,1)';
const SCAN = [6.3, 8.6]; // début / fin du scan (anneau + pourcentage)

const CSS = `
:root{--fg:#f5f5f7;--mu:#86868b;--ac:#8b5cf6;--ac2:#ec4899;--ok:#30d158;--card:rgba(255,255,255,.05);--bd:rgba(255,255,255,.1)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#000;color:var(--fg);font-family:'Inter Display',Inter,sans-serif;-webkit-font-smoothing:antialiased}
.grad{background:linear-gradient(100deg,var(--ac) 15%,var(--ac2) 95%);-webkit-background-clip:text;color:transparent}
.t{font-weight:700;letter-spacing:-.045em;line-height:1.02}
.mu{color:var(--mu)}
.scene{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 70px;
opacity:0;animation:sIn .9s ${EASE} var(--s) forwards,sOut .6s ease-in var(--e) forwards}
@keyframes sIn{from{opacity:0}to{opacity:1}}
@keyframes sOut{from{opacity:1}to{opacity:0;filter:blur(8px)}}
.w{display:inline-block;opacity:0;animation:w 1.1s ${EASE} var(--d) forwards}
@keyframes w{from{opacity:0;transform:translateY(40px);filter:blur(12px)}to{opacity:1;transform:none;filter:none}}
.fade{opacity:0;animation:fade 1.2s ${EASE} var(--d) forwards}
@keyframes fade{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}
.glow{position:absolute;width:1100px;height:760px;left:-10px;top:880px;border-radius:50%;background:radial-gradient(closest-side,rgba(139,92,246,.42),rgba(236,72,153,.12),transparent);filter:blur(40px);opacity:0;animation:fade 2s ease var(--d) forwards}
/* ordinateur */
.stage{perspective:2400px}
.mac{width:940px;opacity:0;animation:rise 1.8s ${EASE} var(--d) forwards}
@keyframes rise{from{opacity:0;transform:translateY(380px) rotateX(36deg) scale(.9)}to{opacity:1;transform:none}}
.lid{background:#0b0b0f;border-radius:30px 30px 8px 8px;padding:18px;box-shadow:0 0 0 2px #2c2c33,0 60px 160px rgba(0,0,0,.9)}
.scr{height:560px;border-radius:14px;background:radial-gradient(ellipse at 50% 0%,#17141f,#09090c 70%);position:relative;overflow:hidden;padding:30px 34px;text-align:left;display:flex;gap:36px;align-items:center}
.deck{height:30px;margin:0 -60px;border-radius:0 0 34px 34px;background:linear-gradient(#d9d9de,#8e8e96 60%,#5c5c63);position:relative}
.deck:after{content:'';position:absolute;left:50%;top:0;width:180px;height:11px;margin-left:-90px;background:#6b6b73;border-radius:0 0 14px 14px}
.ring{width:300px;height:300px;flex:none;position:relative}
.ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.ring .pc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.ring .pc b{font-size:72px;font-weight:700;letter-spacing:-.04em}.ring .pc small{font-size:20px;color:var(--mu);margin-top:2px}
.info{flex:1}
.info h5{font-size:16px;color:var(--mu);font-weight:600;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px}
.info h4{font-size:32px;font-weight:700;letter-spacing:-.02em;margin-bottom:24px}
.mod{display:flex;justify-content:space-between;align-items:center;font-size:22px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.07)}
.mod i{font-style:normal;color:var(--mu)}
.chk{width:30px;height:30px;border-radius:50%;background:var(--ok);display:grid;place-items:center;opacity:0;animation:pop .45s cubic-bezier(.3,1.6,.4,1) var(--d) forwards}
.chk svg{width:18px;height:18px}
@keyframes pop{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:none}}
.dots{display:flex;gap:6px}.dots span{width:7px;height:7px;border-radius:50%;background:var(--mu);animation:blink 1s infinite}
.dots span:nth-child(2){animation-delay:.2s}.dots span:nth-child(3){animation-delay:.4s}
@keyframes blink{50%{opacity:.2}}
.swap{position:relative;width:30px;height:30px}.swap>*{position:absolute;right:0;top:50%;margin-top:-15px}
.dots{margin-top:-4px!important;top:50%}
.hide{animation:out .2s linear var(--d) forwards}@keyframes out{to{opacity:0}}
/* tuiles */
.tiles{display:grid;grid-template-columns:1fr 1fr;gap:22px;width:100%}
.tile{background:var(--card);border:1px solid var(--bd);border-radius:36px;padding:44px 36px;text-align:left;min-height:330px;display:flex;flex-direction:column;justify-content:flex-end}
.tile .ic{width:76px;height:76px;border-radius:22px;background:linear-gradient(135deg,var(--ac),var(--ac2));display:grid;place-items:center;margin-bottom:auto}
.tile .ic svg{width:38px;height:38px;stroke:#fff;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.tile h3{font-size:44px;font-weight:700;letter-spacing:-.03em;margin-bottom:8px}
.tile p{font-size:24px;color:var(--mu);line-height:1.35}
/* gamme */
.line{display:flex;flex-direction:column;gap:18px;width:100%}
.kit{display:flex;align-items:center;gap:30px;background:var(--card);border:1px solid var(--bd);border-radius:30px;padding:30px 36px;text-align:left}
.kit svg{width:84px;height:64px;flex:none;stroke:var(--fg);fill:none;stroke-width:2;stroke-linejoin:round;opacity:.9}
.kit div{flex:1}.kit small{display:block;font-size:20px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px}
.kit h4{font-size:34px;font-weight:700;letter-spacing:-.02em}
.kit b{font-size:52px;font-weight:700;letter-spacing:-.04em;white-space:nowrap}
.logo{font-size:150px;font-weight:800;letter-spacing:-.05em;opacity:0;animation:logo 1.6s ${EASE} var(--d) forwards}
@keyframes logo{from{opacity:0;transform:scale(.85);filter:blur(16px)}to{opacity:1;transform:none;filter:none}}
.wa{display:inline-flex;align-items:center;gap:16px;font-size:36px;font-weight:600;padding:22px 40px;border-radius:99px;background:rgba(37,211,102,.12);color:#30d158;border:1px solid rgba(48,209,88,.3)}
.wa svg{width:40px;height:40px;fill:#30d158}
`;

const words = (txt, d0, step = .14, cls = '') => txt.split(' ').map((w, i) =>
  `<span class="w ${cls}" style="--d:${(d0 + i * step).toFixed(2)}s">${w}</span>`).join(' ');
const sc = (s, e, html) => `<section class="scene" style="--s:${s}s;--e:${e}s">${html}</section>`;
const CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICONS = {
  ready: '<path d="M20 6 9 17l-5-5"/>',
  car: '<path d="M5 17h14M3 13l2-6h14l2 6v4H3z"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
};
const ic = k => `<div class="ic"><svg viewBox="0 0 24 24">${ICONS[k]}</svg></div>`;
const LAPTOP = '<svg viewBox="0 0 84 64"><rect x="14" y="8" width="56" height="38" rx="4"/><path d="M4 52h76l-4 6H8z"/></svg>';
const TABLET = '<svg viewBox="0 0 84 64"><rect x="18" y="4" width="48" height="56" rx="7"/><path d="M38 54h8"/></svg>';
const WA = `<svg viewBox="0 0 32 32"><path d="M16 .4C7.4.4.4 7.4.4 16c0 2.8.7 5.5 2.1 7.9L.2 31.8l8.1-2.1c2.3 1.3 4.9 2 7.6 2 8.6 0 15.7-7 15.7-15.6S24.6.4 16 .4zm7.5 22.2c-.3.9-1.9 1.8-2.7 1.9-.7.1-1.6.1-2.5-.2-.6-.2-1.3-.4-2.3-.8-4.1-1.7-6.7-5.7-6.9-6-.2-.3-1.6-2.1-1.6-4.1s1-2.9 1.4-3.3c.4-.4.8-.5 1.1-.5h.8c.2 0 .6-.1.9.7.3.8 1.1 2.8 1.2 3 .1.2.2.4 0 .7-.1.3-.2.5-.4.7l-.6.7c-.2.2-.4.4-.2.8.2.4 1 1.7 2.2 2.8 1.6 1.4 2.9 1.8 3.3 2 .4.2.7.2.9-.1.3-.3 1-1.2 1.3-1.6.3-.4.5-.3.9-.2.4.1 2.4 1.1 2.8 1.3.4.2.7.3.8.5.2.1.2 1-.4 1.7z"/></svg>`;

const MODS = ['Moteur', 'Boîte de vitesses', 'ABS / ESP', 'Airbag', 'Climatisation'];
const modDone = i => SCAN[0] + (i + 1) * (SCAN[1] - SCAN[0]) / MODS.length;

const SCENES = [
  sc(0, 2.7, `<div class="t" style="font-size:132px">${words('Le diagnostic', .3, .2)}<br>${words('auto.', .7)}</div>`),
  sc(2.7, 5.2, `<div class="t" style="font-size:170px;padding-bottom:20px">${words('Enfin simple.', 2.9, .22, 'grad')}</div>`),
  sc(5.2, 10.0, `<div class="glow" style="--d:5.4s"></div>
<div class="t fade" style="--d:5.3s;font-size:80px;margin-bottom:80px">Branchez. Lisez.<br><span class="grad">Comprenez.</span></div>
<div class="stage"><div class="mac" style="--d:5.3s"><div class="lid"><div class="scr">
 <div class="ring"><svg viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs>
  <circle cx="50" cy="50" r="44" stroke="rgba(255,255,255,.08)" stroke-width="7" fill="none"/>
  <circle id="arc" cx="50" cy="50" r="44" stroke="url(#g)" stroke-width="7" fill="none" stroke-linecap="round" stroke-dasharray="276.5" stroke-dashoffset="276.5"/></svg>
  <div class="pc"><b id="pct">0%</b><small id="lbl">Analyse…</small></div></div>
 <div class="info"><h5>Connecté · OBD</h5><h4>Volkswagen Golf 7 · 1.6 TDI</h4>
  ${MODS.map((m, i) => `<div class="mod"><i>${m}</i><div class="swap"><div class="dots hide" style="--d:${modDone(i).toFixed(2)}s"><span></span><span></span><span></span></div><div class="chk" style="--d:${modDone(i).toFixed(2)}s">${CHECK}</div></div></div>`).join('')}
 </div></div></div><div class="deck"></div></div></div>`),
  sc(10.0, 13.2, `<div class="t fade" style="--d:10.1s;font-size:96px;margin-bottom:70px">Tout est<br><span class="grad">déjà prêt.</span></div>
<div class="tiles">${[['ready', 'Prêt à l\'emploi', 'Logiciel installé et testé sur véhicule.'], ['car', 'Multimarques', '24 marques. Auto et poids-lourds.'],
    ['globe', 'FR · NL · EN', 'Choisissez la langue à la configuration.'], ['chat', 'Support WhatsApp', 'Prise en main et mises à jour.']].map((x, i) =>
    `<div class="tile fade" style="--d:${(10.35 + i * .18).toFixed(2)}s">${ic(x[0])}<h3>${x[1]}</h3><p>${x[2]}</p></div>`).join('')}</div>`),
  sc(13.2, 15.9, `<div class="t fade" style="--d:13.3s;font-size:96px;margin-bottom:64px">Choisissez<br><span class="grad">votre kit.</span></div>
<div class="line">${[['Entrée de gamme', 'PC Delphi / Autocom', '150 €', LAPTOP], ['Pack complet', 'Auto & Poids-Lourds', '399 €', LAPTOP], ['Premium', 'Pack DiagZone', '580 €', TABLET], ['Haut de gamme', 'Kit LAUNCH SmartLink', '1 050 €', TABLET]].map((k, i) =>
    `<div class="kit fade" style="--d:${(13.5 + i * .16).toFixed(2)}s">${k[3]}<div><small class="grad">${k[0]}</small><h4>${k[1]}</h4></div><b>${k[2]}</b></div>`).join('')}</div>`),
  sc(15.9, 99, `<div class="logo" style="--d:16s">Diag<span class="grad">Shop</span></div>
<div class="fade mu" style="--d:16.4s;font-size:46px;font-weight:500;margin-top:18px;letter-spacing:-.02em">Diagnostic auto pro. Prêt à l'emploi.</div>
<div class="fade" style="--d:16.8s;margin-top:80px"><div class="wa">${WA}0485 38 25 36</div></div>
<div class="fade mu" style="--d:17.1s;font-size:30px;font-weight:600;margin-top:36px">diagshop.vercel.app · Essai à Bruxelles · Envoi Europe</div>`),
];

const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${SCENES.join('')}
<script>
const S=${JSON.stringify(SCAN)};
window.seek=t=>{
  document.getAnimations().forEach(a=>{a.pause();a.currentTime=t*1000});
  const k=Math.min(1,Math.max(0,(t-S[0])/(S[1]-S[0]))),e=1-Math.pow(1-k,2);
  document.getElementById('arc').setAttribute('stroke-dashoffset',(276.5*(1-e)).toFixed(1));
  document.getElementById('pct').textContent=Math.round(e*100)+'%';
  document.getElementById('lbl').textContent=k<1?'Analyse…':'Aucun défaut';
};
</script></body></html>`;

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-'));
  const htmlPath = path.join(tmp, 'v.html'); fs.writeFileSync(htmlPath, HTML);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await p.goto('file://' + htmlPath); await p.evaluate(() => document.fonts.ready);
  if (process.env.PREVIEW) {
    for (const t of process.env.PREVIEW.split(',').map(Number)) {
      await p.evaluate(t => seek(t), t);
      await p.screenshot({ path: path.join(process.env.PREVIEW_DIR || __dirname, `prev-${t}.jpg`), type: 'jpeg', quality: 80 });
    }
  } else {
    for (let f = 0; f < FPS * DUR; f++) {
      await p.evaluate(t => seek(t), f / FPS);
      await p.screenshot({ path: path.join(tmp, `f${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 });
    }
    const silent = path.join(tmp, 'silent.mp4'), wav = path.join(tmp, 'a.wav'), out = path.join(__dirname, 'diagshop-pub-keynote.mp4');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.jpg'),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', silent]);
    execFileSync('python3', [path.join(__dirname, 'audio.py'), wav, String(DUR)]); // musique seule, pas de clics
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
    console.log('OK', out);
  }
  await b.close(); fs.rmSync(tmp, { recursive: true, force: true });
})();
