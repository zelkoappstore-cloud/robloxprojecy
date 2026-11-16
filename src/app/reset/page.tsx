'use client';
import { useState } from 'react';
import { CheckCircle2, Loader2, KeyRound } from 'lucide-react';

export default function Reset() {
  const [pw, setPw] = useState('');
  const [st, setSt] = useState<'idle' | 'busy' | 'ok'>('idle');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = new URLSearchParams(window.location.search).get('token');
    setSt('busy'); setErr('');
    const r = await fetch('/api/auth/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password: pw }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok) setSt('ok'); else { setSt('idle'); setErr(d.error ?? 'Erreur serveur'); }
  }

  return (
    <main className='flex min-h-screen items-center justify-center p-6'>
      {st === 'ok' ? (
        <div className='anim-pop w-full max-w-sm space-y-3 rounded-2xl border border-white/10 bg-slate-900 p-8 text-center'>
          <CheckCircle2 size={52} className='mx-auto text-emerald-400' />
          <p className='text-lg font-semibold'>Mot de passe modifié</p>
          <a href='/' className='inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium transition hover:bg-indigo-500 active:scale-95'>Se connecter</a>
        </div>
      ) : (
        <form onSubmit={submit} className='anim-slide w-full max-w-sm space-y-3 rounded-2xl border border-white/10 bg-slate-900 p-6'>
          <p className='flex items-center gap-2 font-semibold'><KeyRound size={18} />Nouveau mot de passe</p>
          <input type='password' value={pw} onChange={e => setPw(e.target.value)} placeholder='8 caractères minimum' className='w-full rounded-xl bg-slate-800 px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500' />
          {err && <p className='anim-fade text-sm text-rose-400'>{err}</p>}
          <button disabled={st === 'busy'} className='flex w-full items-center justify-center rounded-xl bg-indigo-600 py-2.5 font-medium transition hover:bg-indigo-500 active:scale-95 disabled:opacity-60'>
            {st === 'busy' ? <Loader2 size={18} className='animate-spin' /> : 'Enregistrer'}
          </button>
        </form>
      )}
    </main>
  );
}
