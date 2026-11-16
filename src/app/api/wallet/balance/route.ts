import { db } from '@/lib/db';
import { getUserId, json } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const uid = await getUserId();
  if (!uid) return json({ error: 'Non authentifié' }, 401);
  const w = await db.wallet.findUnique({ where: { userId: uid }, include: { user: { select: { founder: true } } } });
  return w ? json({ balance: w.zeltokenBalance, cents: w.balanceCents, unlimited: w.user.founder }) : json({ error: 'Wallet introuvable' }, 404);
}
