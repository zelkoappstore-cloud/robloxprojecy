// Dessin du bureau simulé de l'agent sur un canevas (utilisé par l'écran 3D et par la page 2D).
(function (root) {
  function AgentScreen(canvas) {
    const A = root.AgentLinux;
    const { HOME, COLS, ROWS, LAYOUT, DOCK, page } = A;
    const g = canvas.getContext('2d');
    const SW = canvas.width, SH = canvas.height, CW = SW / COLS, CH = SH / ROWS, U = SW / 960;
    const cur = { x: 6.5 * CW, y: 3.5 * CH, ring: 0 };
    const TILE = { terminal: '#1a1d24', fichiers: '#3b6fd8', editeur: '#f3f1ea', code: '#252a3a', navigateur: '#1f8a70', calculatrice: '#ff9f43', jeu: '#8e5cf7', parametres: '#5f6b7d', corbeille: '#4a505e' };
    const WALL = [['#1a2140', '#0f1424', '#0a0d17'], ['#2a1530', '#1a0f24', '#0e0a17'], ['#10302a', '#0c201f', '#081312']];
    const WALL_LIGHT = [['#dfe7ff', '#c9d6f5', '#b7c6ea'], ['#f6dfee', '#e9cfe3', '#dcc0d6'], ['#d9f2ea', '#c6e8dc', '#b4dccd']];
    const word = (k, p) => (({ '‹dossier›': p.dir, '‹fichier›': p.file, '‹texte›': p.text, '‹mot›': p.word, '‹paquet›': p.pkg, '‹site›': p.site, '‹nombre A›': p.a, '‹nombre B›': p.b })[k] ?? k) + '';
    const shown = (line, p) => line.replace('‹texte›', JSON.stringify(p.text ?? ''));
    const F = n => Math.round(n * U);
    function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
    function text(str, x, y, color, size = 14, font = 'Inter', weight = 400, align = 'left') {
      g.fillStyle = color; g.font = `${weight} ${F(size)}px ${font}, system-ui, sans-serif`; g.textAlign = align; g.textBaseline = 'middle';
      g.fillText(str, x, y);
    }
    const clip = (str, max) => (str = String(str ?? ''), str.length > max ? str.slice(0, max - 1) + '…' : str);
    const pill = (label, cx, cy, bg, fg = '#fff') => { g.font = `600 ${F(13)}px Inter, system-ui`; const w = g.measureText(label).width + F(18); g.fillStyle = bg; rr(cx - w / 2, cy - F(13), w, F(26), F(8)); g.fill(); text(label, cx, cy, fg, 13, 'Inter', 600, 'center'); };
    const C = (x, y) => [(x + 0.5) * CW, (y + 0.5) * CH];

    function icon(app, cx, cy, s) {
      g.save(); g.translate(cx, cy); g.lineWidth = Math.max(2, 3 * U); g.lineCap = 'round'; g.lineJoin = 'round';
      const L = (pts, col) => { g.strokeStyle = col; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x * s, y * s) : g.moveTo(x * s, y * s)); g.stroke(); };
      if (app === 'terminal') { L([[-0.3, -0.2], [-0.05, 0], [-0.3, 0.2]], '#63d68a'); L([[0.02, 0.22], [0.3, 0.22]], '#63d68a'); }
      if (app === 'fichiers') { g.fillStyle = '#fff'; rr(-s * 0.3, -s * 0.2, s * 0.6, s * 0.42, 4); g.fill(); }
      if (app === 'editeur') for (let i = 0; i < 4; i++) L([[-0.25, -0.2 + i * 0.13], [i === 3 ? 0.05 : 0.25, -0.2 + i * 0.13]], '#3b6fd8');
      if (app === 'code') { L([[-0.12, -0.2], [-0.3, 0], [-0.12, 0.2]], '#c792ea'); L([[0.12, -0.2], [0.3, 0], [0.12, 0.2]], '#c792ea'); }
      if (app === 'navigateur') { g.strokeStyle = '#fff'; g.beginPath(); g.arc(0, 0, s * 0.27, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.ellipse(0, 0, s * 0.11, s * 0.27, 0, 0, Math.PI * 2); g.stroke(); L([[-0.27, 0], [0.27, 0]], '#fff'); }
      if (app === 'calculatrice') { g.fillStyle = '#fff'; rr(-s * 0.22, -s * 0.28, s * 0.44, s * 0.14, 3); g.fill(); for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) { rr(-s * 0.22 + c * s * 0.16, -s * 0.06 + r * s * 0.16, s * 0.12, s * 0.12, 2); g.fill(); } }
      if (app === 'jeu') { L([[-0.08, -0.27], [-0.08, 0.27]], '#fff'); L([[0.08, -0.27], [0.08, 0.27]], '#fff'); L([[-0.27, -0.08], [0.27, -0.08]], '#fff'); L([[-0.27, 0.08], [0.27, 0.08]], '#fff'); }
      if (app === 'parametres') { g.strokeStyle = '#fff'; g.beginPath(); g.arc(0, 0, s * 0.13, 0, Math.PI * 2); g.stroke(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; L([[Math.cos(a) * 0.17, Math.sin(a) * 0.17], [Math.cos(a) * 0.27, Math.sin(a) * 0.27]], '#fff'); } }
      if (app === 'corbeille') L([[-0.25, -0.15], [0.25, -0.15]], '#e6e9ef'), L([[-0.18, -0.15], [-0.13, 0.25], [0.13, 0.25], [0.18, -0.15]], '#e6e9ef');
      g.restore();
    }

    function draw(e, p = {}, opts = {}) {
      const light = e.theme === 'clair';
      const T = light
        ? { win: '#f4f5f8', head: '#e1e4ea', title: '#1d2230', dim: '#6b7385', body: '#ffffff', ink: '#1d2230', bar: 'rgba(240,242,246,0.92)', barInk: '#1d2230', dock: 'rgba(255,255,255,0.75)' }
        : { win: '#1d2029', head: '#262a35', title: '#e6e9ef', dim: '#8a93a6', body: '#11141b', ink: '#e6e9ef', bar: 'rgba(5,6,9,0.9)', barInk: '#e6e9ef', dock: 'rgba(20,23,31,0.85)' };
      const W3 = (light ? WALL_LIGHT : WALL)[e.fond || 0];
      const bg = g.createLinearGradient(0, 0, SW, SH); bg.addColorStop(0, W3[0]); bg.addColorStop(0.6, W3[1]); bg.addColorStop(1, W3[2]);
      g.fillStyle = bg; g.fillRect(0, 0, SW, SH);
      g.fillStyle = 'rgba(255,181,71,0.10)'; g.beginPath(); g.arc(SW * 0.82, SH * 0.25, 160 * U, 0, Math.PI * 2); g.fill();
      // Barre du haut, avec le presse-papiers
      g.fillStyle = T.bar; g.fillRect(0, 0, SW, F(26));
      text('Activités', F(12), F(13), T.barInk, 13, 'Inter', 600);
      text(opts.clock || '09:00', SW / 2, F(13), T.barInk, 13, 'Inter', 600, 'center');
      text(e.clip ? 'Presse-papiers : ' + clip(e.clip, 26) : 'FR   Wi-Fi   100 %', SW - F(12), F(13), e.clip ? '#ffb547' : T.dim, 12, 'Inter', e.clip ? 600 : 400, 'right');
      // Dock
      const dockXs = Object.keys(DOCK).map(Number);
      g.fillStyle = T.dock; rr(Math.min(...dockXs) * CW + 4, 7 * CH + 6, (Math.max(...dockXs) - Math.min(...dockXs) + 1) * CW - 8, CH - 12, F(16)); g.fill();
      for (const [x, app] of Object.entries(DOCK)) {
        const [cx, cy] = C(+x, 7), s = F(48);
        g.fillStyle = TILE[app]; rr(cx - s / 2, cy - s / 2, s, s, F(11)); g.fill();
        icon(app, cx, cy, s);
        if (e.open.includes(app)) { g.fillStyle = '#ffb547'; g.beginPath(); g.arc(cx, cy + F(32), F(3), 0, Math.PI * 2); g.fill(); }
        if (app === 'corbeille' && e.trash.length) { g.fillStyle = '#ff6b6b'; g.beginPath(); g.arc(cx + F(20), cy - F(20), F(9), 0, Math.PI * 2); g.fill(); text(String(e.trash.length), cx + F(20), cy - F(20), '#fff', 11, 'Inter', 600, 'center'); }
      }
      // Fenêtres, de l'arrière vers l'avant
      const order = [...e.open].sort((a, b) => (a === e.focus) - (b === e.focus));
      for (const app of order) {
        const L = LAYOUT[app], x = L.x0 * CW + 3, y = L.y0 * CH + 3, w = (L.x1 - L.x0 + 1) * CW - 6, h = (L.y1 - L.y0 + 1) * CH - 6;
        g.save(); g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = F(18); g.shadowOffsetY = F(6);
        g.fillStyle = T.win; rr(x, y, w, h, F(12)); g.fill(); g.restore();
        g.save(); rr(x, y, w, h, F(12)); g.clip();
        g.fillStyle = T.head; g.fillRect(x, y, w, F(30));
        const title = { terminal: `agent@linux: ${e.cwd.replace(HOME, '~')}`, fichiers: 'Fichiers', editeur: `${e.ed.name || 'Sans titre'} — Éditeur`, code: 'Atelier de code', bac: `Bac à sable${e.ran ? ' — ' + e.ran.from : ''}`, navigateur: 'Navigateur', calculatrice: 'Calculatrice', jeu: 'Morpion', parametres: 'Paramètres' }[app];
        text(clip(title, 36), x + w / 2, y + F(15), e.focus === app ? T.title : T.dim, 13, 'Inter', 600, 'center');
        const by = y + F(30), bh = h - F(30);
        if (app === 'terminal') {
          g.fillStyle = '#0d0f14'; g.fillRect(x, by, w, bh);
          const lines = e.term.slice(-7);
          const prompt = 'agent@linux:' + e.cwd.replace(HOME, '~') + ' $ ' + e.buf.map(k => word(k, p)).join(' ').replace('./ ', './');
          lines.forEach((l, i) => text(clip(l.line, 56), x + F(10), by + F(14) + i * F(19), l.err ? '#ff6b6b' : '#e6e9ef', 13, 'JetBrains Mono'));
          text(clip(prompt, 56) + (Math.floor(performance.now() / 500) % 2 ? '▌' : ''), x + F(10), by + F(14) + lines.length * F(19), '#63d68a', 13, 'JetBrains Mono');
        }
        if (app === 'fichiers') {
          text(e.fm.replace(HOME, '~'), x + F(12), y + F(15), T.dim, 11, 'JetBrains Mono');
          pill('↑ Parent', ...C(...L.up), '#2f3542'); pill('Corbeille', ...C(...L.bin), '#a53c3c');
          e.list(e.fm).slice(0, L.items.length).forEach((name, k) => {
            const [cx, cy0] = C(...L.items[k]), cy = cy0 - F(8), f = e.fs.get(e.fm + '/' + name);
            if (e.sel === name) { g.fillStyle = 'rgba(59,111,216,0.45)'; rr(cx - F(36), cy - F(30), F(72), F(66), F(8)); g.fill(); }
            if (f.d) { g.fillStyle = '#f5c95c'; rr(cx - F(20), cy - F(16), F(40), F(30), F(4)); g.fill(); g.fillStyle = '#e8b84a'; rr(cx - F(20), cy - F(20), F(18), F(8), F(3)); g.fill(); }
            else { g.fillStyle = f.prog ? '#c792ea' : name.endsWith('.png') ? '#7aa7ff' : '#dfe4ee'; rr(cx - F(14), cy - F(19), F(28), F(36), F(4)); g.fill(); }
            text(clip(name, 11), cx, cy + F(28), T.ink, 11, 'Inter', 400, 'center');
          });
        }
        if (app === 'editeur') {
          g.fillStyle = '#fbfaf6'; g.fillRect(x, by, w, bh - CH + 3);
          text(clip(e.ed.text, 44), x + F(12), by + F(18), '#23262d', 14, 'JetBrains Mono');
          g.fillStyle = '#ece9e1'; g.fillRect(x, L.y1 * CH, w, CH);
          text(e.ed.saving ? 'Enregistrer sous : ' + (e.ed.nameBuf || '') : e.ed.name ? '~/' + e.ed.name : 'Non enregistré', x + F(12), (L.y1 + 0.5) * CH, '#444', 13);
          pill('Coller', ...C(...L.paste), e.clip ? '#2f3542' : '#9aa0aa'); pill('Enregistrer', ...C(...L.save), '#3b6fd8');
        }
        if (app === 'code') {
          g.fillStyle = '#11141b'; g.fillRect(x, by, w, bh);
          if (!e.code.length) text('Programme vide', x + F(14), by + F(20), '#8a93a6', 13);
          e.code.forEach((l, i) => {
            text(String(i + 1), x + F(24), by + F(18) + i * F(22), '#4b5366', 13, 'JetBrains Mono', 400, 'right');
            text(clip(shown(l, p), 50), x + F(36), by + F(18) + i * F(22), /^(import|for)/.test(l.trim()) ? '#c792ea' : '#e6e9ef', 13, 'JetBrains Mono');
          });
          const st = !e.run ? 'Pas encore exécuté' : e.run.error ? e.run.error : e.run.win && !e.run.win.shown ? 'La fenêtre s’est fermée tout de suite' : e.run.win ? 'Fenêtre ouverte dans le bac à sable' : 'Sortie : ' + (e.run.out.join(' ') || '(rien)');
          g.fillStyle = '#181c25'; g.fillRect(x, y + h - F(26), w, F(26));
          text(clip(st, 60), x + F(12), y + h - F(13), e.run?.error ? '#ff6b6b' : e.run ? '#63d68a' : '#8a93a6', 12, 'JetBrains Mono');
          const [nx, ny] = C(...L.neu), [bx] = C(...L.build), [rx] = C(...L.run);
          pill('Nouveau', nx, ny + F(8), '#2f3542'); pill('.exe', bx, ny + F(8), '#2f3542'); pill('▶ Lancer', rx, ny + F(8), '#3b6fd8');
        }
        if (app === 'bac') {
          g.fillStyle = '#0f1218'; g.fillRect(x, by, w, bh);
          const r = e.ran;
          if (!r) text('En attente d’un programme', x + F(12), by + F(18), '#8a93a6', 12);
          else if (r.error) text(clip(r.error, 44), x + F(12), by + F(18), '#ff6b6b', 12, 'JetBrains Mono');
          else if (r.win && r.win.shown) {
            g.fillStyle = '#ececec'; rr(x + F(14), by + F(8), w * 0.62, bh - F(16), F(6)); g.fill();
            g.fillStyle = '#d6d6d6'; g.fillRect(x + F(14), by + F(8), w * 0.62, F(16));
            text('tk', x + F(22), by + F(16), '#333', 10);
            const items = [...r.win.labels.map(l => ['l', l]), ...Array(r.win.buttons).fill(['b', 'Quitter'])];
            items.slice(0, 2).forEach(([k, l], i) => {
              const cy = by + F(40) + i * F(24), cx = x + F(14) + w * 0.31;
              if (k === 'b') { g.fillStyle = '#fff'; rr(cx - F(34), cy - F(10), F(68), F(20), F(4)); g.fill(); g.strokeStyle = '#999'; g.lineWidth = 1; g.stroke(); }
              text(clip(l, 20), cx, cy, '#222', 13, 'Inter', 500, 'center');
            });
          } else text(clip(r.out.join('  ') || '(rien)', 40), x + F(12), by + F(18), '#e6e9ef', 13, 'JetBrains Mono');
        }
        if (app === 'navigateur') {
          g.fillStyle = T.body; g.fillRect(x, by, w, bh);
          const [ax, ay] = C(...L.addr), pg = page(e.br.page);
          g.fillStyle = light ? '#eef0f4' : '#1a1e27'; rr(x + CW, ay - F(15), 6 * CW - F(10), F(30), F(15)); g.fill();
          if (e.br.addr) { g.strokeStyle = '#ffb547'; g.lineWidth = 2; g.stroke(); }
          const addrText = e.br.addr ? (e.br.typed ? word('‹site›', { site: e.br.typed }) : '') + (Math.floor(performance.now() / 500) % 2 ? '▌' : '') : 'http://' + e.br.page;
          text(clip(addrText, 40), x + CW + F(14), ay, e.br.addr ? T.ink : T.dim, 13, 'JetBrains Mono');
          pill('←', ...C(...L.back), e.br.hist.length ? '#2f3542' : '#9aa0aa');
          pill('Copier', ...C(...L.copy), e.br.sel ? '#ffb547' : '#9aa0aa', e.br.sel ? '#1a1406' : '#fff');
          text(pg.title, x + F(16), (L.rows[0] - 0.15) * CH, T.ink, 15, 'Inter', 600);
          pg.items.slice(0, L.rows.length).forEach((it, i) => {
            const cy = (L.rows[i] + 0.5) * CH + F(6);
            if (it.k === 'lien') { text(clip(it.label, 34), x + CW, cy, '#3b8bff', 14, 'Inter', 500); g.fillStyle = '#3b8bff'; g.fillRect(x + CW, cy + F(9), Math.min(5 * CW, g.measureText(clip(it.label, 34)).width), 1.5); }
            else {
              if (e.br.sel === it.text) { g.fillStyle = 'rgba(255,181,71,0.25)'; rr(x + CW - F(6), cy - F(14), 6 * CW, F(28), F(6)); g.fill(); }
              text(clip(it.text, 36), x + CW, cy, T.ink, 14);
            }
          });
        }
        if (app === 'calculatrice') {
          g.fillStyle = T.body; g.fillRect(x, by, w, bh);
          const c = e.calc;
          g.fillStyle = light ? '#e9ecf2' : '#0b0d12'; rr(x + F(12), by + F(10), w - F(24), F(48), F(8)); g.fill();
          text([c.a ?? '', c.op ?? '', c.b ?? ''].join(' ').trim() || ' ', x + w - F(22), by + F(24), T.dim, 12, 'JetBrains Mono', 400, 'right');
          text(c.display, x + w - F(22), by + F(44), T.ink, 22, 'JetBrains Mono', 600, 'right');
          ['7 8 9 +', '4 5 6 ×', '1 2 3 ='].forEach((row, r) => row.split(' ').forEach((k, i) => {
            const kx = x + F(12) + i * (w - F(24)) / 4, ky = by + F(68) + r * F(30);
            g.fillStyle = /[+×=]/.test(k) ? '#ff9f43' : (light ? '#dfe2e8' : '#262b36'); rr(kx + 2, ky, (w - F(24)) / 4 - 4, F(26), F(6)); g.fill();
            text(k, kx + (w - F(24)) / 8, ky + F(13), /[+×=]/.test(k) ? '#1a1406' : T.ink, 13, 'Inter', 600, 'center');
          }));
        }
        if (app === 'jeu') {
          g.fillStyle = T.body; g.fillRect(x, by, w, bh);
          L.cells.forEach(([cx0, cy0], k) => {
            const [cx, cy] = C(cx0, cy0), s = Math.min(CW, CH) * 0.82;
            g.fillStyle = light ? '#eceff4' : '#1a1e27'; rr(cx - s / 2, cy - s / 2, s, s, F(8)); g.fill();
            const v = e.game.b[k];
            if (v === 'X') { g.strokeStyle = '#4fd6e3'; g.lineWidth = F(5); g.beginPath(); g.moveTo(cx - s * 0.25, cy - s * 0.25); g.lineTo(cx + s * 0.25, cy + s * 0.25); g.moveTo(cx + s * 0.25, cy - s * 0.25); g.lineTo(cx - s * 0.25, cy + s * 0.25); g.stroke(); }
            if (v === 'O') { g.strokeStyle = '#ffb547'; g.lineWidth = F(5); g.beginPath(); g.arc(cx, cy, s * 0.26, 0, Math.PI * 2); g.stroke(); }
          });
          pill('Rejouer', ...C(...L.again), '#2f3542');
          const st = e.game.over === 'gagné' ? 'Gagné !' : e.game.over === 'perdu' ? 'Perdu…' : e.game.over === 'nul' ? 'Match nul' : 'À toi (X)';
          text(st, (L.x0 + 1.5) * CW, (L.y1 + 0.5) * CH, e.game.over === 'gagné' ? '#63d68a' : e.game.over === 'perdu' ? '#ff6b6b' : T.dim, 14, 'Inter', 600, 'center');
        }
        if (app === 'parametres') {
          g.fillStyle = T.body; g.fillRect(x, by, w, bh);
          text('Apparence', x + F(16), by + F(22), T.ink, 15, 'Inter', 600);
          pill('Thème : ' + e.theme, ...C(...L.theme), '#3b6fd8');
          const [fx, fy] = C(...L.fond);
          pill('Fond d’écran', fx, fy, '#2f3542');
          const W = (light ? WALL_LIGHT : WALL)[e.fond || 0];
          const gr = g.createLinearGradient(fx - F(40), 0, fx + F(40), 0); gr.addColorStop(0, W[0]); gr.addColorStop(1, W[2]);
          g.fillStyle = gr; rr(fx - F(40), fy + F(18), F(80), F(22), F(5)); g.fill();
        }
        g.restore();
        const [clx] = C(...L.close);
        g.fillStyle = '#3a3f4c'; g.beginPath(); g.arc(clx, y + F(15), F(9), 0, Math.PI * 2); g.fill();
        text('✕', clx, y + F(15), '#e6e9ef', 11, 'Inter', 600, 'center');
        if (e.focus === app) { g.strokeStyle = 'rgba(255,181,71,0.6)'; g.lineWidth = 2; rr(x, y, w, h, F(12)); g.stroke(); }
      }
      // Curseur : il glisse vers sa case
      const [tx, ty] = C(e.cx, e.cy);
      cur.x += (tx - cur.x) * 0.35; cur.y += (ty - cur.y) * 0.35;
      if (cur.ring > 0) { g.strokeStyle = `rgba(255,181,71,${cur.ring})`; g.lineWidth = 3; g.beginPath(); g.arc(cur.x, cur.y, F(26) - cur.ring * F(14), 0, Math.PI * 2); g.stroke(); cur.ring = Math.max(0, cur.ring - 0.06); }
      g.save(); g.translate(cur.x - 3, cur.y - 3); g.scale(1.6 * U, 1.6 * U);
      g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(2, 1); g.lineTo(2, 19); g.lineTo(7, 14.5); g.lineTo(10.5, 22); g.lineTo(13.8, 20.5); g.lineTo(10.3, 13); g.lineTo(17.5, 13); g.closePath(); g.fill(); g.stroke();
      g.restore();
      const ov = opts.overlay;
      if (ov) {
        g.fillStyle = 'rgba(5,7,10,0.74)'; g.fillRect(0, 0, SW, SH);
        text(ov.title, SW / 2, SH / 2 - F(30), '#e6e9ef', 30, 'Inter', 600, 'center');
        g.fillStyle = '#242b38'; rr(SW / 2 - F(220), SH / 2 + F(4), F(440), F(14), F(7)); g.fill();
        g.fillStyle = '#ffb547'; rr(SW / 2 - F(220), SH / 2 + F(4), F(440) * ov.p, F(14), F(7)); g.fill();
        text(ov.sub || '', SW / 2, SH / 2 + F(46), '#8a93a6', 16, 'Inter', 400, 'center');
      }
    }
    return { draw, click: () => { cur.ring = 1; }, word, shown };
  }
  root.AgentScreen = AgentScreen;
})(typeof window !== 'undefined' ? window : globalThis);
