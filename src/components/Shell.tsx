'use client';
import { useEffect, useState } from 'react';
import { Loader2, Store, Package, PlusCircle, MessageCircle, Settings, Wallet, Bell, Sparkles } from 'lucide-react';
import AuthForm from './AuthForm';
import { CurCtx } from '@/lib/cur';
import { fmt } from '@/lib/money';

export type Me = { id: string; username: string; currency: string; avatar: string };

const NAV = [
  { id: 'catalogue', label: 'Catalogue', Icon: Store },
  { id: 'orders', label: 'Commandes', Icon: Package },
  { id: 'sell', label: 'Vendre', Icon: PlusCircle },
  { id: 'messages', label: 'Messages', Icon: MessageCircle },
  { id: 'account', label: 'Compte', Icon: Settings },
];

export default function Shell({ active, onSelect, children }: { active?: string; onSelect?: (id: string) => void; children: (me: Me) => React.ReactNode }) {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [bal, setBal] = useState<number | null>(null);
  const [zlt, setZlt] = useState<number | null>(null);
  const [inf, setInf] = useState(false);
  const [unread, setUnread] = useState(0);

  const loadMe = () => fetch('/api/account').then(r => r.ok ? r.json() : null).then(d => setMe(d ? { id: d.id, username: d.username, currency: d.currency ?? 'EUR', avatar: d.avatar ?? '' } : null)).catch(() => setMe(null));
  useEffect(() => {
    loadMe();
    window.addEventListener('zelko:account', loadMe);
    return () => window.removeEventListener('zelko:account', loadMe);
  }, []);
  useEffect(() => {
    if (!me) return;
    const poll = () => {
      fetch('/api/wallet/balance').then(r => r.json()).then(d => { if (typeof d.cents === 'number') setBal(d.cents); if (typeof d.balance === 'number') setZlt(d.balance); setInf(!!d.unlimited); }).catch(() => {});
      fetch('/api/notifications?summary=1').then(r => r.json()).then(d => { if (typeof d.unread === 'number') setUnread(d.unread); }).catch(() => {});
    };
    poll();
    const i = setInterval(poll, 6000);
    return () => clearInterval(i);
  }, [me, active]);

  const go = (id: string) => { if (onSelect) onSelect(id); else window.location.href = '/?tab=' + id; };
  const hb = 'relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 ring-1 ring-white/10 transition hover:bg-slate-800 active:scale-90';

  if (me === undefined) return <main className='flex min-h-screen items-center justify-center'><Loader2 className='animate-spin text-slate-500' /></main>;
  if (!me) return <AuthForm onDone={loadMe} />;

  return (
    <div className='mx-auto min-h-screen max-w-4xl px-4 pt-4 sm:px-6'>
      <header className='mb-5 flex items-center justify-between'>
        <a href='/' className='flex items-center gap-2 text-2xl font-bold tracking-tight'>
          <img src='/logo.webp' alt='' width={40} height={40} className='h-11 w-11 object-contain' />
          <span className='hidden sm:inline'>Zelko</span>
        </a>
        <div className='flex items-center gap-2'>
          <button onClick={() => go('shop')} aria-label='Boutique' className={hb + (active === 'shop' ? ' text-indigo-400' : '')}><Sparkles size={17} /></button>
          <button onClick={() => go('notifications')} aria-label='Notifications' className={hb + (active === 'notifications' ? ' text-indigo-400' : '')}>
            <Bell size={17} />
            {unread > 0 && <span key={unread} className='anim-pop absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold'>{unread > 9 ? '9+' : unread}</span>}
          </button>
          <button onClick={() => go('wallet')} className='flex h-9 items-center gap-2 rounded-full bg-slate-900 px-3.5 text-sm ring-1 ring-white/10 transition hover:bg-slate-800 active:scale-95'>
            <Wallet size={14} className='text-indigo-400' />
            {bal === null ? <span className='h-4 w-12 animate-pulse rounded bg-slate-800' /> : <span key={bal} className='anim-pop font-semibold tabular-nums'>{fmt(bal, me.currency)}</span>}
            {zlt !== null && <span className='hidden text-xs text-slate-500 sm:inline'>· {inf ? '∞' : zlt.toLocaleString('fr-FR')} ZLT</span>}
          </button>
          <button onClick={() => go('account')} aria-label='Mon compte' className='h-9 w-9 overflow-hidden rounded-full bg-indigo-600 text-sm font-bold uppercase ring-1 ring-white/10 transition active:scale-90'>
            {me.avatar ? <img src={me.avatar} alt='' className='h-full w-full object-cover' /> : me.username.charAt(0)}
          </button>
        </div>
      </header>
      <main className='pb-28'><CurCtx.Provider value={me.currency}>{children(me)}</CurCtx.Provider></main>
      <nav className='fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur'>
        <div className='mx-auto flex max-w-4xl'>
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => go(id)}
              className={'relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition active:scale-90 ' + (active === id ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300')}>
              {active === id && <span className='anim-pop absolute top-0 h-0.5 w-8 rounded-full bg-indigo-500' />}
              <Icon size={22} className={'transition-transform ' + (active === id ? '-translate-y-0.5 scale-110' : '')} />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
