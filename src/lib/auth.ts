import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const key = new TextEncoder().encode(process.env.AUTH_SECRET ?? '');
const COOKIE = 'zelko_session';

export const json = (d: unknown, status = 200) => NextResponse.json(d, { status });

export async function startSession(uid: string) {
  const token = await new SignJWT({ uid }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('7d').sign(key);
  cookies().set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 604800, path: '/' });
}

export async function getUserId(): Promise<string | null> {
  const t = cookies().get(COOKIE)?.value;
  if (!t) return null;
  try { return (await jwtVerify(t, key)).payload.uid as string; } catch { return null; }
}
