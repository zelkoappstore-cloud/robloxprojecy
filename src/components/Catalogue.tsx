'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, BadgeCheck, Rocket, MessageCircle, X, PackageOpen } from 'lucide-react';
import BuyButton from './BuyButton';
import ChatBox from './ChatBox';
import { CATEGORIES, catLabel } from '@/lib/money';
import { useFmt } from '@/lib/cur';

type L = { id: string; title: string; description: string; price: number; category: string; thumb: string; sellerId: string; sellerName: string; badge: boolean; featured: boolean };

export default function Catalogue({ meId }: { meId: string }) {
  const [items, setItems] = useState<L[] | null>(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [chat, setChat] = useState<L | null>(null);
  const f = useFmt();

  useEffect(() => {
    const t = setTimeout(() => {
      fetch('/api/listings?q=' + encodeURIComponent(q) + '&cat=' + cat).then(r => r.json()).then(d => setItems(d.listings ?? [])).catch(() => setItems([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, cat]);

  return (
    <div className='space-y-4'>
      <div className='relative'>
        <Search size={16} className='absolute left-3 top-3 text-slate-500' />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder='Rechercher une annonce'
          className='w-full rounded-xl bg-slate-900 py-2.5 pl-9 pr-3 text-sm outline-none ring-1 ring-white/10 transition focus:ring-2 focus:ring-indigo-500' />
      </div>
      <div className='-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0' style={{ scrollbarWidth: 'none' }}>
        {[{ id: '', label: 'Tout' }, ...CATEGORIES].map(c => (
          <button key={c.id} onClick={() => { setCat(c.id); setItems(null); }}
            className={'shrink-0 rounded-full px-3.5 py-1.5 text-sm transition active:scale-95 ' + (cat === c.id ? 'bg-indigo-600 font-medium' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>{c.label}</button>
        ))}
      </div>
      {items === null ? (
        <div className='grid gap-3 sm:grid-cols-2'>{[0, 1, 2, 3].map(i => <div key={i} className='h-40 animate-pulse rounded-2xl bg-slate-900' />)}</div>
      ) : items.length === 0 ? (
        <div className='anim-fade flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 py-16 text-slate-500'>
          <PackageOpen size={36} />
          <p>{q || cat ? 'Aucun résultat' : 'Aucune annonce pour le moment'}</p>
        </div>
      ) : (
        <div className='grid gap-3 sm:grid-cols-2'>
          {items.map((l, i) => (
            <div key={l.id} style={{ animationDelay: Math.min(i, 8) * 40 + 'ms' }}
              className='anim-slide flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900 transition hover:-translate-y-0.5 hover:border-indigo-500/50'>
              <Link href={'/listing/' + l.id} className='relative block aspect-[4/3] bg-slate-800'>
                {l.thumb ? <img src={l.thumb} alt='' loading='lazy' className='h-full w-full object-cover' /> : <span className='flex h-full items-center justify-center text-slate-500'><PackageOpen size={32} /></span>}
                <span className='absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-slate-700 shadow-sm'>{catLabel(l.category)}</span>
              </Link>
              <div className='flex flex-1 flex-col p-4'>
              <div className='flex items-start justify-between gap-2'>
                <Link href={'/listing/' + l.id} className='font-semibold leading-tight transition hover:text-indigo-300'>{l.title}</Link>
                {l.featured && <span className='inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300'><Rocket size={12} />En avant</span>}
              </div>
              <p className='mt-2 line-clamp-3 flex-1 text-sm text-slate-400'>{l.description}</p>
              <p className='mt-3 flex items-center gap-1 text-xs text-slate-500'>par <Link href={'/seller/' + l.sellerId} className='hover:text-slate-300 hover:underline'>{l.sellerName}</Link>{l.badge && <BadgeCheck size={14} className='text-indigo-400' />}</p>
              <div className='mt-3 flex items-center gap-2'>
                {l.sellerId === meId ? <span className='text-sm text-slate-500'>Votre annonce · {f(l.price)}</span> : (
                  <>
                    <BuyButton listingId={l.id} price={l.price} />
                    <button onClick={() => setChat(l)} className='rounded-xl bg-slate-800 p-2.5 transition hover:bg-slate-700 active:scale-90' aria-label='Contacter'><MessageCircle size={18} /></button>
                  </>
                )}
              </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {chat && (
        <div className='anim-fade fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4' onClick={() => setChat(null)}>
          <div className='anim-pop relative' onClick={e => e.stopPropagation()}>
            <button onClick={() => setChat(null)} className='absolute -top-9 right-0 text-slate-300 transition hover:text-white'><X size={22} /></button>
            <p className='mb-2 text-sm text-slate-300'>Discussion avec {chat.sellerName}</p>
            <ChatBox meId={meId} peerId={chat.sellerId} />
          </div>
        </div>
      )}
    </div>
  );
}
