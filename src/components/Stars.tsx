'use client';
import { Star } from 'lucide-react';

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className='inline-flex items-center gap-0.5' aria-label={value + ' sur 5'}>
      {[1, 2, 3, 4, 5].map(i => <Star key={i} size={size} className={i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />)}
    </span>
  );
}

export function Rating({ r }: { r: { avg: number | null; count: number } }) {
  if (!r.count || r.avg === null) return <span className='text-xs text-slate-500'>Pas encore d’avis</span>;
  return <span className='inline-flex items-center gap-1.5 text-xs text-slate-500'><Stars value={r.avg} /><b className='text-slate-700'>{r.avg.toFixed(1)}</b>({r.count} avis)</span>;
}

export function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <span className='inline-flex gap-1'>
      {[1, 2, 3, 4, 5].map(i => (
        <button type='button' key={i} onClick={() => onChange(i)} aria-label={i + ' étoile' + (i > 1 ? 's' : '')} className='transition active:scale-90'>
          <Star size={26} className={i <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
        </button>
      ))}
    </span>
  );
}
