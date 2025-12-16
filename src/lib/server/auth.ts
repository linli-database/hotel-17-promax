import { createHmac, randomBytes, scrypt } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@/generated/prisma/client';

type SessionPayload = {
  userId: number;
  role: UserRole;
};

const SESSION_COOKIE = 'hotel_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const scryptAsync = (password: string, salt: string, keylen: number) =>
  new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keylen, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey as Buffer);
    });
  });

export const getSessionSecret = () => {
  const secret = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-secret');
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return secret;
};

const base64Url = (input: Buffer | string) => Buffer.from(input).toString('base64url');

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(password, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hashed] = stored.split(':');
  if (!salt || !hashed) return false;
  const derived = await scryptAsync(password, salt, 64);
  return derived.toString('hex') === hashed;
}

export function createSessionToken(payload: SessionPayload) {
  const secret = getSessionSecret();
  const body = base64Url(JSON.stringify(payload));
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function parseSessionToken(token: string): SessionPayload | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const secret = getSessionSecret();
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  if (expected !== sig) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    return payload;
  } catch (err) {
    return null;
  }
}

export function getSessionFromRequest(req: NextRequest): SessionPayload | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return parseSessionToken(token);
}

export function applySession(res: NextResponse, payload: SessionPayload) {
  const token = createSessionToken(payload);
  res.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}

export function clearSession(res: NextResponse) {
  res.cookies.set({
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
