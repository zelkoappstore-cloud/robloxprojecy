// Pub style « keynote » pour lolpanel.vercel.app — 1080x1920, 18 s, 30 i/s.
// Utilise de vraies captures du builder (dossier shots/, 1440x1300) et le logo (logo.png).
// Usage : node build.js            (vidéo)   |   PREVIEW=3,7,12 node build.js (images fixes)
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');

const W = 1080, H = 1920, FPS = 30, DUR = 18;
const EASE = 'cubic-bezier(.16,1,.3,1)';
const SHOT_W = 1440, SHOT_H = 1300, WIN_W = 960, K = WIN_W / SHOT_W; // échelle capture -> vidéo
const shot = n => 'file://' + path.join(__dirname, 'shots', `s-${n}.png`);
const T = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(__dirname, 'shots', 'steps.json'))).map(s => [s.name, s.target]));

// Démo : clic -> nouvelle capture. Le curseur vise le centre réel du bouton cliqué.
const WIN_IN = 5.5, RISE = 1.4;
const CLICKS = [['1Hero', 7.0], ['1Stats', 7.7], ['1Features', 8.4], ['2theme', 9.1], ['3color', 9.7], ['4export', 10.4]];
const WAYPOINTS = [{ t: 6.2, x: 700, y: 760 }, ...CLICKS.map(([n, t]) => ({ t, x: T[n].x * K, y: T[n].y * K, click: true }))];

// Fenêtre d'export (onglet React), recadrée : x 231→1209, y 195→1100 de la capture
const CROP = { x: 231, y: 195, w: 978, h: 905 }, CODE_W = 920, KC = CODE_W / CROP.w;

const CSS = `
:root{--fg:#f5f5f7;--mu:#86868b;--ac:#8b5cf6;--ac2:#22d3ee}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#000;color:var(--fg);font-family:'Inter Display',Inter,sans-serif;-webkit-font-smoothing:antialiased}
.grad{background:linear-gradient(100deg,var(--ac) 10%,var(--ac2) 90%);-webkit-background-clip:text;color:transparent}
.t{font-weight:700;letter-spacing:-.045em;line-height:1.02}
.scene{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 60px;
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
.glow{position:absolute;width:1100px;height:800px;left:-10px;top:900px;border-radius:50%;background:radial-gradient(closest-side,rgba(139,92,246,.4),rgba(34,211,238,.1),transparent);filter:blur(40px);opacity:0;animation:fade 2s ease var(--d) forwards}
.stage{perspective:2400px}
.win{width:${WIN_W}px;height:${Math.round(SHOT_H * K)}px;border-radius:22px;overflow:hidden;position:relative;background:#07070a;
box-shadow:0 60px 160px rgba(0,0,0,.85),0 0 0 1px rgba(255,255,255,.12);opacity:0;animation:rise ${RISE}s ${EASE} var(--d) forwards}
@keyframes rise{from{opacity:0;transform:translateY(380px) rotateX(34deg) scale(.9)}to{opacity:1;transform:none}}
.win img{position:absolute;inset:0;width:100%;height:100%;opacity:0;animation:show .18s ease var(--d) forwards}
.win img:first-child{opacity:1;animation:none}
@keyframes show{to{opacity:1}}
#cur{position:absolute;left:0;top:0;width:34px;height:34px;z-index:5;filter:drop-shadow(0 3px 8px rgba(0,0,0,.7));opacity:0;pointer-events:none}
#rip{position:absolute;left:0;top:0;width:60px;height:60px;margin:-30px 0 0 -30px;border-radius:50%;border:3px solid #fff;opacity:0;z-index:4}
.code{width:${CODE_W}px;height:${Math.round(CROP.h * KC)}px;border-radius:22px;
background:url(${shot('5react')}) no-repeat ${-CROP.x * KC}px ${-CROP.y * KC}px/${SHOT_W * KC}px auto;
box-shadow:0 60px 160px rgba(0,0,0,.85),0 0 0 1px rgba(255,255,255,.12);opacity:0;animation:zoom 3.4s ${EASE} var(--d) forwards}
@keyframes zoom{0%{opacity:0;transform:scale(.92) translateY(40px)}25%{opacity:1}100%{opacity:1;transform:scale(1.02)}}
.logo{width:520px;height:520px;margin:-120px 0 -100px;opacity:0;animation:logo 1.6s ${EASE} var(--d) forwards}
@keyframes logo{from{opacity:0;transform:scale(.8);filter:blur(16px)}to{opacity:1;transform:none;filter:none}}
`;

const words = (txt, d0, step = .14) => txt.split(' ').map((w, i) =>
  `<span class="w" style="--d:${(d0 + i * step).toFixed(2)}s">${w}</span>`).join(' ');
const sc = (s, e, html) => `<section class="scene" style="--s:${s}s;--e:${e}s">${html}</section>`;
// Textes : LANG=fr pour la version française (même vidéo, seul le texte change)
const LANG = process.env.LANG_PUB || 'en';
const TXT = {
  en: { s1: 'Design it.', s2a: 'Without writing', s2b: 'a single line.', s3: 'Stack. Edit.', s3g: 'Done.', s4a: 'Then take', s4g: 'the code.', end: 'Free. For everyone.' },
  fr: { s1: 'Créez.', s2a: 'Sans écrire', s2b: 'une seule ligne.', s3: 'Empilez. Éditez.', s3g: 'Terminé.', s4a: 'Puis prenez', s4g: 'le code.', end: 'Gratuit. Pour tout le monde.' },
}[LANG];
const FW = ['HTML.', 'React.', 'Vue.', 'Svelte.', 'Tailwind.'];

