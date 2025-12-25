import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/server/session';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }
  
  // 从三张表中查找用户
  let user = null;
  
  // 先尝试从Admin表查找
  user = await prisma.admin.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true },
  });
  
  if (user) {
    return NextResponse.json({ 
      user: { ...user, role: 'ADMIN' }
    });
  }
  
  // 尝试从Staff表查找
  user = await prisma.staff.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true },
  });
  
  if (user) {
    return NextResponse.json({ 
      user: { ...user, role: 'STAFF' }
    });
  }
  
  // 尝试从Customer表查找
  user = await prisma.customer.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true },
  });
  
  if (user) {
    return NextResponse.json({ 
      user: { ...user, role: 'CUSTOMER' }
    });
  }
  
  return NextResponse.json({ user: null });
}
