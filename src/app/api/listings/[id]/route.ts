import { db } from '@/lib/db';
import { json } from '@/lib/auth';
import { sellerRating } from '@/lib/rating';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const l = await db.listing.findUnique({
    where: { id: params.id },
    include: { seller: { select: { id: true, username: true, badgePro: true, createdAt: true, accountStatus: true, avatar: true } } },
  });
  if (!l || l.status !== 'ACTIVE' || l.hidden || l.seller.accountStatus !== 'ACTIVE') return json({ error: 'Annonce introuvable' }, 404);
  const [sales, rating] = await Promise.all([db.order.count({ where: { sellerId: l.sellerId, status: 'COMPLETED' } }), sellerRating(l.sellerId)]);
  return json({
    listing: { id: l.id, title: l.title, description: l.description, price: l.priceCents, category: l.category, images: l.images, createdAt: l.createdAt },
    seller: { id: l.seller.id, username: l.seller.username, badge: l.seller.badgePro, avatar: l.seller.avatar, since: l.seller.createdAt, sales, rating },
  });
}
