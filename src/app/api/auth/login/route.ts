import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySession, getSessionSecret, verifyPassword } from '@/lib/server/auth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  getSessionSecret();

  const email = body.email.trim().toLowerCase();
  const password = body.password;

  // 尝试在三个表中查找用户
  let user = null;
  let role: 'CUSTOMER' | 'ADMIN' | 'STAFF' | null = null;

  // 先检查管理员
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (admin && admin.isActive) {
    user = admin;
    role = 'ADMIN';
  }

  // 再检查前台
  if (!user) {
    const staff = await prisma.staff.findUnique({ where: { email } });
    if (staff && staff.isActive) {
      user = staff;
      role = 'STAFF';
    }
  }

  // 最后检查客户
  if (!user) {
    const customer = await prisma.customer.findUnique({ where: { email } });
    if (customer && customer.isActive) {
      user = customer;
      role = 'CUSTOMER';
    }
  }

  if (!user || !role) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const res = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      role: role,
      name: user.name,
    },
  });

  const scope = role === 'CUSTOMER' ? 'client' : 'admin';
  return applySession(res, { userId: user.id, role }, scope);
}
