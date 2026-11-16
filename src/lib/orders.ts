import { OrderStatus, Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export async function complete(t: Tx, id: string): Promise<boolean> {
  const o = await t.order.findUnique({ where: { id } });
  if (!o) return false;
  const u = await t.order.updateMany({ where: { id, status: 'DELIVERED' }, data: { status: 'COMPLETED', closedAt: new Date() } });
  if (u.count !== 1) return false;
  const bw = await t.wallet.findUnique({ where: { userId: o.buyerId } });
  const sw = await t.wallet.findUnique({ where: { userId: o.sellerId } });
  if (!bw || !sw) throw new Error('WALLET');
  await t.wallet.update({ where: { id: sw.id }, data: { balanceCents: { increment: o.amountCents }, zeltokenBalance: { increment: o.amount } } });
  await t.transaction.create({ data: { buyerWalletId: bw.id, sellerWalletId: sw.id, amount: o.amount, amountCents: o.amountCents } });
  return true;
}

export async function cancel(t: Tx, id: string, from: OrderStatus[]): Promise<boolean> {
  const o = await t.order.findUnique({ where: { id } });
  if (!o) return false;
  const u = await t.order.updateMany({ where: { id, status: { in: from } }, data: { status: 'CANCELLED', closedAt: new Date() } });
  if (u.count !== 1) return false;
  await t.wallet.update({ where: { userId: o.buyerId }, data: { balanceCents: { increment: o.amountCents }, zeltokenBalance: { increment: o.amount } } });
  return true;
}
