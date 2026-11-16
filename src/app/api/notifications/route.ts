import { db } from '@/lib/db';
import { getUserId, json } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const uid = await getUserId();
  if (!uid) return json({ error: 'Non authentifié' }, 401);
  const unread = await db.notification.count({ where: { userId: uid, read: false } });
  if (new URL(req.url).searchParams.get('summary')) return json({ unread });
  const items = await db.notification.findMany({ where: { userId: uid }, orderBy: { createdAt: 'desc' }, take: 50 });
  return json({ items, unread });
}

export async function POST() {
  const uid = await getUserId();
  if (!uid) return json({ error: 'Non authentifié' }, 401);
  await db.notification.updateMany({ where: { userId: uid, read: false }, data: { read: true } });
  return json({ ok: true });
}
