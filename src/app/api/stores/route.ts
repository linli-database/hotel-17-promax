import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, getAccessibleStores } from '@/lib/server/permissions';

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  
  // 客户端访问：返回所有活跃门店（用于选择）
  if (!sessionUser || sessionUser.role === 'CUSTOMER') {
    const stores = await prisma.store.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });

    // 获取每个门店的评分
    const storesWithRating = await Promise.all(
      stores.map(async (store) => {
        const reviews = await prisma.bookingReview.findMany({
          where: { storeId: store.id },
          select: { rating: true },
        });

        const avgRating = reviews.length > 0
          ? reviews.reduce((sum: number, r) => sum + r.rating, 0) / reviews.length
          : 0;

        return {
          id: store.id,
          name: store.name,
          address: store.address,
          avgRating: reviews.length > 0 ? Number(avgRating.toFixed(1)) : null,
          reviewCount: reviews.length,
        };
      })
    );

    return NextResponse.json({ stores: storesWithRating });
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
