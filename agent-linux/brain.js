// Cerveau et monde du petit agent Linux. Aucune action « toute faite » : il n'a qu'une souris
// (bouger d'une case, cliquer) et un clavier de mots. Il doit apprendre où cliquer et quoi taper.
(function (root) {
  const HOME = '/home/agent';
  const COLS = 12, ROWS = 8;
  const KEYS = ['ls', 'pwd', 'mkdir', 'cd', 'cd ..', 'touch', 'cat', 'rm', '‹dossier›', '‹fichier›', '‹texte›', 'Entrée', 'Effacer'];
  const ACTIONS = ['↑', '↓', '←', '→', 'clic', ...KEYS.map(k => 'touche ' + k)];

  // Disposition des fenêtres sur la grille (colonnes x, lignes y, bornes incluses)
  const LAYOUT = {
    terminal: { x0: 0, x1: 6, y0: 1, y1: 3, close: [6, 1] },
    fichiers: { x0: 7, x1: 11, y0: 1, y1: 4, close: [11, 1], up: [7, 2], bin: [11, 2], items: [[7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4]] },
    editeur: { x0: 1, x1: 6, y0: 4, y1: 6, close: [6, 4], save: [6, 6] }
  };
  const DOCK = { 4: 'terminal', 5: 'fichiers', 6: 'editeur', 7: 'corbeille' };
  const rnd = n => Math.random() * n | 0;
  const pick = a => a[rnd(a.length)];

  class Env {
    reset(random = false) {
      this.fs = new Map([
        [HOME, { d: 1 }], [HOME + '/Documents', { d: 1 }], [HOME + '/Images', { d: 1 }],
        [HOME + '/notes.txt', { c: 'liste de courses : pain, pommes, café' }],
        [HOME + '/photo.png', { c: '(image)' }],
        [HOME + '/Documents/recette.txt', { c: 'crêpes : farine, œufs, lait' }]
      ]);
      this.cwd = HOME; this.fm = HOME; this.open = []; this.focus = null; this.sel = null;
      this.ed = { text: '', name: null, saving: false, nameBuf: null };
      this.buf = []; this.term = []; this.lastCmd = null; this.read = null; this.trash = [];
      this.cx = 6; this.cy = 3;
      if (random) {
        if (Math.random() < 0.3) this.fs.set(HOME + '/projets', { d: 1 });
        for (const app of ['terminal', 'fichiers', 'editeur']) if (Math.random() < 0.3) this.open.push(app);
        this.focus = this.open.length ? pick(this.open) : null;
        const r = Math.random();
        if (r < 0.2) this.cwd = HOME + '/Documents';
        else if (r < 0.5 && this.fs.has(HOME + '/projets')) this.cwd = HOME + '/projets';
        if (this.open.includes('editeur')) this.ed.text = pick(['', 'brouillon', 'bonjour']);
        this.cx = rnd(COLS); this.cy = rnd(ROWS);
      }
      return this;
    }
    isDir(p) { return this.fs.get(p)?.d === 1; }
    list(dir) {
      const pre = dir + '/';
      return [...this.fs.keys()].filter(k => k.startsWith(pre) && !k.slice(pre.length).includes('/')).map(k => k.slice(pre.length)).sort();
    }
    say(line, err) { this.term.push({ line, err }); if (this.term.length > 40) this.term.shift(); }
    // Ce qui se trouve sous une case, en tenant compte de la fenêtre au premier plan
    hit(x, y) {
      if (y === 7 && DOCK[x]) return { kind: 'dock', app: DOCK[x] };
      const order = [...this.open].sort((a, b) => (a === this.focus) - (b === this.focus)).reverse();
      for (const app of order) {
        const L = LAYOUT[app];
        if (x < L.x0 || x > L.x1 || y < L.y0 || y > L.y1) continue;
        if (x === L.close[0] && y === L.close[1]) return { kind: 'close', app };
        if (app === 'fichiers') {
          if (x === L.up[0] && y === L.up[1]) return { kind: 'up', app };
          if (x === L.bin[0] && y === L.bin[1]) return { kind: 'bin', app };
          const k = L.items.findIndex(([ix, iy]) => ix === x && iy === y);
          if (k >= 0) { const name = this.list(this.fm)[k]; if (name) return { kind: 'item', app, name }; }
        }
        if (app === 'editeur' && x === L.save[0] && y === L.save[1]) return { kind: 'save', app };
        return { kind: 'win', app };
      }
      return { kind: 'desk' };
    }
    focusApp(app) {
      if (!this.open.includes(app)) {
        this.open.push(app);
        if (app === 'editeur') this.ed = { text: '', name: null, saving: false, nameBuf: null };
      }
      this.focus = app;
    }
    run(p) {
      const t = this.buf, w = t.map(k => k === '‹dossier›' ? p.dir : k === '‹fichier›' ? p.file : k === '‹texte›' ? p.text : k);
      this.buf = [];
      const line = w.join(' ');
      this.say('$ ' + line);
      const named = t[1] === '‹dossier›' || t[1] === '‹fichier›';
      const arg = named ? w[1] : null, one = w.length === 2 && named, path = arg ? this.cwd + '/' + arg : null;
      if (w[0] === 'ls' && w.length === 1) { this.say(this.list(this.cwd).join('  ') || '(vide)'); this.lastCmd = 'ls:' + this.cwd; return true; }
      if (w[0] === 'pwd' && w.length === 1) { this.say(this.cwd); return true; }
      if (w[0] === 'cd ..' && w.length === 1) { if (this.cwd !== HOME) this.cwd = this.cwd.slice(0, this.cwd.lastIndexOf('/')); return true; }
      if (one && arg) {
        if (w[0] === 'mkdir') { if (this.fs.has(path)) this.say(`mkdir: « ${arg} » existe déjà`, 1); else this.fs.set(path, { d: 1 }); return true; }
        if (w[0] === 'cd') { if (this.isDir(path)) { this.cwd = path; return true; } this.say(`cd: ${arg}: aucun dossier de ce nom`, 1); return false; }
        if (w[0] === 'touch') { if (!this.fs.has(path)) this.fs.set(path, { c: '' }); return true; }
        if (w[0] === 'cat') { const f = this.fs.get(path); if (f && !f.d) { this.say(f.c || '(vide)'); this.read = path; return true; } this.say(`cat: ${arg}: introuvable`, 1); return false; }
        if (w[0] === 'rm') { if (this.fs.has(path) && !this.isDir(path)) { this.fs.delete(path); return true; } this.say(`rm: ${arg}: introuvable`, 1); return false; }
      }
      this.say(`${line || '(rien)'} : commande inconnue`, 1);
      return false;
    }
    // Une action = un geste de souris ou une touche. Renvoie false si le geste n'a servi à rien.
    step(ai, p) {
      const a = ACTIONS[ai];
      if (a === '↑') { if (this.cy === 0) return false; this.cy--; return true; }
      if (a === '↓') { if (this.cy === ROWS - 1) return false; this.cy++; return true; }
      if (a === '←') { if (this.cx === 0) return false; this.cx--; return true; }
      if (a === '→') { if (this.cx === COLS - 1) return false; this.cx++; return true; }
      if (a === 'clic') {
        const h = this.hit(this.cx, this.cy);
        if (h.kind === 'dock') { if (h.app === 'corbeille') return false; this.focusApp(h.app); return true; }
        if (h.kind === 'close') { this.open = this.open.filter(x => x !== h.app); if (this.focus === h.app) this.focus = this.open[this.open.length - 1] || null; return true; }
        if (h.kind === 'desk') return false;
        this.focus = h.app;
        if (h.kind === 'item') { this.sel = h.name; return true; }
        if (h.kind === 'up') { if (this.fm === HOME) return false; this.fm = this.fm.slice(0, this.fm.lastIndexOf('/')); this.sel = null; return true; }
        if (h.kind === 'bin') {
          const path = this.fm + '/' + this.sel;
          if (!this.sel || !this.fs.has(path) || this.isDir(path)) return false;
          this.trash.push({ name: this.sel, c: this.fs.get(path).c }); this.fs.delete(path); this.sel = null; return true;
        }
        if (h.kind === 'save') { if (!this.ed.text) return false; this.ed.saving = true; this.ed.nameBuf = null; return true; }
        return true;
      }
      const key = a.slice(7);
      if (this.focus === 'terminal') {
        if (key === 'Entrée') return this.buf.length ? this.run(p) : false;
        if (key === 'Effacer') { const had = this.buf.length > 0; this.buf = []; return had; }
        if (this.buf.length >= 2) return false;
        if (key === '‹dossier›' && !p.dir) return false;
        if (key === '‹fichier›' && !p.file) return false;
        if (key === '‹texte›') return false;
        this.buf.push(key); return true;
      }
      if (this.focus === 'editeur') {
        if (this.ed.saving) {
          if (key === '‹fichier›' && p.file) { this.ed.nameBuf = p.file; return true; }
          if (key === 'Entrée' && this.ed.nameBuf) { this.fs.set(HOME + '/' + this.ed.nameBuf, { c: this.ed.text }); this.ed.name = this.ed.nameBuf; this.ed.saving = false; this.ed.nameBuf = null; return true; }
          if (key === 'Effacer') { this.ed.saving = false; this.ed.nameBuf = null; return true; }
          return false;
        }
        if (key === '‹texte›' && p.text) { this.ed.text = p.text; return true; }
        if (key === 'Effacer' && this.ed.text) { this.ed.text = ''; return true; }
        return false;
      }
      return false;
    }
  }

  const TASKS = [
    { id: 'term', label: 'Ouvrir le terminal', p: {}, done: e => e.focus === 'terminal' },
    { id: 'ls', label: 'Lister le dossier personnel', p: {}, done: e => e.lastCmd === 'ls:' + HOME },
    { id: 'mkdir', label: 'Créer un dossier', p: { dir: 'projets' }, done: (e, p) => e.isDir(HOME + '/' + p.dir) },
    { id: 'touch', label: 'Créer un fichier dans un dossier', p: { dir: 'projets', file: 'idee.txt' }, done: (e, p) => { const f = e.fs.get(`${HOME}/${p.dir}/${p.file}`); return !!f && !f.d; } },
    { id: 'cat', label: 'Lire un fichier texte', p: { file: 'notes.txt' }, done: (e, p) => e.read === HOME + '/' + p.file },
    { id: 'write', label: 'Écrire et enregistrer un texte', p: { file: 'lettre.txt', text: 'bonjour' }, done: (e, p) => e.fs.get(HOME + '/' + p.file)?.c === p.text },
    { id: 'trash', label: 'Mettre un fichier à la corbeille', p: { file: 'photo.png' }, done: (e, p) => !e.fs.has(HOME + '/' + p.file) }
  ];

  // Ce que l'agent perçoit : où est son curseur, ce qu'il y a dessous, l'état de l'écran et ce qu'il a déjà tapé
  function observe(e, task, p) {
    const h = e.hit(e.cx, e.cy);
    const under = h.kind === 'item' ? (h.name === p.file ? 'cible' : 'item') : h.kind === 'dock' ? 'd-' + h.app : h.kind === 'desk' ? 'desk' : h.kind + '-' + h.app;
    const ctx = [
      task.id, e.focus || '-',
      +e.open.includes('terminal'), +e.open.includes('fichiers'), +e.open.includes('editeur'),
      +(e.cwd === HOME),
      p.dir ? +e.isDir(HOME + '/' + p.dir) : '',
      p.dir ? +(e.cwd === HOME + '/' + p.dir) : '',
      p.file ? +e.fs.has(e.cwd + '/' + p.file) : '',
      p.file ? +(e.sel === p.file) : '',
      p.text ? +(e.ed.text === p.text) : '',
      +e.ed.saving, e.ed.nameBuf ? 1 : 0,
      e.buf.join(',')
    ].join('|');
    return { ctx, cx: e.cx, cy: e.cy, under };
  }

  // Son cerveau ne retient pas chaque case séparément : il combine plusieurs « intuitions »
  // (la situation seule, la colonne du curseur, sa ligne, la case exacte, ce qu'il voit dessous).
  // Ainsi, ce qu'il apprend à un endroit l'aide ailleurs.
  const bases = s => [s.ctx, s.ctx + '#x' + s.cx, s.ctx + '#y' + s.cy, s.ctx + '#' + s.cx + ',' + s.cy, s.ctx + '#u' + s.under];

  // Les objectifs longs (créer un fichier dans un dossier, écrire un texte) reviennent deux fois plus souvent
  const ORDER = [0, 1, 2, 3, 3, 4, 5, 5, 5, 6];

  class Brain {
    constructor() { this.w = new Map(); this.stats = {}; this.trained = 0; for (const t of TASKS) this.stats[t.id] = { tries: 0, wins: [], steps: [] }; }
    rows(s) {
      if (s._rows) return s._rows;
      return (s._rows = bases(s).map(k => { let r = this.w.get(k); if (!r) { r = new Float32Array(ACTIONS.length); this.w.set(k, r); } return r; }));
    }
    values(s) { const R = this.rows(s), v = new Float32Array(ACTIONS.length); for (const r of R) for (let i = 0; i < v.length; i++) v[i] += r[i]; return v; }
    best(s) { const v = this.values(s); let b = 0, n = 1; for (let i = 1; i < v.length; i++) { if (v[i] > v[b] + 1e-9) { b = i; n = 1; } else if (Math.abs(v[i] - v[b]) < 1e-9 && Math.random() < 1 / ++n) b = i; } return b; }
    maxq(s) { const v = this.values(s); let m = v[0]; for (let i = 1; i < v.length; i++) if (v[i] > m) m = v[i]; return m; }
    choose(s, eps) { return Math.random() < eps ? rnd(ACTIONS.length) : this.best(s); }
    learn(s, a, target, lr = 0.5) {
      const R = this.rows(s);
      let q = 0; for (const r of R) q += r[a];
      const d = (target - q) * lr / R.length;
      for (const r of R) r[a] += d;
    }
    // Il joue un essai entier, puis repasse le film à l'envers pour que la récompense remonte tout le chemin
    episode(task, eps, maxSteps = 60, update = true) {
      const e = new Env().reset(true), p = task.p, path = [];
      let s = observe(e, task, p), n = 0, ok = false;
      while (n < maxSteps) {
        const a = this.choose(s, eps);
        const useful = e.step(a, p);
        n++;
        ok = task.done(e, p);
        const s2 = observe(e, task, p);
        path.push([s, a, ok ? 1 : useful ? -0.01 : -0.04, s2, ok]);
        s = s2;
        if (ok) break;
      }
      if (update) for (let i = path.length - 1; i >= 0; i--) {
        const [s0, a, r, s1, end] = path[i];
        this.learn(s0, a, r + (end ? 0 : 0.97 * this.maxq(s1)));
      }
      return { ok, n };
    }
    train(count) {
      for (let k = 0; k < count; k++) {
        const task = TASKS[ORDER[this.trained % ORDER.length]], st = this.stats[task.id];
        const eps = Math.max(0.05, 1 - st.tries / 3000);
        const r = this.episode(task, eps);
        st.tries++; st.wins.push(r.ok); st.steps.push(r.n);
        if (st.wins.length > 50) { st.wins.shift(); st.steps.shift(); }
        this.trained++;
      }
    }
  }

  root.AgentLinux = { HOME, COLS, ROWS, KEYS, ACTIONS, LAYOUT, DOCK, Env, TASKS, observe, Brain, pick, rnd };
})(typeof window !== 'undefined' ? window : globalThis);
