import crypto from 'crypto';
import { cookies } from 'next/headers';
import { db } from './db';
import { getUserId, json } from './auth';
import { ipOf } from './rate';

/*
 * Sécurité du panneau admin : chaque requête doit passer TOUS ces verrous.
 * 1. AUTH_SECRET fort configuré (sinon tout est refusé).
 * 2. Requêtes d'écriture : en-tête Origin identique au site (anti-CSRF).
 * 3. Session utilisateur valide + compte Fondateur actif et email confirmé (relu en base à chaque requête).
 * 4. Session admin séparée : jeton aléatoire stocké haché en base, 30 min max, révocable,
 *    obtenue uniquement avec mot de passe + code 2FA (TOTP).
 * Toute tentative refusée renvoie 404 pour ne pas révéler l'existence du panneau.
 */

export const ADMIN_COOKIE = 'zelko_admin';
export const ADMIN_TTL = 30 * 60 * 1000;
const SECRET = process.env.AUTH_SECRET ?? '';
export const secretOk = () => SECRET.length >= 32;

export const notFound = () => json({ error: 'Introuvable' }, 404);
export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}

/* ---------- Chiffrement du secret 2FA (AES-256-GCM) ---------- */
const encKey = () => crypto.createHash('sha256').update(SECRET + ':zelko-totp').digest();
export function seal(plain: string) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', encKey(), iv);
  const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), ct].map(b => b.toString('base64')).join('.');
}
export function unseal(box: string): string | null {
  try {
    const [iv, tag, ct] = box.split('.').map(s => Buffer.from(s, 'base64'));
    const d = crypto.createDecipheriv('aes-256-gcm', encKey(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
  } catch { return null; }
}

/* ---------- TOTP (RFC 6238, compatible Google Authenticator, Authy…) ---------- */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function newTotpSecret() {
  const bytes = crypto.randomBytes(20);
  let bits = '', out = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}
function b32decode(s: string) {
  let bits = '';
  for (const ch of s.replace(/=+$/, '').toUpperCase()) { const v = B32.indexOf(ch); if (v < 0) continue; bits += v.toString(2).padStart(5, '0'); }
  const out: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}
function hotp(secret: string, counter: number) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', b32decode(secret)).update(buf).digest();
  const o = h[h.length - 1] & 0xf;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, '0');
}
/** Renvoie le pas de temps accepté (pour bloquer la réutilisation du même code), ou -1. */
export function checkTotp(secret: string, code: string, lastStep: number): number {
  if (!/^\d{6}$/.test(code)) return -1;
  const now = Math.floor(Date.now() / 30000);
  for (const s of [now - 1, now, now + 1]) {
    if (s <= lastStep) continue;
    const a = Buffer.from(hotp(secret, s)), b = Buffer.from(code);
    if (crypto.timingSafeEqual(a, b)) return s;
  }
  return -1;
}
export const otpauthUri = (secret: string, account: string) =>
  `otpauth://totp/Zelko%20Admin:${encodeURIComponent(account)}?secret=${secret}&issuer=Zelko%20Admin&algorithm=SHA1&digits=6&period=30`;

/* ---------- Journal ---------- */
export async function audit(req: Request, adminId: string | null, action: string, target?: string, detail?: string) {
  await db.adminLog.create({ data: { adminId, action, target: target ?? null, detail: detail?.slice(0, 500) ?? null, ip: ipOf(req) } }).catch(() => {});
}

/* ---------- Vérifications ---------- */
export async function founderOf(req: Request) {
  if (!secretOk()) return null;
  if (req.method !== 'GET' && !sameOrigin(req)) return null;
  const uid = await getUserId();
  if (!uid) return null;
  const u = await db.user.findUnique({ where: { id: uid } });
  if (!u || !u.founder || u.accountStatus !== 'ACTIVE' || !u.emailVerified) return null;
  return u;
}

export async function adminSession(uid: string) {
  const raw = cookies().get(ADMIN_COOKIE)?.value;
  if (!raw || raw.length < 40) return null;
  const s = await db.adminSession.findUnique({ where: { tokenHash: sha256(raw) } });
  if (!s || s.userId !== uid || s.revokedAt || s.expiresAt < new Date()) return null;
  return s;
}

/** À appeler en tête de chaque route admin protégée. */
export async function requireAdmin(req: Request) {
  const u = await founderOf(req);
  if (!u) return null;
  const s = await adminSession(u.id);
  if (!s) return null;
  return { user: u, session: s };
}

export function setAdminCookie(token: string) {
  cookies().set(ADMIN_COOKIE, token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: ADMIN_TTL / 1000, path: '/' });
}
export function clearAdminCookie() {
  cookies().set(ADMIN_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 0, path: '/' });
}
