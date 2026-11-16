import { db } from '@/lib/db';
import { getUserId, json } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const uid = await getUserId();
  if (!uid) return json({ error: 'Non authentifié' }, 401);
  const w = await db.wallet.findUnique({ where: { userId: uid } });
  if (!w) return json({ error: 'Wallet introuvable' }, 404);
  const tx = await db.transaction.findMany({
    where: { OR: [{ buyerWalletId: w.id }, { sellerWalletId: w.id }] },
    orderBy: { timestamp: 'desc' }, take: 20,
  });
  return json({ items: tx.map(t => ({ id: t.id, amount: t.amount, amountCents: t.amountCents, at: t.timestamp, type: t.buyerWalletId === w.id ? 'OUT' : 'IN' })) });
}
