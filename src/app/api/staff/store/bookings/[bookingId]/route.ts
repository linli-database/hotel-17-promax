import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const session = await getSession('admin');
    
    if (!session?.userId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { roomId, action } = await request.json();
    const { bookingId } = await params;

    // 检查员工权限
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      include: { assignedStore: true }
    });

    if (!staff || !staff.assignedStore) {
      return NextResponse.json({ error: '您没有权限操作订单' }, { status: 403 });
    }

    // 检查订单是否存在且属于该门店
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        storeId: staff.assignedStore.id
      },
      include: {
        bookingRooms: {
          include: {
            room: true
          }
        }
      }
    });

    if (!booking) {
      return NextResponse.json({ error: '订单不存在或不属于您的门店' }, { status: 404 });
    }

    let updatedBooking;

    switch (action) {
      case 'assign':
        // 分配房间
        if (!roomId) {
          return NextResponse.json({ error: '请选择房间' }, { status: 400 });
        }

        // 检查房间是否可用
        const room = await prisma.room.findFirst({
          where: {
            id: roomId,
            storeId: staff.assignedStore.id,
            status: 'AVAILABLE'
          }
        });

        if (!room) {
          return NextResponse.json({ error: '房间不可用' }, { status: 400 });
        }

        // 使用事务同时更新订单和房间状态
        updatedBooking = await prisma.$transaction(async (tx) => {
          // 创建 BookingRoom 关联
          await tx.bookingRoom.create({
            data: {
              bookingId: bookingId,
              roomId: roomId,
              nightlyRate: room.basePrice
            }
          });

          // 更新订单状态为已入住（分配房间即入住）
          const booking = await tx.booking.update({
            where: { id: bookingId },
            data: { 
              status: 'CHECKED_IN',
              checkedInAt: new Date()
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
              bookingRooms: {
                include: {
                  room: {
                    select: {
                      roomNo: true
                    }
                  }
                }
              }
            }
          });

          // 更新房间状态为占用
          await tx.room.update({
            where: { id: roomId },
            data: { 
              status: 'OCCUPIED'
            }
          });

          return booking;
        });

        break;

      case 'checkin':
        // 入住
        updatedBooking = await prisma.booking.update({
          where: { id: bookingId },
          data: { 
            status: 'CHECKED_IN',
            checkedInAt: new Date()
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
            bookingRooms: {
              include: {
                room: {
                  select: {
                    roomNo: true
                  }
                }
              }
            }
          }
        });
        break;

      case 'checkout':
        // 退房
        updatedBooking = await prisma.$transaction(async (tx) => {
          // 更新订单状态
          const booking = await tx.booking.update({
            where: { id: bookingId },
            data: { 
              status: 'CHECKED_OUT',
              checkedOutAt: new Date()
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
              bookingRooms: {
                include: {
                  room: {
                    select: {
                      roomNo: true
                    }
                  }
                }
              }
            }
          });

          // 如果有分配的房间，更新房间状态为待清洁
          if (booking.bookingRooms.length > 0) {
            for (const bookingRoom of booking.bookingRooms) {
              await tx.room.update({
                where: { id: bookingRoom.roomId },
                data: { 
                  status: 'CLEANING'
                }
              });
            }
          }

          return booking;
        });
        break;

      case 'confirm':
        // 确认订单
        updatedBooking = await prisma.booking.update({
          where: { id: bookingId },
          data: { 
            status: 'CONFIRMED',
            confirmedByStaffId: session.userId
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
            bookingRooms: {
              include: {
                room: {
                  select: {
                    roomNo: true
                  }
                }
              }
            }
          }
        });
        break;

      case 'cancel':
        // 取消订单
        updatedBooking = await prisma.$transaction(async (tx) => {
          // 更新订单状态
          const cancelledBooking = await tx.booking.update({
            where: { id: bookingId },
            data: { 
              status: 'CANCELLED',
              cancelledAt: new Date(),
              cancelReason: '前台取消'
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
              bookingRooms: {
                include: {
                  room: {
                    select: {
                      roomNo: true
                    }
                  }
                }
              }
            }
          });

          // 如果有分配的房间，释放房间
          if (cancelledBooking.bookingRooms.length > 0) {
            for (const bookingRoom of cancelledBooking.bookingRooms) {
              await tx.room.update({
                where: { id: bookingRoom.roomId },
                data: { 
                  status: 'AVAILABLE'
                }
              });
            }
          }

          return cancelledBooking;
        });
        break;

      default:
        return NextResponse.json({ error: '无效的操作' }, { status: 400 });
    }

    return NextResponse.json(updatedBooking);

  } catch (error) {
    console.error('操作订单失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}