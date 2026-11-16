'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, History as HistoryIcon } from 'lucide-react';
import { useFmt } from '@/lib/cur';

type I = { id: string; amount: number; amountCents: number; at: string; type: 'IN' | 'OUT' };

export default function History() {
  const [items, setItems] = useState<I[] | null>(null);
  const f = useFmt();
  useEffect(() => { fetch('/api/wallet/history').then(r => r.json()).then(d => setItems(d.items ?? [])).catch(() => setItems([])); }, []);
  return (
    <div className='w-full max-w-sm space-y-2'>
      <h2 className='flex items-center gap-2 text-sm font-semibold text-slate-400'><HistoryIcon size={16} />Historique</h2>
      {items === null ? <div className='h-12 animate-pulse rounded-xl bg-slate-900' /> : items.length === 0 ? (
        <p className='anim-fade text-sm text-slate-500'>Aucune transaction.</p>
      ) : items.map(t => (
        <div key={t.id} className='anim-slide flex items-center justify-between rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm'>
          <span className='flex items-center gap-2'>
            {t.type === 'IN' ? <ArrowDownLeft size={16} className='text-emerald-400' /> : <ArrowUpRight size={16} className='text-rose-400' />}
            {t.type === 'IN' ? 'Vente' : 'Achat'}
            <span className='text-xs text-slate-500'>{new Date(t.at).toLocaleDateString('fr-FR')}</span>
          </span>
          <span className={'font-semibold tabular-nums ' + (t.type === 'IN' ? 'text-emerald-400' : 'text-rose-400')}>{t.type === 'IN' ? '+' : '-'}{t.amountCents ? f(t.amountCents) : t.amount + ' ZLT'}</span>
        </div>
      ))}
    </div>
  );
}
