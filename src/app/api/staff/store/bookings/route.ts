import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession('admin');
    
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
      return NextResponse.json({ error: '您没有权限访问订单信息' }, { status: 403 });
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const checkInDate = searchParams.get('checkInDate');
    const checkOutDate = searchParams.get('checkOutDate');
    const customerName = searchParams.get('customerName');
    const bookingStatus = searchParams.get('bookingStatus');

    // 构建查询条件
    const whereConditions: any = {
      storeId: staff.assignedStore.id
    };

    // 根据状态筛选
    if (status === 'active') {
      whereConditions.status = {
        in: ['PENDING', 'CONFIRMED', 'CHECKED_IN']
      };
    } else if (bookingStatus) {
      whereConditions.status = bookingStatus;
    }

    // 按入住日期筛选
    if (checkInDate) {
      whereConditions.checkIn = {
        gte: new Date(checkInDate)
      };
    }

    // 按离店日期筛选
    if (checkOutDate) {
      whereConditions.checkOut = {
        lte: new Date(checkOutDate)
      };
    }

    // 按客户姓名筛选
    if (customerName) {
      whereConditions.customer = {
        name: {
          contains: customerName,
          mode: 'insensitive'
        }
      };
    }

    // 获取门店的订单
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
      }
    });

    return NextResponse.json(bookings);

  } catch (error) {
    console.error('获取订单信息失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}