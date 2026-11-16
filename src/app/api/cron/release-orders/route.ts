import { db } from '@/lib/db';
import { json } from '@/lib/auth';
import { complete } from '@/lib/orders';
import { notify } from '@/lib/notify';
import { fmt } from '@/lib/money';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== 'Bearer ' + secret) return json({ error: 'Interdit' }, 401);
  const due = await db.order.findMany({ where: { status: 'DELIVERED', deliveredAt: { lt: new Date(Date.now() - 72 * 3600000) } }, take: 200 });
  let released = 0;
  for (const o of due) {
    try {
      const ok = await db.$transaction(t => complete(t, o.id));
      if (ok) {
        released++;
        await notify(o.sellerId, 'ORDER', 'Paiement libéré automatiquement : +' + (o.amountCents ? fmt(o.amountCents) : o.amount + ' ZLT') + ' (' + o.title + ')', '/?tab=orders');
        await notify(o.buyerId, 'ORDER', 'Commande terminée automatiquement : ' + o.title, '/?tab=orders');
      }
    } catch {}
  }
  return json({ checked: due.length, released });
}
