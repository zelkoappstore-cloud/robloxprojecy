// Deploiement Vercel sans integration GitHub : au moment du build, Vercel telecharge le code de FactuBot
// depuis le depot GitHub PUBLIC, fige sur un commit precis (deploy-sha.txt), et fabrique le site au
// format "Build Output API" : fichiers statiques + fonctions /api/* + tache planifiee.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REPO = 'zelkoappstore-cloud/robloxprojecy', SHA = fs.readFileSync('deploy-sha.txt', 'utf8').trim();
const OUT = '.vercel/output', SRC = process.env.SRC_DIR || 'src';
if (!/^[0-9a-f]{40}$/.test(SHA)) throw new Error('deploy-sha.txt doit contenir un commit complet');
if (!process.env.SRC_DIR) {
  fs.rmSync('tmp-src', { recursive: true, force: true }); fs.mkdirSync('tmp-src');
  execSync(`curl -fsSL https://codeload.github.com/${REPO}/tar.gz/${SHA} | tar -xz -C tmp-src`, { stdio: 'inherit' });
  fs.rmSync(SRC, { recursive: true, force: true });
  fs.renameSync(path.join('tmp-src', fs.readdirSync('tmp-src')[0], 'factubot'), SRC);
}
fs.rmSync(OUT, { recursive: true, force: true });
const STATIC = new Set(['.html', '.css', '.js', '.json', '.png', '.svg', '.ico', '.txt']);
const copyStatic = (from, to) => {
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (['api', 'cerveau', 'outils', 'node_modules'].includes(e.name) || e.name.startsWith('.')) continue;
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copyStatic(a, b);
    else if (STATIC.has(path.extname(e.name)) && !['package.json', 'vercel.json', 'deploy.mjs'].includes(e.name)) { fs.mkdirSync(to, { recursive: true }); fs.copyFileSync(a, b); }
  }
};
copyStatic(SRC, path.join(OUT, 'static'));
for (const f of fs.readdirSync(path.join(SRC, 'api')).filter(f => f.endsWith('.js'))) {
  const dir = path.join(OUT, 'functions', 'api', f.replace(/\.js$/, '') + '.func');
  fs.mkdirSync(dir, { recursive: true });
  fs.cpSync(path.join(SRC, 'api'), path.join(dir, 'api'), { recursive: true });
  fs.cpSync(path.join(SRC, 'js'), path.join(dir, 'js'), { recursive: true });
  fs.cpSync('node_modules', path.join(dir, 'node_modules'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ type: 'module' }));
  fs.writeFileSync(path.join(dir, '.vc-config.json'), JSON.stringify({ runtime: 'nodejs22.x', handler: `api/${f}`, launcherType: 'Nodejs', shouldAddHelpers: true, maxDuration: 60 }));
}
fs.writeFileSync(path.join(OUT, 'config.json'), JSON.stringify({ version: 3, crons: [{ path: '/api/state', schedule: '0 5 * * *' }] }));
console.log('FactuBot', SHA.slice(0, 7), 'pret :', fs.readdirSync(path.join(OUT, 'functions', 'api')).join(', '));
