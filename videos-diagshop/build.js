// Génère 3 vidéos verticales 1080x1920 (15 s, 30 i/s) pour DiagShop.
// Usage : node build.js [1|2|3]   (sans argument : les 3)
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const W = 1080, H = 1920, FPS = 30, DUR = 15;
const OUT = __dirname;

const CSS = `
:root{--bg:#06080c;--card:rgba(255,255,255,.055);--line:rgba(255,255,255,.1);--txt:#f4f6fb;--mut:#8b93a7;
--a1:#3b82f6;--a2:#22d3ee;--red:#ff3b47;--grn:#22c55e;--wa:#25D366;--amb:#fbbf24}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:var(--bg);color:var(--txt);
font-family:Inter,sans-serif;-webkit-font-smoothing:antialiased}
.h{font-family:'Inter Display',Inter,sans-serif;font-weight:800;letter-spacing:-.035em;line-height:.98}
.grad{background:linear-gradient(90deg,var(--a1),var(--a2));-webkit-background-clip:text;color:transparent}
.mut{color:var(--mut)}
/* fond */
.bg{position:absolute;inset:0;overflow:hidden}
.grid{position:absolute;inset:-200px;background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);
background-size:90px 90px;opacity:.35;mask-image:radial-gradient(ellipse at 50% 45%,#000 20%,transparent 70%);animation:gridmv 15s linear forwards}
@keyframes gridmv{to{transform:translateY(270px)}}
.blob{position:absolute;border-radius:50%;filter:blur(120px);opacity:.55}
.b1{width:900px;height:900px;background:var(--a1);left:-300px;top:-200px;animation:drift1 15s ease-in-out forwards}
.b2{width:800px;height:800px;background:var(--a2);right:-350px;bottom:100px;opacity:.35;animation:drift2 15s ease-in-out forwards}
.b3{width:700px;height:700px;background:var(--red);left:190px;top:500px;opacity:0;animation:redglow 3.4s ease forwards}
@keyframes drift1{to{transform:translate(260px,500px)}}
@keyframes drift2{to{transform:translate(-200px,-600px)}}
@keyframes redglow{0%{opacity:0}20%{opacity:.4}85%{opacity:.4}100%{opacity:0}}
.vign{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 50%,rgba(0,0,0,.7))}
/* habillage */
.top{position:absolute;top:70px;left:70px;right:70px;display:flex;gap:10px;z-index:9}
.seg{flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,.18);overflow:hidden}
.seg i{display:block;height:100%;width:0;background:#fff;animation:fill linear forwards}
@keyframes fill{to{width:100%}}
.brand{position:absolute;top:110px;left:70px;right:70px;display:flex;justify-content:space-between;align-items:center;z-index:9}
.logo{font-weight:800;font-size:40px;letter-spacing:-.02em}.logo span{color:var(--a2)}
.pill{font-size:26px;font-weight:600;padding:12px 24px;border-radius:99px;background:var(--card);border:1px solid var(--line);display:flex;gap:12px;align-items:center}
.dot{width:12px;height:12px;border-radius:50%;background:var(--grn);box-shadow:0 0 16px var(--grn);animation:blink 1s infinite}
/* scènes */
.scene{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 80px;text-align:center;
opacity:0;animation:sIn .55s cubic-bezier(.2,.8,.2,1) var(--s) forwards,sOut .4s ease-in var(--e) forwards}
@keyframes sIn{from{opacity:0;transform:scale(1.08);filter:blur(14px)}to{opacity:1;transform:none;filter:none}}
@keyframes sOut{from{opacity:1}to{opacity:0;transform:scale(.94);filter:blur(14px)}}
.up{opacity:0;animation:up .7s cubic-bezier(.2,.9,.25,1.15) var(--d) forwards}
@keyframes up{from{opacity:0;transform:translateY(70px)}to{opacity:1;transform:none}}
.pop{opacity:0;animation:pop .55s cubic-bezier(.3,1.6,.4,1) var(--d) forwards}
@keyframes pop{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:none}}
.slam{opacity:0;animation:slam .45s cubic-bezier(.2,1.4,.4,1) var(--d) forwards}
@keyframes slam{from{opacity:0;transform:scale(2.6) rotate(-8deg)}to{opacity:1;transform:rotate(-8deg)}}
.left{opacity:0;animation:left .6s cubic-bezier(.2,.9,.25,1.1) var(--d) forwards}
@keyframes left{from{opacity:0;transform:translateX(-120px)}to{opacity:1;transform:none}}
@keyframes blink{50%{opacity:.25}}
@keyframes pulse{0%,100%{transform:scale(1);filter:drop-shadow(0 0 30px var(--red))}50%{transform:scale(1.08);filter:drop-shadow(0 0 80px var(--red))}}
.engine{width:300px;height:300px;color:var(--red);animation:pulse 1s ease-in-out infinite}
.strike{position:relative;display:inline-block}
.strike:after{content:'';position:absolute;left:-4%;top:52%;height:14px;width:0;background:var(--txt);border-radius:7px;transform:rotate(-6deg);animation:strk .35s ease-out var(--d) forwards}
@keyframes strk{to{width:108%}}
/* laptop */
.laptop{width:900px}
.screen{background:#0c111a;border:14px solid #1a1f29;border-radius:26px 26px 6px 6px;height:600px;padding:26px;text-align:left;
box-shadow:0 0 0 2px #2a303c,0 40px 120px rgba(59,130,246,.35);position:relative;overflow:hidden}
.base{height:34px;margin:0 -50px;background:linear-gradient(#2b313d,#151922);border-radius:0 0 30px 30px;position:relative}
.base:after{content:'';position:absolute;left:50%;top:0;width:160px;height:10px;margin-left:-80px;background:#0b0e14;border-radius:0 0 12px 12px}
.sh{display:flex;justify-content:space-between;font:600 22px 'DejaVu Sans Mono',monospace;color:var(--a2);margin-bottom:18px}
.veh{font-size:30px;font-weight:700;margin-bottom:20px}
.bar{height:16px;border-radius:8px;background:rgba(255,255,255,.08);overflow:hidden;margin-bottom:22px}
.bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--a1),var(--a2));box-shadow:0 0 24px var(--a2);animation:fill var(--t) cubic-bezier(.4,0,.2,1) var(--d) forwards}
.ecu{display:flex;justify-content:space-between;align-items:center;font-size:25px;padding:12px 0;border-bottom:1px solid var(--line)}
.ok{color:var(--grn);font-weight:700}.ko{color:var(--red);font-weight:700}
.scanline{position:absolute;left:0;right:0;height:120px;background:linear-gradient(transparent,rgba(34,211,238,.18),transparent);animation:scan 1.4s linear infinite}
@keyframes scan{from{top:-120px}to{top:600px}}
/* cartes */
.card{background:var(--card);border:1px solid var(--line);border-radius:32px;padding:34px 40px;backdrop-filter:blur(20px);text-align:left;width:100%}
.code{display:flex;gap:28px;align-items:center;margin-bottom:22px}
.code b{font:700 40px 'DejaVu Sans Mono',monospace;color:var(--red);min-width:170px}
.code div{font-size:30px;font-weight:600}.code small{display:block;font-size:24px;color:var(--mut);font-weight:500;margin-top:4px}
.tag{font-size:24px;font-weight:700;padding:8px 18px;border-radius:99px;margin-left:auto;white-space:nowrap}
.tag.r{background:rgba(255,59,71,.15);color:var(--red)}.tag.g{background:rgba(34,197,94,.15);color:var(--grn)}
.chips{display:flex;flex-wrap:wrap;gap:16px;justify-content:center}
.chip{font-size:28px;font-weight:600;padding:16px 26px;border-radius:99px;background:var(--card);border:1px solid var(--line)}
.chip:before{content:'✓ ';color:var(--grn)}
.price{font-size:260px}.price sup{font-size:110px;vertical-align:top;position:relative;top:40px;margin-left:10px}
.wa{display:flex;align-items:center;gap:22px;background:var(--wa);color:#03140a;font-weight:800;font-size:44px;padding:34px 56px;border-radius:99px;
box-shadow:0 0 0 0 rgba(37,211,102,.6);animation:waP 1.4s ease-out infinite}
@keyframes waP{0%{box-shadow:0 0 0 0 rgba(37,211,102,.55)}100%{box-shadow:0 0 0 50px rgba(37,211,102,0)}}
.wa svg{width:56px;height:56px;fill:#03140a}
.brands{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;width:100%}
.brands div{font-size:28px;font-weight:700;padding:24px 8px;border-radius:22px;background:var(--card);border:1px solid var(--line)}
.packs{display:flex;flex-direction:column;gap:22px;width:100%}
.pack{display:flex;justify-content:space-between;align-items:center;font-size:34px;font-weight:700}
.pack span{font-size:24px;color:var(--a2);font-weight:700;display:block;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px}
.pack b{font-size:60px;letter-spacing:-.03em}
.steps{display:flex;flex-direction:column;gap:28px;width:100%}
.step{display:flex;align-items:center;gap:34px;text-align:left}
.num{width:120px;height:120px;border-radius:34px;display:grid;place-items:center;font-size:56px;font-weight:800;background:linear-gradient(135deg,var(--a1),var(--a2));flex:none;box-shadow:0 20px 60px rgba(59,130,246,.4)}
.step h3{font-size:64px;font-weight:800;letter-spacing:-.03em}.step p{font-size:30px;color:var(--mut)}
.timer{font:700 130px 'DejaVu Sans Mono',monospace;letter-spacing:-.04em}
.cluster{width:820px;height:420px;border-radius:220px;background:radial-gradient(ellipse at 50% 30%,#141b28,#07090e);border:3px solid #222a38;
display:flex;align-items:center;justify-content:space-around;padding:0 50px;box-shadow:0 30px 120px rgba(255,59,71,.25)}
.gauge{width:280px;height:280px;border-radius:50%;border:6px solid #263043;display:grid;place-items:center;font-size:64px;font-weight:800;position:relative}
.gauge small{position:absolute;bottom:60px;font-size:20px;color:var(--mut);font-weight:600}
.needle{position:absolute;width:6px;height:120px;background:var(--red);left:50%;bottom:50%;margin-left:-3px;transform-origin:bottom;border-radius:3px;animation:ndl 3s ease-in-out infinite}
@keyframes ndl{0%{transform:rotate(-110deg)}50%{transform:rotate(20deg)}100%{transform:rotate(-110deg)}}
.cel{width:140px;height:140px;color:var(--amb);animation:blink .6s steps(1) infinite;filter:drop-shadow(0 0 30px var(--amb))}
`;

