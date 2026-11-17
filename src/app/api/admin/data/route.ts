import { db } from '@/lib/db';
import { json } from '@/lib/auth';
import { notify } from '@/lib/notify';
import { cancel, complete } from '@/lib/orders';
import { fmt } from '@/lib/money';
import { audit, notFound, requireAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

const ID = /^[a-z0-9]{10,40}$/i;

export async function GET(req: Request) {
  const a = await requireAdmin(req);
  if (!a) return notFound();
  const sp = new URL(req.url).searchParams;
  const view = sp.get('view');
  const q = (sp.get('q') ?? '').trim().slice(0, 80);

  if (view === 'stats') {
    const day = new Date(Date.now() - 86400000);
    const [users, users24, listings, listings24, orders, disputes, suspended, reports] = await Promise.all([
      db.user.count(), db.user.count({ where: { createdAt: { gt: day } } }),
      db.listing.count({ where: { status: 'ACTIVE' } }), db.listing.count({ where: { createdAt: { gt: day } } }),
      db.order.count(), db.order.count({ where: { status: 'DISPUTED' } }),
      db.user.count({ where: { accountStatus: 'SUSPENDED' } }),
      db.report.count({ where: { resolved: false } }),
    ]);
    return json({ users, users24, listings, listings24, orders, disputes, suspended, reports, expiresAt: a.session.expiresAt });
  }

  if (view === 'listings') {
    const where: any = { status: sp.get('deleted') ? 'DELETED' : 'ACTIVE' };
    if (q) where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }, { seller: { username: { contains: q, mode: 'insensitive' } } }];
    const rows = await db.listing.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, title: true, description: true, priceCents: true, category: true, thumb: true, status: true, createdAt: true, seller: { select: { id: true, username: true } } } });
    return json({ items: rows });
  }

  if (view === 'users') {
    const where: any = q ? { OR: [{ username: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : {};
    const rows = await db.user.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, username: true, email: true, accountStatus: true, founder: true, emailVerified: true, createdAt: true, avatar: true, _count: { select: { listings: true, sellOrders: true, buyOrders: true } } } });
    return json({ items: rows });
  }

  if (view === 'disputes') {
    const rows = await db.order.findMany({ where: { status: 'DISPUTED' }, orderBy: { createdAt: 'desc' }, take: 50, include: { buyer: { select: { id: true, username: true } }, seller: { select: { id: true, username: true } } } });
    return json({ items: rows.map(o => ({ id: o.id, title: o.title, amountCents: o.amountCents, amount: o.amount, deliveryNote: o.deliveryNote, createdAt: o.createdAt, deliveredAt: o.deliveredAt, buyer: o.buyer, seller: o.seller })) });
  }

  if (view === 'reports') {
    const rows = await db.listing.findMany({
      where: { reports: { some: { resolved: false } } }, take: 50,
      select: { id: true, title: true, description: true, priceCents: true, thumb: true, hidden: true, status: true, seller: { select: { id: true, username: true } }, reports: { where: { resolved: false }, orderBy: { createdAt: 'desc' }, select: { id: true, reason: true, detail: true, createdAt: true } } },
    });
    rows.sort((a, b) => b.reports.length - a.reports.length);
    return json({ items: rows });
  }

  if (view === 'logs') {
    const rows = await db.adminLog.findMany({ orderBy: { at: 'desc' }, take: 100 });
    return json({ items: rows });
  }

  return json({ error: 'Vue inconnue' }, 400);
}

export async function POST(req: Request) {
  const a = await requireAdmin(req);
  if (!a) return notFound();
  const { action, id, reason } = await req.json().catch(() => ({}));
  if (typeof id !== 'string' || !ID.test(id)) return json({ error: 'Identifiant invalide' }, 400);
  const why = typeof reason === 'string' ? reason.trim().slice(0, 300) : '';

  if (action === 'deleteListing' || action === 'restoreListing') {
    const del = action === 'deleteListing';
    const l = await db.listing.findUnique({ where: { id } });
    if (!l) return json({ error: 'Annonce introuvable' }, 404);
    await db.listing.update({ where: { id }, data: { status: del ? 'DELETED' : 'ACTIVE', hidden: false } });
    await db.report.updateMany({ where: { listingId: id, resolved: false }, data: { resolved: true } });
    if (del) await notify(l.sellerId, 'ADMIN', 'Votre annonce « ' + l.title + ' » a été retirée par la modération' + (why ? ' : ' + why : '.'), '/?tab=sell');
    await audit(req, a.user.id, del ? 'LISTING_DELETE' : 'LISTING_RESTORE', id, l.title + (why ? ' | ' + why : ''));
    return json({ ok: true });
  }

  if (action === 'dismissReports') {
    const l = await db.listing.findUnique({ where: { id } });
    if (!l) return json({ error: 'Annonce introuvable' }, 404);
    await db.report.updateMany({ where: { listingId: id, resolved: false }, data: { resolved: true } });
    if (l.hidden) {
      await db.listing.update({ where: { id }, data: { hidden: false } });
      await notify(l.sellerId, 'ADMIN', 'Votre annonce « ' + l.title + ' » a été vérifiée et remise en ligne.', '/listing/' + id);
    }
    await audit(req, a.user.id, 'REPORTS_DISMISS', id, l.title + (why ? ' | ' + why : ''));
    return json({ ok: true });
  }

  if (action === 'suspendUser' || action === 'activateUser') {
    const sus = action === 'suspendUser';
    const u = await db.user.findUnique({ where: { id } });
    if (!u) return json({ error: 'Membre introuvable' }, 404);
    if (u.founder) return json({ error: 'Impossible de modifier un compte Fondateur' }, 403);
    await db.user.update({ where: { id }, data: { accountStatus: sus ? 'SUSPENDED' : 'ACTIVE' } });
    await audit(req, a.user.id, sus ? 'USER_SUSPEND' : 'USER_ACTIVATE', id, u.username + (why ? ' | ' + why : ''));
    return json({ ok: true });
  }

  if (action === 'refundDispute' || action === 'releaseDispute') {
    const refund = action === 'refundDispute';
    const o = await db.order.findUnique({ where: { id } });
    if (!o || o.status !== 'DISPUTED') return json({ error: 'Litige introuvable ou déjà traité' }, 409);
    const ok = await db.$transaction(t => refund ? cancel(t, id, ['DISPUTED']) : complete(t, id, ['DISPUTED']));
    if (!ok) return json({ error: 'Litige déjà traité' }, 409);
    const amt = o.amountCents ? fmt(o.amountCents) : o.amount + ' ZLT';
    await notify(o.buyerId, 'ORDER', 'Litige « ' + o.title + ' » : ' + (refund ? 'vous avez été remboursé (' + amt + ').' : 'tranché en faveur du vendeur.'), '/?tab=orders');
    await notify(o.sellerId, 'ORDER', 'Litige « ' + o.title + ' » : ' + (refund ? 'l’acheteur a été remboursé.' : 'paiement libéré (+' + amt + ').'), '/?tab=orders');
    await audit(req, a.user.id, refund ? 'DISPUTE_REFUND' : 'DISPUTE_RELEASE', id, o.title + (why ? ' | ' + why : ''));
    return json({ ok: true });
  }

  return json({ error: 'Action inconnue' }, 400);
}
