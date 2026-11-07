# Usage : python3 construire_lecture.py js/lecture-modele.json livre1.txt livre2.txt ...  (les livres ne sont PAS dans le depot)
# Construit le modele de lecture de FactuBot a partir de livres (txt). Ne garde AUCUN texte :
# seulement des statistiques (quels mots se suivent souvent) + des empreintes anti-copie.
import re, sys, json, collections, unicodedata
files = sys.argv[2:]; out = sys.argv[1]
APOS = "’"
def clean(t):
    t = t.replace("'", APOS).replace(' ', ' ').replace(' ', ' ').replace('œ', 'œ')
    t = re.sub(r'-\n(\w)', r'\1', t)                       # cesures
    t = re.sub(r'\n\s*\d+\s*\n', '\n', t)                  # numeros de page
    t = re.sub(r'[«»“”"—–_*\[\]()]', ' ', t)
    t = re.sub(r'\s+', ' ', t)
    return t
TOK = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿœŒ]+" + APOS + "?|[.!?,;:…]")
sents = []
for f in files:
    t = clean(open(f, encoding='utf-8', errors='ignore').read())
    for s in re.split(r'(?<=[.!?…])\s+', t):
        toks = TOK.findall(s)
        if len(toks) < 4 or toks[-1] not in '.!?…': continue
        if toks[-1] == '…': toks[-1] = '.'
        if any(len(w) > 1 and w.isupper() for w in toks): continue   # titres en capitales
        sents.append(toks)
# casse : mot en majuscule au milieu des phrases = nom propre
mid = collections.Counter(); low = collections.Counter()
for s in sents:
    for w in s[1:]:
        (mid if w[0].isupper() else low)[w.lower()] += 1
def norm(w, first):
    lw = w.lower()
    if lw[0].isalpha() and mid[lw] > low[lw]: return lw[0].upper() + lw[1:]
    return lw
sents = [[norm(w, i == 0) for i, w in enumerate(s)] for s in sents]
freq = collections.Counter(w for s in sents for w in s)
sents = [s for s in sents if len(s) <= 60]
vocab = sorted({w for s in sents for w in s if freq[w] >= 2}, key=lambda w: -freq[w])
idx = {w: i for i, w in enumerate(vocab)}
S = ['<s>', '<s>']
tri = collections.Counter(); bi = collections.Counter()
for s in sents:
    seq = S + s
    for i in range(2, len(seq)):
        tri[(seq[i-2], seq[i-1], seq[i])] += 1; bi[(seq[i-1], seq[i])] += 1
tri = {k: c for k, c in tri.items() if c >= 2 and all(w == '<s>' or w in idx for w in k)}
bi = {k: c for k, c in bi.items() if c >= 2 and all(w == '<s>' or w in idx for w in k)}
enc = lambda w: -1 if w == '<s>' else idx[w]
T = collections.defaultdict(list); B = collections.defaultdict(list)
for (a, b, c), n in tri.items(): T[f'{enc(a)},{enc(b)}'].append([idx[c], n])
for (b, c), n in bi.items(): B[str(enc(b))].append([idx[c], n])
# accord determinant -> nom, appris dans les livres
PL = {'les','des','ces','mes','tes','ses','nos','vos','leurs','aux'}; SG = {'le','la','un','une','ce','cet','cette','mon','ma','ton','ta','son','sa','au','du'}
M = {'le','un','ce','cet','du','au'}; F = {'la','une','cette','ma','ta','sa'}
num = collections.defaultdict(lambda: [0, 0]); gen = collections.defaultdict(lambda: [0, 0])
for s in sents:
    for a, b in zip(s, s[1:]):
        if a in PL: num[b][1] += 1
        elif a in SG: num[b][0] += 1
        if a in M: gen[b][0] += 1
        elif a in F: gen[b][1] += 1
def side(d):
    r = {}
    for w, (x, y) in d.items():
        if w in idx and x + y >= 3 and max(x, y) / (x + y) >= .9: r[idx[w]] = 0 if x > y else 1
    return r
# anti-copie : empreintes des sequences de 7 jetons que le modele pourrait reproduire
def h(seq):
    x = 2166136261
    for ch in '\u0001'.join(seq):
        x ^= ord(ch); x = (x * 16777619) & 0xffffffff
    return x
cp = set()
for s in sents:
    seq = S + s
    for i in range(2, len(seq) - 6):
        win = seq[i:i+7]
        if all((seq[j-2], seq[j-1], seq[j]) in tri for j in range(i, i + 7)): cp.add(h(win))
for s in sents:
    if len(s) <= 10: cp.add(h(['<S>'] + s))           # phrases courtes recopiees en entier
model = { 'books': len(files), 'words': sum(len(s) for s in sents), 'sentences': len(sents), 'vocab': vocab,
  'tri': T, 'bi': B, 'num': side(num), 'gen': side(gen), 'copy': sorted(cp) }
js = json.dumps(model, ensure_ascii=False, separators=(',', ':'))
open(out, 'w', encoding='utf-8').write(js)
print('phrases', len(sents), 'mots', model['words'], 'vocab', len(vocab), 'tri', len(tri), 'bi', len(bi), 'num', len(model['num']), 'gen', len(model['gen']), 'copy', len(cp), 'taille', len(js))
