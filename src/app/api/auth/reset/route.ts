import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { json } from '@/lib/auth';
import { allow, ipOf } from '@/lib/rate';
import { consumeToken } from '@/lib/tokens';

export async function POST(req: Request) {
  if (!(await allow('reset:' + ipOf(req), 10, 3600000))) return json({ error: 'Trop de tentatives' }, 429);
  const { token, password } = await req.json().catch(() => ({}));
  if (typeof token !== 'string' || typeof password !== 'string' || password.length < 8 || password.length > 100) return json({ error: 'Mot de passe invalide (8 caractères min.)' }, 400);
  const uid = await consumeToken(token, 'RESET');
  if (!uid) return json({ error: 'Lien invalide ou expiré' }, 400);
  await db.user.update({ where: { id: uid }, data: { passwordHash: await bcrypt.hash(password, 12), emailVerified: true } });
  return json({ ok: true });
}