const ENGINE = `<svg viewBox="0 0 64 64" fill="currentColor"><path d="M20 14h16v6h-5v4h9l5 5h5v-4h4v18h-4v-4h-4v8h-7l-5 5H22l-6-6h-4v-8H8v7H4V27h4v7h4v-9h6l2-2h5v-3h-5z"/></svg>`;
const WA = `<svg viewBox="0 0 32 32"><path d="M16 .4C7.4.4.4 7.4.4 16c0 2.8.7 5.5 2.1 7.9L.2 31.8l8.1-2.1c2.3 1.3 4.9 2 7.6 2 8.6 0 15.7-7 15.7-15.6S24.6.4 16 .4zm7.5 22.2c-.3.9-1.9 1.8-2.7 1.9-.7.1-1.6.1-2.5-.2-.6-.2-1.3-.4-2.3-.8-4.1-1.7-6.7-5.7-6.9-6-.2-.3-1.6-2.1-1.6-4.1s1-2.9 1.4-3.3c.4-.4.8-.5 1.1-.5h.8c.2 0 .6-.1.9.7.3.8 1.1 2.8 1.2 3 .1.2.2.4 0 .7-.1.3-.2.5-.4.7l-.6.7c-.2.2-.4.4-.2.8.2.4 1 1.7 2.2 2.8 1.6 1.4 2.9 1.8 3.3 2 .4.2.7.2.9-.1.3-.3 1-1.2 1.3-1.6.3-.4.5-.3.9-.2.4.1 2.4 1.1 2.8 1.3.4.2.7.3.8.5.2.1.2 1-.4 1.7z"/></svg>`;

