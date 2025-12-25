import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/server/session';

// 获取客户的所有订单
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'CUSTOMER') {
      return NextResponse.json({ error: '未登录或权限不足' }, { status: 401 });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        customerId: session.userId,
      },
      include: {
        store: {
          select: { name: true },
        },
        roomType: {
          select: { name: true },
        },
        bookingRooms: {
          include: {
            room: {
              select: { roomNo: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 转换数据格式
    const formattedBookings = bookings.map((booking) => ({
      id: booking.id,
      status: booking.status,
      checkIn: booking.checkIn.toISOString(),
      checkOut: booking.checkOut.toISOString(),
      totalPrice: booking.totalPrice.toString(),
      cancelReason: booking.cancelReason,
      store: booking.store,
      roomType: booking.roomType,
      bookingRooms: booking.bookingRooms,
      createdAt: booking.createdAt.toISOString(),
    }));

    return NextResponse.json({ bookings: formattedBookings });
  } catch (error) {
    console.error('获取订单失败:', error);
    return NextResponse.json({ error: '获取订单失败' }, { status: 500 });
  }
}

// 创建新订单
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'CUSTOMER') {
      return NextResponse.json({ error: '未登录或权限不足' }, { status: 401 });
    }

    const { storeId, roomTypeId, checkIn, checkOut } = await req.json();

    if (!storeId || !roomTypeId || !checkIn || !checkOut) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
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

    if (checkInDate < new Date()) {
      return NextResponse.json(
        { error: '入住日期不能早于今天' },
        { status: 400 }
      );
    }

    // 获取房型信息
    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
    });

    if (!roomType) {
      return NextResponse.json({ error: '房型不存在' }, { status: 404 });
    }

    // 计算总价
    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalPrice = Number(roomType.basePrice) * nights;

    // 创建订单（初始状态为PENDING，暂不分配房间）
    const booking = await prisma.booking.create({
      data: {
        customerId: session.userId,
        storeId,
        roomTypeId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        totalPrice: totalPrice.toString(),
        status: 'PENDING',
        createdByRole: 'CUSTOMER',
      },
      include: {
        store: { select: { name: true } },
        roomType: { select: { name: true } },
      },
    });

    return NextResponse.json({
      message: '预订成功',
      booking: {
        id: booking.id,
        status: booking.status,
        checkIn: booking.checkIn.toISOString(),
        checkOut: booking.checkOut.toISOString(),
        totalPrice: booking.totalPrice.toString(),
        store: booking.store,
        roomType: booking.roomType,
      },
    });
  } catch (error) {
    console.error('创建订单失败:', error);
    return NextResponse.json({ error: '创建订单失败' }, { status: 500 });
  }
}
