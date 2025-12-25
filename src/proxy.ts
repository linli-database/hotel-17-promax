import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_CLIENT_PATHS = new Set(['/client/login', '/client/register']);
const PUBLIC_ADMIN_PATHS = new Set(['/admin/login']);

const encoder = new TextEncoder();

function toBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string) {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const base = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function parseSession(token: string) {
  const secret = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-secret');
  if (!secret) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const expected = toBase64Url(signature);
  if (expected !== sig) return null;
  try {
    return JSON.parse(fromBase64Url(body)) as { role: 'CUSTOMER' | 'ADMIN' | 'STAFF'; userId: string };
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static/assets and auth APIs
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get('hotel_session')?.value;

  if (pathname.startsWith('/admin')) {
    if (PUBLIC_ADMIN_PATHS.has(pathname)) return NextResponse.next();
    const session = token ? await parseSession(token) : null;
    if (!session || (session.role !== 'STAFF' && session.role !== 'ADMIN')) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/client')) {
    if (PUBLIC_CLIENT_PATHS.has(pathname)) return NextResponse.next();
    const session = token ? await parseSession(token) : null;
    if (!session || session.role !== 'CUSTOMER') {
      return NextResponse.redirect(new URL('/client/login', req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/client/:path*'],
};
