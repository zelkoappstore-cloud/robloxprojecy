// Choix des objectifs quand l'agent est lâché tout seul (commun à la page 2D et au poste 3D).
// Sa curiosité préfère ce qu'il a fait le moins souvent, parmi ce qui a du sens sur son bureau à ce moment-là.
(function (root) {
  const A = root.AgentLinux;
  const { HOME, pick, rnd, TASKS } = A;
  const T = Object.fromEntries(TASKS.map(t => [t.id, t]));
  const DIRS = ['musique', 'jeux', 'secret', 'idees', 'robots'];
  const FILES = ['memo.txt', 'plan.txt', 'todo.txt', 'reve.txt', 'journal.txt', 'meteo.txt', 'prix.txt'];
  const EXES = ['robot.exe', 'bonjour.exe', 'outil.exe', 'jeu.exe'];
  const SAY = ['Bonjour le monde', 'Je sais coder !', 'Salut, humain', 'Vive Linux'];
  const INFOS = [['meteo.local', 'Bruxelles : 14 °C, nuageux'], ['meteo.local', 'Demain : 17 °C, soleil'], ['annonces.local/velo', 'Vélo de course : 450 €'], ['annonces.local/guitare', 'Guitare : 120 €'], ['annonces.local/console', 'Console : 210 €']];
  const ADS = [['annonces.local/velo', 'le vélo'], ['annonces.local/guitare', 'la guitare'], ['annonces.local/console', 'la console']];

  function newMemory() { return { read: new Set(), dirs: new Set(), launched: new Set(), commits: new Set(), count: {} }; }

  function chooseGoal(e, mem) {
    const home = e.list(HOME);
    const isFile = n => !e.isDir(HOME + '/' + n);
    const txt = home.filter(n => n.endsWith('.txt') && !mem.read.has(n));
    const newDir = DIRS.filter(d => !home.includes(d));
    const newFile = FILES.filter(f => !home.includes(f));
    const myDirs = [...mem.dirs].filter(d => e.isDir(HOME + '/' + d));
    const exes = home.filter(n => n.endsWith('.exe') && !mem.launched.has(n));
    const c = [{ t: 'ls', p: {}, why: 'Je regarde ce qu’il y a dans mon dossier.' }];
    // Terminal
    if (txt.length) { const f = pick(txt); c.push({ t: 'cat', p: { file: f }, why: `Je lis ${f}.` }); }
    const readable = home.filter(n => n.endsWith('.txt') && e.fs.get(HOME + '/' + n).c);
    if (readable.length) { const f = pick(readable), w = pick(e.fs.get(HOME + '/' + f).c.split(/[^\p{L}]+/u).filter(x => x.length > 3)); if (w) c.push({ t: 'grep', p: { file: f, word: w }, why: `Je cherche « ${w} » dans ${f}.` }); }
    if (newDir.length) { const d = pick(newDir); c.push({ t: 'mkdir', p: { dir: d }, why: `Je crée un dossier « ${d} ».` }); }
    if (myDirs.length && newFile.length) { const d = pick(myDirs), f = pick(newFile); c.push({ t: 'touch', p: { dir: d, file: f }, why: `Je range un fichier ${f} dans ${d}.` }); }
    if (newFile.length) { const f = pick(newFile); c.push({ t: 'echo', p: { file: f, text: pick(['coder', 'apprendre', 'dormir']) }, why: `J’écris une note dans ${f}.` }); }
    const loose = home.filter(n => isFile(n) && (n.endsWith('.png') || n.endsWith('.txt')));
    if (loose.length && myDirs.length) { const f = pick(loose), d = pick(myDirs); c.push({ t: pick(['cp', 'mv']), p: { file: f, dir: d }, why: `Je range ${f} dans ${d}.` }); }
    if (home.includes('hello.py') && !mem.launched.has('hello.py')) c.push({ t: 'py', p: { file: 'hello.py' }, why: 'Je lance le script hello.py.' });
    const repoDirs = myDirs.filter(d => !mem.commits.has(d));
    if (repoDirs.length) { const d = pick(repoDirs); c.push({ t: 'git', p: { dir: d, text: pick(['premier commit', 'sauvegarde', 'version 1']) }, why: `Je mets le dossier ${d} sous Git.` }); }
    c.push({ t: 'apt', p: { pkg: 'cowsay', text: pick(['Meuh', 'Bonjour', 'Vive Linux']) }, why: e.installed.has('cowsay') ? 'Je fais parler la vache avec cowsay.' : 'J’installe cowsay pour faire parler une vache.' });
    // Web et presse-papiers
    const site = pick(['meteo.local', 'annonces.local', 'docs.local']);
    c.push({ t: 'web-open', p: { site }, why: `J’ouvre le site ${site}.` });
    const [ad, adName] = pick(ADS);
    c.push({ t: 'web-link', p: { site: 'annonces.local', link: ad }, why: `Je regarde l’annonce pour ${adName}.` });
    const [isite, info] = pick(INFOS);
    c.push({ t: 'web-copy', p: { site: isite, info }, why: `Je copie « ${info} ».` });
    const pasteFile = newFile.filter(f => f === 'meteo.txt' || f === 'prix.txt');
    if (e.clip && (pasteFile.length || newFile.length)) { const f = pick(pasteFile.length ? pasteFile : newFile); c.push({ t: 'paste', p: { file: f, info: e.clip }, why: `Je colle « ${e.clip} » dans ${f}.`, boost: 0.6 }); }
    // Applications
    const a = 1 + rnd(60), b = 1 + rnd(60);
    c.push({ t: 'calc', p: { a, b, op: '+' }, why: `Je calcule ${a} + ${b} avec la calculatrice.` });
    c.push({ t: 'jeu', p: {}, why: 'Je fais une partie de morpion.' });
    c.push({ t: 'theme', p: {}, why: `Je passe le bureau en thème ${e.theme === 'sombre' ? 'clair' : 'sombre'}.` });
    c.push({ t: 'fond', p: {}, why: 'Je change de fond d’écran.' });
    // Code
    c.push({ t: 'c-print', p: { text: pick(SAY) }, why: 'J’écris un programme qui affiche une phrase.' });
    c.push({ t: 'c-count', p: {}, why: 'J’écris une boucle qui compte jusqu’à 5.' });
    c.push({ t: 'c-tk', p: { text: pick(SAY) }, why: 'Je fabrique une fenêtre avec tkinter.' });
    c.push({ t: 'c-btn', p: {}, why: 'Je fais une fenêtre avec un bouton.' });
    c.push({ t: 'c-fix', p: { text: 'Réparé !' }, why: 'Quelqu’un a laissé un programme cassé : je le répare.' });
    const newApp = EXES.filter(x => !home.includes(x));
    if (newApp.length) { const x = pick(newApp); c.push({ t: 'c-exe', p: { file: x, text: pick(SAY) }, why: `Je construis mon application ${x}.` }); }
    if (exes.length) { const x = pick(exes); c.push({ t: 'exe', p: { file: x }, why: `Je lance ${x}.`, boost: 0.5 }); }
    for (const g of c) g.score = 1 / (1 + (mem.count[g.t] || 0)) + Math.random() * 0.6 + (g.boost || 0);
    return c.sort((x, y) => y.score - x.score)[0];
  }

  // Préparer le bureau pour un objectif (ce qui « arrive » dans le monde, pas ce que fait l'agent)
  function prepare(e, g) {
    e.run = null; e.ran = null;
    if (g.t === 'theme') e.theme0 = e.theme;
    if (g.t === 'fond') e.fond0 = e.fond;
    if (g.t === 'c-fix') T['c-fix'].setup(e, g.p);
  }

  function remember(e, g, ok, mem) {
    mem.count[g.t] = (mem.count[g.t] || 0) + 1;
    if (!ok) return;
    if (g.t === 'cat') mem.read.add(g.p.file);
    if (g.t === 'mkdir') mem.dirs.add(g.p.dir);
    if (g.t === 'exe' || g.t === 'py') mem.launched.add(g.p.file);
    if (g.t === 'git') mem.commits.add(g.p.dir);
  }

  root.AgentGoals = { chooseGoal, prepare, remember, newMemory };
})(typeof window !== 'undefined' ? window : globalThis);
