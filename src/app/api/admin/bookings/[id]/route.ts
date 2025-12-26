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
      return NextResponse.json({ error: '您没有权限访问订单信息' }, { status: 403 });
    }

    const { id } = await params;

    // 获取订单详情
    const booking = await prisma.booking.findUnique({
      where: { id },
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
            name: true,
            basePrice: true,
            capacity: true
          }
        },
        store: {
          select: {
            name: true,
            address: true
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
        },
        createdByAdmin: {
          select: {
            name: true,
            email: true
          }
        },
        createdByStaff: {
          select: {
            name: true,
            email: true
          }
        },
        confirmedByAdmin: {
          select: {
            name: true,
            email: true
          }
        },
        confirmedByStaff: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!booking) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    return NextResponse.json(booking);

  } catch (error) {
    console.error('获取订单详情失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function PATCH(
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
      return NextResponse.json({ error: '您没有权限修改订单' }, { status: 403 });
    }

    const { id } = await params;
    const updateData = await request.json();

    // 获取当前订单
    const currentBooking = await prisma.booking.findUnique({
      where: { id },
      include: {
        bookingRooms: {
          include: {
            room: true
          }
        }
      }
    });

    if (!currentBooking) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    // 准备更新数据
    const updateFields: any = {};

    if (updateData.status) {
      updateFields.status = updateData.status;

      // 根据状态更新相关字段
      switch (updateData.status) {
        case 'CONFIRMED':
          updateFields.confirmedByAdminId = session.userId;
          break;
        case 'CHECKED_IN':
          updateFields.checkedInAt = new Date();
          break;
        case 'CHECKED_OUT':
          updateFields.checkedOutAt = new Date();
          break;
        case 'CANCELLED':
          updateFields.cancelledAt = new Date();
          if (updateData.cancelReason) {
            updateFields.cancelReason = updateData.cancelReason;
          }
          break;
      }
    }

    // 更新其他字段
    if (updateData.checkIn) {
      updateFields.checkIn = new Date(updateData.checkIn);
    }
    if (updateData.checkOut) {
      updateFields.checkOut = new Date(updateData.checkOut);
    }
    if (updateData.totalPrice !== undefined) {
      updateFields.totalPrice = updateData.totalPrice;
    }

    const updatedBooking = await prisma.$transaction(async (tx) => {
      // 更新订单
      const booking = await tx.booking.update({
        where: { id },
        data: updateFields,
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
                  roomNo: true
                }
              }
            }
          }
        }
      });

      // 如果订单被取消或完成，释放房间
      if (updateData.status === 'CANCELLED' || updateData.status === 'COMPLETED') {
        for (const bookingRoom of currentBooking.bookingRooms) {
          await tx.room.update({
            where: { id: bookingRoom.roomId },
            data: { status: 'AVAILABLE' }
          });
        }
      }

      // 如果订单退房，设置房间为待清洁
      if (updateData.status === 'CHECKED_OUT') {
        for (const bookingRoom of currentBooking.bookingRooms) {
          await tx.room.update({
            where: { id: bookingRoom.roomId },
            data: { status: 'CLEANING' }
          });
        }
      }

      return booking;
    });

    return NextResponse.json(updatedBooking);

  } catch (error) {
    console.error('更新订单失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function DELETE(
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
      return NextResponse.json({ error: '您没有权限删除订单' }, { status: 403 });
    }

    const { id } = await params;

    // 获取订单信息
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
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

    // 检查订单状态，只能删除特定状态的订单
    if (!['PENDING', 'CANCELLED', 'COMPLETED'].includes(booking.status)) {
      return NextResponse.json({ 
        error: '只能删除待确认、已取消或已完成的订单' 
      }, { status: 400 });
    }

    // 删除订单
    await prisma.$transaction(async (tx) => {
      // 删除订单房间关联
      await tx.bookingRoom.deleteMany({
        where: { bookingId: id }
      });

      // 释放房间（如果房间还被占用）
      for (const bookingRoom of booking.bookingRooms) {
        if (bookingRoom.room.status === 'OCCUPIED') {
          await tx.room.update({
            where: { id: bookingRoom.roomId },
            data: { status: 'AVAILABLE' }
          });
        }
      }

      // 删除订单
      await tx.booking.delete({
        where: { id }
      });
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('删除订单失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}