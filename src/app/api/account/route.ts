import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { getUserId, json } from '@/lib/auth';
import { isCur, isImg } from '@/lib/money';

export const dynamic = 'force-dynamic';
const WEEK = 7 * 86400000;

export async function GET() {
  const uid = await getUserId();
  if (!uid) return json({ error: 'Non authentifié' }, 401);
  const u = await db.user.findUnique({
    where: { id: uid },
    select: { id: true, username: true, email: true, accountStatus: true, badgePro: true, extraSlots: true, featuredUntil: true, createdAt: true, emailVerified: true, usernameChangedAt: true, bio: true, emailNotifs: true, allowMessages: true, currency: true, avatar: true },
  });
  if (!u) return json({ error: 'Introuvable' }, 404);
  const listings = await db.listing.count({ where: { sellerId: uid, status: 'ACTIVE' } });
  const { usernameChangedAt, ...rest } = u;
  const next = usernameChangedAt && usernameChangedAt.getTime() + WEEK > Date.now() ? new Date(usernameChangedAt.getTime() + WEEK) : null;
  return json({ ...rest, listings, nextUsernameChange: next });
}

export async function PATCH(req: Request) {
  const uid = await getUserId();
  if (!uid) return json({ error: 'Non authentifié' }, 401);
  const b = await req.json().catch(() => ({}));
  const u = await db.user.findUnique({ where: { id: uid } });
  if (!u) return json({ error: 'Introuvable' }, 404);
  const data: Record<string, unknown> = {};

  if (typeof b.username === 'string' && b.username !== u.username) {
    if (!/^[\w.-]{3,24}$/.test(b.username)) return json({ error: 'Pseudo invalide (3 à 24 caractères : lettres, chiffres, . _ -)' }, 400);
    if (u.usernameChangedAt && u.usernameChangedAt.getTime() + WEEK > Date.now())
      return json({ error: 'Vous pourrez changer de pseudo le ' + new Date(u.usernameChangedAt.getTime() + WEEK).toLocaleDateString('fr-FR') }, 429);
    data.username = b.username;
    data.usernameChangedAt = new Date();
  }
  if (typeof b.bio === 'string') {
    if (b.bio.length > 200) return json({ error: 'Bio trop longue (200 caractères max.)' }, 400);
    data.bio = b.bio.trim();
  }
  if (typeof b.emailNotifs === 'boolean') data.emailNotifs = b.emailNotifs;
  if (typeof b.allowMessages === 'boolean') data.allowMessages = b.allowMessages;
  if (b.currency !== undefined) {
    if (!isCur(b.currency)) return json({ error: 'Devise non prise en charge' }, 400);
    data.currency = b.currency;
  }
  if (b.avatar !== undefined) {
    if (b.avatar !== '' && !isImg(b.avatar, 80000)) return json({ error: 'Photo invalide ou trop lourde' }, 400);
    data.avatar = b.avatar;
  }
  if (typeof b.newPassword === 'string') {
    if (b.newPassword.length < 8 || b.newPassword.length > 100 || typeof b.currentPassword !== 'string') return json({ error: 'Mot de passe invalide (8 caractères min.)' }, 400);
    if (!(await bcrypt.compare(b.currentPassword, u.passwordHash))) return json({ error: 'Mot de passe actuel incorrect' }, 401);
    data.passwordHash = await bcrypt.hash(b.newPassword, 12);
  }
  if (!Object.keys(data).length) return json({ ok: true });
  try {
    await db.user.update({ where: { id: uid }, data });
    return json({ ok: true });
  } catch (e: any) {
    if (e.code === 'P2002') return json({ error: 'Pseudo déjà utilisé' }, 409);
    throw e;
  }
}
