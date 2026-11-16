'use client';
import { useState } from 'react';
import { ShoppingCart, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useFmt } from '@/lib/cur';

export default function BuyButton({ listingId, price }: { listingId: string; price: number }) {
  const [open, setOpen] = useState(false);
  const [st, setSt] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');
  const f = useFmt();

  async function buy() {
    setSt('loading');
    const r = await fetch('/api/marketplace/buy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listingId }) });
    const d = await r.json().catch(() => ({}));
    setMsg(d.error ?? ''); setSt(r.ok ? 'ok' : 'err');
  }
  const close = () => { setOpen(false); setSt('idle'); };

  return (
    <>
      <button onClick={() => setOpen(true)} className='inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-medium transition hover:-translate-y-0.5 hover:bg-indigo-500 active:scale-95'>
        <ShoppingCart size={16} /> Acheter · {f(price)}
      </button>
      {open && (
        <div className='anim-fade fixed inset-0 z-50 flex items-center justify-center bg-black/60' onClick={close}>
          <div className='anim-pop w-80 rounded-2xl bg-slate-900 p-6 text-center' onClick={e => e.stopPropagation()}>
            {st === 'ok' ? <><CheckCircle2 size={52} className='anim-pop mx-auto text-emerald-400' /><p className='mt-3 font-semibold'>Achat confirmé</p></>
            : st === 'err' ? <><AlertCircle size={52} className='anim-pop mx-auto text-rose-400' /><p className='mt-3 font-semibold'>{msg}</p></>
            : <><p className='font-semibold'>Confirmer l&apos;achat ?</p><p className='mt-1 text-slate-400'>{f(price)} seront débités de votre solde.</p></>}
            <div className='mt-5 flex gap-3'>
              <button onClick={close} className='flex-1 rounded-lg bg-slate-800 py-2 transition hover:bg-slate-700 active:scale-95'>{st === 'ok' || st === 'err' ? 'Fermer' : 'Annuler'}</button>
              {(st === 'idle' || st === 'loading') && (
                <button onClick={buy} disabled={st === 'loading'} className='flex-1 rounded-lg bg-indigo-600 py-2 transition hover:bg-indigo-500 active:scale-95 disabled:opacity-60'>
                  {st === 'loading' ? <Loader2 size={18} className='mx-auto animate-spin' /> : 'Confirmer'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
