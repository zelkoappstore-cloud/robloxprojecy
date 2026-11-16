'use client';
import { useState } from 'react';
import { LogIn, UserPlus, Loader2, MailCheck, KeyRound } from 'lucide-react';

export default function AuthForm({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('register');
  const [f, setF] = useState({ username: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [unver, setUnver] = useState(false);
  const [busy, setBusy] = useState(false);

  async function post(url: string, body: object) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    return { r, d };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(''); setInfo(''); setUnver(false);
    if (mode === 'forgot') {
      const { r, d } = await post('/api/auth/forgot', { email: f.email });
      if (r.ok) setInfo('Si un compte existe pour cet email, un lien de réinitialisation vient d’être envoyé.');
      else setErr(d.error ?? 'Erreur serveur');
    } else {
      const { r, d } = await post('/api/auth/' + mode, f);
      if (r.ok && d.needsVerification) setInfo('Compte créé. Un email de confirmation vient d’être envoyé : cliquez sur le lien pour activer votre compte.');
      else if (r.ok) onDone();
      else { setErr(d.error ?? 'Erreur serveur'); setUnver(d.code === 'UNVERIFIED'); }
    }
    setBusy(false);
  }
  async function resend() {
    await post('/api/auth/resend', { email: f.email });
    setErr(''); setUnver(false); setInfo('Email de confirmation renvoyé (si le compte existe).');
  }

  const inp = 'w-full rounded-xl bg-slate-800 px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500';
  return (
    <main className='flex min-h-screen flex-col items-center justify-center gap-6 p-6'>
      <h1 className='anim-slide flex flex-col items-center gap-3 text-3xl font-bold tracking-tight'><img src='/logo.webp' alt='' width={120} height={120} className='object-contain' style={{ width: 120, height: 120 }} />Zelko</h1>
      <form onSubmit={submit} className='anim-slide w-full max-w-sm space-y-3 rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-xl'>
        {mode === 'forgot' ? (
          <p className='flex items-center gap-2 font-semibold'><KeyRound size={18} />Mot de passe oublié</p>
        ) : (
          <div className='grid grid-cols-2 gap-1 rounded-xl bg-slate-800 p-1 text-sm'>
            {(['register', 'login'] as const).map(m => (
              <button type='button' key={m} onClick={() => { setMode(m); setErr(''); setInfo(''); }}
                className={'rounded-lg py-2 transition ' + (mode === m ? 'bg-indigo-600' : 'text-slate-400 hover:text-white')}>
                {m === 'register' ? 'Inscription' : 'Connexion'}
              </button>
            ))}
          </div>
        )}
        {mode === 'register' && <input className={inp} placeholder='Pseudo' value={f.username} onChange={e => setF({ ...f, username: e.target.value })} />}
        <input className={inp} type='email' placeholder='Email' value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
        {mode !== 'forgot' && <input className={inp} type='password' placeholder='Mot de passe (8 caractères min.)' value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />}
        {err && <p className='anim-fade text-sm text-rose-400'>{err}</p>}
        {unver && <button type='button' onClick={resend} className='anim-fade text-sm text-indigo-400 underline transition hover:text-indigo-300'>Renvoyer l’email de confirmation</button>}
        {info && <p className='anim-pop flex items-start gap-2 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300'><MailCheck size={18} className='mt-0.5 shrink-0' />{info}</p>}
        <button disabled={busy} className='flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 font-medium transition hover:bg-indigo-500 active:scale-95 disabled:opacity-60'>
          {busy ? <Loader2 size={18} className='animate-spin' /> : mode === 'register' ? <UserPlus size={18} /> : mode === 'login' ? <LogIn size={18} /> : <MailCheck size={18} />}
          {mode === 'register' ? 'S’inscrire (+100 ZLT offerts)' : mode === 'login' ? 'Se connecter' : 'Envoyer le lien'}
        </button>
        {mode === 'login' && <button type='button' onClick={() => { setMode('forgot'); setErr(''); setInfo(''); }} className='w-full text-center text-sm text-slate-400 transition hover:text-white'>Mot de passe oublié ?</button>}
        {mode === 'forgot' && <button type='button' onClick={() => { setMode('login'); setErr(''); setInfo(''); }} className='w-full text-center text-sm text-slate-400 transition hover:text-white'>Retour à la connexion</button>}
      </form>
    </main>
  );
}
