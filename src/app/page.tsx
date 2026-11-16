'use client';
import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import Catalogue from '@/components/Catalogue';
import Orders from '@/components/Orders';
import SellForm from '@/components/SellForm';
import Inbox from '@/components/Inbox';
import Shop from '@/components/Shop';
import WalletCard from '@/components/WalletCard';
import History from '@/components/History';
import Notifications from '@/components/Notifications';
import Account from '@/components/Account';

const TABS = ['catalogue', 'orders', 'sell', 'messages', 'account', 'shop', 'wallet', 'notifications'];

export default function Home() {
  const [tab, setTab] = useState('catalogue');
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t && TABS.includes(t)) setTab(t);
  }, []);
  const select = (id: string) => { setTab(id); window.history.replaceState(null, '', '/?tab=' + id); };

  return (
    <Shell active={tab} onSelect={select}>
      {me => (
        <section key={tab} className='anim-slide'>
          {tab === 'catalogue' && <Catalogue meId={me.id} />}
          {tab === 'orders' && <Orders meId={me.id} />}
          {tab === 'sell' && <SellForm />}
          {tab === 'messages' && <Inbox meId={me.id} />}
          {tab === 'shop' && <Shop />}
          {tab === 'wallet' && <div className='space-y-6'><WalletCard /><History /></div>}
          {tab === 'notifications' && <Notifications />}
          {tab === 'account' && <Account onLogout={() => { window.location.href = '/'; }} />}
        </section>
      )}
    </Shell>
  );
}
