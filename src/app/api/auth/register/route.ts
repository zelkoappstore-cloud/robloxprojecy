import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { json, startSession } from '@/lib/auth';
import { allow, ipOf } from '@/lib/rate';
import { appUrl, mailEnabled, mailHtml, sendMail } from '@/lib/mail';
import { issueToken } from '@/lib/tokens';

export async function POST(req: Request) {
  if (!(await allow('reg:' + ipOf(req), 5, 3600000))) return json({ error: 'Trop de tentatives, réessayez plus tard' }, 429);
  const { username, email, password } = await req.json().catch(() => ({}));
  if (typeof username !== 'string' || !/^[\w.-]{3,24}$/.test(username) || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email) || email.length > 120 || typeof password !== 'string' || password.length < 8 || password.length > 100)
    return json({ error: 'Données invalides (pseudo 3 à 24 caractères, mot de passe 8 min.)' }, 400);
  const verify = mailEnabled();
  try {
    const u = await db.user.create({
      data: { username, email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 12), emailVerified: !verify, wallet: { create: { zeltokenBalance: 100 } } },
    });
    if (verify) {
      const t = await issueToken(u.id, 'VERIFY', 86400000);
      await sendMail(u.email, 'Confirmez votre email Zelko', mailHtml('Bienvenue sur Zelko', 'Confirmez votre adresse email pour activer votre compte.', { label: 'Confirmer mon email', url: appUrl() + '/verify?token=' + t }));
      return json({ needsVerification: true }, 201);
    }
    await startSession(u.id);
    return json({ id: u.id, bonus: 100 }, 201);
  } catch (e: any) {
    if (e.code === 'P2002') return json({ error: 'Pseudo ou email déjà utilisé' }, 409);
    throw e;
  }
}
