'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRef } from 'react';
import { User, KeyRound, LogOut, Loader2, CheckCircle2, AlertCircle, BadgeCheck, Rocket, FileText, SlidersHorizontal, ExternalLink, Camera, Trash2, Banknote } from 'lucide-react';
import { CURRENCIES } from '@/lib/money';
import { accountChanged } from '@/lib/cur';
import { shrink } from '@/lib/img';

type P = { id: string; username: string; email: string; accountStatus: string; badgePro: boolean; featuredUntil: string | null; listings: number; extraSlots: number; createdAt: string; emailVerified: boolean; bio: string; emailNotifs: boolean; allowMessages: boolean; currency: string; avatar: string; nextUsernameChange: string | null };
type Msg = { ok: boolean; t: string } | null;

const Toggle = ({ on, onClick, label, hint }: { on: boolean; onClick: () => void; label: string; hint: string }) => (
  <button onClick={onClick} role='switch' aria-checked={on} className='flex w-full items-center justify-between gap-4 rounded-xl bg-slate-800/60 px-4 py-3 text-left transition hover:bg-slate-800'>
    <span><span className='block text-sm font-medium'>{label}</span><span className='block text-xs text-slate-400'>{hint}</span></span>
    <span className={'relative h-6 w-11 shrink-0 rounded-full transition-colors ' + (on ? 'bg-indigo-600' : 'bg-slate-700')}>
      <span className={'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ' + (on ? 'left-[22px]' : 'left-0.5')} />
    </span>
  </button>
);

