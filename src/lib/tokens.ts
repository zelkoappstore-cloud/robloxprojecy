import { randomBytes, createHash } from 'crypto';
import { db } from './db';

const h = (t: string) => createHash('sha256').update(t).digest('hex');

export async function issueToken(userId: string, type: string, ttlMs: number) {
  const raw = randomBytes(32).toString('hex');
  await db.authToken.deleteMany({ where: { userId, type } });
  await db.authToken.create({ data: { userId, type, tokenHash: h(raw), expiresAt: new Date(Date.now() + ttlMs) } });
  return raw;
}

export async function consumeToken(raw: string, type: string): Promise<string | null> {
  const t = await db.authToken.findUnique({ where: { tokenHash: h(raw) } });
  if (!t || t.type !== type || t.usedAt || t.expiresAt < new Date()) return null;
  const u = await db.authToken.updateMany({ where: { id: t.id, usedAt: null }, data: { usedAt: new Date() } });
  return u.count === 1 ? t.userId : null;
}
