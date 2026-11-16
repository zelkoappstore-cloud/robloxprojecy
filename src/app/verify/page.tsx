'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function Verify() {
  const [st, setSt] = useState<'load' | 'ok' | 'err'>('load');
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) { setSt('err'); return; }
    fetch('/api/auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      .then(r => setSt(r.ok ? 'ok' : 'err')).catch(() => setSt('err'));
  }, []);
  return (
    <main className='flex min-h-screen items-center justify-center p-6'>
      <div className='anim-pop w-full max-w-sm space-y-3 rounded-2xl border border-white/10 bg-slate-900 p-8 text-center'>
        {st === 'load' && <Loader2 size={40} className='mx-auto animate-spin text-slate-500' />}
        {st === 'ok' && <><CheckCircle2 size={52} className='anim-pop mx-auto text-emerald-400' /><p className='text-lg font-semibold'>Email confirmé</p><p className='text-sm text-slate-400'>Votre compte est activé.</p><a href='/' className='mt-2 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium transition hover:bg-indigo-500 active:scale-95'>Se connecter</a></>}
        {st === 'err' && <><AlertCircle size={52} className='anim-pop mx-auto text-rose-400' /><p className='text-lg font-semibold'>Lien invalide ou expiré</p><a href='/' className='mt-2 inline-block rounded-xl bg-slate-800 px-5 py-2.5 text-sm transition hover:bg-slate-700 active:scale-95'>Retour</a></>}
      </div>
    </main>
  );
}
