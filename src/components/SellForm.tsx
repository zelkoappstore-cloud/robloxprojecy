'use client';
import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Loader2, CheckCircle2, AlertCircle, ImagePlus, X } from 'lucide-react';
import { CATEGORIES, CURRENCIES, catLabel } from '@/lib/money';
import { useCur, useFmt } from '@/lib/cur';
import { shrink } from '@/lib/img';

type M = { id: string; title: string; price: number; category: string; thumb: string };
const EMPTY = { title: '', description: '', price: '', category: '' };

export default function SellForm() {
  const cur = useCur();
  const f$ = useFmt();
  const [f, setF] = useState(EMPTY);
  const [imgs, setImgs] = useState<{ full: string; thumb: string }[]>([]);
  const [mine, setMine] = useState<M[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => fetch('/api/listings?mine=1').then(r => r.json()).then(d => setMine(d.listings ?? [])).catch(() => setMine([]));
  useEffect(() => { load(); }, []);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setImgBusy(true);
    const out: { full: string; thumb: string }[] = [];
    for (const file of Array.from(files).slice(0, 6 - imgs.length)) {
      if (!file.type.startsWith('image/')) continue;
      try { out.push({ full: await shrink(file, 1080, 0.72), thumb: await shrink(file, 420, 0.7) }); } catch {}
    }
    setImgs(i => [...i, ...out].slice(0, 6));
    setImgBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.category) { setMsg({ ok: false, t: 'Choisissez une catégorie' }); return; }
    setBusy(true); setMsg(null);
    const r = await fetch('/api/listings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: f.title, description: f.description, price: Number(f.price.replace(',', '.')), currency: cur, category: f.category, images: imgs.map(i => i.full), thumb: imgs[0]?.thumb }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) { setMsg({ ok: true, t: 'Annonce publiée' }); setF(EMPTY); setImgs([]); load(); }
    else setMsg({ ok: false, t: d.error ?? (r.status === 413 ? 'Images trop lourdes' : 'Erreur serveur') });
  }
  async function del(id: string) {
    await fetch('/api/listings?id=' + id, { method: 'DELETE' });
    load();
  }

  const inp = 'w-full rounded-xl bg-slate-800 px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500';
  const sym = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cur }).formatToParts(0).find(p => p.type === 'currency')?.value ?? cur;
  return (
    <div className='grid gap-6 md:grid-cols-2'>
      <form onSubmit={submit} className='space-y-3 rounded-2xl border border-white/10 bg-slate-900 p-5'>
        <h2 className='font-semibold'>Nouvelle annonce</h2>

        <div>
          <p className='mb-2 text-sm font-medium'>Photos <span className='font-normal text-slate-500'>({imgs.length}/6, la première sert de couverture)</span></p>
          <div className='grid grid-cols-3 gap-2'>
            {imgs.map((im, k) => (
              <div key={k} className='anim-pop relative aspect-square overflow-hidden rounded-xl ring-1 ring-white/10'>
                <img src={im.thumb} alt='' className='h-full w-full object-cover' />
                {k === 0 && <span className='absolute bottom-1 left-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-medium'>Couverture</span>}
                <button type='button' onClick={() => setImgs(imgs.filter((_, j) => j !== k))} aria-label='Retirer la photo'
                  className='absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition active:scale-90'><X size={14} /></button>
              </div>
            ))}
            {imgs.length < 6 && (
              <button type='button' onClick={() => fileRef.current?.click()} disabled={imgBusy}
                className='flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/10 bg-slate-800/60 text-xs text-slate-400 transition hover:border-indigo-500/50 hover:text-indigo-400 active:scale-95'>
                {imgBusy ? <Loader2 size={20} className='animate-spin' /> : <ImagePlus size={22} />}Ajouter
              </button>
            )}
          </div>
          <input ref={fileRef} type='file' accept='image/*' multiple hidden onChange={e => addFiles(e.target.files)} />
        </div>

        <input className={inp} placeholder='Titre' maxLength={80} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
        <select className={inp + (f.category ? '' : ' text-slate-500')} value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>
          <option value='' disabled>Catégorie</option>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <textarea className={inp + ' h-28 resize-none'} placeholder='Description' maxLength={2000} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
        <div className='relative'>
          <input className={inp + ' pr-16'} inputMode='decimal' placeholder={'Prix en ' + CURRENCIES[cur].label} value={f.price} onChange={e => setF({ ...f, price: e.target.value.replace(/[^\d.,]/g, '') })} />
          <span className='absolute right-3 top-2.5 text-sm font-medium text-slate-400'>{sym}</span>
        </div>
        <p className='text-xs text-slate-500'>Les acheteurs paient en argent. Le prix s’affiche dans la devise de chacun (modifiable dans Compte).</p>
        {msg && (
          <p className={'anim-fade flex items-center gap-2 text-sm ' + (msg.ok ? 'text-emerald-400' : 'text-rose-400')}>
            {msg.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}{msg.t}
          </p>
        )}
        <button disabled={busy || imgBusy} className='flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 font-medium transition hover:bg-indigo-500 active:scale-95 disabled:opacity-60'>
          {busy ? <Loader2 size={18} className='animate-spin' /> : <Plus size={18} />}Publier
        </button>
      </form>
      <div className='space-y-3'>
        <h2 className='font-semibold'>Mes annonces</h2>
        {mine === null ? <div className='h-16 animate-pulse rounded-xl bg-slate-900' /> : mine.length === 0 ? (
          <p className='anim-fade text-sm text-slate-500'>Vous n’avez aucune annonce active.</p>
        ) : mine.map(m => (
          <div key={m.id} className='anim-slide flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900 p-2 pr-3'>
            {m.thumb ? <img src={m.thumb} alt='' className='h-12 w-12 shrink-0 rounded-lg object-cover' /> : <div className='h-12 w-12 shrink-0 rounded-lg bg-slate-800' />}
            <div className='min-w-0 flex-1'><p className='truncate font-medium'>{m.title}</p><p className='text-xs text-slate-500'>{m.price ? f$(m.price) : 'Sans prix'} · {catLabel(m.category)}</p></div>
            <button onClick={() => del(m.id)} className='rounded-lg p-2 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-400 active:scale-90' aria-label='Supprimer'><Trash2 size={18} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
