import { db } from '@/lib/db';
import { json } from '@/lib/auth';
import { allow, ipOf } from '@/lib/rate';
import { appUrl, mailEnabled, mailHtml, sendMail } from '@/lib/mail';
import { issueToken } from '@/lib/tokens';

export async function POST(req: Request) {
  if (!mailEnabled()) return json({ error: 'L’envoi d’emails n’est pas encore configuré' }, 503);
  const { email } = await req.json().catch(() => ({}));
  if (typeof email !== 'string') return json({ error: 'Données invalides' }, 400);
  if (!(await allow('forgot:' + ipOf(req), 5, 3600000)) || !(await allow('forgotm:' + email.toLowerCase(), 3, 3600000))) return json({ error: 'Trop de tentatives, réessayez plus tard' }, 429);
  const u = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (u) {
    const t = await issueToken(u.id, 'RESET', 3600000);
    await sendMail(u.email, 'Réinitialisation de votre mot de passe Zelko', mailHtml('Mot de passe oublié', 'Ce lien est valable 1 heure. Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.', { label: 'Choisir un nouveau mot de passe', url: appUrl() + '/reset?token=' + t }));
  }
  return json({ ok: true });
}
