// Pub style « keynote » pour lolpanel.vercel.app — 1080x1920, 18 s, 30 i/s.
// Usage : node build.js            (vidéo)   |   PREVIEW=3,7,12 node build.js (images fixes)
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');

const W = 1080, H = 1920, FPS = 30, DUR = 18;
const EASE = 'cubic-bezier(.16,1,.3,1)';

const CSS = `
:root{--bg:#000;--fg:#f5f5f7;--mu:#86868b;--ac:#8b5cf6;--ac2:#22d3ee;--p1:#0c0c11;--p2:#16161d;--bd:rgba(255,255,255,.08)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:var(--bg);color:var(--fg);font-family:'Inter Display',Inter,sans-serif;-webkit-font-smoothing:antialiased}
.mono{font-family:'DejaVu Sans Mono',monospace}
.grad{background:linear-gradient(100deg,var(--ac) 10%,var(--ac2) 90%);-webkit-background-clip:text;color:transparent}
.t{font-weight:700;letter-spacing:-.045em;line-height:1.02}
.scene{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 90px;
opacity:0;animation:sIn .9s ${EASE} var(--s) forwards,sOut .6s ease-in var(--e) forwards}
@keyframes sIn{from{opacity:0}to{opacity:1}}
@keyframes sOut{from{opacity:1}to{opacity:0;filter:blur(8px)}}
.w{display:inline-block;opacity:0;animation:w 1.1s ${EASE} var(--d) forwards}
@keyframes w{from{opacity:0;transform:translateY(40px);filter:blur(12px)}to{opacity:1;transform:none;filter:none}}
.fade{opacity:0;animation:fade 1.2s ${EASE} var(--d) forwards}
@keyframes fade{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
.flash{position:absolute;opacity:0;animation:fl1 .25s ${EASE} var(--d) forwards,fl2 .1s linear var(--o) forwards}
@keyframes fl1{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:none}}
@keyframes fl2{to{opacity:0}}
.glow{position:absolute;width:1000px;height:700px;left:40px;top:980px;border-radius:50%;background:radial-gradient(closest-side,rgba(139,92,246,.45),rgba(34,211,238,.12),transparent);filter:blur(40px);opacity:0;animation:fade 2s ease var(--d) forwards}
/* fenêtre de l'app */
.stage{perspective:2200px}
.win{width:960px;height:700px;border-radius:26px;background:var(--p1);border:1px solid rgba(255,255,255,.12);overflow:hidden;text-align:left;
box-shadow:0 60px 160px rgba(0,0,0,.8),0 0 0 1px rgba(255,255,255,.04) inset;opacity:0;animation:rise 2.2s ${EASE} var(--d) forwards;position:relative}
@keyframes rise{from{opacity:0;transform:translateY(420px) rotateX(38deg) scale(.88)}to{opacity:1;transform:none}}
.bar{height:56px;display:flex;align-items:center;gap:10px;padding:0 22px;border-bottom:1px solid var(--bd);background:var(--p2)}
.bar i{width:13px;height:13px;border-radius:50%;background:#3a3a44}
.bar span{margin-left:14px;font-size:19px;color:var(--mu)}.bar span b{color:var(--fg);font-weight:600}
.exp{margin-left:auto;font-size:18px;font-weight:600;padding:9px 18px;border-radius:10px;background:var(--ac);color:#fff;animation:press .3s ease var(--d) forwards}
@keyframes press{50%{transform:scale(.9);box-shadow:0 0 0 10px rgba(139,92,246,.3)}100%{transform:none}}
.cols{display:flex;height:644px}
.side{width:190px;border-right:1px solid var(--bd);padding:18px 14px;display:flex;flex-direction:column;gap:10px}
.side small{font-size:14px;color:var(--mu);letter-spacing:.08em;text-transform:uppercase;margin:0 6px 4px}
.it{font-size:18px;padding:12px 14px;border-radius:10px;background:rgba(255,255,255,.035);border:1px solid var(--bd)}
.it.hl{animation:hl .5s ease var(--d) forwards}
@keyframes hl{to{border-color:var(--ac);background:rgba(139,92,246,.18)}}
.canvas{flex:1;padding:22px;display:flex;flex-direction:column;gap:16px;background:#09090d;position:relative}
.blk{border-radius:16px;border:1px solid var(--bd);background:var(--p2);opacity:0;animation:drop .8s ${EASE} var(--d) forwards}
@keyframes drop{from{opacity:0;transform:translateY(-40px) scale(.96)}to{opacity:1;transform:none}}
.hero{padding:30px 26px;text-align:center}
.hero h4{font-size:38px;letter-spacing:-.03em;margin-bottom:10px}
.hero p{font-size:17px;color:var(--mu);margin-bottom:18px}
.btn{display:inline-block;font-size:17px;font-weight:600;padding:11px 22px;border-radius:10px;background:var(--ac);color:#fff;animation:recolor .6s ease var(--c) forwards}
@keyframes recolor{to{background:var(--ac2);color:#001014}}
.ttl{animation:retitle .6s ease var(--c) forwards}
@keyframes retitle{to{color:var(--ac2)}}
.row{display:flex;gap:14px}
.row .blk{flex:1;padding:18px;text-align:center}
.row b{display:block;font-size:30px;letter-spacing:-.03em}.row em{font-style:normal;font-size:14px;color:var(--mu)}
.panel{width:220px;border-left:1px solid var(--bd);padding:18px 16px;display:flex;flex-direction:column;gap:16px}
.panel small{font-size:14px;color:var(--mu);letter-spacing:.08em;text-transform:uppercase}
.sw{display:flex;gap:10px}.sw i{width:34px;height:34px;border-radius:50%;position:relative}
.ring{position:absolute;inset:-5px;border-radius:50%;border:2px solid #fff}
.r1{animation:ringoff .2s linear var(--c) forwards}.r2{opacity:0;animation:ringon .2s linear var(--c) forwards}
@keyframes ringoff{to{opacity:0}}@keyframes ringon{to{opacity:1}}
.sl{height:8px;border-radius:4px;background:rgba(255,255,255,.08);position:relative}
.sl i{position:absolute;left:0;top:0;bottom:0;border-radius:4px;background:var(--fg);width:40%;animation:slide 1s ${EASE} var(--c) forwards}
@keyframes slide{to{width:72%}}
.field{font-size:16px;padding:10px 12px;border-radius:9px;border:1px solid var(--bd);background:rgba(255,255,255,.03)}
.cursor{position:absolute;width:44px;height:44px;left:0;top:0;z-index:5;filter:drop-shadow(0 4px 10px rgba(0,0,0,.6));opacity:0;
animation:cur 5.2s ${EASE} var(--d) forwards}
@keyframes cur{0%{opacity:0;transform:translate(700px,600px)}6%{opacity:1}
18%{transform:translate(70px,140px)}26%{transform:translate(70px,140px) scale(.85)}30%{transform:translate(70px,140px)}
44%{transform:translate(70px,250px)}50%{transform:translate(70px,250px) scale(.85)}54%{transform:translate(70px,250px)}
70%{transform:translate(830px,170px)}76%{transform:translate(830px,170px) scale(.85)}80%{transform:translate(830px,170px)}
100%{opacity:1;transform:translate(880px,24px)}}
/* code */
.code{width:920px;border-radius:24px;background:var(--p1);border:1px solid rgba(255,255,255,.12);text-align:left;overflow:hidden;box-shadow:0 60px 160px rgba(0,0,0,.8)}
.tabs{display:flex;gap:6px;padding:16px 18px;border-bottom:1px solid var(--bd);background:var(--p2)}
.tab{font-size:19px;font-weight:600;padding:9px 16px;border-radius:9px;color:var(--mu)}
.tab.on{background:rgba(139,92,246,.2);color:var(--fg)}
.lines{padding:30px 34px;font-size:25px;line-height:1.7}
.ln{white-space:pre;overflow:hidden;width:0;animation:type var(--t) steps(var(--n)) var(--d) forwards}
@keyframes type{to{width:var(--wd)}}
.k{color:#c084fc}.s{color:#67e8f9}.a{color:#fcd34d}.m{color:#6b6b78}
.logo{width:150px;height:150px;border-radius:38px;background:linear-gradient(135deg,var(--ac),var(--ac2));display:grid;place-items:center;
font-size:84px;font-weight:800;color:#fff;letter-spacing:-.06em;box-shadow:0 30px 100px rgba(139,92,246,.5)}
`;

