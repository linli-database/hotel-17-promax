import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySession, getSessionSecret, hashPassword } from '@/lib/server/auth';
import { UserRole } from '@/generated/prisma/client';

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

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role: UserRole.CUSTOMER,
    },
  });

  const res = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
  });

  return applySession(res, { userId: user.id, role: user.role });
}
