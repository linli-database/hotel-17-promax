import { cookies } from 'next/headers';
import { parseSessionToken } from './auth';

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('hotel_session')?.value;
  if (!token) return null;
  return parseSessionToken(token);
}
