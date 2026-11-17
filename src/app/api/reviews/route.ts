import { db } from '@/lib/db';
import { getUserId, json } from '@/lib/auth';
import { notify } from '@/lib/notify';
import { checkMessage } from '@/lib/rules';

export async function POST(req: Request) {
  const uid = await getUserId();
  if (!uid) return json({ error: 'Non authentifié' }, 401);
  const { orderId, rating, comment } = await req.json().catch(() => ({}));
  if (typeof orderId !== 'string' || !Number.isInteger(rating) || rating < 1 || rating > 5) return json({ error: 'Note invalide (1 à 5 étoiles)' }, 400);
  const text = typeof comment === 'string' ? comment.trim().slice(0, 500) : '';
  if (text) { const bad = checkMessage(text); if (bad) return json({ error: bad.replace('Message bloqué', 'Avis refusé') }, 422); }
  const o = await db.order.findUnique({ where: { id: orderId } });
  if (!o || o.buyerId !== uid) return json({ error: 'Commande introuvable' }, 404);
  if (o.status !== 'COMPLETED') return json({ error: 'Vous pourrez noter le vendeur une fois la commande terminée' }, 409);
  try {
    await db.review.create({ data: { orderId, sellerId: o.sellerId, buyerId: uid, rating, comment: text } });
  } catch (e: any) {
    if (e.code === 'P2002') return json({ error: 'Vous avez déjà laissé un avis' }, 409);
    throw e;
  }
  await notify(o.sellerId, 'REVIEW', 'Nouvel avis ' + '★'.repeat(rating) + ' sur « ' + o.title + ' »', '/seller/' + o.sellerId);
  return json({ ok: true }, 201);
}