export default function Account({ onLogout }: { onLogout: () => void }) {
  const [p, setP] = useState<P | null>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [pw, setPw] = useState({ cur: '', next: '' });
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<Record<string, Msg>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => fetch('/api/account').then(r => r.json()).then(d => { setP(d); setName(d.username ?? ''); setBio(d.bio ?? ''); });
  useEffect(() => { load(); }, []);

  async function patch(body: object, key: string) {
    setBusy(key); setMsg(m => ({ ...m, [key]: null }));
    const r = await fetch('/api/account', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    setBusy('');
    setMsg(m => ({ ...m, [key]: r.ok ? { ok: true, t: 'Modifications enregistrées' } : { ok: false, t: d.error ?? 'Erreur serveur' } }));
    if (r.ok && key === 'p') setPw({ cur: '', next: '' });
    if (r.ok) accountChanged();
    load();
  }
  async function pickAvatar(files: FileList | null) {
    const file = files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    try { await patch({ avatar: await shrink(file, 200, 0.8, true) }, 'a'); } catch { setMsg(m => ({ ...m, a: { ok: false, t: 'Image illisible' } })); }
  }
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    onLogout();
  }
  function toggle(k: 'emailNotifs' | 'allowMessages') {
    if (!p) return;
    setP({ ...p, [k]: !p[k] });
    patch({ [k]: !p[k] }, 't');
  }

  const inp = 'w-full rounded-xl bg-slate-800 px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 disabled:opacity-50';
  const card = 'anim-slide space-y-3 rounded-2xl border border-white/10 bg-slate-900 p-5';
  const save = 'flex w-full items-center justify-center rounded-xl bg-indigo-600 py-2.5 text-sm font-medium transition hover:bg-indigo-500 active:scale-95 disabled:opacity-60';
  const Note = ({ k }: { k: string }) => { const m = msg[k]; return m ? <p className={'anim-fade flex items-center gap-2 text-sm ' + (m.ok ? 'text-emerald-400' : 'text-rose-400')}>{m.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}{m.t}</p> : null; };
  if (!p) return <div className='h-40 animate-pulse rounded-2xl bg-slate-900' />;
  const featured = p.featuredUntil && new Date(p.featuredUntil) > new Date();
  const locked = !!p.nextUsernameChange;

  return (
    <div className='grid gap-4 md:grid-cols-2'>
      <div className={card + ' md:col-span-2'}>
        <div className='flex items-center gap-4'>
          <button onClick={() => fileRef.current?.click()} aria-label='Changer la photo de profil' className='group relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-indigo-600 text-3xl font-bold uppercase ring-1 ring-white/10 transition active:scale-95'>
            {p.avatar ? <img src={p.avatar} alt='' className='h-full w-full object-cover' /> : <span className='text-white'>{p.username.charAt(0)}</span>}
            <span className='absolute inset-x-0 bottom-0 flex justify-center bg-black/60 py-1 text-white'>{busy === 'a' ? <Loader2 size={14} className='animate-spin' /> : <Camera size={14} />}</span>
          </button>
          <input ref={fileRef} type='file' accept='image/*' hidden onChange={e => pickAvatar(e.target.files)} />
          <div className='min-w-0'>
            <p className='flex items-center gap-2 text-lg font-semibold'>{p.username}{p.badgePro && <BadgeCheck size={18} className='text-indigo-400' />}</p>
            <p className='truncate text-sm text-slate-400'>{p.email}</p>
            <div className='mt-1 flex gap-3 text-xs'>
              <button onClick={() => fileRef.current?.click()} className='text-indigo-400 hover:underline'>{p.avatar ? 'Changer la photo' : 'Ajouter une photo de profil'}</button>
              {p.avatar && <button onClick={() => patch({ avatar: '' }, 'a')} className='inline-flex items-center gap-1 text-slate-500 hover:text-rose-400'><Trash2 size={12} />Retirer</button>}
            </div>
          </div>
        </div>
        <Note k='a' />
        <div className='flex flex-wrap gap-2 pt-1 text-xs'>
          <span className={'rounded-full px-2.5 py-1 ' + (p.accountStatus === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300')}>{p.accountStatus === 'ACTIVE' ? 'Compte actif' : 'Compte suspendu'}</span>
          {p.emailVerified && <span className='rounded-full bg-slate-800 px-2.5 py-1 text-slate-300'>Email confirmé</span>}
          <span className='rounded-full bg-slate-800 px-2.5 py-1 text-slate-300'>{p.listings} / {5 + p.extraSlots} annonces</span>
          {featured && <span className='inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-300'><Rocket size={12} />Mise en avant active</span>}
        </div>
        <Link href={'/seller/' + p.id} className='inline-flex items-center gap-1.5 text-sm text-indigo-400 transition hover:text-indigo-300'><ExternalLink size={14} />Voir mon profil public</Link>
      </div>
      <div className={card}>
        <h2 className='flex items-center gap-2 font-semibold'><User size={18} />Pseudo</h2>
        <input className={inp} value={name} disabled={locked} onChange={e => setName(e.target.value)} />
        <p className='text-xs text-slate-500'>{locked ? 'Prochain changement possible le ' + new Date(p.nextUsernameChange as string).toLocaleDateString('fr-FR') : 'Le pseudo ne peut être changé qu’une fois par semaine.'}</p>
        <Note k='u' />
        <button onClick={() => patch({ username: name }, 'u')} disabled={busy === 'u' || locked || name === p.username} className={save}>{busy === 'u' ? <Loader2 size={18} className='animate-spin' /> : 'Enregistrer'}</button>
      </div>
      <div className={card}>
        <h2 className='flex items-center gap-2 font-semibold'><FileText size={18} />Bio du profil</h2>
        <textarea className={inp + ' h-24 resize-none'} value={bio} maxLength={200} placeholder='Présentez-vous en quelques mots' onChange={e => setBio(e.target.value)} />
        <p className='text-right text-xs text-slate-500'>{bio.length} / 200</p>
        <Note k='b' />
        <button onClick={() => patch({ bio }, 'b')} disabled={busy === 'b' || bio === p.bio} className={save}>{busy === 'b' ? <Loader2 size={18} className='animate-spin' /> : 'Enregistrer'}</button>
      </div>
      <div className={card + ' md:col-span-2'}>
        <h2 className='flex items-center gap-2 font-semibold'><SlidersHorizontal size={18} />Préférences</h2>
        <label className='flex items-center justify-between gap-4 rounded-xl bg-slate-800/60 px-4 py-3'>
          <span><span className='flex items-center gap-1.5 text-sm font-medium'><Banknote size={15} />Devise</span><span className='block text-xs text-slate-400'>Prix et soldes affichés dans cette monnaie (taux indicatifs).</span></span>
          <select value={p.currency} onChange={e => { setP({ ...p, currency: e.target.value }); patch({ currency: e.target.value }, 't'); }}
            className='shrink-0 rounded-lg bg-slate-900 px-2 py-1.5 text-sm outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-indigo-500'>
            {Object.entries(CURRENCIES).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
          </select>
        </label>
        <Toggle on={p.emailNotifs} onClick={() => toggle('emailNotifs')} label='Notifications par email' hint='Recevoir un email pour les commandes et paiements.' />
        <Toggle on={p.allowMessages} onClick={() => toggle('allowMessages')} label='Accepter les messages' hint='Autoriser les autres membres à vous écrire.' />
        <Note k='t' />
      </div>
      <div className={card + ' md:col-span-2'}>
        <h2 className='flex items-center gap-2 font-semibold'><KeyRound size={18} />Mot de passe</h2>
        <div className='grid gap-3 sm:grid-cols-2'>
          <input className={inp} type='password' placeholder='Mot de passe actuel' value={pw.cur} onChange={e => setPw({ ...pw, cur: e.target.value })} />
          <input className={inp} type='password' placeholder='Nouveau (8 caractères min.)' value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} />
        </div>
        <Note k='p' />
        <button onClick={() => patch({ currentPassword: pw.cur, newPassword: pw.next }, 'p')} disabled={busy === 'p'} className={save}>{busy === 'p' ? <Loader2 size={18} className='animate-spin' /> : 'Changer le mot de passe'}</button>
      </div>
      <button onClick={logout} className='anim-slide flex items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 text-sm transition hover:bg-rose-500/20 hover:text-rose-300 active:scale-95 md:col-span-2'>
        <LogOut size={18} />Se déconnecter
      </button>
    </div>
  );
}
