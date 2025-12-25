import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 获取指定门店的房型及可用数量
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');

    if (!storeId || !checkIn || !checkOut) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 验证日期
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    if (checkInDate >= checkOutDate) {
      return NextResponse.json(
        { error: '离店日期必须晚于入住日期' },
        { status: 400 }
      );
    }

    // 获取该门店所有激活的房型
    const roomTypes = await prisma.roomType.findMany({
      where: { isActive: true },
      include: {
        rooms: {
          where: {
            storeId,
            isActive: true,
            status: { not: 'OUT_OF_SERVICE' },
          },
        },
      },
    });

    // 获取指定时间段内已预订的房间
    const bookedRooms = await prisma.bookingRoom.findMany({
      where: {
        booking: {
          storeId,
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
          OR: [
            {
              checkIn: { lt: checkOutDate },
              checkOut: { gt: checkInDate },
            },
          ],
        },
      },
      select: { roomId: true },
    });

    const bookedRoomIds = new Set(bookedRooms.map((br) => br.roomId));

    // 计算每个房型的可用房间数
    const roomTypesWithAvailability = roomTypes.map((roomType) => {
      const availableCount = roomType.rooms.filter(
        (room) => !bookedRoomIds.has(room.id)
      ).length;

      return {
        id: roomType.id,
        name: roomType.name,
        description: roomType.description,
        basePrice: roomType.basePrice.toString(),
        capacity: roomType.capacity,
        amenities: roomType.amenities,
        availableCount,
      };
    }).filter(rt => rt.availableCount > 0); // 只返回有可用房间的房型

    return NextResponse.json({ roomTypes: roomTypesWithAvailability });
  } catch (error) {
    console.error('获取房型失败:', error);
    return NextResponse.json(
      { error: '获取房型失败' },
      { status: 500 }
    );
  }
}
