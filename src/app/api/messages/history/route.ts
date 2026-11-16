import { db } from '@/lib/db';
import { getUserId, json } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const uid = await getUserId();
  if (!uid) return json({ error: 'Non authentifié' }, 401);
  const peer = new URL(req.url).searchParams.get('with');
  if (!peer) return json({ error: 'Paramètre with requis' }, 400);
  const messages = await db.message.findMany({
    where: { OR: [{ senderId: uid, receiverId: peer }, { senderId: peer, receiverId: uid }] },
    orderBy: { sentAt: 'asc' },
    take: 200,
  });
  return json({ messages });
}
