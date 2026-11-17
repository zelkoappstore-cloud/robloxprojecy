'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BadgeCheck, MessageCircle, X, PackageX, ShieldCheck } from 'lucide-react';
import BuyButton from './BuyButton';
import ChatBox from './ChatBox';
import { catLabel } from '@/lib/money';
import { useFmt } from '@/lib/cur';
import ReportButton from './ReportButton';
import { Rating } from './Stars';

type D = {
  listing: { id: string; title: string; description: string; price: number; category: string; images: string[]; createdAt: string };
  seller: { id: string; username: string; badge: boolean; avatar: string; since: string; sales: number; rating: { avg: number | null; count: number } };
};

export default function ListingView({ id, meId }: { id: string; meId: string }) {
  const [d, setD] = useState<D | null | undefined>(undefined);
  const [chat, setChat] = useState(false);
  const [pic, setPic] = useState(0);
  const f = useFmt();
  useEffect(() => { fetch('/api/listings/' + id).then(r => r.ok ? r.json() : null).then(setD).catch(() => setD(null)); }, [id]);

  const back = <Link href='/' className='mb-4 inline-flex items-center gap-1 text-sm text-slate-400 transition hover:text-white'><ArrowLeft size={16} />Catalogue</Link>;
  if (d === undefined) return <div>{back}<div className='h-64 animate-pulse rounded-2xl bg-slate-900' /></div>;
  if (d === null) return (
    <div>{back}
      <div className='anim-fade flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 py-16 text-slate-500'><PackageX size={36} /><p>Annonce introuvable ou supprimée</p></div>
    </div>
  );
  const { listing: l, seller: s } = d;
  const own = s.id === meId;
  return (
    <div className='anim-slide'>
      {back}
      <div className='grid gap-4 md:grid-cols-3'>
        <div className='space-y-3 rounded-2xl border border-white/10 bg-slate-900 p-6 md:col-span-2'>
          {l.images.length > 0 && (
            <div className='-mx-2 -mt-2 space-y-2'>
              <img src={l.images[pic] ?? l.images[0]} alt={l.title} className='anim-fade max-h-96 w-full rounded-xl bg-slate-800 object-contain' key={pic} />
              {l.images.length > 1 && (
                <div className='flex gap-2 overflow-x-auto'>
                  {l.images.map((src, k) => (
                    <button key={k} onClick={() => setPic(k)} aria-label={'Photo ' + (k + 1)} className={'h-16 w-16 shrink-0 overflow-hidden rounded-lg ring-2 transition ' + (k === pic ? 'ring-indigo-500' : 'ring-white/10 opacity-70 hover:opacity-100')}>
                      <img src={src} alt='' className='h-full w-full object-cover' />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <span className='inline-block rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400'>{catLabel(l.category)}</span>
          <h1 className='text-2xl font-bold leading-tight'>{l.title}</h1>
          <p className='text-xs text-slate-500'>Publiée le {new Date(l.createdAt).toLocaleDateString('fr-FR')}</p>
          <p className='whitespace-pre-wrap text-slate-300'>{l.description}</p>
        </div>
        <div className='space-y-4'>
          <div className='space-y-3 rounded-2xl border border-white/10 bg-slate-900 p-5'>
            <p className='text-3xl font-bold tabular-nums'>{f(l.price)}</p>
            {own ? <p className='text-sm text-slate-500'>C’est votre annonce.</p> : (
              <div className='flex items-center gap-2'>
                <BuyButton listingId={l.id} price={l.price} />
                <button onClick={() => setChat(true)} className='rounded-xl bg-slate-800 p-2.5 transition hover:bg-slate-700 active:scale-90' aria-label='Contacter'><MessageCircle size={18} /></button>
              </div>
            )}
            <p className='flex items-start gap-2 text-xs text-slate-400'><ShieldCheck size={16} className='mt-0.5 shrink-0 text-emerald-400' />Paiement sécurisé : votre argent est bloqué jusqu’à la confirmation de réception.</p>
          </div>
          <Link href={'/seller/' + s.id} className='block rounded-2xl border border-white/10 bg-slate-900 p-5 transition hover:border-indigo-500/50'>
            <p className='flex items-center gap-2 font-semibold'>{s.avatar ? <img src={s.avatar} alt='' className='h-8 w-8 rounded-full object-cover' /> : <span className='flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm uppercase'>{s.username.charAt(0)}</span>}{s.username}{s.badge && <BadgeCheck size={16} className='text-indigo-400' />}</p>
            <p className='mt-2'><Rating r={s.rating} /></p>
            <p className='mt-1 text-xs text-slate-400'>{s.sales} vente{s.sales > 1 ? 's' : ''} · membre depuis {new Date(s.since).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</p>
          </Link>
          {!own && <div className='px-1'><ReportButton listingId={l.id} /></div>}
        </div>
      </div>
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
