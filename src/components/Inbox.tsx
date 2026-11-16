'use client';
import { useEffect, useState } from 'react';
import { ChevronLeft, MessageSquareOff } from 'lucide-react';
import ChatBox from './ChatBox';

type C = { peerId: string; peerName: string; last: string; at: string };

export default function Inbox({ meId }: { meId: string }) {
  const [list, setList] = useState<C[] | null>(null);
  const [open, setOpen] = useState<C | null>(null);
  useEffect(() => {
    const get = () => fetch('/api/messages/conversations').then(r => r.json()).then(d => setList(d.conversations ?? [])).catch(() => setList([]));
    get();
    const i = setInterval(get, 8000);
    return () => clearInterval(i);
  }, []);

  if (open) return (
    <div className='anim-slide space-y-3'>
      <button onClick={() => setOpen(null)} className='flex items-center gap-1 text-sm text-slate-400 transition hover:text-white'><ChevronLeft size={16} />Retour</button>
      <p className='font-semibold'>{open.peerName}</p>
      <ChatBox meId={meId} peerId={open.peerId} />
    </div>
  );
  return (
    <div className='space-y-2'>
      {list === null ? <div className='h-16 animate-pulse rounded-xl bg-slate-900' /> : list.length === 0 ? (
        <div className='anim-fade flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 py-16 text-slate-500'>
          <MessageSquareOff size={36} /><p>Aucune conversation</p>
        </div>
      ) : list.map((c, i) => (
        <button key={c.peerId} onClick={() => setOpen(c)} style={{ animationDelay: Math.min(i, 8) * 40 + 'ms' }}
          className='anim-slide flex w-full items-center justify-between rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-left transition hover:border-indigo-500/50 active:scale-[.99]'>
          <div className='min-w-0'><p className='font-medium'>{c.peerName}</p><p className='truncate text-sm text-slate-400'>{c.last}</p></div>
          <span className='ml-3 shrink-0 text-xs text-slate-500'>{new Date(c.at).toLocaleDateString('fr-FR')}</span>
        </button>
      ))}
    </div>
  );
}