const sc = (s, e, html, extra = '') => `<section class="scene" style="--s:${s}s;--e:${e}s;${extra}">${html}</section>`;

const laptop = (d, codes) => `
<div class="laptop up" style="--d:${d}s"><div class="screen"><div class="scanline"></div>
 <div class="sh"><span>DIAGSHOP · MULTIMARQUE</span><span>● CONNECTÉ OBD</span></div>
 <div class="veh">Volkswagen Golf 7 · 1.6 TDI · 2017</div>
 <div class="bar"><i style="--d:${d + .4}s;--t:2.6s"></i></div>
 ${['Moteur (ECU)', 'Boîte de vitesses', 'ABS / ESP', 'Airbag', 'Tableau de bord'].map((n, i) =>
  `<div class="ecu left" style="--d:${(d + .7 + i * .45).toFixed(2)}s"><span>${n}</span>${codes.includes(i) ? '<span class="ko">● DÉFAUT</span>' : '<span class="ok">● OK</span>'}</div>`).join('')}
</div><div class="base"></div></div>`;

const KITS = [['Entrée de gamme', 'PC Delphi / Autocom', '150 €'], ['Pack complet', 'Auto & Poids-Lourds', '399 €'], ['Premium', 'Pack DiagZone', '580 €'], ['Haut de gamme', 'LAUNCH SmartLink', '1 050 €']];
const CHIPS = ['Logiciel installé', 'Testé sur véhicule', 'FR · NL · EN', 'Essai à Bruxelles'];
const ctaFoot = (s) => `
<div class="pop" style="--d:${s}s"><div class="wa">${WA}0485 38 25 36</div></div>
<div class="up mut" style="--d:${s + .3}s;font-size:30px;margin-top:30px;font-weight:600">diagshop.vercel.app · Envoi Europe</div>`;
// mode 'kits' : les 4 kits avec leurs prix ; mode 'range' : « à partir de 150 € » (quand les kits viennent d'être montrés)
const cta = (s, title, mode = 'kits') => sc(s, 99, mode === 'kits' ? `
<div class="up h" style="--d:${s + .1}s;font-size:68px;margin-bottom:44px">${title}</div>
<div class="packs" style="gap:16px;margin-bottom:50px">${KITS.map((p, i) =>
  `<div class="card pack left" style="--d:${(s + .3 + i * .2).toFixed(2)}s;padding:24px 36px"><div><span>${p[0]}</span>${p[1]}</div><b>${p[2]}</b></div>`).join('')}</div>
<div class="chips" style="margin-bottom:50px">${CHIPS.map((c, i) =>
  `<div class="chip pop" style="--d:${(s + 1.1 + i * .1).toFixed(2)}s;font-size:24px;padding:12px 22px">${c}</div>`).join('')}</div>
${ctaFoot(s + 1.6)}` : `
<div class="up h" style="--d:${s + .1}s;font-size:64px;margin-bottom:10px">${title}</div>
<div class="up mut" style="--d:${s + .3}s;font-size:44px;font-weight:700">4 kits · à partir de</div>
<div class="pop h price" style="--d:${s + .45}s"><span class="grad">150</span><sup class="grad">€</sup></div>
<div class="up mut" style="--d:${s + .7}s;font-size:34px;font-weight:600;margin:-10px 0 44px">jusqu'au kit LAUNCH à 1 050 €</div>
<div class="chips" style="margin-bottom:60px">${CHIPS.map((c, i) =>
  `<div class="chip pop" style="--d:${(s + .9 + i * .15).toFixed(2)}s">${c}</div>`).join('')}</div>
${ctaFoot(s + 1.6)}`);

