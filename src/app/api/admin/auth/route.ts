import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { json } from '@/lib/auth';
import { allow, ipOf } from '@/lib/rate';
import {
  ADMIN_TTL, adminSession, audit, checkTotp, clearAdminCookie, founderOf, newTotpSecret,
  notFound, otpauthUri, seal, setAdminCookie, sha256, unseal,
} from '@/lib/admin';

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store' };

/** État : 2FA configurée ? session admin ouverte ? (404 si pas Fondateur) */
export async function GET(req: Request) {
  const u = await founderOf(req);
  if (!u) return notFound();
  const s = await adminSession(u.id);
  return json({ totp: !!u.totpSecret, open: !!s, expiresAt: s?.expiresAt ?? null, username: u.username });
}

export async function POST(req: Request) {
  const u = await founderOf(req);
  if (!u) return notFound();
  const ip = ipOf(req);
  if (!(await allow('adm:' + u.id, 8, 15 * 60000)) || !(await allow('admip:' + ip, 8, 15 * 60000))) {
    await audit(req, u.id, 'AUTH_RATE_LIMIT');
    return json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' }, 429);
  }
  const { action, password, code } = await req.json().catch(() => ({}));
  const pwOk = typeof password === 'string' && password.length <= 100 && (await bcrypt.compare(password, u.passwordHash));

  // 1) Démarrer la configuration 2FA (une seule fois : impossible si déjà active)
  if (action === 'setup') {
    if (u.totpSecret) return json({ error: 'La double authentification est déjà active.' }, 409);
    if (!pwOk) { await audit(req, u.id, 'TOTP_SETUP_BAD_PASSWORD'); return json({ error: 'Mot de passe incorrect' }, 401); }
    const secret = newTotpSecret();
    await db.user.update({ where: { id: u.id }, data: { totpPending: seal(secret) } });
    await audit(req, u.id, 'TOTP_SETUP_START');
    return json({ secret, uri: otpauthUri(secret, u.username) }, 200);
  }

  // 2) Confirmer la 2FA avec un premier code
  if (action === 'confirm') {
    if (u.totpSecret) return json({ error: 'La double authentification est déjà active.' }, 409);
    const secret = u.totpPending ? unseal(u.totpPending) : null;
    const step = secret && typeof code === 'string' ? checkTotp(secret, code.trim(), 0) : -1;
    if (!pwOk || step < 0) { await audit(req, u.id, 'TOTP_CONFIRM_FAIL'); return json({ error: 'Mot de passe ou code incorrect' }, 401); }
    await db.user.update({ where: { id: u.id }, data: { totpSecret: u.totpPending, totpPending: '', totpLastStep: step } });
    await audit(req, u.id, 'TOTP_ENABLED');
    return json({ ok: true });
  }

  // 3) Ouvrir une session admin : mot de passe + code 2FA obligatoires
  if (action === 'login') {
    const secret = u.totpSecret ? unseal(u.totpSecret) : null;
    if (!secret) return json({ error: 'Configurez d’abord la double authentification.' }, 403);
    const step = typeof code === 'string' ? checkTotp(secret, code.trim(), u.totpLastStep) : -1;
    if (!pwOk || step < 0) { await audit(req, u.id, 'LOGIN_FAIL'); return json({ error: 'Mot de passe ou code incorrect' }, 401); }
    await db.user.update({ where: { id: u.id }, data: { totpLastStep: step } });
    await db.adminSession.updateMany({ where: { userId: u.id, revokedAt: null }, data: { revokedAt: new Date() } });
    const token = crypto.randomBytes(32).toString('base64url');
    await db.adminSession.create({ data: { userId: u.id, tokenHash: sha256(token), ip, ua: (req.headers.get('user-agent') ?? '').slice(0, 200), expiresAt: new Date(Date.now() + ADMIN_TTL) } });
    setAdminCookie(token);
    await audit(req, u.id, 'LOGIN_OK');
    return json({ ok: true }, 200);
  }

  return json({ error: 'Action inconnue' }, 400);
}

/** Fermer la session admin (et toutes les autres sessions admin du compte). */
export async function DELETE(req: Request) {
  const u = await founderOf(req);
  if (!u) return notFound();
  await db.adminSession.updateMany({ where: { userId: u.id, revokedAt: null }, data: { revokedAt: new Date() } });
  clearAdminCookie();
  await audit(req, u.id, 'LOGOUT');
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } });
}
