import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type FilterStoresRequest = {
  checkIn: string;
  checkOut: string;
  roomTypeName: string | null;
  amenities: string[] | null;
};

export async function POST(req: NextRequest) {
  try {
    const { checkIn, checkOut, roomTypeName, amenities } = (await req.json()) as FilterStoresRequest;

    // 验证参数
    if (!checkIn || !checkOut) {
      return NextResponse.json({ error: '请提供入住和离店日期' }, { status: 400 });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // 查询所有活跃的门店
    const stores = await prisma.store.findMany({
      where: { isActive: true },
    });

    // 对每个门店进行筛选
    const storesWithFilters = await Promise.all(
      stores.map(async (store) => {
        // 查询该门店在指定时间段内可用的房间
        const availableRooms = await prisma.room.findMany({
          where: {
            storeId: store.id,
            isActive: true,
            status: 'AVAILABLE',
          },
          include: {
            roomType: true,
          },
        });

        // 过滤房间
        let filteredRooms = availableRooms;

        // 按房型名称筛选
        if (roomTypeName) {
          filteredRooms = filteredRooms.filter((room) => room.roomType.name === roomTypeName);
        }

        // 按设施筛选
        if (amenities && amenities.length > 0) {
          filteredRooms = filteredRooms.filter((room) => {
            return amenities.every((amenity) => room.roomType.amenities.includes(amenity));
          });
        }

        // 如果有符合条件的房间，返回该门店及其房型
        if (filteredRooms.length > 0) {
          // 获取该门店的所有房型（如果指定了房型名称，则只返回该房型）
          const storeRoomTypes = await prisma.roomType.findMany({
            where: {
              id: {
                in: Array.from(new Set(filteredRooms.map((r) => r.roomTypeId))),
              },
            },
          });

          // 对每个房型计算可用数量
          const roomTypesWithCount = storeRoomTypes.map((rt) => {
            const availableCount = filteredRooms.filter((r) => r.roomTypeId === rt.id).length;
            return {
              id: rt.id,
              name: rt.name,
              description: rt.description,
              basePrice: rt.basePrice.toString(),
              capacity: rt.capacity,
              amenities: rt.amenities,
              availableCount,
            };
          });

          // 获取门店的评分
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
            roomTypes: roomTypesWithCount,
          };
        }

        return null;
      })
    );

    // 过滤掉没有符合条件房间的门店
    const validStores = storesWithFilters.filter((s): s is NonNullable<typeof s> => s !== null);

    return NextResponse.json({ stores: validStores });
  } catch (error) {
    console.error('筛选门店失败:', error);
    return NextResponse.json({ error: '筛选门店失败' }, { status: 500 });
  }
}