const codesCard = (d, after) => `
<div class="card">
${[['P0300', 'Ratés d\'allumage', 'Cylindres multiples'], ['P0171', 'Mélange trop pauvre', 'Banc 1'], ['P0420', 'Catalyseur', 'Efficacité sous le seuil']].map((c, i) =>
  `<div class="code left" style="--d:${(d + i * .4).toFixed(2)}s"><b>${c[0]}</b><div>${c[1]}<small>${c[2]}</small></div><span class="tag r">LU</span></div>`).join('')}
</div>
<div class="pop h" style="--d:${d + 1.5}s;font-size:72px;margin-top:50px">${after}</div>`;

const VIDEOS = {
  1: {
    name: 'diagshop-1-garagiste-80e', red: true,
    cuts: [0, 3.4, 7.6, 11.2, 15],
    html: [
      sc(0, 3.4, `<div class="pop" style="--d:.05s">${ENGINE.replace('<svg', '<svg class="engine"')}</div>
<div class="up h" style="--d:.25s;font-size:84px;margin-top:40px">Ton garagiste te facture</div>
<div class="h" style="font-size:300px;color:var(--red);margin:10px 0"><span class="pop strike" style="--d:.55s;display:inline-block"><span class="strike" style="--d:2.5s">80 €</span></span></div>
<div class="up h" style="--d:.9s;font-size:84px">pour lire un voyant ?</div>`),
      sc(3.4, 7.6, `<div class="up h" style="--d:3.5s;font-size:76px;margin-bottom:60px">Fais-le <span class="grad">toi-même.</span></div>${laptop(3.7, [0])}`),
      sc(7.6, 11.2, `<div class="up h" style="--d:7.7s;font-size:76px;margin-bottom:50px">Tous les défauts.<br><span class="grad">En 2 minutes.</span></div>${codesCard(8.0, 'Plus besoin de<br>payer à chaque fois.')}`),
      cta(11.2, 'Payé une fois. Utilisé à vie.')
    ]
  },
  2: {
    name: 'diagshop-2-voyant-moteur', red: true,
    cuts: [0, 3.4, 8, 11.2, 15],
    html: [
      sc(0, 3.4, `<div class="up h" style="--d:.05s;font-size:120px;margin-bottom:70px">Voyant moteur<br><span style="color:var(--amb)">allumé ?</span></div>
<div class="cluster pop" style="--d:.3s"><div class="gauge"><div class="needle"></div>3<small>x1000 tr/min</small></div>
${ENGINE.replace('<svg', '<svg class="cel"')}<div class="gauge">0<small>km/h</small></div></div>
<div class="up mut" style="--d:1.2s;font-size:40px;font-weight:600;margin-top:60px">Ne roule pas à l'aveugle.</div>`),
      sc(3.4, 8, `<div class="timer up" style="--d:3.5s"><span data-timer="3.8,7.6,120">00:00</span></div>
<div class="up mut" style="--d:3.6s;font-size:32px;font-weight:600;margin-bottom:70px">chrono</div>
<div class="steps">${[['Branche', 'Prise OBD, sous le volant'], ['Lis', 'Tous les calculateurs, codes expliqués'], ['Efface', 'Après réparation. Voyant éteint.']].map((s, i) =>
        `<div class="step left" style="--d:${(3.9 + i * 1.1).toFixed(2)}s"><div class="num">${i + 1}</div><div><h3>${s[0]}.</h3><p>${s[1]}</p></div></div>`).join('')}</div>`),
      sc(8, 11.2, `<div class="up h" style="--d:8.1s;font-size:76px;margin-bottom:60px">Le vrai défaut,<br><span class="grad">pas une supposition.</span></div>${laptop(8.3, [0, 2])}`),
      cta(11.2, 'Choisis ton kit.')
    ]
  },
  3: {
    name: 'diagshop-3-mecanos', red: false,
    cuts: [0, 3.4, 7.4, 11.2, 15],
    html: [
      sc(0, 3.4, `<div class="up h" style="--d:.05s;font-size:130px">Mécanos :</div>
<div class="up h" style="--d:.35s;font-size:100px;margin-top:30px">arrêtez de <span style="color:var(--red)">refuser</span><br>des voitures.</div>
<div class="slam h" style="--d:1.3s;font-size:58px;margin-top:80px;border:6px solid var(--red);color:var(--red);padding:18px 40px;border-radius:20px">« PAS LA VALISE POUR ÇA »</div>`),
      sc(3.4, 7.4, `<div class="up h" style="--d:3.5s;font-size:84px;margin-bottom:60px"><span class="grad">24 marques.</span><br>Auto & poids-lourds.</div>
<div class="brands">${['BMW', 'Mercedes', 'Audi', 'VW', 'Renault', 'Peugeot', 'Citroën', 'Ford', 'Opel', 'Volvo', 'Fiat', 'Toyota', 'Nissan', 'Hyundai', 'Kia', 'Škoda', 'Seat', 'Dacia', 'MINI', 'Smart', 'Iveco', 'MAN', 'Scania', 'DAF'].map((b, i) =>
        `<div class="pop" style="--d:${(3.8 + i * .09).toFixed(2)}s">${b}</div>`).join('')}</div>`),
      sc(7.4, 11.2, `<div class="up h" style="--d:7.5s;font-size:80px;margin-bottom:56px">Un kit pour<br><span class="grad">chaque atelier.</span></div>
<div class="packs">${[['Entrée de gamme', 'PC Delphi / Autocom', '150 €'], ['Pack complet', 'Auto & Poids-Lourds', '399 €'], ['Premium', 'Pack DiagZone', '580 €'], ['Haut de gamme', 'LAUNCH SmartLink', '1 050 €']].map((p, i) =>
        `<div class="card pack left" style="--d:${(7.8 + i * .35).toFixed(2)}s"><div><span>${p[0]}</span>${p[1]}</div><b>${p[2]}</b></div>`).join('')}</div>`),
      cta(11.2, 'Livré prêt à brancher.', 'range')
    ]
  }
};

