import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/server/session';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

// 取消订单
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'CUSTOMER') {
      return NextResponse.json({ error: '未登录或权限不足' }, { status: 401 });
    }

    const params = await context.params;
    const bookingId = params.id;
    const { reason } = await req.json();

    // 查找订单
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingRooms: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    // 验证订单所有者
    if (booking.customerId !== session.userId) {
      return NextResponse.json({ error: '无权操作此订单' }, { status: 403 });
    }

    // 只能取消待入住的订单
    if (booking.status !== 'PENDING') {
      return NextResponse.json(
        { error: '只能取消待入住的订单' },
        { status: 400 }
      );
    }

    // 更新订单状态
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        cancelReason: reason || '用户取消',
        cancelledAt: new Date(),
      },
    });

    // 如果订单已分配房间，需要释放房间
    if (booking.bookingRooms.length > 0) {
      const roomIds = booking.bookingRooms.map((br) => br.roomId);
      await prisma.room.updateMany({
        where: { id: { in: roomIds } },
        data: { status: 'AVAILABLE' },
      });
    }

    return NextResponse.json({
      message: '订单已取消',
      booking: {
        id: updatedBooking.id,
        status: updatedBooking.status,
        cancelReason: updatedBooking.cancelReason,
      },
    });
  } catch (error) {
    console.error('取消订单失败:', error);
    return NextResponse.json({ error: '取消订单失败' }, { status: 500 });
  }
}
