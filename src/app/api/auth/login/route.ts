import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { json, startSession } from '@/lib/auth';
import { allow, ipOf } from '@/lib/rate';

export async function POST(req: Request) {
  if (!(await allow('login:' + ipOf(req), 15, 900000))) return json({ error: 'Trop de tentatives, réessayez dans 15 minutes' }, 429);
  const { email, password } = await req.json().catch(() => ({}));
  if (typeof email !== 'string' || typeof password !== 'string') return json({ error: 'Données invalides' }, 400);
  if (!(await allow('loginm:' + email.toLowerCase(), 6, 900000))) return json({ error: 'Trop de tentatives, réessayez dans 15 minutes' }, 429);
  const u = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!u || !(await bcrypt.compare(password, u.passwordHash))) return json({ error: 'Identifiants incorrects' }, 401);
  if (!u.emailVerified) return json({ error: 'Email non confirmé. Vérifiez votre boîte mail.', code: 'UNVERIFIED' }, 403);
  await startSession(u.id);
  return json({ id: u.id, status: u.accountStatus });
}
