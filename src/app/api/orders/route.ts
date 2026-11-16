import { db } from '@/lib/db';
import { getUserId, json } from '@/lib/auth';
import { cancel, complete } from '@/lib/orders';
import { notify } from '@/lib/notify';
import { fmt } from '@/lib/money';

export const dynamic = 'force-dynamic';

export async function GET() {
  const uid = await getUserId();
  if (!uid) return json({ error: 'Non authentifié' }, 401);
  const rows = await db.order.findMany({
    where: { OR: [{ buyerId: uid }, { sellerId: uid }] },
    orderBy: { createdAt: 'desc' }, take: 100,
    include: { buyer: { select: { id: true, username: true } }, seller: { select: { id: true, username: true } } },
  });
  const items = rows.map(o => {
    const isBuyer = o.buyerId === uid;
    const peer = isBuyer ? o.seller : o.buyer;
    return { id: o.id, title: o.title, amount: o.amount, amountCents: o.amountCents, status: o.status, deliveryNote: o.deliveryNote, createdAt: o.createdAt, role: isBuyer ? 'buyer' : 'seller', peerId: peer.id, peerName: peer.username };
  });
  return json({ items });
}

export async function POST(req: Request) {
  const uid = await getUserId();
  if (!uid) return json({ error: 'Non authentifié' }, 401);
  const { id, action, note } = await req.json().catch(() => ({}));
  if (typeof id !== 'string' || !['DELIVER', 'CONFIRM', 'CANCEL', 'DISPUTE'].includes(action)) return json({ error: 'Données invalides' }, 400);
  const o = await db.order.findUnique({ where: { id } });
  if (!o || (o.buyerId !== uid && o.sellerId !== uid)) return json({ error: 'Commande introuvable' }, 404);
  const buyer = o.buyerId === uid;
  if ((action === 'DELIVER' && buyer) || ((action === 'CONFIRM' || action === 'DISPUTE') && !buyer)) return json({ error: 'Action non autorisée' }, 403);

  const to = buyer ? o.sellerId : o.buyerId;
  let ok = false;
  let text = '';
  if (action === 'DELIVER') {
    const r = await db.order.updateMany({
      where: { id, status: 'PAID' },
      data: { status: 'DELIVERED', deliveredAt: new Date(), deliveryNote: typeof note === 'string' && note.trim() ? note.trim().slice(0, 1000) : null },
    });
    ok = r.count === 1;
    text = 'Commande livrée : ' + o.title + '. Confirmez la réception.';
  } else if (action === 'CONFIRM') {
    ok = await db.$transaction(t => complete(t, id));
    text = 'Paiement reçu : +' + (o.amountCents ? fmt(o.amountCents) : o.amount + ' ZLT') + ' (' + o.title + ')';
  } else if (action === 'CANCEL') {
    ok = await db.$transaction(t => cancel(t, id, buyer ? ['PAID'] : ['PAID', 'DELIVERED']));
    text = 'Commande annulée : ' + o.title + (buyer ? '' : ' (remboursée)');
  } else {
    const r = await db.order.updateMany({ where: { id, status: 'DELIVERED' }, data: { status: 'DISPUTED' } });
    ok = r.count === 1;
    text = 'Litige ouvert sur la commande : ' + o.title;
  }
  if (!ok) return json({ error: 'Action impossible dans l’état actuel de la commande' }, 409);
  await notify(to, 'ORDER', text, '/?tab=orders');
  return json({ ok: true });
}
