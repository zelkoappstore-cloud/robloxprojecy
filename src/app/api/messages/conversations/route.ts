import { db } from '@/lib/db';
import { getUserId, json } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const uid = await getUserId();
  if (!uid) return json({ error: 'Non authentifié' }, 401);
  const msgs = await db.message.findMany({
    where: { OR: [{ senderId: uid }, { receiverId: uid }] },
    orderBy: { sentAt: 'desc' }, take: 300,
    include: { sender: { select: { id: true, username: true } }, receiver: { select: { id: true, username: true } } },
  });
  const seen = new Map<string, { peerId: string; peerName: string; last: string; at: Date }>();
  for (const m of msgs) {
    const peer = m.senderId === uid ? m.receiver : m.sender;
    if (!seen.has(peer.id)) seen.set(peer.id, { peerId: peer.id, peerName: peer.username, last: m.content, at: m.sentAt });
  }
  return json({ conversations: Array.from(seen.values()) });
}
