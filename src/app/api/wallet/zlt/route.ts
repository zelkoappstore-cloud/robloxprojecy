import { db } from '@/lib/db';
import { getUserId, json } from '@/lib/auth';

/** Convertit 10 € du solde en 100 ZLT (pour la boutique d'avantages). */
export async function POST() {
  const uid = await getUserId();
  if (!uid) return json({ error: 'Non authentifié' }, 401);
  const r = await db.wallet.updateMany({ where: { userId: uid, balanceCents: { gte: 1000 } }, data: { balanceCents: { decrement: 1000 }, zeltokenBalance: { increment: 100 } } });
  if (r.count !== 1) return json({ error: 'Solde insuffisant' }, 402);
  const w = await db.wallet.findUnique({ where: { userId: uid } });
  return json({ balance: w?.zeltokenBalance, cents: w?.balanceCents });
}
