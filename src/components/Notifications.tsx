'use client';
import { useEffect, useState } from 'react';
import { Package, MessageCircle, BellOff, Bell } from 'lucide-react';

type N = { id: string; type: string; text: string; link: string | null; read: boolean; createdAt: string };

export default function Notifications() {
  const [items, setItems] = useState<N[] | null>(null);
  useEffect(() => {
    fetch('/api/notifications').then(r => r.json()).then(d => { setItems(d.items ?? []); fetch('/api/notifications', { method: 'POST' }); }).catch(() => setItems([]));
  }, []);

  return (
    <div className='space-y-2'>
      <h2 className='flex items-center gap-2 text-lg font-semibold'><Bell size={18} />Notifications</h2>
      {items === null ? <div className='h-16 animate-pulse rounded-xl bg-slate-900' /> : items.length === 0 ? (
        <div className='anim-fade flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 py-16 text-slate-500'>
          <BellOff size={36} /><p>Aucune notification</p>
        </div>
      ) : items.map((n, i) => {
        const Icon = n.type === 'MESSAGE' ? MessageCircle : Package;
        return (
          <a key={n.id} href={n.link ?? '/'} style={{ animationDelay: Math.min(i, 8) * 40 + 'ms' }}
            className={'anim-slide flex items-center gap-3 rounded-xl border px-4 py-3 transition hover:border-indigo-500/50 ' + (n.read ? 'border-white/10 bg-slate-900' : 'border-indigo-500/40 bg-indigo-500/10')}>
            <Icon size={18} className='shrink-0 text-indigo-400' />
            <div className='min-w-0 flex-1'>
              <p className='text-sm'>{n.text}</p>
              <p className='text-xs text-slate-500'>{new Date(n.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</p>
            </div>
          </a>
        );
      })}
    </div>
  );
}
