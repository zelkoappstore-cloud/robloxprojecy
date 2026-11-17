import { db } from '@/lib/db';
import { getUserId, json } from '@/lib/auth';
import { allow } from '@/lib/rate';
import { notify } from '@/lib/notify';
import { HIDE_AFTER, REPORT_REASONS } from '@/lib/rules';

export async function POST(req: Request) {
  const uid = await getUserId();
  if (!uid) return json({ error: 'Non authentifié' }, 401);
  const { listingId, reason, detail } = await req.json().catch(() => ({}));
  if (typeof listingId !== 'string' || !(reason in REPORT_REASONS)) return json({ error: 'Données invalides' }, 400);
  const me = await db.user.findUnique({ where: { id: uid }, select: { accountStatus: true, emailVerified: true } });
  if (!me || me.accountStatus !== 'ACTIVE' || !me.emailVerified) return json({ error: 'Compte non actif' }, 403);
  if (!(await allow('report:' + uid, 15, 3600000))) return json({ error: 'Trop de signalements, réessayez plus tard' }, 429);
  const l = await db.listing.findUnique({ where: { id: listingId } });
  if (!l || l.status !== 'ACTIVE') return json({ error: 'Annonce introuvable' }, 404);
  if (l.sellerId === uid) return json({ error: 'Vous ne pouvez pas signaler votre propre annonce' }, 400);
  try {
    await db.report.create({ data: { listingId, reporterId: uid, reason, detail: typeof detail === 'string' ? detail.trim().slice(0, 500) : '' } });
  } catch (e: any) {
    if (e.code === 'P2002') return json({ error: 'Vous avez déjà signalé cette annonce' }, 409);
    throw e;
  }
  const n = await db.report.count({ where: { listingId, resolved: false } });
  if (n >= HIDE_AFTER && !l.hidden) {
    await db.listing.update({ where: { id: listingId }, data: { hidden: true } });
    await notify(l.sellerId, 'ADMIN', 'Votre annonce « ' + l.title + ' » a été signalée plusieurs fois et est masquée en attendant une vérification.', '/?tab=sell');
  }
  return json({ ok: true }, 201);
}
