'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PackageOpen, Loader2, Truck, CheckCircle2, XCircle, AlertTriangle, MessageCircle, X, Clock } from 'lucide-react';
import { useFmt } from '@/lib/cur';
import ChatBox from './ChatBox';

type St = 'PAID' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
type O = { id: string; title: string; amount: number; amountCents: number; status: St; deliveryNote: string | null; createdAt: string; role: 'buyer' | 'seller'; peerId: string; peerName: string };

const LABEL: Record<St, [string, string]> = {
  PAID: ['En attente de livraison', 'bg-amber-500/15 text-amber-300'],
  DELIVERED: ['Livrée, à confirmer', 'bg-sky-500/15 text-sky-300'],
  COMPLETED: ['Terminée', 'bg-emerald-500/15 text-emerald-300'],
  CANCELLED: ['Annulée et remboursée', 'bg-slate-700 text-slate-300'],
  DISPUTED: ['Litige en cours', 'bg-rose-500/15 text-rose-300'],
};
const STEPS: St[] = ['PAID', 'DELIVERED', 'COMPLETED'];

export default function Orders({ meId }: { meId: string }) {
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [items, setItems] = useState<O[] | null>(null);
  const f = useFmt();
  const [busy, setBusy] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [chat, setChat] = useState<O | null>(null);

  const load = () => fetch('/api/orders').then(r => r.json()).then(d => setItems(d.items ?? [])).catch(() => setItems([]));
  useEffect(() => { load(); const i = setInterval(load, 10000); return () => clearInterval(i); }, []);

  async function act(id: string, action: string) {
    setBusy(id + action); setErr('');
    const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, note: notes[id] }) });
    const d = await r.json().catch(() => ({}));
    setBusy('');
    if (!r.ok) setErr(d.error ?? 'Erreur serveur');
    load();
  }
  const btn = (o: O, action: string, label: string, Icon: any, tone = 'bg-indigo-600 hover:bg-indigo-500') => (
    <button key={action} onClick={() => act(o.id, action)} disabled={!!busy}
      className={'flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition active:scale-95 disabled:opacity-60 ' + tone}>
      {busy === o.id + action ? <Loader2 size={16} className='animate-spin' /> : <Icon size={16} />}{label}
    </button>
  );

  const list = (items ?? []).filter(o => o.role === role);
  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-2 gap-1 rounded-xl bg-slate-900 p-1 text-sm ring-1 ring-white/10'>
        {(['buyer', 'seller'] as const).map(r => (
          <button key={r} onClick={() => setRole(r)} className={'rounded-lg py-2 transition ' + (role === r ? 'bg-indigo-600' : 'text-slate-400 hover:text-white')}>{r === 'buyer' ? 'Mes achats' : 'Mes ventes'}</button>
        ))}
      </div>
      {err && <p className='anim-fade text-sm text-rose-400'>{err}</p>}
      {items === null ? <div className='h-32 animate-pulse rounded-2xl bg-slate-900' /> : list.length === 0 ? (
        <div className='anim-fade flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 py-16 text-slate-500'>
          <PackageOpen size={36} /><p>{role === 'buyer' ? 'Aucun achat pour le moment' : 'Aucune vente pour le moment'}</p>
        </div>
      ) : list.map((o, i) => {
        const idx = STEPS.indexOf(o.status);
        const [lab, tone] = LABEL[o.status];
        const seller = o.role === 'seller';
        return (
          <div key={o.id} style={{ animationDelay: Math.min(i, 8) * 40 + 'ms' }} className='anim-slide space-y-3 rounded-2xl border border-white/10 bg-slate-900 p-4'>
            <div className='flex items-start justify-between gap-2'>
              <div className='min-w-0'>
                <p className='truncate font-semibold'>{o.title}</p>
                <p className='text-xs text-slate-500'>{seller ? 'Acheteur' : 'Vendeur'} : <Link href={'/seller/' + o.peerId} className='hover:text-slate-300 hover:underline'>{o.peerName}</Link> · {new Date(o.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
              <div className='shrink-0 text-right'>
                <p className='font-semibold tabular-nums'>{o.amountCents ? f(o.amountCents) : o.amount + ' ZLT'}</p>
                <span className={'mt-1 inline-block rounded-full px-2 py-0.5 text-xs ' + tone}>{lab}</span>
              </div>
            </div>
            {idx >= 0 && (
              <div className='flex gap-1.5'>
                {STEPS.map((s, k) => <span key={s} className={'h-1.5 flex-1 rounded-full transition-colors duration-500 ' + (k <= idx ? 'bg-indigo-500' : 'bg-slate-800')} />)}
              </div>
            )}
            {o.deliveryNote && !seller && <p className='rounded-xl bg-slate-800 p-3 text-sm text-slate-300'>{o.deliveryNote}</p>}
            {seller && o.status === 'PAID' && (
              <textarea value={notes[o.id] ?? ''} onChange={e => setNotes({ ...notes, [o.id]: e.target.value })} maxLength={1000} placeholder='Message de livraison (instructions, code…)'
                className='h-20 w-full resize-none rounded-xl bg-slate-800 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500' />
            )}
            <div className='flex flex-wrap items-center gap-2'>
              {seller && o.status === 'PAID' && btn(o, 'DELIVER', 'Marquer comme livré', Truck)}
              {!seller && o.status === 'DELIVERED' && btn(o, 'CONFIRM', 'Confirmer la réception', CheckCircle2)}
              {!seller && o.status === 'DELIVERED' && btn(o, 'DISPUTE', 'Signaler un problème', AlertTriangle, 'bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300')}
              {((!seller && o.status === 'PAID') || (seller && (o.status === 'PAID' || o.status === 'DELIVERED'))) && btn(o, 'CANCEL', 'Annuler et rembourser', XCircle, 'bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300')}
              {seller && o.status === 'DELIVERED' && <span className='flex items-center gap-1.5 text-xs text-slate-500'><Clock size={14} />Paiement libéré automatiquement 72 h après la livraison</span>}
              {o.status === 'DISPUTED' && <span className='text-xs text-rose-300'>Le paiement reste bloqué le temps de l’examen.</span>}
              <button onClick={() => setChat(o)} className='ml-auto rounded-xl bg-slate-800 p-2.5 transition hover:bg-slate-700 active:scale-90' aria-label='Contacter'><MessageCircle size={16} /></button>
            </div>
          </div>
        );
      })}
      {chat && (
        <div className='anim-fade fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4' onClick={() => setChat(null)}>
          <div className='anim-pop relative' onClick={e => e.stopPropagation()}>
            <button onClick={() => setChat(null)} className='absolute -top-9 right-0 text-slate-300 transition hover:text-white'><X size={22} /></button>
            <p className='mb-2 text-sm text-slate-300'>Discussion avec {chat.peerName}</p>
            <ChatBox meId={meId} peerId={chat.peerId} />
          </div>
        </div>
      )}
    </div>
  );
}
