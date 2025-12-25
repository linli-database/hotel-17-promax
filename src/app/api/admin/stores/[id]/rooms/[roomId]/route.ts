import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { prisma } from '@/lib/prisma';

// 获取单个房间详情
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string; roomId: string }> }
) {
  try {
    const { id: storeId, roomId } = await context.params;
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

    const room = await prisma.room.findUnique({
      where: {
        id: roomId,
        storeId,
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
        store: {
          select: {
            id: true,
            name: true,
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
    });

    if (!room) {
      return NextResponse.json({ error: '房间不存在' }, { status: 404 });
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error('获取房间详情失败:', error);
    return NextResponse.json(
      { error: '获取房间详情失败' },
      { status: 500 }
    );
  }
}

// 更新房间信息
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string; roomId: string }> }
) {
  try {
    const { id: storeId, roomId } = await context.params;
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

    const { roomNo, floor, roomTypeId, basePrice, capacity, status } = await req.json();

    // 检查房间是否存在
    const existingRoom = await prisma.room.findUnique({
      where: {
        id: roomId,
        storeId,
      },
    });

    if (!existingRoom) {
      return NextResponse.json({ error: '房间不存在' }, { status: 404 });
    }

    // 如果修改房间号，检查是否冲突
    if (roomNo && roomNo !== existingRoom.roomNo) {
      const duplicateRoom = await prisma.room.findUnique({
        where: {
          storeId_roomNo: {
            storeId,
            roomNo,
          },
        },
      });

      if (duplicateRoom) {
        return NextResponse.json(
          { error: '该门店已存在相同房间号' },
          { status: 400 }
        );
      }
    }

    // 如果修改房型，检查房型是否存在
    if (roomTypeId && roomTypeId !== existingRoom.roomTypeId) {
      const roomType = await prisma.roomType.findUnique({
        where: { id: roomTypeId },
      });

      if (!roomType) {
        return NextResponse.json({ error: '房型不存在' }, { status: 404 });
      }
    }

    // 更新房间
    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: {
        ...(roomNo && { roomNo }),
        ...(floor && { floor: parseInt(floor) }),
        ...(roomTypeId && { roomTypeId }),
        ...(basePrice !== undefined && { basePrice: parseFloat(basePrice) }),
        ...(capacity !== undefined && { capacity: parseInt(capacity) }),
        ...(status && { status }),
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

    return NextResponse.json(updatedRoom);
  } catch (error) {
    console.error('更新房间失败:', error);
    return NextResponse.json({ error: '更新房间失败' }, { status: 500 });
  }
}

// 删除房间
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string; roomId: string }> }
) {
  try {
    const { id: storeId, roomId } = await context.params;
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

    // 检查房间是否存在
    const existingRoom = await prisma.room.findUnique({
      where: {
        id: roomId,
        storeId,
      },
      include: {
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
    });

    if (!existingRoom) {
      return NextResponse.json({ error: '房间不存在' }, { status: 404 });
    }

    // 检查是否有活跃的预订
    if (existingRoom._count.bookingRooms > 0) {
      return NextResponse.json(
        { error: '该房间有活跃的预订，无法删除' },
        { status: 400 }
      );
    }

    // 软删除房间（设置为非活跃状态）
    await prisma.room.update({
      where: { id: roomId },
      data: { isActive: false },
    });

    return NextResponse.json({ message: '房间已删除' });
  } catch (error) {
    console.error('删除房间失败:', error);
    return NextResponse.json({ error: '删除房间失败' }, { status: 500 });
  }
}