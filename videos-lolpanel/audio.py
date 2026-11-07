"""Bande son de la pub lolpanel : musique chill synthétisée + sons de clic.
Usage : python3 audio.py sortie.wav DUREE t_clic1 t_clic2 ...
Tout est généré ici (aucun fichier audio externe, donc aucun souci de droits)."""
import sys, wave
import numpy as np

SR = 44100
out, dur, clicks = sys.argv[1], float(sys.argv[2]), [float(x) for x in sys.argv[3:]]
n = int(SR * dur)
t = np.arange(n) / SR
rng = np.random.default_rng(7)

def env(length, a, r):
    e = np.ones(length)
    ai, ri = int(a * SR), int(r * SR)
    e[:ai] = np.linspace(0, 1, ai)
    e[-ri:] *= np.linspace(1, 0, ri)
    return e

def note(f, length, detune=0.0):
    tt = np.arange(length) / SR
    s = np.sin(2 * np.pi * f * tt) + .35 * np.sin(2 * np.pi * f * 2 * tt + .5) + .12 * np.sin(2 * np.pi * f * 3 * tt)
    if detune:
        s += np.sin(2 * np.pi * f * (1 + detune) * tt)
    return s

def hz(m):  # numéro MIDI -> fréquence
    return 440 * 2 ** ((m - 69) / 12)

L = np.zeros(n); R = np.zeros(n)
# 4 accords (Fmaj7, Em7, Dm7, Cmaj9) sur toute la durée
chords = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 55, 59, 62]]
seg = dur / len(chords)
for i, ch in enumerate(chords):
    s0, ln = int(i * seg * SR), int((seg + .8) * SR)
    ln = min(ln, n - s0)
    e = env(ln, 1.2, 1.6)
    for k, m in enumerate(ch):
        v = note(hz(m), ln, detune=.003) * e * .05
        pan = .35 + .3 * (k % 2)
        L[s0:s0 + ln] += v * (1 - pan); R[s0:s0 + ln] += v * pan
    # basse douce
    b = np.sin(2 * np.pi * hz(ch[0] - 12) * np.arange(ln) / SR) * e * .09
    L[s0:s0 + ln] += b; R[s0:s0 + ln] += b

# arpège de notes pincées (croches à 84 BPM)
step = 60 / 84 / 2
for j in range(int(dur / step)):
    st = j * step
    ch = chords[min(int(st / seg), len(chords) - 1)]
    m = ch[[0, 2, 1, 3, 2, 1, 3, 2][j % 8]] + 12
    ln = int(1.2 * SR); s0 = int(st * SR)
    if s0 + ln > n: ln = n - s0
    if ln <= 0: break
    tt = np.arange(ln) / SR
    v = np.sin(2 * np.pi * hz(m) * tt) * np.exp(-tt * 5) * .045
    pan = .5 + .25 * np.sin(j)
    L[s0:s0 + ln] += v * (1 - pan); R[s0:s0 + ln] += v * pan

# léger souffle « vinyle »
L += rng.normal(0, .0025, n); R += rng.normal(0, .0025, n)

# réverbération : convolution FFT avec une réponse impulsionnelle bruitée qui décroît
def reverb(x, seed):
    ir_len = int(2.2 * SR)
    ir = np.random.default_rng(seed).normal(0, 1, ir_len) * np.exp(-np.arange(ir_len) / SR * 2.6)
    ir /= np.abs(ir).sum() / 6
    size = 1 << int(np.ceil(np.log2(len(x) + ir_len)))
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[:len(x)]
    return x * .7 + y * .35
L, R = reverb(L, 1), reverb(R, 2)

# fondu d'entrée et de sortie de la musique
fade = np.ones(n)
fade[:int(1.5 * SR)] = np.linspace(0, 1, int(1.5 * SR))
fade[-int(2 * SR):] = np.linspace(1, 0, int(2 * SR))
L *= fade; R *= fade

# musique calée à un niveau d'écoute confortable (RMS ≈ -21 dBFS), avant d'ajouter les clics
rms = np.sqrt((L ** 2 + R ** 2).mean() / 2)
L, R = L / rms * .09, R / rms * .09

# clics de souris : appui + relâchement, bruit filtré très court
def click(at, gain):
    for off, g in ((0, 1), (.055, .6)):
        s0 = int((at + off) * SR); ln = int(.012 * SR)
        if s0 + ln > n: continue
        tt = np.arange(ln) / SR
        noise = np.diff(rng.normal(0, 1, ln + 1))  # bruit « aigu »
        c = (noise * .5 + np.sin(2 * np.pi * 2600 * tt)) * np.exp(-tt * 900)
        c = c / np.abs(c).max() * gain * g
        L[s0:s0 + ln] += c; R[s0:s0 + ln] += c
for c in clicks:
    click(c, .4)

L, R = np.tanh(L * 1.1) / 1.1, np.tanh(R * 1.1) / 1.1  # limiteur doux, aucun écrêtage
data = (np.stack([L, R], 1) * 32767).astype('<i2').tobytes()
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data)
print('OK', out)
