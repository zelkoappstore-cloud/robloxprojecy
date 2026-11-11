// Monde et cerveau du petit agent Linux.
// Aucune action toute faite : une souris (bouger d'une case, cliquer) et un clavier de mots.
// Le terminal, les applications, le web, le mini-Python et le bac à sable sont simulés en JavaScript.
(function (root) {
  const HOME = '/home/agent';
  const COLS = 12, ROWS = 8;

  // ---------- Claviers ----------
  const CMD_WORDS = ['ls', 'pwd', 'mkdir', 'cd', 'cd ..', 'touch', 'cat', 'rm', 'cp', 'mv', 'grep', 'echo', 'chmod +x', 'python3', './', 'git init', 'git add .', 'git commit -m', 'sudo apt install', '‹paquet›'];
  const ARG_WORDS = ['‹dossier›', '‹fichier›', '‹texte›', '‹mot›', '‹paquet›', '>', 'Entrée', 'Effacer'];
  const TERM_KEYS = [...new Set([...CMD_WORDS, ...ARG_WORDS])];
  const CODE_KEYS = ['import tkinter as tk', 'fen = tk.Tk()', 'tk.Label(fen, text=‹texte›).pack()', 'tk.Button(fen, text="Quitter").pack()', 'fen.mainloop()', 'print(‹texte›)', 'for i in range(1, 6):', '    print(i)', '⌫ ligne'];
  const EDIT_KEYS = ['‹texte›', '‹fichier›', 'Entrée', 'Effacer'];
  const WEB_KEYS = ['‹site›', 'Entrée', 'Effacer'];
  const CALC_KEYS = ['‹nombre A›', '‹nombre B›', '+', '×', '=', 'C'];
  const KEYS = [...new Set([...TERM_KEYS, ...CODE_KEYS, ...EDIT_KEYS, ...WEB_KEYS, ...CALC_KEYS])];
  const ACTIONS = ['↑', '↓', '←', '→', 'clic', ...KEYS.map(k => 'touche ' + k)];

  // ---------- Disposition des fenêtres sur la grille 12 × 8 (colonnes x, lignes y, bornes incluses) ----------
  const LAYOUT = {
    terminal: { x0: 0, x1: 6, y0: 1, y1: 3, close: [6, 1] },
    fichiers: { x0: 7, x1: 11, y0: 1, y1: 4, close: [11, 1], up: [7, 2], bin: [11, 2], items: [[7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4]] },
    editeur: { x0: 1, x1: 6, y0: 4, y1: 6, close: [6, 4], save: [6, 6], paste: [5, 6] },
    code: { x0: 0, x1: 6, y0: 1, y1: 5, close: [6, 1], run: [5, 1], build: [4, 1], neu: [3, 1] },
    bac: { x0: 7, x1: 11, y0: 5, y1: 6, close: [11, 5] },
    navigateur: { x0: 0, x1: 8, y0: 1, y1: 6, close: [8, 1], back: [0, 2], addr: [3, 2], copy: [8, 2], rows: [3, 4, 5, 6] },
    calculatrice: { x0: 8, x1: 11, y0: 3, y1: 6, close: [11, 3] },
    jeu: { x0: 8, x1: 11, y0: 1, y1: 5, close: [11, 1], again: [11, 3], cells: [[8, 2], [9, 2], [10, 2], [8, 3], [9, 3], [10, 3], [8, 4], [9, 4], [10, 4]] },
    parametres: { x0: 3, x1: 8, y0: 2, y1: 5, close: [8, 2], theme: [4, 4], fond: [7, 4] }
  };
  const DOCK = { 1: 'terminal', 2: 'fichiers', 3: 'editeur', 4: 'code', 5: 'navigateur', 6: 'calculatrice', 7: 'jeu', 8: 'parametres', 9: 'corbeille' };
  const APPS = ['terminal', 'fichiers', 'editeur', 'code', 'navigateur', 'calculatrice', 'jeu', 'parametres'];
  const rnd = n => Math.random() * n | 0;
  const pick = a => a[rnd(a.length)];

  // ---------- Le petit web simulé ----------
  const SITES = {
    accueil: { title: 'Page d’accueil', items: [{ k: 'lien', label: 'meteo.local', to: 'meteo.local' }, { k: 'lien', label: 'annonces.local', to: 'annonces.local' }, { k: 'lien', label: 'docs.local', to: 'docs.local' }] },
    'meteo.local': { title: 'Météo', items: [{ k: 'info', text: 'Bruxelles : 14 °C, nuageux' }, { k: 'info', text: 'Demain : 17 °C, soleil' }] },
    'annonces.local': { title: 'Petites annonces', items: [{ k: 'lien', label: 'Vélo de course — 450 €', to: 'annonces.local/velo' }, { k: 'lien', label: 'Guitare — 120 €', to: 'annonces.local/guitare' }, { k: 'lien', label: 'Console — 210 €', to: 'annonces.local/console' }] },
    'annonces.local/velo': { title: 'Vélo de course', items: [{ k: 'info', text: 'Vélo de course : 450 €' }, { k: 'info', text: 'Vendeur : Léa, Ixelles' }] },
    'annonces.local/guitare': { title: 'Guitare', items: [{ k: 'info', text: 'Guitare : 120 €' }, { k: 'info', text: 'Vendeur : Sam, Uccle' }] },
    'annonces.local/console': { title: 'Console', items: [{ k: 'info', text: 'Console : 210 €' }, { k: 'info', text: 'Vendeur : Noé, Schaerbeek' }] },
    'docs.local': { title: 'Docs Python', items: [{ k: 'info', text: 'print() affiche un texte' }, { k: 'info', text: 'tkinter crée des fenêtres' }] }
  };
  const page = name => SITES[name] || { title: 'Page introuvable (404)', items: [] };

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
  function runStatus(r) {
    if (!r) return 'jamais';
    if (r.error) return r.etype;
    if (r.win && !r.win.shown) return 'fenetre-fermee';
    if (r.win) return 'fenetre' + (r.win.labels.length ? '+texte' : '') + (r.win.buttons ? '+bouton' : '') + (r.late ? '+apres' : '');
    return r.out.length ? 'sortie' + r.out.length : 'rien';
  }
  const BROKEN = ['fen = tk.Tk()', 'import tkinter as tk', 'tk.Label(fen, text=‹texte›).pack()', 'fen.mainloop()'];
  const LINES3 = (a, b, c) => [a, b, c].filter(Boolean);
  const WIN3 = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const winner = b => { for (const [a, c, d] of WIN3) if (b[a] !== '.' && b[a] === b[c] && b[a] === b[d]) return b[a]; return null; };

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
      this.br = { page: 'accueil', hist: [], addr: false, typed: null, sel: null };
      this.clip = null;
      this.calc = { a: null, op: null, b: null, display: '0' };
      this.game = { b: '.........', over: null };
      this.theme = 'sombre'; this.fond = 0;
      this.repos = new Map(); this.installed = new Set(); this.cow = false;
      if (random) {
        if (Math.random() < 0.5) this.fs.set(HOME + '/projets', { d: 1 });
        for (const app of APPS) if (Math.random() < 0.25) this.open.push(app);
        this.focus = this.open.length ? pick(this.open) : null;
        const r = Math.random();
        if (r < 0.2) this.cwd = HOME + '/Documents';
        else if (r < 0.45 && this.fs.has(HOME + '/projets')) this.cwd = HOME + '/projets';
        if (this.open.includes('editeur')) this.ed.text = pick(['', 'brouillon', 'bonjour']);
        // Départs variés : parfois des lignes de code, une commande, une page web ou un calcul déjà commencés
        if (this.open.includes('code') && Math.random() < 0.6) { const n = 1 + rnd(5); for (let i = 0; i < n; i++) this.code.push(pick(CODE_KEYS.slice(0, -1))); }
        // Une commande laissée à moitié tapée dans le terminal, même s'il n'est pas au premier plan
        if (Math.random() < 0.35) { this.buf = [pick(CMD_WORDS)]; const n = rnd(3); for (let i = 0; i < n; i++) this.buf.push(pick(ARG_WORDS.slice(0, 5))); }
        if (this.open.includes('navigateur') && Math.random() < 0.5) this.br.page = pick(Object.keys(SITES));
        if (Math.random() < 0.3) this.clip = pick(['Bruxelles : 14 °C, nuageux', 'Guitare : 120 €', 'brouillon']);
        if (Math.random() < 0.4) this.theme = 'clair';
        this.fond = rnd(3);
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
    // Ce qui se trouve sous une case, en tenant compte de la fenêtre au premier plan
    order() { return [...this.open].sort((a, b) => (a === this.focus) - (b === this.focus)).reverse(); }
    hit(x, y, order = this.order()) {
      if (y === 7 && DOCK[x]) return { kind: 'dock', app: DOCK[x] };
      const at = (c) => c && x === c[0] && y === c[1];
      for (const app of order) {
        const L = LAYOUT[app];
        if (x < L.x0 || x > L.x1 || y < L.y0 || y > L.y1) continue;
        if (at(L.close)) return { kind: 'close', app };
        if (app === 'fichiers') {
          if (at(L.up)) return { kind: 'up', app };
          if (at(L.bin)) return { kind: 'bin', app };
          const k = L.items.findIndex(c => at(c));
          if (k >= 0) { const name = this.list(this.fm)[k]; if (name) return { kind: 'item', app, name }; }
        }
        if (app === 'editeur') { if (at(L.save)) return { kind: 'save', app }; if (at(L.paste)) return { kind: 'paste', app }; }
        if (app === 'code') { if (at(L.run)) return { kind: 'run', app }; if (at(L.build)) return { kind: 'build', app }; if (at(L.neu)) return { kind: 'new', app }; }
        if (app === 'navigateur') {
          if (at(L.back)) return { kind: 'back', app };
          if (at(L.addr)) return { kind: 'addr', app };
          if (at(L.copy)) return { kind: 'copy', app };
          const i = L.rows.indexOf(y), it = page(this.br.page).items[i];
          if (x >= 1 && x <= 6 && it) return { kind: it.k, app, item: it, i };
        }
        if (app === 'jeu') {
          if (at(L.again)) return { kind: 'again', app };
          const k = L.cells.findIndex(c => at(c));
          if (k >= 0) return { kind: 'cell', app, k };
        }
        if (app === 'parametres') { if (at(L.theme)) return { kind: 'theme', app }; if (at(L.fond)) return { kind: 'fond', app }; }
        return { kind: 'win', app };
      }
      return { kind: 'desk' };
    }
    focusApp(app) {
      if (!this.open.includes(app)) {
        this.open.push(app);
        if (app === 'editeur') this.ed = { text: '', name: null, saving: false, nameBuf: null };
        if (app === 'navigateur') this.br = { page: 'accueil', hist: [], addr: false, typed: null, sel: null };
        if (app === 'calculatrice') this.calc = { a: null, op: null, b: null, display: '0' };
      }
      this.focus = app;
    }
    launch(prog, ptext, from) {
      const r = runProgram(prog, { text: ptext });
      r.from = from;
      this.ran = r;
      if (!this.open.includes('bac')) this.open.push('bac');
      return r;
    }
    go(to) { this.br.hist.push(this.br.page); this.br.page = to; this.br.sel = null; }
    exec(p) {
      const t = this.buf, w = t.map(k => ({ '‹dossier›': p.dir, '‹fichier›': p.file, '‹texte›': p.text, '‹mot›': p.word, '‹paquet›': p.pkg })[k] ?? (k.startsWith('‹') ? undefined : k));
      this.buf = [];
      const line = w.map(x => x ?? '?').join(' ').replace('./ ', './');
      this.say('$ ' + line);
      const fail = msg => { this.say(msg, 1); return false; };
      if (w.some(x => x == null)) return fail(`${line} : argument manquant`);
      const is = (...pattern) => t.length === pattern.length && pattern.every((k, i) => k === t[i] || (k === 'F' && t[i] === '‹fichier›') || (k === 'D' && t[i] === '‹dossier›'));
      const at = name => this.cwd + '/' + name;
      const repo = this.repos.get(this.cwd);
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
      // git : init, add, commit
      if (is('git init')) { if (repo) return fail('git: dépôt déjà initialisé'); this.repos.set(this.cwd, { staged: false, commits: 0 }); this.say(`Dépôt Git vide initialisé dans ${this.cwd.replace(HOME, '~')}/.git`); return true; }
      if (is('git add .')) { if (!repo) return fail("fatal: ce n'est pas un dépôt git"); repo.staged = true; return true; }
      if (is('git commit -m', '‹texte›')) {
        if (!repo) return fail("fatal: ce n'est pas un dépôt git");
        if (!repo.staged) return fail('rien à valider (utilisez « git add »)');
        repo.commits++; repo.staged = false; this.say(`[main ${(Math.random() * 1e7 | 0).toString(16)}] ${w[1]}`); return true;
      }
      // apt : installer un paquet, puis s'en servir
      if (is('sudo apt install', '‹paquet›')) { if (this.installed.has(w[1])) return fail(`${w[1]} est déjà installé`); this.installed.add(w[1]); this.say(`Installation de ${w[1]}… terminé.`); return true; }
      if (is('‹paquet›', '‹texte›')) {
        if (!this.installed.has(w[0])) return fail(`${w[0]} : commande introuvable (essayez sudo apt install ${w[0]})`);
        this.say(' ' + '_'.repeat(w[1].length + 2)); this.say(`< ${w[1]} >`); this.say(' ' + '-'.repeat(w[1].length + 2)); this.say('        \\   ^__^'); this.say('         \\  (oo)\\_______');
        this.cow = true; return true;
      }
      return fail(`${line || '(rien)'} : commande inconnue`);
    }
    // Un geste : bouger le curseur d'une case, cliquer, ou appuyer sur une touche. Renvoie false si le geste n'a servi à rien.
    step(ai, p) {
      const a = ACTIONS[ai];
      if (a === '↑') { if (this.cy === 0) return false; this.cy--; return true; }
      if (a === '↓') { if (this.cy === ROWS - 1) return false; this.cy++; return true; }
      if (a === '←') { if (this.cx === 0) return false; this.cx--; return true; }
      if (a === '→') { if (this.cx === COLS - 1) return false; this.cx++; return true; }
      if (a === 'clic') return this.click(p);
      return this.key(a.slice(7), p);
    }
    click(p) {
      const h = this.hit(this.cx, this.cy);
      if (h.kind === 'dock') { if (h.app === 'corbeille') return false; this.focusApp(h.app); return true; }
      if (h.kind === 'close') { this.open = this.open.filter(x => x !== h.app); if (this.focus === h.app) this.focus = this.open.filter(x => x !== 'bac').pop() || null; return true; }
      if (h.kind === 'desk') return false;
      if (h.kind === 'win') { if (h.app === 'bac' || this.focus === h.app) return false; this.focus = h.app; return true; }
      if (h.app !== 'bac') this.focus = h.app;
      switch (h.kind) {
        case 'item': this.sel = h.name; return true;
        case 'up': if (this.fm === HOME) return false; this.fm = this.fm.slice(0, this.fm.lastIndexOf('/')); this.sel = null; return true;
        case 'bin': {
          const path = this.fm + '/' + this.sel;
          if (!this.sel || !this.fs.has(path) || this.isDir(path)) return false;
          this.trash.push({ name: this.sel, c: this.fs.get(path).c }); this.fs.delete(path); this.sel = null; return true;
        }
        case 'save': if (!this.ed.text) return false; this.ed.saving = true; this.ed.nameBuf = null; return true;
        case 'paste': if (!this.clip || this.ed.saving) return false; this.ed.text = this.clip; return true;
        case 'new': if (!this.code.length) return false; this.code = []; this.run = null; return true;
        case 'run': if (!this.code.length) return false; this.run = this.launch(this.code, p.text, 'atelier'); return true;
        case 'build': {
          if (!this.code.length || !p.file) return false;
          const r = runProgram(this.code, p);
          r.from = 'build'; this.run = r;
          if (r.error) return false;
          this.fs.set(HOME + '/' + p.file, { c: '', prog: [...this.code], ptext: p.text, x: false });
          this.built = p.file;
          return true;
        }
        case 'addr': if (this.br.addr) return false; this.br.addr = true; this.br.typed = null; return true;
        case 'back': if (!this.br.hist.length) return false; this.br.page = this.br.hist.pop(); this.br.sel = null; return true;
        case 'lien': this.go(h.item.to); return true;
        case 'info': this.br.sel = h.item.text; return true;
        case 'copy': if (!this.br.sel) return false; this.clip = this.br.sel; return true;
        case 'cell': {
          const g = this.game;
          if (g.over || g.b[h.k] !== '.') return false;
          let b = g.b.slice(0, h.k) + 'X' + g.b.slice(h.k + 1);
          if (winner(b) === 'X') { g.b = b; g.over = 'gagné'; return true; }
          const free = [...b].map((c, i) => c === '.' ? i : -1).filter(i => i >= 0);
          if (!free.length) { g.b = b; g.over = 'nul'; return true; }
          const o = pick(free);
          b = b.slice(0, o) + 'O' + b.slice(o + 1);
          g.b = b;
          if (winner(b) === 'O') g.over = 'perdu';
          else if (!b.includes('.')) g.over = 'nul';
          return true;
        }
        case 'again': if (!this.game.over && this.game.b === '.........') return false; this.game = { b: '.........', over: null }; return true;
        case 'theme': this.theme = this.theme === 'sombre' ? 'clair' : 'sombre'; return true;
        case 'fond': this.fond = (this.fond + 1) % 3; return true;
      }
      return true;
    }
    key(key, p) {
      if (this.focus === 'code') {
        if (!CODE_KEYS.includes(key)) return false;
        if (key === '⌫ ligne') { if (!this.code.length) return false; this.code.pop(); this.run = null; return true; }
        if (this.code.length >= 6) return false;
        this.code.push(key); this.run = null; return true;
      }
      if (this.focus === 'terminal') {
        if (!TERM_KEYS.includes(key)) return false;
        if (key === 'Entrée') return this.buf.length ? this.exec(p) : false;
        if (key === 'Effacer') { const had = this.buf.length > 0; this.buf = []; return had; }
        if (this.buf.length >= 4) return false;
        const need = { '‹dossier›': p.dir, '‹fichier›': p.file, '‹texte›': p.text, '‹mot›': p.word, '‹paquet›': p.pkg };
        if (key in need && !need[key]) return false;
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
      if (this.focus === 'navigateur') {
        if (!this.br.addr) return false;
        if (key === '‹site›' && p.site) { this.br.typed = p.site; return true; }
        if (key === 'Entrée' && this.br.typed) { this.go(this.br.typed); this.br.addr = false; this.br.typed = null; return true; }
        if (key === 'Effacer') { this.br.addr = false; this.br.typed = null; return true; }
        return false;
      }
      if (this.focus === 'calculatrice') {
        const c = this.calc;
        if (key === 'C') { if (c.a == null) return false; this.calc = { a: null, op: null, b: null, display: '0' }; return true; }
        if (key === '‹nombre A›' || key === '‹nombre B›') {
          const v = key === '‹nombre A›' ? p.a : p.b;
          if (v == null) return false;
          if (c.op == null) { c.a = v; c.display = String(v); } else { c.b = v; c.display = String(v); }
          return true;
        }
        if (key === '+' || key === '×') { if (c.a == null) return false; c.op = key; return true; }
        if (key === '=') {
          if (c.a == null || c.op == null || c.b == null) return false;
          const r = c.op === '+' ? c.a + c.b : c.a * c.b;
          this.calc = { a: r, op: null, b: null, display: String(r) };
          return true;
        }
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
    { id: 'theme', cat: 'Bureau', label: 'Paramètres : changer de thème', p: {}, setup: e => { e.theme0 = e.theme; }, done: e => e.theme !== e.theme0 },
    { id: 'fond', cat: 'Bureau', label: 'Paramètres : changer le fond d’écran', p: {}, setup: e => { e.fond0 = e.fond; }, done: e => e.fond !== e.fond0 },
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
    { id: 'git', cat: 'Commandes', label: 'git : init, add et commit', p: { dir: 'projets', text: 'premier commit' },
      setup: e => { e.fs.set(HOME + '/projets', { d: 1 }); if (Math.random() < 0.5) e.cwd = HOME + '/projets'; if (Math.random() < 0.4) e.repos.set(HOME + '/projets', { staged: Math.random() < 0.5, commits: 0 }); },
      done: (e, p) => (e.repos.get(HOME + '/' + p.dir)?.commits || 0) > 0 },
    { id: 'apt', cat: 'Commandes', label: 'apt : installer puis utiliser cowsay', p: { pkg: 'cowsay', text: 'Meuh' }, setup: e => { if (Math.random() < 0.25) e.installed.add('cowsay'); }, done: e => e.cow },
    { id: 'web-open', cat: 'Web', label: 'Ouvrir un site dans le navigateur', p: { site: 'meteo.local' }, done: (e, p) => e.br.page === p.site },
    { id: 'web-link', cat: 'Web', label: 'Suivre un lien sur une page', p: { site: 'annonces.local', link: 'annonces.local/guitare' }, done: (e, p) => e.br.page === p.link },
    { id: 'web-copy', cat: 'Web', label: 'Copier une info d’une page', p: { site: 'meteo.local', info: 'Bruxelles : 14 °C, nuageux' }, done: (e, p) => e.clip === p.info },
    { id: 'paste', cat: 'Web', label: 'Coller dans l’éditeur et enregistrer', p: { file: 'meteo.txt', info: 'Bruxelles : 14 °C, nuageux' }, setup: (e, p) => { e.clip = p.info; }, done: (e, p) => fget(e, p.file)?.c === p.info },
    { id: 'calc', cat: 'Apps', label: 'Calculatrice : faire une addition', p: { a: 12, b: 30, op: '+' }, done: (e, p) => e.calc.display === String(p.a + p.b) && e.calc.op == null },
    { id: 'jeu', cat: 'Apps', label: 'Morpion : gagner une partie', p: {}, done: e => e.game.over === 'gagné' },
    { id: 'c-print', cat: 'Code', label: 'Programme qui affiche un texte', p: { text: 'Bonjour' }, done: (e, p) => e.run?.from === 'atelier' && !e.run.error && !e.run.win && e.run.out.join('|') === p.text },
    { id: 'c-count', cat: 'Code', label: 'Programme qui compte de 1 à 5', p: {}, done: e => e.run?.from === 'atelier' && !e.run.error && !e.run.win && e.run.out.join('') === '12345' },
    { id: 'c-tk', cat: 'Code', goal: 'fenetre+texte', label: 'Fenêtre tkinter avec un texte', p: { text: 'Salut !' }, done: (e, p) => e.run?.from === 'atelier' && !e.run.error && e.run.win?.shown && e.run.win.labels.includes(p.text) },
    { id: 'c-btn', cat: 'Code', label: 'Fenêtre tkinter avec un bouton', p: {}, done: e => e.run?.from === 'atelier' && !e.run.error && e.run.win?.shown && e.run.win.buttons > 0 },
    { id: 'c-fix', cat: 'Code', goal: 'fenetre+texte', label: 'Débogage : réparer un programme cassé', p: { text: 'Réparé !' },
      setup: (e, p) => { if (!e.open.includes('code')) e.open.push('code'); e.code = [...BROKEN]; e.run = runProgram(e.code, p); e.run.from = 'atelier'; },
      done: (e, p) => e.run?.from === 'atelier' && !e.run.error && e.run.win?.shown && e.run.win.labels.includes(p.text) },
    { id: 'c-exe', cat: 'Code', label: 'Construire un .exe avec fenêtre', p: { file: 'appli.exe', text: 'Mon appli' }, done: (e, p) => e.built === p.file && e.run?.win?.shown }
  ];

  // ---------- Perception : les objets visibles à l'écran ----------
  function elements(e, p) {
    const out = [];
    for (const [x, app] of Object.entries(DOCK)) if (app !== 'corbeille') out.push({ d: 'icône ' + app, x: +x, y: 7, kind: 'dock', app });
    for (const app of e.open) {
      const L = LAYOUT[app], add = (d, c, kind, extra) => out.push({ d, x: c[0], y: c[1], kind, app, ...extra });
      add('fermer ' + app, L.close, 'close');
      if (app !== 'bac') add('fenêtre ' + app, [L.close[0] - 1, L.y0 + 1], 'win');
      if (app === 'fichiers') {
        add('bouton Parent', L.up, 'up'); add('bouton Corbeille', L.bin, 'bin');
        e.list(e.fm).slice(0, L.items.length).forEach((name, k) => {
          if (name === p.file) add('fichier visé', L.items[k], 'item');
          else if (!out.some(o => o.d === 'autre fichier')) add('autre fichier', L.items[k], 'item');
        });
      }
      if (app === 'editeur') { add('bouton Enregistrer', L.save, 'save'); add('bouton Coller', L.paste, 'paste'); }
      if (app === 'code') { add('bouton Exécuter', L.run, 'run'); add('bouton Construire .exe', L.build, 'build'); add('bouton Nouveau', L.neu, 'new'); }
      if (app === 'navigateur') {
        add('barre d’adresse', L.addr, 'addr'); add('bouton Retour', L.back, 'back'); add('bouton Copier', L.copy, 'copy');
        page(e.br.page).items.slice(0, L.rows.length).forEach((it, i) => {
          const c = [2, L.rows[i]];
          if (it.k === 'lien') add(it.to === p.link || it.to === p.site ? 'lien visé' : 'lien ' + (i + 1), c, 'lien');
          else add(it.text === p.info ? 'info visée' : 'info ' + (i + 1), c, 'info');
        });
      }
      if (app === 'jeu') { add('bouton Rejouer', L.again, 'again'); if (!e.game.over) L.cells.forEach((c, k) => { if (e.game.b[k] === '.') add('case ' + (k + 1), c, 'cell'); }); }
      if (app === 'parametres') { add('bouton Thème', L.theme, 'theme'); add('bouton Fond d’écran', L.fond, 'fond'); }
    }
    // On ne garde que ce qui n'est pas caché par une autre fenêtre
    const order = e.order();
    return out.filter(o => { const h = e.hit(o.x, o.y, order); return h.kind === o.kind && h.app === o.app; });
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
  // Ce que la tête sait de la situation : seulement ce qui compte pour l'objectif en cours
  function headState(e, task, p) {
    const fl = p.file ? e.fs.get(e.cwd + '/' + p.file) : null;
    const repo = e.repos.get(e.cwd);
    const c = e.calc;
    const flags = [
      +(e.cwd === HOME),
      p.dir ? +e.isDir(HOME + '/' + p.dir) : '',
      p.dir ? +(e.cwd === HOME + '/' + p.dir) : '',
      p.file ? (fl ? (fl.x ? 'x' : '1') : '0') : '',
      task.id === 'trash' ? +(e.sel === p.file) + (e.fm === HOME ? 'h' : 'a') : '',
      task.id === 'write' || task.id === 'paste' ? +(e.ed.text === (p.text ?? p.info)) + '' + +e.ed.saving + (e.ed.nameBuf ? 1 : 0) + (e.clip === p.info ? 'c' : '') : '',
      task.id === 'exe' || task.id === 'py' ? (e.ran ? (e.ran.error ? 'err' : 'ok') : '-') : '',
      task.id === 'git' ? (repo ? 'r' + +repo.staged : '-') : '',
      task.id === 'apt' ? +e.installed.has(p.pkg) : '',
      task.cat === 'Web' && task.id !== 'paste' ? (e.br.page === p.site ? 's' : e.br.page === p.link ? 'l' : e.br.page === 'accueil' ? 'a' : 'x') + +e.br.addr + (e.br.typed ? 't' : '') + (e.br.sel === p.info ? 'v' : e.br.sel ? 'o' : '') + (e.clip === p.info ? 'c' : '') + (e.br.hist.length ? 'h' : '') : '',
      task.id === 'calc' ? `${c.a == null ? '-' : c.a === p.a ? 'A' : c.a === p.a + p.b ? 'R' : '?'}${c.op || '-'}${c.b == null ? '-' : c.b === p.b ? 'B' : '?'}` : '',
      task.id === 'jeu' ? e.game.b + (e.game.over || '') : '',
      task.id === 'theme' ? +(e.theme !== e.theme0) : '', task.id === 'fond' ? +(e.fond !== e.fond0) : ''
    ].join('');
    const typed = task.cat === 'Code' ? e.code.map(l => CODE_KEYS.indexOf(l)).join('.') + '|' + runStatus(e.run) : task.cat === 'Commandes' ? e.buf.join(',') : '';
    // Pour le code, il retient ce que l'objectif demande (fenêtre, texte, bouton, .exe…) plutôt que son nom :
    // réparer un programme ou écrire une fenêtre avec un texte, c'est le même savoir
    const id = task.cat === 'Code' ? 'code:' + (task.goal || task.id) : task.id;
    return id + '|' + (e.focus || '-') + '|' + flags + '|' + typed;
  }
  // Le clavier proposé dépend de ce qui est au premier plan, avec une autocomplétion comme dans un vrai terminal
  const ARGS_FOR = { mkdir: ['‹dossier›'], cd: ['‹dossier›'], touch: ['‹fichier›'], cat: ['‹fichier›'], rm: ['‹fichier›'], cp: ['‹fichier›', '‹dossier›'], mv: ['‹fichier›', '‹dossier›'], grep: ['‹mot›', '‹fichier›'], echo: ['‹texte›', '>', '‹fichier›'], 'chmod +x': ['‹fichier›'], python3: ['‹fichier›'], './': ['‹fichier›'], 'git commit -m': ['‹texte›'], 'sudo apt install': ['‹paquet›'], '‹paquet›': ['‹texte›'] };
  const argKeys = e => [...(ARGS_FOR[e.buf[0]] || []), 'Entrée', 'Effacer'];
  const keysFor = e => e.focus === 'terminal' ? (e.buf.length ? argKeys(e) : CMD_WORDS)
    : e.focus === 'editeur' ? EDIT_KEYS : e.focus === 'code' ? CODE_KEYS
    : e.focus === 'navigateur' ? (e.br.addr ? WEB_KEYS : []) : e.focus === 'calculatrice' ? CALC_KEYS : [];
  function choices(e, p) { return [...elements(e, p).map(o => ({ kind: 'viser', ...o })), ...keysFor(e).map(k => ({ kind: 'touche', d: k }))]; }
  // Applique une décision. En entraînement la main est supposée réussir (elle s'entraîne à part)
  function applyChoice(e, c, p) {
    if (c.kind === 'touche') return e.step(ACTIONS.indexOf('touche ' + c.d), p);
    e.cx = c.x; e.cy = c.y;
    return e.step(4, p);
  }

  // Les objectifs les plus longs reviennent plus souvent à l'entraînement
  const WEIGHT = { touch: 6, write: 2, exe: 3, cp: 3, mv: 3, grep: 3, echo: 4, py: 2, git: 7, apt: 4, 'web-open': 2, 'web-link': 3, 'web-copy': 4, paste: 3, calc: 3, jeu: 6, 'c-print': 2, 'c-count': 3, 'c-tk': 5, 'c-btn': 7, 'c-fix': 5, 'c-exe': 3 };
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
    learn(s, c, target, lr = 0.35) { const r = this.row(s), q = r.has(c.d) ? r.get(c.d) : target; r.set(c.d, q + lr * (target - q)); }
    // Il joue un essai entier, puis repasse le film à l'envers pour que la récompense remonte tout le chemin
    episode(task, eps, maxSteps = 25, update = true) {
      const e = new Env().reset(true), p = task.p, path = [];
      // Parfois, il garde son bureau tel qu'il l'a laissé (fenêtres, code, commande commencée)
      const c0 = this.carry;
      if (c0 && Math.random() < 0.4) {
        Object.assign(e, { open: [...c0.open], focus: c0.focus, code: [...c0.code], buf: [...c0.buf], run: c0.run, ran: c0.ran, cx: c0.cx, cy: c0.cy, ed: { ...c0.ed, saving: false, nameBuf: null }, br: { ...c0.br, hist: [...c0.br.hist], addr: false, typed: null }, theme: c0.theme, fond: c0.fond, clip: c0.clip });
        e.cwd = e.isDir(c0.cwd) ? c0.cwd : HOME;
      }
      if (task.setup) task.setup(e, p);
      let n = 0, ok = false, s = headState(e, task, p), C = choices(e, p);
      while (n < maxSteps) {
        const c = this.choose(s, C, eps);
        const useful = applyChoice(e, c, p);
        n++;
        ok = !!task.done(e, p);
        const s1 = headState(e, task, p), C1 = choices(e, p);
        path.push([s, c, ok ? 1 : useful ? -0.02 : -0.06, s1, C1, ok]);
        s = s1; C = C1;
        if (ok) break;
      }
      this.carry = e;
      if (update) for (let i = path.length - 1; i >= 0; i--) {
        const [s0, c, r, s1, C1, end] = path[i];
        this.learn(s0, c, r + (end ? 0 : 0.95 * this.maxq(s1, C1)));
      }
      return { ok, n };
    }
    // Programme d'entraînement adaptatif : il s'exerce surtout sur ce qu'il rate encore
    pickTask() {
      if (!this._w || this.trained % 500 === 0) {
        this._w = TASKS.map(t => {
          const st = this.stats[t.id], rate = st.wins.length < 20 ? 0 : st.wins.filter(Boolean).length / st.wins.length;
          return (WEIGHT[t.id] || 1) * (0.12 + (1 - rate));
        });
        this._tot = this._w.reduce((a, b) => a + b, 0);
      }
      let r = Math.random() * this._tot;
      for (let i = 0; i < TASKS.length; i++) { r -= this._w[i]; if (r <= 0) return TASKS[i]; }
      return TASKS[TASKS.length - 1];
    }
    train(count) {
      for (let k = 0; k < count; k++) {
        const task = this.pickTask(), st = this.stats[task.id];
        const r = this.episode(task, Math.max(0.03, 0.3 - st.tries / 6000));
        st.tries++; st.wins.push(r.ok); st.steps.push(r.n);
        if (st.wins.length > 60) { st.wins.shift(); st.steps.shift(); }
        this.trained++;
      }
    }
  }

  root.AgentLinux = { Hand, Head, elements, choices, applyChoice, headState, keysFor, MOVES, HOME, COLS, ROWS, KEYS, TERM_KEYS, CODE_KEYS, ACTIONS, LAYOUT, DOCK, APPS, SITES, page, Env, TASKS, pick, rnd, runProgram, runStatus, BROKEN, winner };
})(typeof window !== 'undefined' ? window : globalThis);
