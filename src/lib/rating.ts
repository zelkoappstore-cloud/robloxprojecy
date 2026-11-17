import { db } from './db';

export async function sellerRating(sellerId: string) {
  const r = await db.review.aggregate({ where: { sellerId }, _avg: { rating: true }, _count: true });
  return { avg: r._avg.rating ? Math.round(r._avg.rating * 10) / 10 : null, count: r._count };
}
