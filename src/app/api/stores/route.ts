import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, getAccessibleStores } from '@/lib/server/permissions';

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  
  // 客户端访问：返回所有活跃门店（用于选择）
  if (!sessionUser || sessionUser.role === 'CUSTOMER') {
    const stores = await prisma.store.findMany({
      where: { isActive: true },
      select: { id: true, name: true, address: true },
      orderBy: { id: 'asc' },
    });
    return NextResponse.json({ stores });
  }

  // 管理端访问：根据权限返回门店
  const accessControl = getAccessibleStores(sessionUser);
  
  const whereClause = accessControl.all 
    ? { isActive: true }
    : { 
        isActive: true,
        id: { in: accessControl.storeIds || [] }
      };

  const stores = await prisma.store.findMany({
    where: whereClause,
    select: { 
      id: true, 
      name: true, 
      address: true,
      _count: {
        select: {
          rooms: true,
          bookings: { where: { status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] } } }
        }
      }
    },
    orderBy: { id: 'asc' },
  });
  
  return NextResponse.json({ stores });
}
