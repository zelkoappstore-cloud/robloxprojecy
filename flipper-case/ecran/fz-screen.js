// Ecran Flipper Zero simule : framebuffer 128x64, rendu inspire de l'interface officielle
// (applications/services/gui : menu.c, submenu.c, elements.c du firmware flipperdevices).
(function () {
  const W = 128, H = 64, A = window.FZ_ASSETS;
  const fb = new Uint8Array(W * H);

  // ---- decodage des bitmaps 1 bit ----
  const cache = new Map();
  function bits(img) {
    if (!img.d) return new Uint8Array(0);
    let b = cache.get(img);
    if (b) return b;
    const raw = atob(img.d), stride = Math.ceil(img.w / 8);
    b = new Uint8Array(img.w * img.h);
    for (let y = 0; y < img.h; y++)
      for (let x = 0; x < img.w; x++)
        b[y * img.w + x] = (raw.charCodeAt(y * stride + (x >> 3)) >> (7 - (x & 7))) & 1;
    cache.set(img, b);
    return b;
  }

  // ---- primitives (couleur 1 = noir, 0 = blanc) ----
  let color = 1;
  const dot = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H) fb[y * W + x] = color; };
  const box = (x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) dot(x + i, y + j); };
  const hline = (x, y, w) => box(x, y, w, 1), vline = (x, y, h) => box(x, y, 1, h);
  const frame = (x, y, w, h) => { hline(x, y, w); hline(x, y + h - 1, w); vline(x, y, h); vline(x + w - 1, y, h); };
  function rframe(x, y, w, h, r) {
    hline(x + r, y, w - 2 * r); hline(x + r, y + h - 1, w - 2 * r);
    vline(x, y + r, h - 2 * r); vline(x + w - 1, y + r, h - 2 * r);
    dot(x + 1, y + 1); dot(x + w - 2, y + 1); dot(x + 1, y + h - 2); dot(x + w - 2, y + h - 2);
  }
  function rbox(x, y, w, h, r) {
    box(x + r, y, w - 2 * r, h); box(x, y + r, w, h - 2 * r);
    box(x + 1, y + 1, w - 2, h - 2);
  }
  function bitmap(img, x, y) {
    const b = bits(img);
    for (let j = 0; j < img.h; j++)
      for (let i = 0; i < img.w; i++) if (b[j * img.w + i]) dot(x + i, y + j);
  }
  function str(font, x, y, s) {
    const f = A.fonts[font];
    for (const c of s) {
      const g = f[c] || f["?"];
      if (g.w) bitmap(g, x + g.x, y + g.y);
      x += g.a;
    }
    return x;
  }
  const strW = (font, s) => [...s].reduce((a, c) => a + (A.fonts[font][c] || A.fonts[font]["?"]).a, 0);
  function strAligned(font, x, y, s, align) {
    const w = strW(font, s);
    return str(font, align === "center" ? x - (w >> 1) : align === "right" ? x - w : x, y, s);
  }
  // elements_frame : cadre arrondi avec ombre portee
  function elFrame(x, y, w, h) {
    rframe(x, y, w, h, 3);
    hline(x + 3, y + h, w - 3); vline(x + w, y + 3, h - 3); dot(x + w - 1, y + h - 1);
  }
  // elements_scrollbar_pos
  function scrollbar(pos, total, x = W, y = 0, h = H) {
    color = 0; box(x - 3, y, 3, h); color = 1;
    for (let i = y; i < y + h; i += 2) dot(x - 2, i);
    if (total) { const bh = h / total; box(x - 3, Math.round(y + bh * pos), 3, Math.max(Math.round(bh), 1)); }
  }
  function icon(name, x, y, t, animate) {
    const ic = A.icons[name];
    if (!ic) return;
    const n = ic.frames.length;
    const i = animate && ic.rate ? Math.floor(t * ic.rate / 1000) % n : 0;
    bitmap(ic.frames[i], x, y);
  }

  // ---- contenu : applications du menu principal (firmware officiel) ----
  const APPS = [
    ["Sub-GHz", "Sub1ghz_14", ["Read", "Read RAW", "Saved", "Add Manually", "Frequency Analyzer"]],
    ["125 kHz RFID", "125khz_14", ["Read", "Saved", "Add Manually", "Extra Actions"]],
    ["NFC", "NFC_14", ["Read", "Detect Reader", "Saved", "Extra Actions", "Add Manually"]],
    ["Infrared", "Infrared_14", ["Universal Remotes", "Learn New Remote", "Saved Remotes"]],
    ["GPIO", "GPIO_14", ["USB-UART Bridge", "GPIO Manual Control", "5V on GPIO"]],
    ["iButton", "iButton_14", ["Read", "Saved", "Add Manually"]],
    ["Bad USB", "BadUsb_14", ["demo.txt", "layouts"]],
    ["U2F", "U2F_14", ["Connect me to computer"]],
    ["Apps", "Plugins_14", ["Games", "Media", "Tools", "USB"]],
    ["Archive", "FileManager_14", ["Favorites", "Sub-GHz", "NFC", "Infrared"]],
    ["Settings", "Settings_14", ["Bluetooth", "LCD and Notifications", "Storage", "Power", "System", "About"]],
  ];
  const READ_HINTS = {
    "Sub-GHz": ["Scanning 433.92 MHz", "Press a remote button"],
    "125 kHz RFID": ["Reading", "Apply card to", "Flipper's back"],
    "NFC": ["Reading", "Apply card to", "Flipper's back"],
    "iButton": ["Reading", "Apply key to", "Flipper's back"],
  };
  const ANIMS = Object.keys(A.anims);

  // ---- etat de l'interface ----
  const st = { view: "desktop", anim: 0, menu: 0, sub: 0, subTop: 0, t0: performance.now() };

  function drawDesktop(t) {
    const a = A.anims[ANIMS[st.anim]];
    const f = a.frames[a.order[Math.floor((t - st.t0) * a.rate / 1000) % a.order.length]];
    bitmap(f, 0, H - f.h);
    // barre d'etat : batterie a droite (Battery_26x8 + jauge) et carte SD
    color = 0; box(98, 0, 30, 10); box(84, 0, 14, 10); color = 1;
    icon("Battery_26x8", 100, 1, t);
    box(102, 3, 18, 4);
    icon("SDcardMounted_11x8", 86, 1, t);
  }
  function drawMenu(t) {
    const n = APPS.length, prev = (st.menu - 1 + n) % n, next = (st.menu + 1) % n;
    icon(APPS[prev][1], 4, 3, t, false); str("secondary", 22, 14, APPS[prev][0]);
    icon(APPS[st.menu][1], 4, 25, t, true); str("primary", 22, 36, APPS[st.menu][0]);
    icon(APPS[next][1], 4, 47, t, false); str("secondary", 22, 58, APPS[next][0]);
    elFrame(0, 21, W - 5, 21);
    scrollbar(st.menu, n);
  }
  function drawSub() {
    const items = APPS[st.menu][2], ih = 16, vis = 4;
    if (st.sub < st.subTop) st.subTop = st.sub;
    if (st.sub >= st.subTop + vis) st.subTop = st.sub - vis + 1;
    for (let i = 0; i < Math.min(vis, items.length - st.subTop); i++) {
      const idx = st.subTop + i, y = i * ih;
      if (idx === st.sub) { color = 1; rbox(0, y + 1, 123, ih - 2, 1); color = 0; }
      else color = 1;
      str("secondary", 6, y + ih - 4, items[idx]);
      color = 1;
    }
    scrollbar(st.sub, items.length);
  }
  function drawAction(t) {
    const app = APPS[st.menu][0], item = APPS[st.menu][2][st.sub];
    const hint = item === "Read" || item === "Read RAW" ? READ_HINTS[app] : null;
    icon(APPS[st.menu][1], 4, 4, t, true);
    str("primary", 22, 15, item.length > 16 ? item.slice(0, 15) + "." : item);
    hline(0, 21, W);
    const lines = hint || [app, "Demo: function not", "simulated"];
    lines.forEach((l, i) => strAligned("secondary", 64, 34 + i * 10, l, "center"));
    // indication du bouton retour (comme elements_button_left)
    color = 1; rbox(0, 53, 31, 11, 2); color = 0;
    bitmap(A.icons.ButtonLeft_4x7.frames[0], 3, 55); str("secondary", 10, 62, "Back"); color = 1;
  }

  function render(t) {
    fb.fill(0); color = 1;
    if (st.view === "desktop") drawDesktop(t);
    else if (st.view === "menu") drawMenu(t);
    else if (st.view === "sub") drawSub();
    else drawAction(t);
    return fb;
  }

  function press(k) {
    const n = APPS.length;
    if (st.view === "desktop") {
      if (k === "ok") { st.view = "menu"; }
      else if (k === "left" || k === "up") { st.anim = (st.anim - 1 + ANIMS.length) % ANIMS.length; st.t0 = performance.now(); }
      else if (k === "right" || k === "down") { st.anim = (st.anim + 1) % ANIMS.length; st.t0 = performance.now(); }
    } else if (st.view === "menu") {
      if (k === "up") st.menu = (st.menu - 1 + n) % n;
      else if (k === "down") st.menu = (st.menu + 1) % n;
      else if (k === "ok" || k === "right") { st.view = "sub"; st.sub = 0; st.subTop = 0; }
      else if (k === "back" || k === "left") st.view = "desktop";
    } else if (st.view === "sub") {
      const m = APPS[st.menu][2].length;
      if (k === "up") st.sub = (st.sub - 1 + m) % m;
      else if (k === "down") st.sub = (st.sub + 1) % m;
      else if (k === "ok" || k === "right") st.view = "action";
      else if (k === "back" || k === "left") st.view = "menu";
    } else if (k === "back" || k === "left") st.view = "sub";
  }

  // ---- rendu LCD : retroeclairage orange, pixels sombres avec grille fine ----
  function paint(ctx, cw, ch, t) {
    render(t);
    const px = Math.floor(Math.min(cw / (W + 8), ch / (H + 10)));
    const ox = Math.floor((cw - W * px) / 2), oy = Math.floor((ch - H * px) / 2);
    const g = ctx.createRadialGradient(cw / 2, ch / 2, 10, cw / 2, ch / 2, cw * 0.7);
    g.addColorStop(0, "#ff9a1f"); g.addColorStop(1, "#f07800");
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = "rgba(120,55,0,0.10)";
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!fb[y * W + x]) ctx.fillRect(ox + x * px, oy + y * px, px - 1, px - 1);
    ctx.fillStyle = "#1c0e02";
    const s = Math.max(1, px - (px > 3 ? 1 : 0));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (fb[y * W + x]) ctx.fillRect(ox + x * px, oy + y * px, s, s);
  }

  window.FZScreen = { W, H, press, paint, state: st };
})();
