import { db } from '@/lib/db';
import { json } from '@/lib/auth';
import { sellerRating } from '@/lib/rating';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const u = await db.user.findUnique({ where: { id: params.id }, select: { id: true, username: true, badgePro: true, bio: true, createdAt: true, accountStatus: true, avatar: true, founder: true } });
  if (!u || u.accountStatus !== 'ACTIVE') return json({ error: 'Profil introuvable' }, 404);
  const [sales, rows, rating, reviews] = await Promise.all([
    db.order.count({ where: { sellerId: u.id, status: 'COMPLETED' } }),
    db.listing.findMany({ where: { sellerId: u.id, status: 'ACTIVE', hidden: false }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, title: true, description: true, priceCents: true, category: true, thumb: true } }),
    sellerRating(u.id),
    db.review.findMany({ where: { sellerId: u.id }, orderBy: { createdAt: 'desc' }, take: 20, include: { order: { select: { title: true, buyer: { select: { username: true } } } } } }),
  ]);
  return json({
    seller: { id: u.id, username: u.username, badge: u.badgePro, avatar: u.avatar, founder: u.founder, bio: u.bio, since: u.createdAt, sales, rating },
    reviews: reviews.map(r => ({ id: r.id, rating: r.rating, comment: r.comment, at: r.createdAt, title: r.order.title, buyer: r.order.buyer.username })),
    listings: rows.map(l => ({ id: l.id, title: l.title, description: l.description, price: l.priceCents, category: l.category, thumb: l.thumb })),
  });
}
