import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { prisma } from '@/lib/prisma';

// 获取指定门店的所有房间
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storeId } = await context.params;
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 检查权限
    const currentUser = await prisma.admin.findUnique({
      where: { id: session.userId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    // 获取房间列表，按房间号排序
    const rooms = await prisma.room.findMany({
      where: {
        storeId,
        isActive: true,
      },
      include: {
        roomType: {
          select: {
            id: true,
            name: true,
            description: true,
            basePrice: true,
            capacity: true,
            amenities: true,
          },
        },
        _count: {
          select: {
            bookingRooms: {
              where: {
                booking: {
                  status: {
                    in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'],
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { floor: 'asc' },
        { roomNo: 'asc' },
      ],
    });

    // 同时获取门店信息
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true },
    });

    if (!store) {
      return NextResponse.json({ error: '门店不存在' }, { status: 404 });
    }

    return NextResponse.json({
      store,
      rooms,
    });
  } catch (error) {
    console.error('获取房间列表失败:', error);
    return NextResponse.json(
      { error: '获取房间列表失败' },
      { status: 500 }
    );
  }
}

// 为指定门店创建新房间
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storeId } = await context.params;
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 检查权限
    const currentUser = await prisma.admin.findUnique({
      where: { id: session.userId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { roomNo, floor, roomTypeId, basePrice, capacity } = await req.json();

    if (!roomNo || !floor || !roomTypeId) {
      return NextResponse.json(
        { error: '房间号、楼层和房型不能为空' },
        { status: 400 }
      );
    }

    // 检查门店是否存在
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return NextResponse.json({ error: '门店不存在' }, { status: 404 });
    }

    // 检查房型是否存在
    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
    });

    if (!roomType) {
      return NextResponse.json({ error: '房型不存在' }, { status: 404 });
    }

    // 检查房间号是否已存在于该门店
    const existingRoom = await prisma.room.findUnique({
      where: {
        storeId_roomNo: {
          storeId,
          roomNo,
        },
      },
    });

    if (existingRoom) {
      return NextResponse.json(
        { error: '该门店已存在相同房间号' },
        { status: 400 }
      );
    }

    // 创建房间
    const room = await prisma.room.create({
      data: {
        roomNo,
        floor: parseInt(floor),
        roomTypeId,
        storeId,
        basePrice: basePrice ? parseFloat(basePrice) : roomType.basePrice,
        capacity: capacity ? parseInt(capacity) : roomType.capacity,
      },
      include: {
        roomType: {
          select: {
            id: true,
            name: true,
            description: true,
            basePrice: true,
            capacity: true,
            amenities: true,
          },
        },
      },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error('创建房间失败:', error);
    return NextResponse.json({ error: '创建房间失败' }, { status: 500 });
  }
}