import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/server/session';

export async function GET() {
  const session = await getSession('client');
  if (!session || session.role !== 'CUSTOMER') {
    return NextResponse.json({ user: null });
  }

  const user = await prisma.customer.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, phone: true, createdAt: true },
  });

  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: { ...user, role: 'CUSTOMER' } });
}
