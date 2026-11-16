import { db } from '@/lib/db';
import { getUserId, json } from '@/lib/auth';
import { PERKS } from '@/lib/perks';

export const dynamic = 'force-dynamic';

const ERR: Record<string, [string, number]> = {
  ACCOUNT: ['Compte non actif', 403],
  OWNED: ['Avantage déjà acquis', 409],
  FUNDS: ['Solde insuffisant', 402],
};

export async function GET() {
  const uid = await getUserId();
  if (!uid) return json({ error: 'Non authentifié' }, 401);
  const owned = await db.user.findUnique({ where: { id: uid }, select: { badgePro: true, extraSlots: true, featuredUntil: true } });
  return json({ perks: PERKS, owned });
}

export async function POST(req: Request) {
  const uid = await getUserId();
  if (!uid) return json({ error: 'Non authentifié' }, 401);
  const { key } = await req.json().catch(() => ({}));
  const perk = PERKS.find(p => p.key === key);
  if (!perk) return json({ error: 'Avantage inconnu' }, 400);
  try {
    const balance = await db.$transaction(async (t) => {
      const u = await t.user.findUnique({ where: { id: uid }, include: { wallet: true } });
      if (!u?.wallet || u.accountStatus !== 'ACTIVE') throw new Error('ACCOUNT');
      if (perk.key === 'BADGE_PRO' && u.badgePro) throw new Error('OWNED');
      const d = await t.wallet.updateMany({
        where: { id: u.wallet.id, zeltokenBalance: { gte: perk.price } },
        data: { zeltokenBalance: { decrement: perk.price } },
      });
      if (d.count !== 1) throw new Error('FUNDS');
      const data = perk.key === 'BADGE_PRO' ? { badgePro: true }
        : perk.key === 'EXTRA_SLOTS' ? { extraSlots: { increment: 10 } }
        : { featuredUntil: new Date(Math.max(Date.now(), u.featuredUntil?.getTime() ?? 0) + 7 * 86400000) };
      await t.user.update({ where: { id: uid }, data });
      return u.wallet.zeltokenBalance - perk.price;
    });
    return json({ ok: true, balance });
  } catch (e: any) {
    const m = ERR[e.message];
    if (m) return json({ error: m[0] }, m[1]);
    throw e;
  }
}
