import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySession, getSessionSecret, hashPassword } from '@/lib/server/auth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  // Ensure secret before any DB writes to avoid partial creation
  getSessionSecret();

  const email = body.email.trim().toLowerCase();
  const password = body.password;
  const name = typeof body.name === 'string' ? body.name.trim() : null;

  if (!email || !password || password.length < 6) {
    return NextResponse.json({ error: 'Email and password (>=6 chars) are required' }, { status: 400 });
  }

  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const customer = await prisma.customer.create({
    data: {
      email,
      passwordHash,
      name,
    },
  });

  const res = NextResponse.json({
    user: {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      role: 'CUSTOMER',
    },
  });

  return applySession(res, { userId: customer.id, role: 'CUSTOMER' });
}
