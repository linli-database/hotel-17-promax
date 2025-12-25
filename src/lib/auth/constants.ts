export type SessionScope = 'admin' | 'client';

export const ADMIN_SESSION_COOKIE = 'hotel_admin_session';
export const CLIENT_SESSION_COOKIE = 'hotel_client_session';

export function getSessionCookieName(scope: SessionScope) {
  return scope === 'admin' ? ADMIN_SESSION_COOKIE : CLIENT_SESSION_COOKIE;
}
