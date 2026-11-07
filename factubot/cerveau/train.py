# Cerveau de FactuBot : un mini-GPT qui apprend le francais en lisant, puis se fait corriger par un
# JUGE STRICT (LanguageTool, correcteur libre). Seules les phrases jugees parfaites servent a le
# re-entrainer : il s'ameliore a chaque tour. Export final : cerveau.bin, lisible dans le navigateur.
#
#   python train.py --corpus train.txt --out cerveau.bin --taille cpu --minutes 60 --juge api
#   (sur Kaggle / Colab avec GPU : --taille gpu --minutes 180 --juge local)
import argparse, json, math, os, random, re, struct, sys, time, urllib.parse, urllib.request
import torch, torch.nn as nn, torch.nn.functional as F
from tokenizers import Tokenizer, models, pre_tokenizers, decoders, trainers

p = argparse.ArgumentParser()
p.add_argument('--corpus', required=True); p.add_argument('--out', default='cerveau.bin')
p.add_argument('--taille', default='cpu', choices=['mini', 'cpu', 'gpu']); p.add_argument('--minutes', type=float, default=60)
p.add_argument('--juge', default='api', choices=['api', 'local', 'aucun']); p.add_argument('--tours', type=int, default=3)
p.add_argument('--phrases-par-tour', type=int, default=400)
a = p.parse_args()
dev = 'cuda' if torch.cuda.is_available() else 'cpu'
torch.manual_seed(0); random.seed(0)
CFG = {'mini': dict(vocab=2048, n_layer=2, n_embd=128, n_head=4, block=64, batch=32),
       'cpu': dict(vocab=4096, n_layer=4, n_embd=256, n_head=4, block=96, batch=32),
       'gpu': dict(vocab=8192, n_layer=6, n_embd=384, n_head=6, block=128, batch=64)}[a.taille]
EOS = '\n'

# ---------- 1. tokenizer : decoupe le texte en morceaux de mots (BPE au niveau des octets) ----------
lines = open(a.corpus, encoding='utf-8').read().split('\n')
lines = [l for l in lines if l.strip()]
tok = Tokenizer(models.BPE())
tok.pre_tokenizer = pre_tokenizers.ByteLevel(add_prefix_space=False)
tok.decoder = decoders.ByteLevel()
tok.train_from_iterator(lines, trainers.BpeTrainer(vocab_size=CFG['vocab'], special_tokens=['<s>'], initial_alphabet=pre_tokenizers.ByteLevel.alphabet()))
BOS = tok.token_to_id('<s>'); NL = tok.encode('\n').ids[0]
V = tok.get_vocab_size()
print(f'tokenizer : {V} morceaux de mots, {len(lines)} phrases')
ids = []
for i in range(0, len(lines), 5000):
    for e in tok.encode_batch(lines[i:i + 5000]): ids += [BOS] + e.ids + [NL]
data = torch.tensor(ids, dtype=torch.long)
print(f'corpus : {len(data) / 1e6:.1f} M morceaux')

