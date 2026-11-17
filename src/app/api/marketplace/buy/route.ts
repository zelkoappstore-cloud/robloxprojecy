import { db } from '@/lib/db';
import { getUserId, json } from '@/lib/auth';
import { notify } from '@/lib/notify';
import { fmt } from '@/lib/money';

const ERR: Record<string, [string, number]> = {
  ACCOUNT: ['Compte non actif ou email non confirmé', 403],
  LISTING: ['Annonce indisponible', 404],
  SELF: ['Achat de sa propre annonce impossible', 400],
  FUNDS: ['Solde insuffisant', 402],
};

export async function POST(req: Request) {
  const uid = await getUserId();
  if (!uid) return json({ error: 'Non authentifié' }, 401);
  const { listingId } = await req.json().catch(() => ({}));
  if (typeof listingId !== 'string') return json({ error: 'Données invalides' }, 400);

  try {
    const o = await db.$transaction(async (t) => {
      const buyer = await t.user.findUnique({ where: { id: uid }, include: { wallet: true } });
      if (!buyer?.wallet || buyer.accountStatus !== 'ACTIVE' || !buyer.emailVerified) throw new Error('ACCOUNT');
      const l = await t.listing.findUnique({ where: { id: listingId }, include: { seller: { select: { accountStatus: true } } } });
      if (!l || l.status !== 'ACTIVE' || l.hidden || l.seller.accountStatus !== 'ACTIVE') throw new Error('LISTING');
      if (l.sellerId === uid) throw new Error('SELF');
      if (l.priceCents < 1) throw new Error('LISTING');
      const d = await t.wallet.updateMany({
        where: { id: buyer.wallet.id, balanceCents: { gte: l.priceCents } },
        data: { balanceCents: { decrement: l.priceCents } },
      });
      if (d.count !== 1) throw new Error('FUNDS');
      return t.order.create({ data: { listingId: l.id, buyerId: uid, sellerId: l.sellerId, title: l.title, amountCents: l.priceCents } });
    });
    await notify(o.sellerId, 'ORDER', 'Nouvelle commande : ' + o.title + ' (' + fmt(o.amountCents) + ')', '/?tab=orders');
    return json({ orderId: o.id, amountCents: o.amountCents }, 201);
  } catch (e: any) {
    const m = ERR[e.message];
    if (m) return json({ error: m[0] }, m[1]);
    throw e;
  }
}
