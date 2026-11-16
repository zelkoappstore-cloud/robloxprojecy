'use client';
import { useEffect, useState } from 'react';
import { BadgeCheck, Layers, Rocket, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const ICONS: Record<string, any> = { BadgeCheck, Layers, Rocket };
type Perk = { key: string; name: string; desc: string; price: number; icon: string };
type Owned = { badgePro: boolean; extraSlots: number; featuredUntil: string | null };

export default function Shop() {
  const [perks, setPerks] = useState<Perk[] | null>(null);
  const [owned, setOwned] = useState<Owned | null>(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  const load = () => fetch('/api/shop').then(r => r.json()).then(d => { setPerks(d.perks ?? []); setOwned(d.owned ?? null); });
  useEffect(() => { load(); }, []);

  async function buy(key: string) {
    setBusy(key); setMsg(null);
    const r = await fetch('/api/shop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) });
    const d = await r.json().catch(() => ({}));
    setBusy('');
    setMsg(r.ok ? { ok: true, t: 'Avantage activé' } : { ok: false, t: d.error ?? 'Erreur serveur' });
    if (r.ok) load();
  }

  const until = owned?.featuredUntil && new Date(owned.featuredUntil) > new Date() ? new Date(owned.featuredUntil).toLocaleDateString('fr-FR') : null;
  const status = (k: string) => k === 'BADGE_PRO' ? (owned?.badgePro ? 'Acquis' : '') : k === 'EXTRA_SLOTS' ? (owned?.extraSlots ? '+' + owned.extraSlots + ' emplacements' : '') : (until ? 'Actif jusqu’au ' + until : '');

  return (
    <div className='space-y-4'>
      <h2 className='text-lg font-semibold'>Boutique d’avantages</h2>
      {msg && (
        <p key={msg.t + busy} className={'anim-pop flex items-center gap-2 rounded-xl px-4 py-3 text-sm ' + (msg.ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300')}>
          {msg.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}{msg.t}
        </p>
      )}
      {perks === null ? <div className='h-32 animate-pulse rounded-2xl bg-slate-900' /> : (
        <div className='grid gap-3 sm:grid-cols-3'>
          {perks.map((p, i) => {
            const Icon = ICONS[p.icon] ?? Layers;
            const s = status(p.key);
            const done = p.key === 'BADGE_PRO' && owned?.badgePro;
            return (
              <div key={p.key} style={{ animationDelay: i * 80 + 'ms' }} className='anim-slide flex flex-col rounded-2xl border border-white/10 bg-slate-900 p-5 transition hover:-translate-y-0.5 hover:border-indigo-500/50'>
                <Icon size={28} className='text-indigo-400' />
                <h3 className='mt-3 font-semibold'>{p.name}</h3>
                <p className='mt-1 flex-1 text-sm text-slate-400'>{p.desc}</p>
                {s && <p className='mt-2 text-xs text-emerald-400'>{s}</p>}
                <button onClick={() => buy(p.key)} disabled={!!busy || !!done}
                  className='mt-4 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-medium transition hover:bg-indigo-500 active:scale-95 disabled:opacity-50'>
                  {busy === p.key ? <Loader2 size={18} className='animate-spin' /> : done ? 'Acquis' : p.price + ' ZLT'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
