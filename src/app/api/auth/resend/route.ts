import { db } from '@/lib/db';
import { json } from '@/lib/auth';
import { allow, ipOf } from '@/lib/rate';
import { appUrl, mailEnabled, mailHtml, sendMail } from '@/lib/mail';
import { issueToken } from '@/lib/tokens';

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  if (typeof email !== 'string') return json({ error: 'Données invalides' }, 400);
  if (!(await allow('resend:' + ipOf(req), 5, 3600000)) || !(await allow('resendm:' + email.toLowerCase(), 3, 3600000))) return json({ error: 'Trop de tentatives, réessayez plus tard' }, 429);
  const u = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (u && !u.emailVerified && mailEnabled()) {
    const t = await issueToken(u.id, 'VERIFY', 86400000);
    await sendMail(u.email, 'Confirmez votre email Zelko', mailHtml('Confirmez votre email', 'Cliquez sur le bouton pour activer votre compte Zelko.', { label: 'Confirmer mon email', url: appUrl() + '/verify?token=' + t }));
  }
  return json({ ok: true });
}
