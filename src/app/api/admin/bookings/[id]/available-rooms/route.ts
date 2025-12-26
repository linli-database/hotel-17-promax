import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession('admin');
    
    if (!session?.userId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 验证管理员权限
    const admin = await prisma.admin.findUnique({
      where: { id: session.userId }
    });

    if (!admin) {
      return NextResponse.json({ error: '您没有权限访问房间信息' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const roomTypeId = searchParams.get('roomTypeId');

    // 获取订单信息
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        store: true,
        roomType: true
      }
    });

    if (!booking) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    // 构建查询条件
    const whereConditions: any = {
      storeId: booking.storeId,
      status: 'AVAILABLE',
      isActive: true
    };

    // 如果指定了房型，按房型筛选
    if (roomTypeId) {
      whereConditions.roomTypeId = roomTypeId;
    } else if (booking.roomTypeId) {
      // 默认显示订单对应房型的房间
      whereConditions.roomTypeId = booking.roomTypeId;
    }

    // 获取可用房间
    const availableRooms = await prisma.room.findMany({
      where: whereConditions,
      include: {
        roomType: {
          select: {
            name: true,
            capacity: true
          }
        }
      },
      orderBy: [
        { floor: 'asc' },
        { roomNo: 'asc' }
      ]
    });

    // 按楼层分组
    const roomsByFloor = availableRooms.reduce((acc, room) => {
      const floor = room.floor;
      if (!acc[floor]) {
        acc[floor] = [];
      }
      acc[floor].push(room);
      return acc;
    }, {} as Record<number, typeof availableRooms>);

    return NextResponse.json({
      booking: {
        id: booking.id,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        roomType: booking.roomType,
        store: booking.store
      },
      availableRooms,
      roomsByFloor,
      totalAvailable: availableRooms.length
    });

  } catch (error) {
    console.error('获取可用房间失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}