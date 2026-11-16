export const CURRENCIES: Record<string, { rate: number; label: string }> = {
  EUR: { rate: 1, label: 'Euro (€)' },
  USD: { rate: 1.08, label: 'Dollar américain ($)' },
  GBP: { rate: 0.85, label: 'Livre sterling (£)' },
  CHF: { rate: 0.95, label: 'Franc suisse (CHF)' },
  CAD: { rate: 1.5, label: 'Dollar canadien (CA$)' },
  MAD: { rate: 10.8, label: 'Dirham marocain (MAD)' },
  XOF: { rate: 655.957, label: 'Franc CFA (XOF)' },
};
export const isCur = (c: unknown): c is string => typeof c === 'string' && c in CURRENCIES;
/** Montant saisi dans une devise -> centimes d'euro (unité interne). */
export const toEurCents = (amount: number, cur: string) => Math.round((amount * 100) / (CURRENCIES[cur]?.rate ?? 1));
/** Centimes d'euro -> texte dans la devise choisie. */
export function fmt(cents: number, cur = 'EUR') {
  const c = isCur(cur) ? cur : 'EUR';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c, maximumFractionDigits: c === 'XOF' ? 0 : 2 }).format((cents / 100) * CURRENCIES[c].rate);
}

export const CATEGORIES = [
  { id: 'numerique', label: 'Numérique' },
  { id: 'electronique', label: 'Électronique' },
  { id: 'mode', label: 'Mode' },
  { id: 'maison', label: 'Maison' },
  { id: 'loisirs', label: 'Loisirs & sport' },
  { id: 'art', label: 'Art & création' },
  { id: 'services', label: 'Services' },
  { id: 'autre', label: 'Autre' },
];
export const catLabel = (id: string) => CATEGORIES.find(c => c.id === id)?.label ?? 'Autre';

const IMG = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
export const isImg = (s: unknown, max: number): s is string => typeof s === 'string' && s.length <= max && IMG.test(s);
