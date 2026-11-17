'use client';
import { useCallback, useEffect, useState } from 'react';
import { Flag, ShieldCheck, Loader2, LogOut, Users, Package, AlertTriangle, ScrollText, LayoutDashboard, Search, Trash2, RotateCcw, Ban, CheckCircle2, KeyRound, Smartphone, Copy, Lock } from 'lucide-react';
import { fmt, catLabel } from '@/lib/money';

type Status = { totp: boolean; open: boolean; expiresAt: string | null; username: string };
type Tab = 'stats' | 'reports' | 'listings' | 'users' | 'disputes' | 'logs';

const inp = 'w-full rounded-xl bg-slate-800 px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500';
const btn = 'flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium transition hover:bg-indigo-500 active:scale-95 disabled:opacity-60';
const card = 'rounded-2xl border border-white/10 bg-slate-900 p-5';

async function call(url: string, method = 'GET', body?: object) {
  const r = await fetch(url, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, d };
}

export default function AdminPanel() {
  const [st, setSt] = useState<Status | null | undefined>(undefined);
  const load = useCallback(() => call('/api/admin/auth').then(({ ok, d }) => setSt(ok ? d : null)), []);
  useEffect(() => { load(); }, [load]);

  if (st === undefined) return <main className='flex min-h-screen items-center justify-center'><Loader2 className='animate-spin text-slate-500' /></main>;
  if (st === null) return (
    <main className='flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center'>
      <p className='text-4xl font-bold'>404</p><p className='text-slate-400'>Page introuvable</p>
      <a href='/' className='mt-3 text-sm text-indigo-400 hover:underline'>Retour à l’accueil</a>
    </main>
  );
  if (!st.totp) return <Setup onDone={load} />;
  if (!st.open) return <Login username={st.username} onDone={load} />;
  return <Dashboard onExit={load} />;
}

function Shield({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <main className='flex min-h-screen items-center justify-center p-6'>
      <div className='anim-pop w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-xl'>
        <div className='flex flex-col items-center gap-2 text-center'>
          <span className='flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white'><ShieldCheck size={24} /></span>
          <h1 className='text-lg font-bold'>{title}</h1>
          <p className='text-sm text-slate-400'>{sub}</p>
        </div>
        {children}
      </div>
    </main>
  );
}

