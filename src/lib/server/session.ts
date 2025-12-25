import { cookies } from 'next/headers';
import { getSessionCookieName, SessionScope } from '@/lib/auth/constants';
import { parseSessionToken } from './auth';

export async function getSession(scope: SessionScope) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName(scope))?.value;
  if (!token) return null;
  const session = parseSessionToken(token);
  if (!session) return null;
  if (scope === 'admin' && session.role === 'CUSTOMER') return null;
  if (scope === 'client' && session.role !== 'CUSTOMER') return null;
  return session;
}
