import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/server/session';

export async function GET() {
  const adminSession = await getSession('admin');
  if (adminSession) {
    if (adminSession.role === 'ADMIN') {
      const user = await prisma.admin.findUnique({
        where: { id: adminSession.userId },
        select: { id: true, email: true, name: true, createdAt: true },
      });
      if (user) {
        return NextResponse.json({ user: { ...user, role: 'ADMIN' } });
      }
    }

    if (adminSession.role === 'STAFF') {
      const user = await prisma.staff.findUnique({
        where: { id: adminSession.userId },
        select: { id: true, email: true, name: true, createdAt: true },
      });
      if (user) {
        return NextResponse.json({ user: { ...user, role: 'STAFF' } });
      }
    }
  }

  const clientSession = await getSession('client');
  if (clientSession?.role === 'CUSTOMER') {
    const user = await prisma.customer.findUnique({
      where: { id: clientSession.userId },
      select: { id: true, email: true, name: true, phone: true, createdAt: true },
    });
    if (user) {
      return NextResponse.json({ user: { ...user, role: 'CUSTOMER' } });
    }
  }

  return NextResponse.json({ user: null });
}
