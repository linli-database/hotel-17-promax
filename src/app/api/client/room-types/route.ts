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

    // 获取指定时间段内有重叠的订单（排除已完成和已取消的订单）
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        storeId,
        status: { notIn: ['CHECKED_OUT', 'CANCELLED'] }, // 排除已完成和取消的订单
        checkIn: { lt: checkOutDate },
        checkOut: { gt: checkInDate },
      },
      select: {
        roomTypeId: true,
      },
    });

    // 按房型统计重叠订单数量
    const occupiedCountByRoomType = overlappingBookings.reduce((acc, booking) => {
      if (booking.roomTypeId) {
        acc[booking.roomTypeId] = (acc[booking.roomTypeId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // 计算每个房型的可用房间数
    const roomTypesWithAvailability = roomTypes.map((roomType) => {
      // 该房型在该门店的总房间数
      const totalRooms = roomType.rooms.length;
      // 该房型被占用的房间数（重叠订单数）
      const occupiedCount = occupiedCountByRoomType[roomType.id] || 0;
      // 可用房间数 = 总数 - 占用数
      const availableCount = Math.max(0, totalRooms - occupiedCount);

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
