import { db } from './db';
import { appUrl, mailEnabled, mailHtml, sendMail } from './mail';

export async function notify(userId: string, type: string, text: string, link?: string) {
  try {
    await db.notification.create({ data: { userId, type, text, link } });
    if (type === 'ORDER' && mailEnabled()) {
      const u = await db.user.findUnique({ where: { id: userId }, select: { email: true, emailNotifs: true, emailVerified: true } });
      if (u?.emailNotifs && u.emailVerified) await sendMail(u.email, 'Zelko : ' + text, mailHtml('Zelko', text, { label: 'Ouvrir Zelko', url: appUrl() + (link ?? '') }));
    }
  } catch {}
}