const SCENES = [
  sc(0, 2.9, `<div class="t" style="font-size:150px">${words(TXT.s1, .3, .25)}</div>`),
  sc(2.9, 5.4, `<div class="t" style="font-size:118px">${words(TXT.s2a, 3.1)}<br>${words(TXT.s2b, 3.6)}</div>`),
  sc(5.4, 11.0, `<div class="glow" style="--d:5.6s"></div>
<div class="t fade" style="--d:5.5s;font-size:84px;margin-bottom:70px">${TXT.s3} <span class="grad">${TXT.s3g}</span></div>
<div class="stage"><div class="win" style="--d:${WIN_IN}s">
 <img src="${shot('0blank')}">${CLICKS.map(([n, t]) => `<img src="${shot(n)}" style="--d:${(t + .1).toFixed(2)}s">`).join('')}
 <div id="rip"></div>
 <svg id="cur" viewBox="0 0 24 24"><path d="M4 2l16 9-7 2-3 7z" fill="#fff" stroke="#000" stroke-width="1.3" stroke-linejoin="round"/></svg>
</div></div>`),
  sc(11.0, 14.4, `<div class="t fade" style="--d:11.1s;font-size:100px;margin-bottom:70px">${TXT.s4a}<br><span class="grad">${TXT.s4g}</span></div>
<div class="code" style="--d:11.3s"></div>`),
  sc(14.4, 16.1, FW.map((f, i) => {
    const d = 14.5 + i * .32, last = i === FW.length - 1;
    return `<div class="flash t${last ? ' grad' : ''}" style="--d:${d.toFixed(2)}s;--o:${last ? 99 : (d + .2).toFixed(2)}s;font-size:190px">${f}</div>`;
  }).join('')),
  sc(16.1, 99, `<img class="logo" src="file://${path.join(__dirname, 'logo.png')}" style="--d:16.1s">
<div class="t fade" style="--d:16.4s;font-size:120px">lolpanel</div>
<div class="fade" style="--d:16.75s;font-size:48px;font-weight:500;color:var(--mu);margin-top:22px;letter-spacing:-.02em">${TXT.end}</div>
<div class="fade" style="--d:17.1s;font-size:34px;font-weight:600;margin-top:90px">lolpanel.vercel.app</div>`),
];

const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${SCENES.join('')}
<script>
const WP=${JSON.stringify(WAYPOINTS)};
const ease=k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
window.seek=t=>{
  document.getAnimations().forEach(a=>{a.pause();a.currentTime=t*1000});
  const cur=document.getElementById('cur'),rip=document.getElementById('rip');
  // chaque déplacement dure 0.45 s et arrive pile au moment du clic
  let x=WP[0].x,y=WP[0].y;
  for(let i=1;i<WP.length;i++){const a=WP[i-1],b=WP[i];const s=b.t-.5,e=b.t-.05;
    if(t>=e){x=b.x;y=b.y}else if(t>s){const k=ease((t-s)/(e-s));x=a.x+(b.x-a.x)*k;y=a.y+(b.y-a.y)*k}}
  let sc=1,ro=0,rs=1;
  for(const w of WP){if(!w.click)continue;const d=t-w.t;
    if(d>-.06&&d<.12)sc=.82;
    if(d>=0&&d<.35){ro=.8*(1-d/.35);rs=.4+d/.35*1.2;rip.style.left=w.x+'px';rip.style.top=w.y+'px'}}
  cur.style.opacity=t<WP[0].t?0:Math.min(1,(t-WP[0].t)/.2);
  cur.style.transform='translate('+(x-6)+'px,'+(y-3)+'px) scale('+sc+')';
  rip.style.opacity=ro;rip.style.transform='scale('+rs+')';
};
</script></body></html>`;

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-'));
  const htmlPath = path.join(tmp, 'v.html'); fs.writeFileSync(htmlPath, HTML);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await p.goto('file://' + htmlPath); await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(() => [...document.images].every(i => i.complete));
  const out = path.join(__dirname, LANG === 'en' ? 'lolpanel-pub.mp4' : `lolpanel-pub-${LANG}.mp4`);
  // Son : musique chill + un clic à chaque clic du curseur, puis mixage avec l'image
  const addAudio = video => {
    const wav = path.join(tmp, 'a.wav'), muxed = path.join(tmp, 'muxed.mp4');
    execFileSync('python3', [path.join(__dirname, 'audio.py'), wav, String(DUR), ...CLICKS.map(c => String(c[1]))]);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-i', wav, '-map', '0:v', '-map', '1:a',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', muxed]);
    fs.copyFileSync(muxed, out);
  };
  if (process.env.AUDIO_ONLY) { // refait seulement le son, sur la vidéo existante
    addAudio(out); console.log('OK', out);
  } else if (process.env.PREVIEW) {
    for (const t of process.env.PREVIEW.split(',').map(Number)) {
      await p.evaluate(t => seek(t), t);
      await p.screenshot({ path: path.join(process.env.PREVIEW_DIR || __dirname, `prev-${t}.jpg`), type: 'jpeg', quality: 80 });
    }
  } else {
    for (let f = 0; f < FPS * DUR; f++) {
      await p.evaluate(t => seek(t), f / FPS);
      await p.screenshot({ path: path.join(tmp, `f${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 });
    }
    const silent = path.join(tmp, 'silent.mp4');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.jpg'),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', silent]);
    addAudio(silent);
    console.log('OK', out);
  }
  await b.close(); fs.rmSync(tmp, { recursive: true, force: true });
})();
