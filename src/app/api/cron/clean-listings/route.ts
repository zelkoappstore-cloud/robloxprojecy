import { db } from '@/lib/db';
import { json } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const RX = /\b(hacks?|cheats?|aimbot|wallhack|kamas?|gold|triche[rs]?|boosting)\b/i;
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== 'Bearer ' + secret) return json({ error: 'Interdit' }, 401);

  const listings = await db.listing.findMany({ where: { status: 'ACTIVE' }, select: { id: true, title: true, description: true, sellerId: true } });
  const bad = listings.filter(l => RX.test(norm(l.title + ' ' + l.description)));

  if (bad.length) {
    await db.$transaction([
      db.listing.updateMany({ where: { id: { in: bad.map(l => l.id) } }, data: { status: 'DELETED' } }),
      db.user.updateMany({ where: { id: { in: Array.from(new Set(bad.map(l => l.sellerId))) } }, data: { accountStatus: 'SUSPENDED' } }),
    ]);
  }
  return json({ scanned: listings.length, deleted: bad.length });
}
