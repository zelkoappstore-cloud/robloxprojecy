import { db } from '@/lib/db';
import { getUserId, json } from '@/lib/auth';

const PACKS: Record<string, number> = { '10': 1000, '50': 5000 };

export async function POST(req: Request) {
  if (process.env.ALLOW_MOCK_DEPOSIT !== 'true') return json({ error: 'Désactivé' }, 403);
  const uid = await getUserId();
  if (!uid) return json({ error: 'Non authentifié' }, 401);
  const { pack } = await req.json().catch(() => ({}));
  const add = PACKS[String(pack)];
  if (!add) return json({ error: 'Pack invalide' }, 400);
  const w = await db.wallet.update({ where: { userId: uid }, data: { balanceCents: { increment: add } } });
  return json({ added: add, cents: w.balanceCents });
}
