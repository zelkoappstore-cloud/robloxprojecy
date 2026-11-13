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
  const ANIMS = Object.keys(A.anims);

  // ---- etat de l'interface ----
  const st = { view: "desktop", anim: 0, menu: 0, sub: 0, subTop: 0, t0: performance.now(), since: 0, led: null, read: false };

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
    icon(APPS[st.menu][1], 4, 4, t, true);
    str("primary", 22, 15, item.length > 16 ? item.slice(0, 15) + "." : item);
    hline(0, 21, W);
    [app, "Demo: function not", "simulated"].forEach((l, i) => strAligned("secondary", 64, 34 + i * 10, l, "center"));
    buttonLeft("Back");
  }

  // ---- reproductions des ecrans officiels (code source du firmware) ----
  const FONT = {primary: {asc: 8, h: 11}, secondary: {asc: 7, h: 11}};  // u8g2 ascent / canvas_current_font_height
  // elements_multiline_text_aligned + canvas_draw_str_aligned
  function multiline(font, x, y, h, v, text) {
    const lines = text.split("\n"), fh = FONT[font].h;
    if (v === "bottom") y -= fh * (lines.length - 1);
    else if (v === "center") y -= Math.floor(fh * (lines.length - 1) / 2);
    for (const l of lines) {
      const yy = v === "top" ? y + FONT[font].asc : v === "center" ? y + (FONT[font].asc >> 1) : y;
      strAligned(font, x, yy, l, h);
      y += fh;
    }
  }
  // popup_view_draw_callback
  function popup(p) {
    if (p.icon) bitmap(A.icons[p.icon[0]].frames[0], p.icon[1], p.icon[2]);
    if (p.header) multiline("primary", ...p.header);
    if (p.text) multiline("secondary", ...p.text);
  }
  // elements_button_left / elements_button_right
  function buttonLeft(s) {
    const sw = strW("secondary", s), bw = sw + 3 * 2 + 4 + 3, y = H;
    color = 1; box(0, y - 12, bw, 12);
    for (let i = 0; i < 3; i++) vline(bw + i, y - 12 + i, 12 - i);
    color = 0; bitmap(A.icons.ButtonLeft_4x7.frames[0], 3, y - 10); str("secondary", 3 + 7, y - 3, s); color = 1;
  }
  function buttonRight(s) {
    const sw = strW("secondary", s), bw = sw + 3 * 2 + 4 + 3, y = H, x = W;
    color = 1; box(x - bw, y - 12, bw, 12);
    for (let i = 0; i < 3; i++) vline(x - bw - 1 - i, y - 12 + i, 12 - i);
    color = 0; str("secondary", x - bw + 3, y - 3, s); bitmap(A.icons.ButtonRight_4x7.frames[0], x - 3 - 4, y - 10); color = 1;
  }
  // widget text box / text scroll : "\e#" = ligne en gras (FontPrimary)
  function textWidget(text) {
    let y = 0;
    for (let l of text.split("\n")) {
      const bold = l.startsWith("\x1b#"); l = l.replace(/\x1b#/g, "");
      const f = bold ? "primary" : "secondary";
      str(f, 0, y + FONT[f].asc + 1, l); y += bold ? 12 : 10;
    }
  }

  // Donnees d'exemple (cartes fictives)
  const CARDS = {
    nfc: "\x1b#NTAG215\nUID: 04 5E 2A 1B 6C 80 00\nPages Read: 135/135",
    rfid: "\x1b#EM-Micro EM4100\x1b#\nHex: 1A 2B 3C 4D 5E\nFC: 060 Card: 15438",
  };
  const READS = {
    "NFC": {view: "nfcRead", ms: 2600, led: "cyan"},
    "125 kHz RFID": {view: "rfidRead", ms: 3200, led: "yellow"},
    "iButton": {view: "ibRead", ms: 2400, led: "cyan"},
    "Sub-GHz": {view: "subRead", ms: 4000, led: "magenta"},
  };

  function drawNfcRead() {  // nfc_scene_detect.c
    popup({header: [97, 15, "center", "top", "Reading"], text: [94, 27, "center", "top", "Hold card next\nto Flipper's back"],
      icon: ["NFC_manual_60x50", 0, 8]});
  }
  function drawRfidRead(t) {  // lfrfid_view_read.c
    bitmap(A.icons.NFC_manual_60x50.frames[0], 0, 8);
    const ask = (t - st.since) % 1600 < 800;
    if (ask) {
      str("primary", 70, 16, "Reading 1/2"); str("primary", 77, 29, "ASK");
      bitmap(A.icons.ButtonRight_4x7.frames[0], 70, 22); icon("Round_loader_8x8", 102, 21, t, true);
      str("secondary", 77, 43, "PSK");
    } else {
      str("primary", 70, 16, "Reading 2/2"); str("primary", 77, 43, "PSK");
      bitmap(A.icons.ButtonRight_4x7.frames[0], 70, 36); icon("Round_loader_8x8", 102, 35, t, true);
      str("secondary", 77, 29, "ASK");
    }
    str("secondary", 61, 56, "Don't move card");
  }
  function drawIbRead() {  // ibutton_scene_read.c
    popup({header: [95, 26, "center", "bottom", "Reading"], text: [95, 30, "center", "top", "Connect key\nwith pogo pins"],
      icon: ["DolphinWait_59x54", 0, 10]});
  }
  function drawIbOk() {  // ibutton_scene_read_success.c
    str("primary", 0, 2 + FONT.primary.asc, "Dallas DS1990");
    multiline("secondary", 0, 16, "left", "top", "ID: 01 A2 B3 C4 D5 E6 F7 3E");
    buttonLeft("Retry"); buttonRight("More");
  }
  function drawSubRead(t) {  // subghz receiver.c
    const got = t - st.since > READS["Sub-GHz"].ms;
    buttonLeft("Config");
    if (got) {  // un signal recu dans l'historique
      color = 1; box(0, 0, 127, 12); color = 0;
      dot(0, 0); dot(1, 0); dot(0, 1); dot(0, 11); dot(126, 0); dot(126, 11);
      bitmap(A.icons.Quest_7x8.frames[0], 4, 2); str("secondary", 15, 9, "Princeton 24bit"); color = 1;
    } else {
      bitmap(A.icons.Scanning_short_96x52.frames[0], 0, 0);
      str("primary", 63, 44, "Scanning...");
    }
    bitmap(A.icons.Internal_ant_1_9x11.frames[0], 109, 0);
    // jauge RSSI (subghz_view_rssi_draw) : barres animees
    const lvl = got ? 0 : Math.floor(4 + 3 * Math.sin(t / 180) + 2 * Math.sin(t / 77));
    for (let i = 0; i < Math.max(0, lvl); i++) { box(46 + i * 2, 52, 1, 3); }
    str("secondary", 44, 64, "433.92"); str("secondary", 79, 64, "AM"); str("secondary", 97, 64, got ? "1/50" : "0/50");
  }

  function render(t) {
    fb.fill(0); color = 1;
    const r = st.read && READS[APPS[st.menu][0]];
    if (r && st.view === r.view && st.view !== "subRead" && t - st.since > r.ms) {  // lecture terminee
      st.view = r.view.replace("Read", "Ok"); st.led = "green";
    }
    if (st.view === "subRead" && t - st.since > READS["Sub-GHz"].ms) st.led = null;
    switch (st.view) {
      case "desktop": drawDesktop(t); break;
      case "menu": drawMenu(t); break;
      case "sub": drawSub(); break;
      case "nfcRead": drawNfcRead(); break;
      case "rfidRead": drawRfidRead(t); break;
      case "ibRead": drawIbRead(); break;
      case "subRead": drawSubRead(t); break;
      case "nfcOk": textWidget(CARDS.nfc); buttonLeft("Retry"); buttonRight("More"); break;
      case "rfidOk": textWidget(CARDS.rfid); buttonLeft("Retry"); buttonRight("More"); break;
      case "ibOk": drawIbOk(); break;
      default: drawAction(t);
    }
    return fb;
  }
  function startRead() {
    const r = READS[APPS[st.menu][0]];
    st.read = true; st.view = r.view; st.since = performance.now(); st.led = r.led;
  }
  // LED de notification : couleur courante (clignote pendant la lecture)
  function led(t) {
    if (!st.led) return null;
    if (st.view.endsWith("Read") && (t - st.since) % 900 > 120) return null;
    return st.led;
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
      else if (k === "ok" || k === "right") {
        if (APPS[st.menu][2][st.sub] === "Read" && READS[APPS[st.menu][0]]) startRead();
        else st.view = "action";
      }
      else if (k === "back" || k === "left") st.view = "menu";
    } else if (st.view.endsWith("Ok")) {
      if (k === "left") startRead();                      // Retry
      else if (k === "back") { st.view = "sub"; st.led = null; st.read = false; }
    } else if (k === "back" || (k === "left" && st.view === "action")) { st.view = "sub"; st.led = null; st.read = false; }
  }

  // ---- rendu LCD : retroeclairage orange, pixels sombres avec grille fine ----
  function paint(ctx, cw, ch, t) {
    render(t);
    const px = Math.floor(Math.min(cw / (W + 8), ch / (H + 10)));
    const ox = Math.floor((cw - W * px) / 2), oy = Math.floor((ch - H * px) / 2);
    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    // vitre aux coins arrondis, comme la fenetre d'ecran du boitier
    ctx.beginPath(); ctx.roundRect(0, 0, cw, ch, Math.round(ch * 0.09)); ctx.clip();
    const g = ctx.createRadialGradient(cw / 2, ch / 2, 10, cw / 2, ch / 2, cw * 0.7);
    g.addColorStop(0, "#ff9a1f"); g.addColorStop(1, "#f07800");
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = "rgba(120,55,0,0.10)";
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!fb[y * W + x]) ctx.fillRect(ox + x * px, oy + y * px, px - 1, px - 1);
    ctx.fillStyle = "#1c0e02";
    const s = Math.max(1, px - (px > 3 ? 1 : 0));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (fb[y * W + x]) ctx.fillRect(ox + x * px, oy + y * px, s, s);
    ctx.restore();
  }

  window.FZScreen = { W, H, press, paint, led, state: st };
})();