const words = (txt, d0, step = .14) => txt.split(' ').map((w, i) =>
  `<span class="w" style="--d:${(d0 + i * step).toFixed(2)}s">${w}</span>`).join(' ');
const sc = (s, e, html) => `<section class="scene" style="--s:${s}s;--e:${e}s">${html}</section>`;
const CUR = `<svg class="cursor" style="--d:5.9s" viewBox="0 0 24 24"><path d="M4 2l16 9-7 2-3 7z" fill="#fff" stroke="#000" stroke-width="1.2" stroke-linejoin="round"/></svg>`;

// lignes de code (texte brut pour la largeur, HTML coloré pour l'affichage)
const CODE = [
  ['<span class="k">export default function</span> <span class="a">Hero</span>() {', 'export default function Hero() {'],
  ['  <span class="k">return</span> (', '  return ('],
  ['    &lt;<span class="k">section</span> <span class="a">className</span>=<span class="s">"hero"</span>&gt;', '    <section className="hero">'],
  ['      &lt;<span class="k">h1</span>&gt;Ship faster.&lt;/<span class="k">h1</span>&gt;', '      <h1>Ship faster.</h1>'],
  ['      &lt;<span class="k">a</span> <span class="a">href</span>=<span class="s">"#start"</span>&gt;Start&lt;/<span class="k">a</span>&gt;', '      <a href="#start">Start</a>'],
  ['    &lt;/<span class="k">section</span>&gt;', '    </section>'],
  ['  );', '  );'],
  ['}', '}'],
];
let cd = 11.0;
const codeLines = CODE.map(([h, raw]) => {
  const n = raw.length, t = Math.max(.12, n * .012), d = cd; cd += t + .03;
  return `<div class="ln" style="--n:${n};--t:${t.toFixed(2)}s;--d:${d.toFixed(2)}s;--wd:${n}ch">${h}</div>`;
}).join('');

