'use client';
import { useState } from 'react';
import { Flag, Loader2, CheckCircle2, X } from 'lucide-react';

const REASONS: [string, string][] = [
  ['SCAM', 'Arnaque ou fraude'],
  ['FORBIDDEN', 'Objet interdit'],
  ['FAKE', 'Contrefaçon'],
  ['OFFSITE', 'Demande de paiement ou contact hors Zelko'],
  ['OFFENSIVE', 'Contenu choquant ou inapproprié'],
  ['OTHER', 'Autre'],
];

export default function ReportButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [st, setSt] = useState<'idle' | 'busy' | 'ok'>('idle');
  const [err, setErr] = useState('');

  async function send() {
    setSt('busy'); setErr('');
    const r = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listingId, reason, detail }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok) setSt('ok'); else { setSt('idle'); setErr(d.error ?? 'Erreur serveur'); }
  }
  const close = () => { setOpen(false); setSt('idle'); setReason(''); setDetail(''); setErr(''); };

  return (
    <>
      <button onClick={() => setOpen(true)} className='inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-rose-400'><Flag size={14} />Signaler l’annonce</button>
      {open && (
        <div className='anim-fade fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4' onClick={close}>
          <div className='anim-pop relative w-full max-w-sm space-y-3 rounded-2xl bg-slate-900 p-6' onClick={e => e.stopPropagation()}>
            <button onClick={close} className='absolute right-3 top-3 text-slate-500 hover:text-slate-300' aria-label='Fermer'><X size={18} /></button>
            {st === 'ok' ? (
              <div className='py-4 text-center'>
                <CheckCircle2 size={48} className='anim-pop mx-auto text-emerald-400' />
                <p className='mt-3 font-semibold'>Merci pour votre signalement</p>
                <p className='mt-1 text-sm text-slate-400'>L’équipe Zelko va vérifier cette annonce.</p>
              </div>
            ) : (
              <>
                <p className='flex items-center gap-2 font-semibold'><Flag size={18} className='text-rose-400' />Signaler l’annonce</p>
                <div className='space-y-1.5'>
                  {REASONS.map(([k, label]) => (
                    <label key={k} className={'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ' + (reason === k ? 'bg-rose-500/10 ring-1 ring-rose-400' : 'bg-slate-800 hover:bg-slate-700')}>
                      <input type='radio' name='reason' className='accent-rose-500' checked={reason === k} onChange={() => setReason(k)} />{label}
                    </label>
                  ))}
                </div>
                <textarea value={detail} onChange={e => setDetail(e.target.value)} maxLength={500} placeholder='Précisions (facultatif)' className='h-20 w-full resize-none rounded-xl bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500' />
                {err && <p className='text-sm text-rose-400'>{err}</p>}
                <button onClick={send} disabled={!reason || st === 'busy'} className='flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 py-2.5 text-sm font-medium transition hover:bg-rose-600 active:scale-95 disabled:opacity-50'>
                  {st === 'busy' ? <Loader2 size={18} className='animate-spin' /> : 'Envoyer le signalement'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
