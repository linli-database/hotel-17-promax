import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession('admin');
    
    if (!session?.userId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 验证用户权限（支持 Admin 和 Staff）
    let userRole: 'ADMIN' | 'STAFF' = 'ADMIN';
    let staffStoreId: string | null = null;

    const admin = await prisma.admin.findUnique({
      where: { id: session.userId }
    });

    if (!admin) {
      // 如果不是 Admin，检查是否是 Staff
      const staff = await prisma.staff.findUnique({
        where: { id: session.userId },
        include: { assignedStore: true }
      });

      if (!staff || !staff.assignedStore) {
        return NextResponse.json({ error: '您没有权限访问订单信息' }, { status: 403 });
      }

      userRole = 'STAFF';
      staffStoreId = staff.assignedStore.id;
    }

    const { searchParams } = new URL(request.url);
    
    // 获取查询参数
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const storeId = searchParams.get('storeId');
    const status = searchParams.get('status');
    const roomTypeId = searchParams.get('roomTypeId');
    const checkInDate = searchParams.get('checkInDate');
    const checkOutDate = searchParams.get('checkOutDate');
    const customerName = searchParams.get('customerName');
    const createdByRole = searchParams.get('createdByRole');

    // 构建查询条件
    const whereConditions: any = {};

    // Staff 只能查看自己门店的订单
    if (userRole === 'STAFF' && staffStoreId) {
      whereConditions.storeId = staffStoreId;
    } else if (storeId) {
      whereConditions.storeId = storeId;
    }

    if (status) {
      whereConditions.status = status;
    }

    if (roomTypeId) {
      whereConditions.roomTypeId = roomTypeId;
    }

    if (checkInDate) {
      whereConditions.checkIn = {
        ...whereConditions.checkIn,
        gte: new Date(checkInDate)
      };
    }

    if (checkOutDate) {
      whereConditions.checkOut = {
        ...whereConditions.checkOut,
        lte: new Date(checkOutDate + 'T23:59:59.999Z')
      };
    }

    if (customerName) {
      whereConditions.customer = {
        name: {
          contains: customerName,
          mode: 'insensitive'
        }
      };
    }

    if (createdByRole) {
      whereConditions.createdByRole = createdByRole;
    }

    // 获取总数
    const total = await prisma.booking.count({
      where: whereConditions
    });

    // 获取订单列表
    const bookings = await prisma.booking.findMany({
      where: whereConditions,
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
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    return NextResponse.json({
      bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('获取订单列表失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: '您没有权限创建订单' }, { status: 403 });
    }

    const {
      customerId,
      storeId,
      roomTypeId,
      checkIn,
      checkOut,
      totalPrice,
      roomIds = []
    } = await request.json();

    // 验证必需字段
    if (!customerId || !storeId || !roomTypeId || !checkIn || !checkOut || !totalPrice) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    // 验证客户存在
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return NextResponse.json({ error: '客户不存在' }, { status: 404 });
    }

    // 验证门店存在
    const store = await prisma.store.findUnique({
      where: { id: storeId }
    });

    if (!store) {
      return NextResponse.json({ error: '门店不存在' }, { status: 404 });
    }

    // 验证房型存在
    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId }
    });

    if (!roomType) {
      return NextResponse.json({ error: '房型不存在' }, { status: 404 });
    }

    // 创建订单
    const booking = await prisma.$transaction(async (tx) => {
      // 创建订单
      const newBooking = await tx.booking.create({
        data: {
          customerId,
          storeId,
          roomTypeId,
          checkIn: new Date(checkIn),
          checkOut: new Date(checkOut),
          totalPrice,
          status: 'CONFIRMED', // 管理员创建的订单直接确认
          createdByRole: 'ADMIN',
          createdByAdminId: session.userId,
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
          }
        }
      });

      // 如果指定了房间，创建房间关联
      if (roomIds.length > 0) {
        for (const roomId of roomIds) {
          // 验证房间属于指定门店且可用
          const room = await tx.room.findFirst({
            where: {
              id: roomId,
              storeId: storeId,
              status: 'AVAILABLE'
            }
          });

          if (room) {
            // 创建房间订单关联
            await tx.bookingRoom.create({
              data: {
                bookingId: newBooking.id,
                roomId: roomId,
                nightlyRate: room.basePrice
              }
            });

            // 更新房间状态
            await tx.room.update({
              where: { id: roomId },
              data: { status: 'OCCUPIED' }
            });
          }
        }
      }

      return newBooking;
    });

    return NextResponse.json(booking, { status: 201 });

  } catch (error) {
    console.error('创建订单失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}