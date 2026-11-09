"""Synthesize click / swipe / success sounds and lay them on an 18 s stereo track."""
import sys
import wave
import numpy as np

SR = 48000
DUR = 18.0
rng = np.random.default_rng(7)


def env(n, attack, decay):
    t = np.arange(n) / SR
    a = np.minimum(1.0, t / max(attack, 1e-4))
    return a * np.exp(-t / decay)


def click(strength=1.0, pitch=1.0):
    """Short, crisp UI click: high tick + soft low thump + tiny noise transient."""
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    tick = np.sin(2 * np.pi * 2300 * pitch * t) * env(n, 0.0005, 0.010)
    body = np.sin(2 * np.pi * 900 * pitch * t) * env(n, 0.0008, 0.018) * 0.6
    thump = np.sin(2 * np.pi * 140 * t) * env(n, 0.001, 0.030) * 0.7
    noise = rng.standard_normal(n) * env(n, 0.0002, 0.003) * 0.25
    s = (tick + body + thump + noise) * strength
    return np.stack([s, s], 1)


def key(strength=0.35):
    """Soft keyboard tick for the typing code."""
    return click(strength, pitch=1.3 + rng.random() * 0.3)


def lowpass(x, cutoffs):
    """One-pole low-pass with a time-varying cutoff (array)."""
    y = np.empty_like(x)
    acc = 0.0
    a_arr = 1 - np.exp(-2 * np.pi * cutoffs / SR)
    for i in range(len(x)):
        acc += a_arr[i] * (x[i] - acc)
        y[i] = acc
    return y


def swipe(length=0.42):
    """Airy whoosh that sweeps up in pitch and pans from left to right."""
    n = int(length * SR)
    t = np.linspace(0, 1, n)
    noise = rng.standard_normal(n)
    cut_hi = 500 + 5500 * t ** 1.4
    cut_lo = 150 + 1500 * t ** 1.4
    band = lowpass(noise, cut_hi) - lowpass(noise, cut_lo)
    shape = np.sin(np.pi * t) ** 1.6
    s = band * shape
    s /= np.max(np.abs(s)) + 1e-9
    s *= 0.55
    pan = t  # 0 = left, 1 = right
    left = s * np.cos(pan * np.pi / 2)
    right = s * np.sin(pan * np.pi / 2)
    return np.stack([left, right], 1)


def chime():
    """Bright two-note 'success' sound."""
    out = []
    for f, dl in ((1318.5, 0.0), (1975.5, 0.075)):
        n = int(0.55 * SR)
        t = np.arange(n) / SR
        tone = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)) * env(n, 0.002, 0.16)
        out.append((int(dl * SR), tone * 0.35))
    total = max(o + len(x) for o, x in out)
    s = np.zeros(total)
    for o, x in out:
        s[o:o + len(x)] += x
    return np.stack([s, s], 1)


track = np.zeros((int(DUR * SR), 2))


def put(at, snd, gain=1.0):
    i = int(at * SR)
    j = min(len(track), i + len(snd))
    track[i:j] += snd[: j - i] * gain


# Swipes between scenes (transition centred on each scene boundary)
for b in (3.6, 7.2, 10.8, 14.2):
    put(b - 0.3, swipe(), 2.0)

# Scene 1: blocks drop in, drag & drop, button lands
for at in (0.8, 1.1, 1.4):
    put(at + 0.05, click(0.8))
put(1.75, click(0.6, 1.2))          # pick up
put(2.8, click(1.0, 0.9))           # drop
put(3.02, click(0.7))

# Scene 2: arrow, typing, copy
put(4.42, click(0.8, 0.9))
for at in (4.7, 4.95, 5.2, 5.45, 5.7, 5.95, 6.2, 6.45, 6.6):
    for k in range(3):
        put(at + k * 0.09, key())
put(6.62, click(1.0))
put(6.7, chime(), 0.8)

# Scene 3: success ring + cards
put(8.12, chime())
put(8.42, click(0.7))
put(8.72, click(0.7))

# Scene 4: tiles + CTA
for i, at in enumerate((10.95, 11.1, 11.2, 11.3, 11.4, 11.5)):
    put(at + 0.03, click(0.55, 1.0 + i * 0.06))
put(11.82, click(0.9, 0.85))

# Scene 5: logo + URL
put(14.32, click(0.9, 0.7))
put(15.02, click(1.0))
put(15.1, chime(), 0.7)

peak = np.max(np.abs(track))
track = track / peak * 0.85
pcm = (track * 32767).astype("<i2")
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
