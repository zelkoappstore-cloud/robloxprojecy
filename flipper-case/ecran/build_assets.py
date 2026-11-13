"""Convertit les ressources officielles du Flipper Zero en bitmaps 1 bit pour l'ecran simule.
Sources (GPL-3.0 / licences d'origine) :
  - github.com/flipperdevices/flipperzero-firmware : assets/dolphin/external, assets/icons
  - github.com/olikraus/u8g2 : polices helvB08 (FontPrimary) et HaxrCorp 4089 (FontSecondary)
Usage : python3 build_assets.py <dossier firmware> <dossier u8g2>  -> assets.js"""
import sys, os, json, base64, re
import numpy as np
from PIL import Image, ImageFont

FW, U8 = sys.argv[1], sys.argv[2]
A = os.path.join(FW, "assets")

def pack(arr):  # arr bool HxW -> dict
    h, w = arr.shape
    return {"w": w, "h": h, "d": base64.b64encode(np.packbits(arr, axis=1).tobytes()).decode()}

def png(path):
    im = Image.open(path).convert("RGBA")
    a = np.array(im)
    on = (a[..., 3] > 127) & (a[..., :3].mean(-1) < 128)
    return pack(on)

def meta(path):
    t = open(path).read()
    g = lambda k: re.search(rf"^{k}: (.*)$", t, re.M).group(1)
    return {"order": [int(x) for x in g("Frames order").split()], "rate": int(g("Frame rate")),
            "passive": int(g("Passive frames"))}

ANIMS = ["L1_Waves_128x50", "L1_Sleep_128x64", "L1_Laptop_128x51", "L1_Painting_128x64",
         "L2_Hacking_pc_128x64", "L1_Read_books_128x64"]
out = {"anims": {}, "icons": {}, "fonts": {}}
for n in ANIMS:
    d = os.path.join(A, "dolphin/external", n)
    frames = sorted([f for f in os.listdir(d) if f.startswith("frame_")], key=lambda f: int(re.findall(r"\d+", f)[0]))
    out["anims"][n] = dict(meta(os.path.join(d, "meta.txt")), frames=[png(os.path.join(d, f)) for f in frames])

for n in sorted(os.listdir(os.path.join(A, "icons/MainMenu"))):
    d = os.path.join(A, "icons/MainMenu", n)
    frames = sorted(f for f in os.listdir(d) if f.endswith(".png"))
    rate = int(open(os.path.join(d, "frame_rate")).read().strip())
    out["icons"][n] = {"rate": rate, "frames": [png(os.path.join(d, f)) for f in frames]}
for sub, names in {"StatusBar": ["Battery_26x8", "SDcardMounted_11x8", "Background_128x11"],
                   "Common": ["ButtonCenter_7x7", "ButtonUp_7x4", "ButtonDown_7x4", "ButtonLeft_4x7", "ButtonRight_4x7"]}.items():
    for n in names:
        p = os.path.join(A, "icons", sub, n + ".png")
        if os.path.exists(p):
            out["icons"][n] = {"rate": 0, "frames": [png(p)]}

# helvB08 (BDF) -> FontPrimary
def bdf(path):
    g, cur, bits = {}, None, None
    for line in open(path, encoding="latin-1"):
        p = line.split()
        if not p: continue
        if p[0] == "ENCODING": cur = {"c": int(p[1])}
        elif p[0] == "DWIDTH" and cur is not None: cur["adv"] = int(p[1])
        elif p[0] == "BBX" and cur is not None: cur["w"], cur["h"], cur["x"], cur["y"] = map(int, p[1:5])
        elif p[0] == "BITMAP": bits = []
        elif p[0] == "ENDCHAR":
            if 32 <= cur["c"] < 127:
                w = cur["w"]; rows = [[(int(b, 16) >> (len(b) * 4 - 1 - i)) & 1 for i in range(w)] for b in bits]
                arr = np.array(rows, bool).reshape(cur["h"], w) if w and cur["h"] else np.zeros((0, 0), bool)
                g[chr(cur["c"])] = {"a": cur["adv"], "x": cur["x"], "y": -(cur["y"] + cur["h"]), **(pack(arr) if arr.size else {"w": 0, "h": 0, "d": ""})}
            cur, bits = None, None
        elif bits is not None: bits.append(p[0])
    return g
out["fonts"]["primary"] = bdf(os.path.join(U8, "tools/font/bdf/helvB08.bdf"))

# HaxrCorp 4089 (TTF pixel, net a 16 px) -> FontSecondary
f = ImageFont.truetype(os.path.join(U8, "tools/font/ttf/haxrcorp4089.ttf"), 16)
asc, _ = f.getmetrics()
g = {}
for c in map(chr, range(32, 127)):
    adv = round(f.getlength(c))
    box = f.getbbox(c)
    im = Image.new("L", (max(1, box[2] - box[0]), max(1, box[3] - box[1])))
    from PIL import ImageDraw
    ImageDraw.Draw(im).text((-box[0], -box[1]), c, font=f, fill=255)
    arr = np.array(im) > 127
    g[c] = {"a": adv, "x": box[0], "y": box[1] - asc, **(pack(arr) if c != " " else {"w": 0, "h": 0, "d": ""})}
out["fonts"]["secondary"] = g

open("assets.js", "w").write("window.FZ_ASSETS=" + json.dumps(out, separators=(",", ":")) + ";\n")
print("assets.js", os.path.getsize("assets.js"), "octets")