function page(v) {
  const segs = v.cuts.slice(1).map((c, i) => `<div class="seg"><i style="animation-duration:${(c - v.cuts[i]).toFixed(2)}s;animation-delay:${v.cuts[i]}s"></i></div>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="bg"><div class="grid"></div><div class="blob b1"></div><div class="blob b2"></div>${v.red ? '<div class="blob b3"></div>' : ''}<div class="vign"></div></div>
<div class="top">${segs}</div>
<div class="brand"><div class="logo">Diag<span>Shop</span></div><div class="pill"><span class="dot"></span>Bruxelles</div></div>
${v.html.join('')}
<script>
window.seek=t=>{
  document.getAnimations().forEach(a=>{a.pause();a.currentTime=t*1000});
  document.querySelectorAll('[data-timer]').forEach(el=>{
    const [s,e,max]=el.dataset.timer.split(',').map(Number);
    const k=Math.min(1,Math.max(0,(t-s)/(e-s)));const sec=Math.round(k*max);
    el.textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
  });
};
</script></body></html>`;
}

(async () => {
  const ids = process.argv[2] ? [process.argv[2]] : Object.keys(VIDEOS);
  const browser = await chromium.launch();
  for (const id of ids) {
    const v = VIDEOS[id];
    const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'diag-'));
    const htmlPath = path.join(tmp, 'v.html');
    fs.writeFileSync(htmlPath, page(v));
    const p = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await p.goto('file://' + htmlPath);
    await p.evaluate(() => document.fonts.ready);
    if (process.env.PREVIEW) { // aperçu : quelques images fixes, pas de vidéo
      for (const t of process.env.PREVIEW.split(',').map(Number)) {
        await p.evaluate(t => window.seek(t), t);
        await p.screenshot({ path: path.join(process.env.PREVIEW_DIR || OUT, `prev-${id}-${t}.jpg`), type: 'jpeg', quality: 80 });
      }
      await p.close(); continue;
    }
    const n = FPS * DUR;
    for (let f = 0; f < n; f++) {
      await p.evaluate(t => window.seek(t), f / FPS);
      await p.screenshot({ path: path.join(tmp, `f${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 });
    }
    await p.close();
    const out = path.join(OUT, v.name + '.mp4');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.jpg'),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log('OK', out);
  }
  await browser.close();
})();