# ---------- 2. le mini-GPT ----------
class Block(nn.Module):
    def __init__(s, C, H):
        super().__init__(); s.H = H
        s.ln1 = nn.LayerNorm(C); s.attn = nn.Linear(C, 3 * C, bias=False); s.proj = nn.Linear(C, C, bias=False)
        s.ln2 = nn.LayerNorm(C); s.fc = nn.Linear(C, 4 * C, bias=False); s.fc2 = nn.Linear(4 * C, C, bias=False)
    def forward(s, x):
        B, T, C = x.shape
        q, k, v = s.attn(s.ln1(x)).split(C, 2)
        q, k, v = (t.view(B, T, s.H, C // s.H).transpose(1, 2) for t in (q, k, v))
        y = F.scaled_dot_product_attention(q, k, v, is_causal=True).transpose(1, 2).reshape(B, T, C)
        x = x + s.proj(y)
        return x + s.fc2(F.gelu(s.fc(s.ln2(x)), approximate='tanh'))
class GPT(nn.Module):
    def __init__(s, c):
        super().__init__(); s.c = c
        s.wte = nn.Embedding(V, c['n_embd']); s.wpe = nn.Embedding(c['block'], c['n_embd'])
        s.blocks = nn.ModuleList(Block(c['n_embd'], c['n_head']) for _ in range(c['n_layer'])); s.lnf = nn.LayerNorm(c['n_embd'])
        s.apply(lambda m: nn.init.normal_(m.weight, 0, .02) if isinstance(m, (nn.Linear, nn.Embedding)) else None)
    def forward(s, idx, tgt=None):
        x = s.wte(idx) + s.wpe(torch.arange(idx.shape[1], device=idx.device))
        for b in s.blocks: x = b(x)
        logits = s.lnf(x) @ s.wte.weight.T                     # sortie liee a l'entree (moins de poids)
        return logits if tgt is None else F.cross_entropy(logits.view(-1, V), tgt.view(-1))
    @torch.no_grad()
    def generate(s, n, temp=.8, topk=40, maxlen=60):
        out = []
        for _ in range(n):
            x = torch.tensor([[BOS]], device=dev)
            for _ in range(maxlen):
                l = s(x[:, -s.c['block']:])[0, -1] / temp
                v, _ = torch.topk(l, topk); l[l < v[-1]] = -1e9
                t = torch.multinomial(F.softmax(l, -1), 1)
                if t.item() == NL: break
                x = torch.cat([x, t.view(1, 1)], 1)
            out.append(tok.decode(x[0, 1:].tolist()).strip())
        return out

model = GPT(CFG).to(dev)
print(f'mini-GPT : {sum(p.numel() for p in model.parameters()) / 1e6:.1f} M reglages')

def batches(src):
    T, B = CFG['block'], CFG['batch']
    i = torch.randint(0, len(src) - T - 1, (B,))
    return torch.stack([src[j:j + T] for j in i]).to(dev), torch.stack([src[j + 1:j + T + 1] for j in i]).to(dev)

def train(src, minutes, lr, label):
    opt = torch.optim.AdamW(model.parameters(), lr=lr, betas=(.9, .95), weight_decay=.1)
    t0, step, ema = time.time(), 0, None
    end = t0 + minutes * 60
    model.train()
    while time.time() < end:
        frac = (time.time() - t0) / (minutes * 60)
        for g in opt.param_groups: g['lr'] = lr * min(1, step / 200) * (.1 + .9 * .5 * (1 + math.cos(math.pi * frac)))
        x, y = batches(src)
        with torch.autocast(dev, dtype=torch.bfloat16, enabled=dev == 'cuda'): loss = model(x, y)
        opt.zero_grad(set_to_none=True); loss.backward(); torch.nn.utils.clip_grad_norm_(model.parameters(), 1); opt.step()
        ema = loss.item() if ema is None else .98 * ema + .02 * loss.item(); step += 1
        if step % 200 == 0: print(f'{label} etape {step} perte {ema:.3f} ({(time.time() - t0) / 60:.1f} min)', flush=True)
    model.eval(); return ema

# ---------- 3. le juge strict : LanguageTool ----------
IGNORE = re.compile(r'APOS|ESPACE|WHITESPACE|TYPOGRAPH|NBSP|FRENCH_WHITESPACE|UPPERCASE_SENTENCE_START', re.I)
def lt_check(text):
    if a.juge == 'local':
        global _lt
        if '_lt' not in globals():
            import language_tool_python; _lt = language_tool_python.LanguageTool('fr')
        return [{'offset': m.offset, 'length': m.errorLength, 'rule': {'id': m.ruleId}} for m in _lt.check(text)]
    body = urllib.parse.urlencode({'text': text, 'language': 'fr'}).encode()
    for k in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request('https://api.languagetool.org/v2/check', body), timeout=60) as r:
                return json.load(r)['matches']
        except Exception as e:
            time.sleep(15 * (k + 1))
    raise RuntimeError('LanguageTool injoignable')
REP = re.compile(r'\b(\w{4,})\b.*\b\1\b', re.I)
def judge(sents):
    """renvoie les phrases sans AUCUNE faute (+ 5-30 mots, majuscule, point final, pas de mot repete, pas deja dite)"""
    good, i, seen = [], 0, set()
    while i < len(sents):
        chunk = []; size = 0
        while i < len(sents) and size < 6000: chunk.append(sents[i]); size += len(sents[i]) + 1; i += 1
        text = '\n'.join(chunk); bad = set(); starts = []; o = 0
        for s in chunk: starts.append(o); o += len(s) + 1
        for m in lt_check(text):
            if IGNORE.search(m['rule']['id']): continue
            k = max(j for j, st in enumerate(starts) if st <= m['offset']); bad.add(k)
        for k, s in enumerate(chunk):
            n = len(s.split())
            if k not in bad and 5 <= n <= 30 and s[:1].isupper() and s[-1:] in '.!?' and not REP.search(s) and s not in seen: good.append(s); seen.add(s)
        if a.juge == 'api': time.sleep(4)                       # API publique gratuite : 20 requetes / minute
    return good

# ---------- 4. programme : lire, ecrire, se faire corriger, recommencer ----------
stats = {'tours': []}
train_min = a.minutes * (.75 if a.juge != 'aucun' else 1)
loss = train(data, train_min, 3e-3 if a.taille != 'gpu' else 1e-3, 'lecture')
stats['perte'] = round(loss, 3)
if a.juge != 'aucun':
    per_round = a.minutes * .25 / max(1, a.tours)
    for r in range(a.tours):
        sents = model.generate(a.phrases_par_tour)
        good = judge(sents)
        rate = round(100 * len(good) / len(sents), 1)
        print(f'tour {r + 1} : {len(good)}/{len(sents)} phrases jugees parfaites ({rate} %)', flush=True)
        stats['tours'].append(rate)
        if r == a.tours - 1 or not good: break
        # il relit ses meilleures phrases, melangees a ses lectures pour ne rien oublier
        g = []
        for s in good: g += [BOS] + tok.encode(s).ids + [NL]
        gt = torch.tensor(g, dtype=torch.long)
        k = len(data) // 20; st0 = torch.randint(0, len(data) - 3 * k, (1,)).item()
        mix = torch.cat([gt.repeat(k // len(gt) + 1)[:k], data[st0:st0 + 3 * k]])     # 25 % ses phrases parfaites, 75 % lectures
        train(mix, per_round, 3e-4, f'correction {r + 1}')
stats['exemples'] = [s for s in judge(model.generate(40))][:12] if a.juge != 'aucun' else model.generate(12)

# ---------- 5. export pour le navigateur : poids en int8 (+ echelle par ligne) ----------
tensors, blob = [], bytearray()
def put(name, t, quant):
    t = t.detach().float().cpu().contiguous()
    if quant and t.dim() == 2:
        sc = t.abs().amax(1).clamp(min=1e-8) / 127
        q = torch.round(t / sc[:, None]).clamp(-127, 127).to(torch.int8)
        tensors.append({'n': name, 's': list(t.shape), 'q': 1, 'o': len(blob)}); blob.extend(q.numpy().tobytes())
        while len(blob) % 4: blob.append(0)
        tensors[-1]['so'] = len(blob); blob.extend(sc.numpy().astype('<f4').tobytes())
    else:
        tensors.append({'n': name, 's': list(t.shape), 'q': 0, 'o': len(blob)}); blob.extend(t.numpy().astype('<f4').tobytes())
    while len(blob) % 4: blob.append(0)
sd = model.state_dict()
for k, t in sd.items(): put(k, t, quant=('weight' in k and t.dim() == 2 and 'wpe' not in k))
vocab = [None] * V
for s, i in tok.get_vocab().items(): vocab[i] = s
head = json.dumps({'cfg': CFG | {'V': V, 'bos': BOS, 'nl': NL}, 'tensors': tensors, 'vocab': vocab, 'stats': stats}, ensure_ascii=False).encode()
pad = (4 - (8 + len(head)) % 4) % 4
with open(a.out, 'wb') as f:
    f.write(b'FBC1'); f.write(struct.pack('<I', len(head) + pad)); f.write(head + b' ' * pad); f.write(blob)
torch.save({'cfg': CFG, 'sd': sd}, a.out + '.pt'); tok.save(a.out + '.tokenizer.json')
print('exporte', a.out, round(os.path.getsize(a.out) / 1e6, 1), 'Mo', json.dumps(stats, ensure_ascii=False))
