import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/server/session';

export async function GET() {
  const session = await getSession('admin');
  if (!session) {
    return NextResponse.json({ user: null });
  }

  if (session.role === 'ADMIN') {
    const user = await prisma.admin.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (user) {
      return NextResponse.json({ user: { ...user, role: 'ADMIN' } });
    }
  }

  if (session.role === 'STAFF') {
    const user = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (user) {
      return NextResponse.json({ user: { ...user, role: 'STAFF' } });
    }
  }

  return NextResponse.json({ user: null });
}
