import { cookies } from 'next/headers';
import { json } from '@/lib/auth';

export async function POST() {
  cookies().delete('zelko_session');
  return json({ ok: true });
}
