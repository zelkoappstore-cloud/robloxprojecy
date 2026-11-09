// Render pub.html frame by frame (deterministic) then encode with ffmpeg.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const [html, out, durStr, fpsStr, only] = process.argv.slice(2);
const dur = Number(durStr || 18), fps = Number(fpsStr || 30);
const dir = path.join(path.dirname(out), 'frames');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir);

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.resolve(html), { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  const times = only ? only.split(',').map(Number) : null;
  const n = times ? times.length : Math.round(dur * fps);
  for (let i = 0; i < n; i++) {
    const t = times ? times[i] : i / fps;
    await p.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; }), t * 1000);
    await p.screenshot({ path: path.join(dir, `f${String(i).padStart(4, '0')}.${times ? 'png' : 'jpg'}`), ...(times ? {} : { type: 'jpeg', quality: 92 }) });
  }
  await b.close();
  if (!times) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(dir, 'f%04d.jpg'),
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', out]);
  }
})();
