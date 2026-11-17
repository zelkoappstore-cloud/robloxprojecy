import { db } from '@/lib/db';
import { getUserId, json } from '@/lib/auth';
import { CATEGORIES, isCur, isImg, toEurCents } from '@/lib/money';
import { checkListing } from '@/lib/rules';

export const dynamic = 'force-dynamic';

const CAT_IDS = CATEGORIES.map(c => c.id);

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = (sp.get('q') ?? '').trim().slice(0, 80);
  const cat = sp.get('cat') ?? '';
  let where: any = { status: 'ACTIVE', hidden: false, priceCents: { gt: 0 }, seller: { accountStatus: 'ACTIVE' } };
  if (sp.get('mine')) {
    const uid = await getUserId();
    if (!uid) return json({ error: 'Non authentifié' }, 401);
    where = { status: 'ACTIVE', sellerId: uid };
  }
  if (CAT_IDS.includes(cat)) where.category = cat;
  if (q) where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }];
  const rows = await db.listing.findMany({
    where, orderBy: { createdAt: 'desc' }, take: 100,
    select: { id: true, title: true, description: true, priceCents: true, category: true, thumb: true, hidden: true, sellerId: true, seller: { select: { username: true, badgePro: true, featuredUntil: true } } },
  });
  const now = Date.now();
  const listings = rows.map(l => ({
    id: l.id, title: l.title, description: l.description, price: l.priceCents, category: l.category, thumb: l.thumb, hidden: l.hidden, sellerId: l.sellerId,
    sellerName: l.seller.username, badge: l.seller.badgePro,
    featured: !!l.seller.featuredUntil && l.seller.featuredUntil.getTime() > now,
  }));
  listings.sort((a, b) => Number(b.featured) - Number(a.featured));
  return json({ listings });
}

export async function POST(req: Request) {
  const uid = await getUserId();
  if (!uid) return json({ error: 'Non authentifié' }, 401);
  const { title, description, price, currency, category, images, thumb } = await req.json().catch(() => ({}));
  if (typeof title !== 'string' || title.trim().length < 3 || title.length > 80 || typeof description !== 'string' || description.trim().length < 10 || description.length > 2000)
    return json({ error: 'Données invalides (titre 3 caractères min., description 10 min.)' }, 400);
  if (!isCur(currency) || typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return json({ error: 'Prix invalide' }, 400);
  const cents = toEurCents(price, currency);
  if (cents < 50 || cents > 10000000) return json({ error: 'Prix hors limites (0,50 € à 100 000 €)' }, 400);
  if (!CAT_IDS.includes(category)) return json({ error: 'Choisissez une catégorie' }, 400);
  const imgs = Array.isArray(images) ? images : [];
  if (imgs.length > 6 || !imgs.every(i => isImg(i, 400000))) return json({ error: 'Images invalides (6 max., 400 Ko chacune)' }, 400);
  if (imgs.length && !isImg(thumb, 80000)) return json({ error: 'Miniature invalide' }, 400);
  const bad = checkListing(title + ' \n ' + description);
  if (bad) return json({ error: bad }, 422);
  const u = await db.user.findUnique({ where: { id: uid }, select: { accountStatus: true } });
  if (!u || u.accountStatus !== 'ACTIVE') return json({ error: 'Compte non actif' }, 403);
  const l = await db.listing.create({ data: { title: title.trim(), description: description.trim(), priceCents: cents, category, images: imgs, thumb: imgs.length ? thumb : '', sellerId: uid } });
  return json({ id: l.id }, 201);
}

export async function DELETE(req: Request) {
  const uid = await getUserId();
  if (!uid) return json({ error: 'Non authentifié' }, 401);
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return json({ error: 'Paramètre id requis' }, 400);
  const r = await db.listing.updateMany({ where: { id, sellerId: uid, status: 'ACTIVE' }, data: { status: 'DELETED' } });
  return r.count ? json({ ok: true }) : json({ error: 'Annonce introuvable' }, 404);
}
