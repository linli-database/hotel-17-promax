import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { prisma } from '@/lib/prisma';

export async function POST(
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
      return NextResponse.json({ error: '您没有权限分配房间' }, { status: 403 });
    }

    const { id } = await params;
    const { roomIds } = await request.json();

    if (!roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
      return NextResponse.json({ error: '请选择要分配的房间' }, { status: 400 });
    }

    // 获取订单信息
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        store: true,
        bookingRooms: {
          include: {
            room: true
          }
        }
      }
    });

    if (!booking) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    // 检查订单状态
    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      return NextResponse.json({ 
        error: '只能为待确认或已确认的订单分配房间' 
      }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 清除原有房间分配
      await tx.bookingRoom.deleteMany({
        where: { bookingId: id }
      });

      // 释放原来占用的房间
      for (const bookingRoom of booking.bookingRooms) {
        await tx.room.update({
          where: { id: bookingRoom.roomId },
          data: { status: 'AVAILABLE' }
        });
      }

      // 验证并分配新房间
      for (const roomId of roomIds) {
        // 检查房间是否属于订单所在门店且可用
        const room = await tx.room.findFirst({
          where: {
            id: roomId,
            storeId: booking.storeId,
            status: 'AVAILABLE'
          }
        });

        if (!room) {
          throw new Error(`房间 ${roomId} 不可用或不属于该门店`);
        }

        // 创建房间分配
        await tx.bookingRoom.create({
          data: {
            bookingId: id,
            roomId: roomId,
            nightlyRate: room.basePrice
          }
        });

        // 更新房间状态为已占用
        await tx.room.update({
          where: { id: roomId },
          data: { status: 'OCCUPIED' }
        });
      }

      // 更新订单状态为已确认（如果还是待确认状态）
      const updatedBooking = await tx.booking.update({
        where: { id },
        data: {
          status: booking.status === 'PENDING' ? 'CONFIRMED' : booking.status,
          confirmedByAdminId: session.userId
        },
        include: {
          customer: {
            select: {
              name: true,
              phone: true,
              email: true
            }
          },
          roomType: {
            select: {
              name: true
            }
          },
          store: {
            select: {
              name: true
            }
          },
          bookingRooms: {
            include: {
              room: {
                select: {
                  roomNo: true,
                  floor: true
                }
              }
            }
          }
        }
      });

      return updatedBooking;
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('分配房间失败:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '服务器错误' 
    }, { status: 500 });
  }
}