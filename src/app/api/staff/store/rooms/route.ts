import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.userId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 获取当前员工信息
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      include: {
        assignedStore: true
      }
    });

    if (!staff || !staff.assignedStore) {
      return NextResponse.json({ error: '您没有权限访问房间信息' }, { status: 403 });
    }

    // 获取门店的所有房间
    const rooms = await prisma.room.findMany({
      where: {
        storeId: staff.assignedStore.id
      },
      include: {
        roomType: {
          select: {
            name: true,
            basePrice: true
          }
        },
        bookingRooms: {
          where: {
            booking: {
              status: {
                in: ['CONFIRMED', 'CHECKED_IN']
              }
            }
          },
          include: {
            booking: {
              include: {
                customer: {
                  select: {
                    name: true
                  }
                }
              }
            }
          },
          take: 1
        }
      },
      orderBy: [
        { floor: 'asc' },
        { roomNo: 'asc' }
      ]
    });

    return NextResponse.json(rooms);

  } catch (error) {
    console.error('获取房间信息失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.userId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { roomId, status } = await request.json();

    if (!roomId || !status) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    // 检查员工权限
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      include: { assignedStore: true }
    });

    if (!staff || !staff.assignedStore) {
      return NextResponse.json({ error: '您没有权限修改房间状态' }, { status: 403 });
    }

    // 检查房间是否属于该门店
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        storeId: staff.assignedStore.id
      }
    });

    if (!room) {
      return NextResponse.json({ error: '房间不存在或不属于您的门店' }, { status: 404 });
    }

    // 更新房间状态
    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: { status },
      include: {
        roomType: {
          select: {
            name: true,
            basePrice: true
          }
        }
      }
    });

    return NextResponse.json(updatedRoom);

  } catch (error) {
    console.error('更新房间状态失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}