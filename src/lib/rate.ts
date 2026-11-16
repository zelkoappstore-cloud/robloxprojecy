import { db } from './db';

export const ipOf = (req: Request) => (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();

export async function allow(key: string, max: number, windowMs: number): Promise<boolean> {
  const now = new Date();
  const row = await db.rateLimit.findUnique({ where: { key } });
  if (!row || row.resetAt < now) {
    const resetAt = new Date(now.getTime() + windowMs);
    await db.rateLimit.upsert({ where: { key }, create: { key, count: 1, resetAt }, update: { count: 1, resetAt } });
    return true;
  }
  if (row.count >= max) return false;
  await db.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
  return true;
}