const FW = ['HTML.', 'React.', 'Vue.', 'Svelte.', 'Tailwind.'];

const SCENES = [
  sc(0, 2.9, `<div class="t" style="font-size:150px">${words('Design it.', .3, .25)}</div>`),
  sc(2.9, 5.4, `<div class="t" style="font-size:118px">${words('Without writing', 3.1)}<br>${words('a single line.', 3.6)}</div>`),
  sc(5.4, 10.4, `<div class="glow" style="--d:5.6s"></div>
<div class="t fade" style="--d:5.5s;font-size:76px;margin-bottom:80px">Stack. Edit. <span class="grad">Done.</span></div>
<div class="stage"><div class="win" style="--d:5.6s">${CUR}
 <div class="bar"><i></i><i></i><i></i><span><b>lolpanel.v1</b> / builder</span><div class="exp" style="--d:10.1s">Export</div></div>
 <div class="cols">
  <div class="side"><small>Blocks</small>
   <div class="it hl" style="--d:6.8s">Hero</div><div class="it hl" style="--d:8.3s">Stats</div><div class="it">Pricing</div><div class="it">FAQ</div><div class="it">Footer</div></div>
  <div class="canvas" style="--c:9.4s">
   <div class="blk hero" style="--d:7.3s"><h4 class="ttl" style="--c:9.4s">Ship faster.</h4><p>Your landing page, built in minutes.</p><span class="btn" style="--c:9.4s">Start →</span></div>
   <div class="row"><div class="blk" style="--d:8.6s"><b>12k</b><em>users</em></div><div class="blk" style="--d:8.72s"><b>99%</b><em>uptime</em></div><div class="blk" style="--d:8.84s"><b>4.9★</b><em>rating</em></div></div>
   <div class="row"><div class="blk" style="--d:9.0s"><em>Starter</em><b>0 €</b></div><div class="blk" style="--d:9.1s;border-color:var(--ac)"><em>Pro</em><b>9 €</b></div><div class="blk" style="--d:9.2s"><em>Team</em><b>29 €</b></div></div>
  </div>
  <div class="panel"><small>Accent</small>
   <div class="sw"><i style="background:#8b5cf6"><span class="ring r1" style="--c:9.4s"></span></i><i style="background:#22d3ee"><span class="ring r2" style="--c:9.4s"></span></i><i style="background:#f472b6"></i><i style="background:#34d399"></i></div>
   <small>Font</small><div class="field">Inter · 800</div>
   <small>Spacing</small><div class="sl"><i style="--c:9.5s"></i></div>
   <small>Radius</small><div class="sl"><i style="--c:9.7s;width:30%"></i></div>
  </div>
 </div></div></div>`),
  sc(10.4, 14.2, `<div class="t fade" style="--d:10.5s;font-size:96px;margin-bottom:70px">Then take<br><span class="grad">the code.</span></div>
<div class="code fade" style="--d:10.6s"><div class="tabs">${['HTML', 'React', 'Vue', 'Svelte', 'Tailwind'].map(t => `<div class="tab${t === 'React' ? ' on' : ''}">${t}</div>`).join('')}</div>
<div class="lines mono">${codeLines}</div></div>`),
  sc(14.2, 15.9, FW.map((f, i) => {
    const d = 14.3 + i * .32, o = d + .2;
    return `<div class="flash t${i === FW.length - 1 ? ' grad' : ''}" style="--d:${d.toFixed(2)}s;--o:${i === FW.length - 1 ? 99 : o.toFixed(2)}s;font-size:190px">${f}</div>`;
  }).join('')),
  sc(15.9, 99, `<div class="logo fade" style="--d:16s">lp</div>
<div class="t fade" style="--d:16.25s;font-size:120px;margin-top:56px">lolpanel</div>
<div class="fade" style="--d:16.6s;font-size:48px;font-weight:500;color:var(--mu);margin-top:22px;letter-spacing:-.02em">Free. For everyone.</div>
<div class="fade" style="--d:17s;font-size:34px;font-weight:600;margin-top:90px;letter-spacing:-.01em">lolpanel.vercel.app</div>`),
];

const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${SCENES.join('')}
<script>window.seek=t=>document.getAnimations().forEach(a=>{a.pause();a.currentTime=t*1000});</script></body></html>`;

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-'));
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
    const out = path.join(__dirname, 'lolpanel-pub.mp4');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.jpg'),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
    console.log('OK', out);
  }
  await b.close(); fs.rmSync(tmp, { recursive: true, force: true });
})();
