import { db } from '@/lib/db';
import { getUserId, json } from '@/lib/auth';
import { notify } from '@/lib/notify';

export async function POST(req: Request) {
  const uid = await getUserId();
  if (!uid) return json({ error: 'Non authentifié' }, 401);
  const { receiverId, content } = await req.json().catch(() => ({}));
  if (typeof receiverId !== 'string' || receiverId === uid || typeof content !== 'string' || !content.trim() || content.length > 2000)
    return json({ error: 'Données invalides' }, 400);
  const me = await db.user.findUnique({ where: { id: uid }, select: { username: true, accountStatus: true } });
  if (!me || me.accountStatus !== 'ACTIVE') return json({ error: 'Compte non actif' }, 403);
  const rcv = await db.user.findUnique({ where: { id: receiverId }, select: { allowMessages: true } });
  if (!rcv) return json({ error: 'Destinataire introuvable' }, 404);
  if (!rcv.allowMessages) return json({ error: 'Cet utilisateur n’accepte pas les messages' }, 403);
  const m = await db.message.create({ data: { senderId: uid, receiverId, content: content.trim() } });
  const text = 'Nouveau message de ' + me.username;
  const dup = await db.notification.findFirst({ where: { userId: receiverId, type: 'MESSAGE', read: false, text } });
  if (!dup) await notify(receiverId, 'MESSAGE', text, '/?tab=messages');
  return json(m, 201);
}
