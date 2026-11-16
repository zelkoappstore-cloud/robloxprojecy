import { db } from '@/lib/db';
import { json } from '@/lib/auth';
import { allow, ipOf } from '@/lib/rate';
import { consumeToken } from '@/lib/tokens';

export async function POST(req: Request) {
  if (!(await allow('verify:' + ipOf(req), 20, 3600000))) return json({ error: 'Trop de tentatives' }, 429);
  const { token } = await req.json().catch(() => ({}));
  if (typeof token !== 'string') return json({ error: 'Lien invalide' }, 400);
  const uid = await consumeToken(token, 'VERIFY');
  if (!uid) return json({ error: 'Lien invalide ou expiré' }, 400);
  await db.user.update({ where: { id: uid }, data: { emailVerified: true } });
  return json({ ok: true });
}