function Setup({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState('');
  const [code, setCode] = useState('');
  const [sec, setSec] = useState<{ secret: string; uri: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  async function start(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    const { ok, d } = await call('/api/admin/auth', 'POST', { action: 'setup', password: pw });
    setBusy(false);
    if (ok) setSec(d); else setErr(d.error ?? 'Erreur');
  }
  async function confirm(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    const { ok, d } = await call('/api/admin/auth', 'POST', { action: 'confirm', password: pw, code });
    setBusy(false);
    if (ok) onDone(); else setErr(d.error ?? 'Erreur');
  }
  return (
    <Shield title='Sécuriser l’administration' sub='Activez la double authentification. Elle sera exigée à chaque ouverture du panneau.'>
      {!sec ? (
        <form onSubmit={start} className='space-y-3'>
          <input className={inp} type='password' autoComplete='current-password' placeholder='Votre mot de passe Zelko' value={pw} onChange={e => setPw(e.target.value)} />
          {err && <p className='text-sm text-rose-400'>{err}</p>}
          <button disabled={busy || !pw} className={btn + ' w-full'}>{busy ? <Loader2 size={18} className='animate-spin' /> : <><KeyRound size={16} />Continuer</>}</button>
        </form>
      ) : (
        <form onSubmit={confirm} className='space-y-3'>
          <ol className='list-decimal space-y-1 pl-5 text-sm text-slate-300'>
            <li>Installez Google Authenticator, Authy ou Microsoft Authenticator.</li>
            <li>Ajoutez Zelko avec le bouton ci-dessous ou en recopiant la clé.</li>
            <li>Entrez le code à 6 chiffres affiché par l’appli.</li>
          </ol>
          <a href={sec.uri} className={btn + ' w-full'}><Smartphone size={16} />Ouvrir dans l’appli</a>
          <button type='button' onClick={() => { navigator.clipboard?.writeText(sec.secret); setCopied(true); }} className='flex w-full items-center justify-between gap-2 rounded-xl bg-slate-800 px-3 py-2.5 text-left font-mono text-xs break-all'>
            <span>{sec.secret}</span><span className='shrink-0 text-slate-400'>{copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}</span>
          </button>
          <p className='text-xs text-amber-300'>Ne partagez jamais cette clé. Sans votre téléphone, le panneau restera fermé.</p>
          <input className={inp + ' text-center font-mono text-lg tracking-[0.4em]'} inputMode='numeric' autoComplete='one-time-code' maxLength={6} placeholder='000000' value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
          {err && <p className='text-sm text-rose-400'>{err}</p>}
          <button disabled={busy || code.length !== 6} className={btn + ' w-full'}>{busy ? <Loader2 size={18} className='animate-spin' /> : 'Activer'}</button>
        </form>
      )}
    </Shield>
  );
}

function Login({ username, onDone }: { username: string; onDone: () => void }) {
  const [pw, setPw] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    const { ok, d } = await call('/api/admin/auth', 'POST', { action: 'login', password: pw, code });
    setBusy(false); setPw(''); setCode('');
    if (ok) onDone(); else setErr(d.error ?? 'Erreur');
  }
  return (
    <Shield title='Administration Zelko' sub={'Connecté en tant que ' + username + '. Confirmez votre identité.'}>
      <form onSubmit={submit} className='space-y-3'>
        <input className={inp} type='password' autoComplete='current-password' placeholder='Mot de passe' value={pw} onChange={e => setPw(e.target.value)} />
        <input className={inp + ' text-center font-mono text-lg tracking-[0.4em]'} inputMode='numeric' autoComplete='one-time-code' maxLength={6} placeholder='Code 2FA' value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
        {err && <p className='text-sm text-rose-400'>{err}</p>}
        <button disabled={busy || !pw || code.length !== 6} className={btn + ' w-full'}>{busy ? <Loader2 size={18} className='animate-spin' /> : <><Lock size={16} />Ouvrir le panneau</>}</button>
        <p className='text-center text-xs text-slate-500'>Session de 30 minutes. Chaque action est enregistrée.</p>
      </form>
    </Shield>
  );
}

const TABS: { id: Tab; label: string; Icon: any }[] = [
  { id: 'stats', label: 'Vue d’ensemble', Icon: LayoutDashboard },
  { id: 'reports', label: 'Signalements', Icon: Flag },
  { id: 'listings', label: 'Annonces', Icon: Package },
  { id: 'users', label: 'Membres', Icon: Users },
  { id: 'disputes', label: 'Litiges', Icon: AlertTriangle },
  { id: 'logs', label: 'Journal', Icon: ScrollText },
];

function Dashboard({ onExit }: { onExit: () => void }) {
  const [tab, setTab] = useState<Tab>('stats');
  const [data, setData] = useState<any>(null);
  const [q, setQ] = useState('');
  const [deleted, setDeleted] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [left, setLeft] = useState('');

  const load = useCallback(async () => {
    setData(null);
    const { ok, d } = await call('/api/admin/data?view=' + tab + '&q=' + encodeURIComponent(q) + (deleted ? '&deleted=1' : ''));
    if (!ok) return onExit();
    setData(d);
  }, [tab, q, deleted, onExit]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  useEffect(() => {
    let exp = 0;
    call('/api/admin/auth').then(({ d }) => { exp = d.expiresAt ? new Date(d.expiresAt).getTime() : 0; });
    const i = setInterval(() => {
      if (!exp) return;
      const s = Math.max(0, Math.round((exp - Date.now()) / 1000));
      setLeft(Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'));
      if (s === 0) onExit();
    }, 1000);
    return () => clearInterval(i);
  }, [onExit]);

  async function act(action: string, id: string, confirmText: string) {
    const reason = window.prompt(confirmText + '\n\nRaison (facultatif, visible dans le journal) :');
    if (reason === null) return;
    setBusy(action + id); setMsg(null);
    const { ok, d } = await call('/api/admin/data', 'POST', { action, id, reason });
    setBusy('');
    setMsg(ok ? { ok: true, t: 'Action effectuée' } : { ok: false, t: d.error ?? 'Erreur' });
    if (ok) load(); else if (!d.error) onExit();
  }
  async function logout() { await call('/api/admin/auth', 'DELETE'); onExit(); }
  const ready = data !== null && (tab === 'stats' ? typeof data.users === 'number' : Array.isArray(data.items));

  const small = (tone: string) => 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition active:scale-95 disabled:opacity-50 ' + tone;
  const danger = small('bg-rose-500/15 text-rose-300 hover:bg-rose-500/25');
  const good = small('bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25');

  return (
    <div className='mx-auto min-h-screen max-w-5xl px-4 pb-16 pt-4 sm:px-6'>
      <header className='mb-5 flex items-center justify-between gap-3'>
        <a href='/' className='flex items-center gap-2 font-bold'><img src='/logo.webp' alt='' className='h-10 w-10 object-contain' />Administration</a>
        <div className='flex items-center gap-2 text-xs'>
          <span className='rounded-full bg-slate-800 px-3 py-1.5 tabular-nums text-slate-400'>Session {left}</span>
          <button onClick={logout} className={danger}><LogOut size={14} />Fermer</button>
        </div>
      </header>
      <nav className='-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0'>
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => { if (id !== tab) setData(null); setTab(id); setQ(''); setMsg(null); }} className={'flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition ' + (tab === id ? 'bg-indigo-600 font-medium' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>
            <Icon size={16} />{label}
          </button>
        ))}
      </nav>
      {msg && <p className={'anim-pop mb-3 rounded-xl px-4 py-3 text-sm ' + (msg.ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300')}>{msg.t}</p>}
      {(tab === 'listings' || tab === 'users') && (
        <div className='mb-4 flex flex-wrap items-center gap-2'>
          <div className='relative min-w-0 flex-1'>
            <Search size={16} className='absolute left-3 top-3 text-slate-500' />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={tab === 'users' ? 'Pseudo ou email' : 'Titre, description ou vendeur'} className={inp + ' pl-9'} />
          </div>
          {tab === 'listings' && <button onClick={() => setDeleted(!deleted)} className={'rounded-xl px-3 py-2.5 text-sm ' + (deleted ? 'bg-indigo-600' : 'bg-slate-800 text-slate-300')}>{deleted ? 'Supprimées' : 'Actives'}</button>}
        </div>
      )}
      {!ready ? <div className='h-40 animate-pulse rounded-2xl bg-slate-900' /> : (
        <section className='anim-fade space-y-3'>
          {tab === 'stats' && (
            <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
              {[['Membres', data.users, '+' + data.users24 + ' en 24 h'], ['Annonces actives', data.listings, '+' + data.listings24 + ' en 24 h'], ['Commandes', data.orders, ''], ['Litiges ouverts', data.disputes, data.suspended + ' compte(s) suspendu(s)'], ['Signalements', data.reports, 'à vérifier']].map(([l, v, s]) => (
                <div key={l as string} className={card}><p className='text-xs text-slate-400'>{l}</p><p className='mt-1 text-3xl font-bold tabular-nums'>{v}</p>{s && <p className='mt-1 text-xs text-slate-500'>{s}</p>}</div>
              ))}
            </div>
          )}
          {tab === 'reports' && (data.items.length === 0 ? <p className='text-sm text-slate-500'>Aucun signalement en attente.</p> : data.items.map((l: any) => (
            <div key={l.id} className={card + ' space-y-3'}>
              <div className='flex gap-3'>
                {l.thumb ? <img src={l.thumb} alt='' className='h-16 w-16 shrink-0 rounded-xl object-cover' /> : <div className='h-16 w-16 shrink-0 rounded-xl bg-slate-800' />}
                <div className='min-w-0 flex-1'>
                  <a href={'/listing/' + l.id} target='_blank' rel='noreferrer' className='font-semibold hover:underline'>{l.title}</a>
                  {l.hidden && <span className='ml-2 rounded-full bg-rose-500/15 px-2 py-0.5 text-xs text-rose-300'>Masquée</span>}
                  {l.status === 'DELETED' && <span className='ml-2 rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300'>Supprimée</span>}
                  <p className='line-clamp-2 text-xs text-slate-400'>{l.description}</p>
                  <p className='mt-1 text-xs text-slate-500'>{fmt(l.priceCents)} · par {l.seller.username}</p>
                </div>
              </div>
              <div className='space-y-1 rounded-xl bg-slate-800/60 p-3 text-xs'>
                <p className='font-semibold text-rose-300'>{l.reports.length} signalement(s)</p>
                {l.reports.map((r: any) => <p key={r.id} className='text-slate-300'>• {({ SCAM: 'Arnaque', FORBIDDEN: 'Objet interdit', FAKE: 'Contrefaçon', OFFSITE: 'Hors Zelko', OFFENSIVE: 'Choquant', OTHER: 'Autre' } as any)[r.reason] ?? r.reason}{r.detail ? ' : ' + r.detail : ''} <span className='text-slate-500'>({new Date(r.createdAt).toLocaleDateString('fr-FR')})</span></p>)}
              </div>
              <div className='flex flex-wrap gap-2'>
                {l.status === 'ACTIVE' && <button disabled={!!busy} onClick={() => act('deleteListing', l.id, 'Supprimer l’annonce « ' + l.title + ' » ? Le vendeur sera prévenu.')} className={danger}><Trash2 size={14} />Supprimer l’annonce</button>}
                <button disabled={!!busy} onClick={() => act('dismissReports', l.id, 'Classer les signalements et remettre « ' + l.title + ' » en ligne ?')} className={good}><CheckCircle2 size={14} />Annonce conforme</button>
              </div>
            </div>
          )))}
          {tab === 'listings' && (data.items.length === 0 ? <p className='text-sm text-slate-500'>Aucune annonce.</p> : data.items.map((l: any) => (
            <div key={l.id} className={card + ' flex gap-3 p-3'}>
              {l.thumb ? <img src={l.thumb} alt='' className='h-16 w-16 shrink-0 rounded-xl object-cover' /> : <div className='h-16 w-16 shrink-0 rounded-xl bg-slate-800' />}
              <div className='min-w-0 flex-1'>
                <a href={'/listing/' + l.id} target='_blank' rel='noreferrer' className='font-semibold hover:underline'>{l.title}</a>
                <p className='line-clamp-2 text-xs text-slate-400'>{l.description}</p>
                <p className='mt-1 text-xs text-slate-500'>{fmt(l.priceCents)} · {catLabel(l.category)} · par {l.seller.username} · {new Date(l.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
              <div className='shrink-0'>
                {l.status === 'ACTIVE'
                  ? <button disabled={!!busy} onClick={() => act('deleteListing', l.id, 'Supprimer l’annonce « ' + l.title + ' » ? Le vendeur sera prévenu.')} className={danger}><Trash2 size={14} />Supprimer</button>
                  : <button disabled={!!busy} onClick={() => act('restoreListing', l.id, 'Remettre en ligne « ' + l.title + ' » ?')} className={good}><RotateCcw size={14} />Restaurer</button>}
              </div>
            </div>
          )))}
          {tab === 'users' && (data.items.length === 0 ? <p className='text-sm text-slate-500'>Aucun membre.</p> : data.items.map((u: any) => (
            <div key={u.id} className={card + ' flex items-center gap-3 p-3'}>
              <div className='flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-600 font-bold uppercase text-white'>{u.avatar ? <img src={u.avatar} alt='' className='h-full w-full object-cover' /> : u.username.charAt(0)}</div>
              <div className='min-w-0 flex-1'>
                <a href={'/seller/' + u.id} target='_blank' rel='noreferrer' className='font-semibold hover:underline'>{u.username}</a>
                {u.founder && <span className='ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300'>Fondateur</span>}
                {u.accountStatus === 'SUSPENDED' && <span className='ml-2 rounded-full bg-rose-500/15 px-2 py-0.5 text-xs text-rose-300'>Suspendu</span>}
                <p className='truncate text-xs text-slate-400'>{u.email}{u.emailVerified ? '' : ' (non confirmé)'}</p>
                <p className='text-xs text-slate-500'>{u._count.listings} annonce(s) · {u._count.sellOrders} vente(s) · {u._count.buyOrders} achat(s) · inscrit le {new Date(u.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
              {!u.founder && (u.accountStatus === 'ACTIVE'
                ? <button disabled={!!busy} onClick={() => act('suspendUser', u.id, 'Suspendre ' + u.username + ' ? Il ne pourra plus vendre ni acheter.')} className={danger}><Ban size={14} />Suspendre</button>
                : <button disabled={!!busy} onClick={() => act('activateUser', u.id, 'Réactiver ' + u.username + ' ?')} className={good}><CheckCircle2 size={14} />Réactiver</button>)}
            </div>
          )))}
          {tab === 'disputes' && (data.items.length === 0 ? <p className='text-sm text-slate-500'>Aucun litige en cours.</p> : data.items.map((o: any) => (
            <div key={o.id} className={card + ' space-y-2'}>
              <div className='flex items-start justify-between gap-2'>
                <p className='font-semibold'>{o.title}</p>
                <p className='font-semibold tabular-nums'>{o.amountCents ? fmt(o.amountCents) : o.amount + ' ZLT'}</p>
              </div>
              <p className='text-xs text-slate-400'>Acheteur : {o.buyer.username} · Vendeur : {o.seller.username} · commandé le {new Date(o.createdAt).toLocaleDateString('fr-FR')}</p>
              {o.deliveryNote && <p className='rounded-xl bg-slate-800 p-3 text-sm text-slate-300'>Note de livraison : {o.deliveryNote}</p>}
              <div className='flex flex-wrap gap-2'>
                <button disabled={!!busy} onClick={() => act('refundDispute', o.id, 'Rembourser l’acheteur ' + o.buyer.username + ' ?')} className={danger}><RotateCcw size={14} />Rembourser l’acheteur</button>
                <button disabled={!!busy} onClick={() => act('releaseDispute', o.id, 'Payer le vendeur ' + o.seller.username + ' ?')} className={good}><CheckCircle2 size={14} />Payer le vendeur</button>
              </div>
            </div>
          )))}
          {tab === 'logs' && (
            <div className={card + ' overflow-x-auto p-0'}>
              <table className='w-full text-left text-xs'>
                <thead className='text-slate-400'><tr><th className='p-3'>Date</th><th className='p-3'>Action</th><th className='p-3'>Détail</th><th className='p-3'>IP</th></tr></thead>
                <tbody>{data.items.map((l: any) => (
                  <tr key={l.id} className={'border-t border-white/10 ' + (/FAIL|RATE/.test(l.action) ? 'text-rose-300' : '')}>
                    <td className='whitespace-nowrap p-3'>{new Date(l.at).toLocaleString('fr-FR')}</td><td className='p-3 font-mono'>{l.action}</td><td className='p-3'>{l.detail ?? l.target ?? ''}</td><td className='p-3 font-mono'>{l.ip}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
