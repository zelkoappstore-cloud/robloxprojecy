'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Crown, ArrowLeft, BadgeCheck, MessageCircle, X, UserX, PackageOpen } from 'lucide-react';
import ChatBox from './ChatBox';
import { useFmt } from '@/lib/cur';

type D = {
  seller: { id: string; username: string; badge: boolean; avatar: string; founder: boolean; bio: string; since: string; sales: number };
  listings: { id: string; title: string; description: string; price: number; thumb: string }[];
};

export default function SellerView({ id, meId }: { id: string; meId: string }) {
  const [d, setD] = useState<D | null | undefined>(undefined);
  const [chat, setChat] = useState(false);
  const f = useFmt();
  useEffect(() => { fetch('/api/sellers/' + id).then(r => r.ok ? r.json() : null).then(setD).catch(() => setD(null)); }, [id]);

  const back = <Link href='/' className='mb-4 inline-flex items-center gap-1 text-sm text-slate-400 transition hover:text-white'><ArrowLeft size={16} />Catalogue</Link>;
  if (d === undefined) return <div>{back}<div className='h-40 animate-pulse rounded-2xl bg-slate-900' /></div>;
  if (d === null) return (
    <div>{back}
      <div className='anim-fade flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 py-16 text-slate-500'><UserX size={36} /><p>Profil introuvable</p></div>
    </div>
  );
  const { seller: s, listings } = d;
  return (
    <div className='anim-slide space-y-5'>
      {back}
      <div className='flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900 p-6 sm:flex-row sm:items-center'>
        <div className='flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-600 text-2xl font-bold uppercase'>{s.avatar ? <img src={s.avatar} alt='' className='h-full w-full object-cover' /> : s.username.charAt(0)}</div>
        <div className='min-w-0 flex-1'>
          <p className='flex items-center gap-2 text-xl font-bold'>{s.username}{s.badge && <BadgeCheck size={20} className='text-indigo-400' />}{s.founder && <span className='inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-300'><Crown size={12} />Fondateur</span>}</p>
          <p className='text-sm text-slate-400'>{s.sales} vente{s.sales > 1 ? 's' : ''} terminée{s.sales > 1 ? 's' : ''} · membre depuis {new Date(s.since).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
          {s.bio && <p className='mt-2 text-sm text-slate-300'>{s.bio}</p>}
        </div>
        {s.id !== meId && <button onClick={() => setChat(true)} className='flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium transition hover:bg-indigo-500 active:scale-95'><MessageCircle size={16} />Contacter</button>}
      </div>
      <h2 className='font-semibold'>Annonces ({listings.length})</h2>
      {listings.length === 0 ? (
        <div className='anim-fade flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 py-12 text-slate-500'><PackageOpen size={32} /><p>Aucune annonce active</p></div>
      ) : (
        <div className='grid gap-3 sm:grid-cols-2'>
          {listings.map((l, i) => (
            <Link key={l.id} href={'/listing/' + l.id} style={{ animationDelay: Math.min(i, 8) * 40 + 'ms' }} className='anim-slide flex gap-3 rounded-2xl border border-white/10 bg-slate-900 p-3 transition hover:-translate-y-0.5 hover:border-indigo-500/50'>
              {l.thumb ? <img src={l.thumb} alt='' loading='lazy' className='h-20 w-20 shrink-0 rounded-xl object-cover' /> : <div className='h-20 w-20 shrink-0 rounded-xl bg-slate-800' />}
              <div className='min-w-0'>
              <p className='font-semibold'>{l.title}</p>
              <p className='mt-1 line-clamp-2 text-sm text-slate-400'>{l.description}</p>
              <p className='mt-2 text-sm font-semibold text-indigo-400'>{f(l.price)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
      {chat && (
        <div className='anim-fade fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4' onClick={() => setChat(false)}>
          <div className='anim-pop relative' onClick={e => e.stopPropagation()}>
            <button onClick={() => setChat(false)} className='absolute -top-9 right-0 text-slate-300 transition hover:text-white'><X size={22} /></button>
            <p className='mb-2 text-sm text-slate-300'>Discussion avec {s.username}</p>
            <ChatBox meId={meId} peerId={s.id} />
          </div>
        </div>
      )}
    </div>
  );
}
