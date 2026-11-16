'use client';
import { useEffect, useRef, useState } from 'react';
import { Wallet, CheckCircle2, Loader2, X, Coins, AlertCircle } from 'lucide-react';
import { useFmt } from '@/lib/cur';

function useCountUp(target: number | null) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (target === null) return;
    const s = performance.now(), f = from.current;
    let raf = 0;
    const step = (n: number) => {
      const p = Math.min((n - s) / 900, 1);
      const cur = Math.round(f + (target - f) * (1 - Math.pow(1 - p, 3)));
      setV(cur); from.current = cur;
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

const PACKS = [10, 50];

export default function WalletCard() {
  const [balance, setBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [zlt, setZlt] = useState<number | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const shown = useCountUp(balance);
  const f = useFmt();

  useEffect(() => { fetch('/api/wallet/balance').then(r => r.json()).then(d => { setBalance(d.cents ?? 0); setZlt(d.balance ?? 0); }); }, []);

  async function deposit(pack: number) {
    setBusy(pack); setErr('');
    const r = await fetch('/api/wallet/deposit-mock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pack }) });
    const d = await r.json().catch(() => ({}));
    setBusy(null);
    if (r.ok) { setBalance(d.cents); setOk('+' + f(d.added) + ' ajoutés'); } else setErr(r.status === 403 ? 'Le rechargement n’est pas encore activé.' : d.error ?? 'Erreur serveur');
  }
  async function buyZlt() {
    setBusy(0); setErr('');
    const r = await fetch('/api/wallet/zlt', { method: 'POST' });
    const d = await r.json().catch(() => ({}));
    setBusy(null);
    if (r.ok) { setBalance(d.cents); setZlt(d.balance); setOk('+100 ZLT ajoutés'); } else setErr(d.error ?? 'Erreur serveur');
  }

  return (
    <div className='w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-xl'>
      <div className='flex items-center gap-2 text-slate-400'><Wallet size={18} /> Mon solde</div>
      <div className='mt-3 h-10'>
        {balance === null
          ? <div className='h-9 w-40 animate-pulse rounded-lg bg-slate-800' />
          : <span className='text-4xl font-bold tabular-nums'>{f(shown)}</span>}
      </div>
      <p className='mt-1 flex items-center gap-1.5 text-sm text-slate-400'><Coins size={14} className='text-amber-300' />{zlt === null ? '…' : zlt.toLocaleString('fr-FR')} ZLT <span className='text-xs text-slate-500'>(pour la boutique d’avantages)</span></p>
      <div className='mt-5 grid grid-cols-2 gap-3'>
        {PACKS.map(p => (
          <button key={p} onClick={() => deposit(p)} disabled={busy !== null}
            className='rounded-xl bg-indigo-600 px-3 py-3 text-sm font-medium transition hover:-translate-y-0.5 hover:bg-indigo-500 active:scale-95 disabled:opacity-60'>
            {busy === p ? <Loader2 className='mx-auto animate-spin' size={18} /> : <>Recharger <span className='block text-xs text-indigo-200'>+{f(p * 100)}</span></>}
          </button>
        ))}
      </div>
      <button onClick={buyZlt} disabled={busy !== null} className='mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-2.5 text-sm transition hover:bg-slate-700 active:scale-95 disabled:opacity-60'>
        {busy === 0 ? <Loader2 size={16} className='animate-spin' /> : <Coins size={16} className='text-amber-300' />}Obtenir 100 ZLT pour {f(1000)}
      </button>
      {err && <p className='anim-fade mt-3 flex items-center gap-2 text-sm text-rose-400'><AlertCircle size={16} />{err}</p>}
      {ok !== null && (
        <div className='anim-fade fixed inset-0 z-50 flex items-center justify-center bg-black/60' onClick={() => setOk(null)}>
          <div className='anim-pop relative rounded-2xl bg-slate-900 p-8 text-center' onClick={e => e.stopPropagation()}>
            <button onClick={() => setOk(null)} className='absolute right-3 top-3 text-slate-500 transition hover:text-white'><X size={18} /></button>
            <CheckCircle2 size={56} className='anim-pop mx-auto text-emerald-400' />
            <p className='mt-3 text-lg font-semibold'>C’est fait</p>
            <p className='text-slate-400'>{ok}</p>
          </div>
        </div>
      )}
    </div>
  );
}
