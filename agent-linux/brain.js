// Monde et cerveau du petit agent Linux.
// Aucune action toute faite : une souris (bouger d'une case, cliquer) et un clavier de mots.
// Le terminal, l'éditeur, l'atelier de code et le bac à sable sont simulés en JavaScript.
(function (root) {
  const HOME = '/home/agent';
  const COLS = 12, ROWS = 8;
  const TERM_KEYS = ['ls', 'pwd', 'mkdir', 'cd', 'cd ..', 'touch', 'cat', 'rm', 'cp', 'mv', 'grep', 'echo', '>', 'chmod +x', 'python3', './', '‹dossier›', '‹fichier›', '‹texte›', '‹mot›', 'Entrée', 'Effacer'];
  const CODE_KEYS = ['import tkinter as tk', 'fen = tk.Tk()', 'tk.Label(fen, text=‹texte›).pack()', 'tk.Button(fen, text="Quitter").pack()', 'fen.mainloop()', 'print(‹texte›)', 'for i in range(1, 6):', '    print(i)', '⌫ ligne'];
  const KEYS = [...TERM_KEYS, ...CODE_KEYS];
  const ACTIONS = ['↑', '↓', '←', '→', 'clic', ...KEYS.map(k => 'touche ' + k)];
  const ARGS = ['‹dossier›', '‹fichier›', '‹texte›', '‹mot›'];

  const LAYOUT = {
    terminal: { x0: 0, x1: 6, y0: 1, y1: 3, close: [6, 1] },
    fichiers: { x0: 7, x1: 11, y0: 1, y1: 4, close: [11, 1], up: [7, 2], bin: [11, 2], items: [[7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4]] },
    editeur: { x0: 1, x1: 6, y0: 4, y1: 6, close: [6, 4], save: [6, 6] },
    code: { x0: 0, x1: 6, y0: 1, y1: 5, close: [6, 1], run: [5, 1], build: [4, 1], neu: [3, 1] },
    bac: { x0: 7, x1: 11, y0: 5, y1: 6, close: [11, 5] }
  };
  const DOCK = { 3: 'terminal', 4: 'fichiers', 5: 'editeur', 6: 'code', 7: 'corbeille' };
  const rnd = n => Math.random() * n | 0;
  const pick = a => a[rnd(a.length)];

  // ---------- Mini-Python : exécute les lignes que l'agent a écrites ----------
  function runProgram(lines, p) {
    const out = [], g = { tk: false, fen: null };
    for (let i = 0; i < lines.length; i++) {
      const L = lines[i];
      const err = (type, msg) => ({ out, error: `${type} (ligne ${i + 1}) : ${msg}`, etype: type, win: null });
      if (L === '    print(i)') return err('IndentationError', 'indentation inattendue');
      if (L === 'for i in range(1, 6):') {
        if (lines[i + 1] !== '    print(i)') return err('IndentationError', 'un bloc indenté était attendu');
        for (let k = 1; k <= 5; k++) out.push(String(k));
        i++;
        continue;
      }
      if (L === 'print(‹texte›)') { out.push(p.text ?? ''); continue; }
      if (L === 'import tkinter as tk') { g.tk = true; continue; }
      if (L === 'fen = tk.Tk()') { if (!g.tk) return err('NameError', "le nom 'tk' n'est pas défini"); g.fen = { labels: [], buttons: 0, shown: false }; continue; }
      if (L.startsWith('tk.Label') || L.startsWith('tk.Button')) {
        if (!g.tk) return err('NameError', "le nom 'tk' n'est pas défini");
        if (!g.fen) return err('NameError', "le nom 'fen' n'est pas défini");
        if (g.fen.shown) { g.late = true; continue; }
        if (L.startsWith('tk.Label')) g.fen.labels.push(p.text ?? ''); else g.fen.buttons++;
        continue;
      }
      if (L === 'fen.mainloop()') { if (!g.fen) return err('NameError', "le nom 'fen' n'est pas défini"); g.fen.shown = true; continue; }
    }
    return { out, error: null, etype: null, win: g.fen, late: !!g.late };
  }
  // Résumé d'une exécution, tel que l'agent le perçoit
  function runStatus(r) {
    if (!r) return 'jamais';
    if (r.error) return r.etype;
    if (r.win && !r.win.shown) return 'fenetre-fermee';
    if (r.win) return 'fenetre' + (r.win.labels.length ? '+texte' : '') + (r.win.buttons ? '+bouton' : '') + (r.late ? '+apres' : '');
    return r.out.length ? 'sortie' + r.out.length : 'rien';
  }

  class Env {
    reset(random = false) {
      this.fs = new Map([
        [HOME, { d: 1 }], [HOME + '/Documents', { d: 1 }], [HOME + '/Images', { d: 1 }],
        [HOME + '/notes.txt', { c: 'liste de courses : pain, pommes, café' }],
        [HOME + '/photo.png', { c: '(image)' }],
        [HOME + '/hello.py', { c: '', prog: ['print(‹texte›)'], ptext: 'Bonjour depuis hello.py' }],
        [HOME + '/Documents/recette.txt', { c: 'crêpes : farine, œufs, lait' }]
      ]);
      this.cwd = HOME; this.fm = HOME; this.open = []; this.focus = null; this.sel = null;
      this.ed = { text: '', name: null, saving: false, nameBuf: null };
      this.buf = []; this.term = []; this.lastCmd = null; this.read = null; this.grep = null; this.trash = [];
      this.code = []; this.run = null; this.ran = null; this.built = null; this.cx = 6; this.cy = 3;
      if (random) {
        if (Math.random() < 0.5) this.fs.set(HOME + '/projets', { d: 1 });
        for (const app of ['terminal', 'fichiers', 'editeur', 'code']) if (Math.random() < 0.28) this.open.push(app);
        this.focus = this.open.length ? pick(this.open) : null;
        const r = Math.random();
        if (r < 0.2) this.cwd = HOME + '/Documents';
        else if (r < 0.45 && this.fs.has(HOME + '/projets')) this.cwd = HOME + '/projets';
        if (this.open.includes('editeur')) this.ed.text = pick(['', 'brouillon', 'bonjour']);
        // Départs variés : parfois des lignes de code ou une commande déjà commencées, tirées au hasard (souvent fausses)
        if (this.open.includes('code') && Math.random() < 0.6) { const n = 1 + rnd(5); for (let i = 0; i < n; i++) this.code.push(pick(CODE_KEYS.slice(0, -1))); }
        if (this.focus === 'terminal' && Math.random() < 0.3) { this.buf.push(pick(CMD_WORDS)); if (Math.random() < 0.5) this.buf.push(pick(ARG_WORDS.slice(0, 4))); }
        this.cx = rnd(COLS); this.cy = rnd(ROWS);
      }
      return this;
    }
    isDir(p) { return this.fs.get(p)?.d === 1; }
    list(dir) {
      const pre = dir + '/';
      return [...this.fs.keys()].filter(k => k.startsWith(pre) && !k.slice(pre.length).includes('/')).map(k => k.slice(pre.length)).sort();
    }
    say(line, err) { this.term.push({ line, err }); if (this.term.length > 60) this.term.shift(); }
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
        if (app === 'code' && x === L.run[0] && y === L.run[1]) return { kind: 'run', app };
        if (app === 'code' && x === L.build[0] && y === L.build[1]) return { kind: 'build', app };
        if (app === 'code' && x === L.neu[0] && y === L.neu[1]) return { kind: 'new', app };
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
    // Lance un programme dans le bac à sable
    launch(prog, ptext, from) {
      const r = runProgram(prog, { text: ptext });
      r.from = from;
      this.ran = r;
      if (!this.open.includes('bac')) this.open.push('bac');
      return r;
    }
    exec(p) {
      const t = this.buf, w = t.map(k => k === '‹dossier›' ? p.dir : k === '‹fichier›' ? p.file : k === '‹texte›' ? p.text : k === '‹mot›' ? p.word : k);
      this.buf = [];
      const line = w.map(x => x ?? '?').join(' ').replace('./ ', './');
      this.say('$ ' + line);
      const fail = msg => { this.say(msg, 1); return false; };
      if (w.some(x => x == null)) return fail(`${line} : argument manquant`);
      const is = (...pattern) => t.length === pattern.length && pattern.every((k, i) => k === t[i] || (k === 'F' && t[i] === '‹fichier›') || (k === 'D' && t[i] === '‹dossier›'));
      const at = name => this.cwd + '/' + name;
      if (is('ls')) { this.say(this.list(this.cwd).join('  ') || '(vide)'); this.lastCmd = 'ls:' + this.cwd; return true; }
      if (is('pwd')) { this.say(this.cwd); return true; }
      if (is('cd ..')) { if (this.cwd !== HOME) this.cwd = this.cwd.slice(0, this.cwd.lastIndexOf('/')); return true; }
      if (is('mkdir', 'D')) { const path = at(w[1]); if (this.fs.has(path)) return fail(`mkdir: « ${w[1]} » existe déjà`); this.fs.set(path, { d: 1 }); return true; }
      if (is('cd', 'D')) { if (this.isDir(at(w[1]))) { this.cwd = at(w[1]); return true; } return fail(`cd: ${w[1]}: aucun dossier de ce nom`); }
      if (is('touch', 'F')) { if (!this.fs.has(at(w[1]))) this.fs.set(at(w[1]), { c: '' }); return true; }
      if (is('cat', 'F')) { const f = this.fs.get(at(w[1])); if (f && !f.d) { this.say(f.prog ? f.prog.join('\n') : (f.c || '(vide)')); this.read = at(w[1]); return true; } return fail(`cat: ${w[1]}: introuvable`); }
      if (is('rm', 'F')) { if (this.fs.has(at(w[1])) && !this.isDir(at(w[1]))) { this.fs.delete(at(w[1])); return true; } return fail(`rm: ${w[1]}: introuvable`); }
      if (is('cp', 'F', 'D') || is('mv', 'F', 'D')) {
        const src = at(w[1]), dst = at(w[2]);
        if (!this.fs.has(src) || this.isDir(src)) return fail(`${w[0]}: ${w[1]}: introuvable`);
        if (!this.isDir(dst)) return fail(`${w[0]}: ${w[2]}: aucun dossier de ce nom`);
        this.fs.set(dst + '/' + w[1], { ...this.fs.get(src) });
        if (w[0] === 'mv') this.fs.delete(src);
        return true;
      }
      if (is('grep', '‹mot›', 'F')) {
        const f = this.fs.get(at(w[2]));
        if (!f || f.d) return fail(`grep: ${w[2]}: introuvable`);
        const hits = (f.prog ? f.prog.join('\n') : f.c).split('\n').filter(l => l.includes(w[1]));
        hits.forEach(h => this.say(h));
        if (hits.length) this.grep = at(w[2]) + '#' + w[1];
        return true;
      }
      if (is('echo', '‹texte›', '>', 'F')) { this.fs.set(at(w[3]), { c: w[1] }); return true; }
      if (is('chmod +x', 'F')) { const f = this.fs.get(at(w[1])); if (!f || f.d) return fail(`chmod: ${w[1]}: introuvable`); f.x = true; return true; }
      if (is('python3', 'F') || is('./', 'F')) {
        const f = this.fs.get(at(w[1]));
        if (!f || f.d) return fail(`${line}: fichier introuvable`);
        if (w[0] === './' && !f.x) return fail(`bash: ${line}: Permission refusée`);
        if (w[0] === 'python3' && !w[1].endsWith('.py')) return fail(`python3: ${w[1]} n'est pas un script Python`);
        if (!f.prog) return fail(`${line}: ce n'est pas un programme`);
        const r = this.launch(f.prog, f.ptext, w[1]);
        r.out.forEach(o => this.say(o));
        if (r.error) this.say(r.error, 1);
        return !r.error;
      }
      return fail(`${line || '(rien)'} : commande inconnue`);
    }
    step(ai, p) {
      const a = ACTIONS[ai];
      if (a === '↑') { if (this.cy === 0) return false; this.cy--; return true; }
      if (a === '↓') { if (this.cy === ROWS - 1) return false; this.cy++; return true; }
      if (a === '←') { if (this.cx === 0) return false; this.cx--; return true; }
      if (a === '→') { if (this.cx === COLS - 1) return false; this.cx++; return true; }
      if (a === 'clic') {
        const h = this.hit(this.cx, this.cy);
        if (h.kind === 'dock') { if (h.app === 'corbeille') return false; this.focusApp(h.app); return true; }
        if (h.kind === 'close') { this.open = this.open.filter(x => x !== h.app); if (this.focus === h.app) this.focus = this.open.filter(x => x !== 'bac').pop() || null; return true; }
        if (h.kind === 'desk') return false;
        if (h.kind === 'win') { if (h.app === 'bac' || this.focus === h.app) return false; this.focus = h.app; return true; }
        if (h.app !== 'bac') this.focus = h.app;
        if (h.kind === 'item') { this.sel = h.name; return true; }
        if (h.kind === 'up') { if (this.fm === HOME) return false; this.fm = this.fm.slice(0, this.fm.lastIndexOf('/')); this.sel = null; return true; }
        if (h.kind === 'bin') {
          const path = this.fm + '/' + this.sel;
          if (!this.sel || !this.fs.has(path) || this.isDir(path)) return false;
          this.trash.push({ name: this.sel, c: this.fs.get(path).c }); this.fs.delete(path); this.sel = null; return true;
        }
        if (h.kind === 'save') { if (!this.ed.text) return false; this.ed.saving = true; this.ed.nameBuf = null; return true; }
        if (h.kind === 'new') { if (!this.code.length) return false; this.code = []; this.run = null; return true; }
        if (h.kind === 'run') { if (!this.code.length) return false; this.run = this.launch(this.code, p.text, 'atelier'); return true; }
        if (h.kind === 'build') {
          if (!this.code.length || !p.file) return false;
          const r = runProgram(this.code, p);
          r.from = 'build';
          this.run = r;
          if (r.error) return false;
          this.fs.set(HOME + '/' + p.file, { c: '', prog: [...this.code], ptext: p.text, x: false });
          this.built = p.file;
          return true;
        }
        return true;
      }
      const key = a.slice(7);
      const isCode = CODE_KEYS.includes(key);
      if (this.focus === 'code') {
        if (!isCode) return false;
        if (key === '⌫ ligne') { if (!this.code.length) return false; this.code.pop(); this.run = null; return true; }
        if (this.code.length >= 6) return false;
        this.code.push(key); this.run = null; return true;
      }
      if (isCode) return false;
      if (this.focus === 'terminal') {
        if (key === 'Entrée') return this.buf.length ? this.exec(p) : false;
        if (key === 'Effacer') { const had = this.buf.length > 0; this.buf = []; return had; }
        if (this.buf.length >= 4) return false;
        if (key === '‹dossier›' && !p.dir) return false;
        if (key === '‹fichier›' && !p.file) return false;
        if (key === '‹texte›' && !p.text) return false;
        if (key === '‹mot›' && !p.word) return false;
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

  const fget = (e, path) => e.fs.get(HOME + '/' + path);
  const TASKS = [
    { id: 'term', cat: 'Bureau', label: 'Ouvrir le terminal', p: {}, done: e => e.focus === 'terminal' },
    { id: 'write', cat: 'Bureau', label: 'Écrire et enregistrer un texte', p: { file: 'lettre.txt', text: 'bonjour' }, done: (e, p) => fget(e, p.file)?.c === p.text },
    { id: 'trash', cat: 'Bureau', label: 'Mettre un fichier à la corbeille', p: { file: 'photo.png' }, done: (e, p) => !fget(e, p.file) },
    { id: 'ls', cat: 'Commandes', label: 'ls : lister le dossier', p: {}, done: e => e.lastCmd === 'ls:' + HOME },
    { id: 'mkdir', cat: 'Commandes', label: 'mkdir : créer un dossier', p: { dir: 'projets' }, done: (e, p) => e.isDir(HOME + '/' + p.dir) },
    { id: 'touch', cat: 'Commandes', label: 'cd + touch : fichier dans un dossier', p: { dir: 'projets', file: 'idee.txt' }, done: (e, p) => { const x = fget(e, p.dir + '/' + p.file); return !!x && !x.d; } },
    { id: 'cat', cat: 'Commandes', label: 'cat : lire un fichier', p: { file: 'notes.txt' }, done: (e, p) => e.read === HOME + '/' + p.file },
    { id: 'cp', cat: 'Commandes', label: 'cp : copier dans un dossier', p: { file: 'notes.txt', dir: 'Documents' }, done: (e, p) => { const a = fget(e, p.dir + '/' + p.file), b = fget(e, p.file); return !!a && !!b && a.c === b.c && String(a.prog) === String(b.prog); } },
    { id: 'mv', cat: 'Commandes', label: 'mv : déplacer dans un dossier', p: { file: 'photo.png', dir: 'Images' }, done: (e, p) => !!fget(e, p.dir + '/' + p.file) && !fget(e, p.file) },
    { id: 'grep', cat: 'Commandes', label: 'grep : chercher un mot', p: { file: 'notes.txt', word: 'pain' }, done: (e, p) => e.grep === `${HOME}/${p.file}#${p.word}` },
    { id: 'echo', cat: 'Commandes', label: 'echo > : écrire dans un fichier', p: { file: 'todo.txt', text: 'coder' }, done: (e, p) => fget(e, p.file)?.c === p.text },
    { id: 'py', cat: 'Commandes', label: 'python3 : lancer un script', p: { file: 'hello.py' }, done: (e, p) => e.ran?.from === p.file && !e.ran.error },
    { id: 'exe', cat: 'Commandes', label: 'chmod +x puis ./ : lancer un .exe', p: { file: 'app.exe' },
      setup: e => e.fs.set(HOME + '/app.exe', { c: '', prog: ['import tkinter as tk', 'fen = tk.Tk()', 'tk.Label(fen, text=‹texte›).pack()', 'fen.mainloop()'], ptext: 'Mon appli', x: Math.random() < 0.3 }),
      done: (e, p) => e.ran?.from === p.file && !e.ran.error },
    { id: 'c-print', cat: 'Code', label: 'Programme qui affiche un texte', p: { text: 'Bonjour' }, done: (e, p) => e.run?.from === 'atelier' && !e.run.error && !e.run.win && e.run.out.join('|') === p.text },
    { id: 'c-count', cat: 'Code', label: 'Programme qui compte de 1 à 5', p: {}, done: e => e.run?.from === 'atelier' && !e.run.error && !e.run.win && e.run.out.join('') === '12345' },
    { id: 'c-tk', cat: 'Code', label: 'Fenêtre tkinter avec un texte', p: { text: 'Salut !' }, done: (e, p) => e.run?.from === 'atelier' && !e.run.error && e.run.win?.shown && e.run.win.labels.includes(p.text) },
    { id: 'c-btn', cat: 'Code', label: 'Fenêtre tkinter avec un bouton', p: {}, done: e => e.run?.from === 'atelier' && !e.run.error && e.run.win?.shown && e.run.win.buttons > 0 },
    { id: 'c-exe', cat: 'Code', label: 'Construire un .exe avec fenêtre', p: { file: 'appli.exe', text: 'Mon appli' }, done: (e, p) => e.built === p.file && e.run?.win?.shown }
  ];

  // ---------- Perception : les objets visibles à l'écran ----------
  function elements(e, p) {
    const out = [];
    for (const [x, app] of Object.entries(DOCK)) if (app !== 'corbeille') out.push({ d: 'icône ' + app, x: +x, y: 7 });
    for (const app of e.open) {
      const L = LAYOUT[app];
      out.push({ d: 'fermer ' + app, x: L.close[0], y: L.close[1] });
      if (app !== 'bac') out.push({ d: 'fenêtre ' + app, x: L.close[0] - 1, y: L.y0 + 1 });
      if (app === 'fichiers') {
        out.push({ d: 'bouton Parent', x: L.up[0], y: L.up[1] }, { d: 'bouton Corbeille', x: L.bin[0], y: L.bin[1] });
        e.list(e.fm).slice(0, L.items.length).forEach((name, k) => {
          if (name === p.file) out.push({ d: 'fichier visé', x: L.items[k][0], y: L.items[k][1] });
          else if (!out.some(o => o.d === 'autre fichier')) out.push({ d: 'autre fichier', x: L.items[k][0], y: L.items[k][1] });
        });
      }
      if (app === 'editeur') out.push({ d: 'bouton Enregistrer', x: L.save[0], y: L.save[1] });
      if (app === 'code') out.push({ d: 'bouton Exécuter', x: L.run[0], y: L.run[1] }, { d: 'bouton Construire .exe', x: L.build[0], y: L.build[1] }, { d: 'bouton Nouveau', x: L.neu[0], y: L.neu[1] });
    }
    // On ne garde que ce qui n'est pas caché par une autre fenêtre
    return out.filter(o => { const h = e.hit(o.x, o.y); return o.d.startsWith('icône') || (h.app && o.d.endsWith(h.app)) || h.kind === 'item' || ['up', 'bin', 'save', 'run', 'build', 'new'].includes(h.kind); });
  }

  // ---------- La main : amener le curseur sur un objet et cliquer ----------
  const MOVES = ['↑', '↓', '←', '→', 'clic'];
  class Hand {
    constructor() { this.Q = new Map(); this.trained = 0; this.wins = []; }
    key(e, t) { const c = v => Math.max(-4, Math.min(4, v)); return c(t.x - e.cx) + ',' + c(t.y - e.cy); }
    row(k) { let r = this.Q.get(k); if (!r) { r = new Float32Array(5); this.Q.set(k, r); } return r; }
    pick(e, t, eps) { const r = this.row(this.key(e, t)); if (Math.random() < eps) return rnd(5); let b = 0; for (let i = 1; i < 5; i++) if (r[i] > r[b] || (r[i] === r[b] && Math.random() < 0.3)) b = i; return b; }
    train(count) {
      for (let n = 0; n < count; n++) {
        const e = { cx: rnd(COLS), cy: rnd(ROWS) }, t = { x: rnd(COLS), y: rnd(ROWS) };
        const eps = Math.max(0.05, 1 - this.trained / 3000);
        let ok = false;
        for (let k = 0; k < 40 && !ok; k++) {
          const s = this.key(e, t), a = this.pick(e, t, eps);
          let r = -0.01;
          if (a === 0) e.cy = Math.max(0, e.cy - 1); if (a === 1) e.cy = Math.min(ROWS - 1, e.cy + 1);
          if (a === 2) e.cx = Math.max(0, e.cx - 1); if (a === 3) e.cx = Math.min(COLS - 1, e.cx + 1);
          if (a === 4) { if (e.cx === t.x && e.cy === t.y) { r = 1; ok = true; } else r = -0.05; }
          const row = this.row(s), nx = ok ? 0 : Math.max(...this.row(this.key(e, t)));
          row[a] += 0.5 * (r + 0.95 * nx - row[a]);
        }
        this.trained++; this.wins.push(ok); if (this.wins.length > 100) this.wins.shift();
      }
    }
    rate() { return this.wins.length ? this.wins.filter(Boolean).length / this.wins.length : 0; }
  }

  // ---------- La tête : décider quoi viser ou quoi taper ----------
  // Ce que la tête sait de la situation
  function headState(e, task, p) {
    const fl = p.file ? e.fs.get(e.cwd + '/' + p.file) : null;
    const flags = [
      +(e.cwd === HOME),
      p.dir ? +e.isDir(HOME + '/' + p.dir) : '',
      p.dir ? +(e.cwd === HOME + '/' + p.dir) : '',
      p.file ? (fl ? (fl.x ? 'x' : '1') : '0') : '',
      task.id === 'trash' ? +(e.sel === p.file) + (e.fm === HOME ? 'h' : 'a') : '',
      task.id === 'write' ? +(e.ed.text === p.text) + '' + +e.ed.saving + (e.ed.nameBuf ? 1 : 0) : '',
      task.id === 'exe' || task.id === 'py' ? (e.ran ? (e.ran.error ? 'err' : 'ok') : '-') : ''
    ].join('');
    // Il ne regarde que ce qui compte pour l'objectif : le programme pour du code, la ligne de commande pour le terminal
    const typed = task.cat === 'Code' ? e.code.map(l => CODE_KEYS.indexOf(l)).join('.') + '|' + runStatus(e.run) : task.cat === 'Commandes' ? e.buf.join(',') : '';
    return task.id + '|' + (e.focus || '-') + '|' + flags + '|' + typed;
  }
  // Le clavier proposé dépend de ce qui est au premier plan, avec une autocomplétion comme dans un vrai terminal :
  // ligne vide -> les commandes ; commande commencée -> les arguments, > , Entrée et Effacer
  const CMD_WORDS = TERM_KEYS.filter(k => !['‹dossier›', '‹fichier›', '‹texte›', '‹mot›', '>', 'Entrée', 'Effacer'].includes(k));
  const ARG_WORDS = ['‹dossier›', '‹fichier›', '‹texte›', '‹mot›', '>', 'Entrée', 'Effacer'];
  const keysFor = e => e.focus === 'terminal' ? (e.buf.length ? ARG_WORDS : CMD_WORDS) : e.focus === 'editeur' ? ['‹texte›', '‹fichier›', 'Entrée', 'Effacer'] : e.focus === 'code' ? CODE_KEYS : [];
  function choices(e, p) { return [...elements(e, p).map(o => ({ kind: 'viser', ...o })), ...keysFor(e).map(k => ({ kind: 'touche', d: k }))]; }
  // Applique une décision. En entraînement la main est supposée réussir (elle s'entraîne à part)
  function applyChoice(e, c, p) {
    if (c.kind === 'touche') return e.step(ACTIONS.indexOf('touche ' + c.d), p);
    e.cx = c.x; e.cy = c.y;
    return e.step(4, p);
  }

  // Les objectifs les plus longs reviennent plus souvent à l'entraînement
  const WEIGHT = { touch: 6, write: 2, exe: 3, cp: 3, mv: 3, grep: 3, echo: 4, py: 2, 'c-print': 2, 'c-count': 3, 'c-tk': 5, 'c-btn': 7, 'c-exe': 3 };
  const ORDER = TASKS.flatMap((t, i) => Array(WEIGHT[t.id] || 1).fill(i));

  class Head {
    constructor() { this.Q = new Map(); this.stats = {}; this.trained = 0; this.carry = null; for (const t of TASKS) this.stats[t.id] = { tries: 0, wins: [], steps: [] }; }
    row(s) { let r = this.Q.get(s); if (!r) { r = new Map(); this.Q.set(s, r); } return r; }
    // Optimisme : une décision jamais essayée paraît prometteuse, il a envie de la tester
    q(s, c, opt = true) { const v = this.row(s).get(c.d); return v === undefined ? (opt ? 0.3 : 0) : v; }
    best(s, C, opt = true) { let b = C[0], vb = this.q(s, b, opt), n = 1; for (const c of C.slice(1)) { const v = this.q(s, c, opt); if (v > vb + 1e-9) { b = c; vb = v; n = 1; } else if (Math.abs(v - vb) < 1e-9 && Math.random() < 1 / ++n) b = c; } return b; }
    maxq(s, C, opt = true) { let m = -Infinity; for (const c of C) m = Math.max(m, this.q(s, c, opt)); return C.length ? m : 0; }
    // En entraînement il est optimiste (il veut tout essayer) ; seul, il s'en tient à ce qu'il sait
    choose(s, C, eps, opt = true) { return Math.random() < eps ? pick(C) : this.best(s, C, opt); }
    learn(s, c, target, lr = 0.5) { const r = this.row(s), q = r.has(c.d) ? r.get(c.d) : target; r.set(c.d, q + lr * (target - q)); }
    episode(task, eps, maxSteps = 25, update = true) {
      const e = new Env().reset(true), p = task.p, path = [];
      if (task.setup) task.setup(e);
      // Parfois, il garde son bureau tel qu'il l'a laissé (fenêtres, code, commande commencée)
      const c0 = this.carry;
      if (c0 && Math.random() < 0.4) {
        Object.assign(e, { open: [...c0.open], focus: c0.focus, code: [...c0.code], buf: [...c0.buf], run: c0.run, ran: c0.ran, cx: c0.cx, cy: c0.cy, ed: { ...c0.ed, saving: false, nameBuf: null } });
        if (!e.isDir(c0.cwd)) e.cwd = HOME; else e.cwd = c0.cwd;
      }
      let n = 0, ok = false;
      while (n < maxSteps) {
        const s = headState(e, task, p), C = choices(e, p), c = this.choose(s, C, eps);
        const useful = applyChoice(e, c, p);
        n++;
        ok = !!task.done(e, p);
        const s1 = headState(e, task, p);
        path.push([s, c, (ok ? 1 : useful ? -0.02 : -0.06) , s1, choices(e, p), ok]);
        if (ok) break;
      }
      this.carry = e;
      if (update) for (let i = path.length - 1; i >= 0; i--) {
        const [s0, c, r, s1, C1, end] = path[i];
        this.learn(s0, c, r + (end ? 0 : 0.95 * this.maxq(s1, C1)));
      }
      return { ok, n };
    }
    train(count) {
      for (let k = 0; k < count; k++) {
        const task = TASKS[pick(ORDER)], st = this.stats[task.id];
        const r = this.episode(task, Math.max(0.03, 0.3 - st.tries / 6000));
        st.tries++; st.wins.push(r.ok); st.steps.push(r.n);
        if (st.wins.length > 60) { st.wins.shift(); st.steps.shift(); }
        this.trained++;
      }
    }
  }

  root.AgentLinux = { Hand, Head, elements, choices, applyChoice, headState, keysFor, MOVES, HOME, COLS, ROWS, KEYS, TERM_KEYS, CODE_KEYS, ACTIONS, LAYOUT, DOCK, Env, TASKS, pick, rnd, runProgram, runStatus };
})(typeof window !== 'undefined' ? window : globalThis);
