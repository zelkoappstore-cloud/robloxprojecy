# Prepare le corpus d'entrainement du cerveau de FactuBot : du francais 100 % libre de droits.
#  - Wikipedia en francais (CC BY-SA, citee dans le site)
#  - Livres du domaine public numerises par la BnF / Gallica (corpus PleIAs French-PD-Books)
# Sortie : un fichier texte, une phrase par ligne, nettoyee.
# Usage : python prepare.py sortie.txt MAX_MO fichier1.parquet [fichier2.parquet ...]
import re, sys, random
import pyarrow.parquet as pq

out, max_mb, files = sys.argv[1], float(sys.argv[2]), sys.argv[3:]
OK = re.compile(r"^[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŒ][A-Za-zÀ-ÖØ-öø-ÿœŒ0-9 ,;:'’\-–()«»!?.%]+[.!?]$")
SENT = re.compile(r'(?<=[.!?])\s+(?=[A-ZÀÂÉÈÊÎÔŒ«])')

def clean(t):
    t = t.replace(' ', ' ').replace(' ', ' ').replace("'", '’')
    t = re.sub(r'-\n(\w)', r'\1', t)
    t = re.sub(r'\s+', ' ', t)
    return t

def sentences(text):
    for s in SENT.split(clean(text)):
        s = s.strip().strip('«» ').strip()
        n = len(s.split())
        if 5 <= n <= 30 and OK.match(s) and not re.search(r'(\b\w\b ){4}|\.\.|[A-Z]{4}|\d{5}| [,;:.]|[,;:] [,;:.]|\( |\(\)|:$', s) and s.count('(') == s.count(')') and s.count('«') == s.count('»'):
            yield s

def col(pf):
    names = pf.schema_arrow.names
    for c in ('text', 'complete_text', 'content'):
        if c in names: return c
    raise SystemExit(f'colonne texte introuvable : {names}')

budget = max_mb * 1e6 / len(files)
lines = []
for f in files:
    pf = pq.ParquetFile(f); c = col(pf); size = 0
    for b in pf.iter_batches(columns=[c], batch_size=64):
        for text in b.column(0).to_pylist():
            if not text: continue
            for s in sentences(text[:200000]):
                lines.append(s); size += len(s.encode()) + 1
            if size > budget: break
        if size > budget: break
    print(f, 'phrases gardees :', len(lines))
random.seed(0); random.shuffle(lines)
open(out, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
print('total', len(lines), 'phrases,', round(sum(len(l) for l in lines) / 1e6, 1), 'Mo')
