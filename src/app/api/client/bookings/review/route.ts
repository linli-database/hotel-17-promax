import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession('client');
    if (!session || session.role !== 'CUSTOMER') {
      return NextResponse.json({ error: '未登录或无权限' }, { status: 401 });
    }

    const { bookingId, storeId, rating, comment } = await req.json();

    // 验证评分范围
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: '评分必须在1-5之间' }, { status: 400 });
    }

    // 验证订单是否存在且属于当前用户
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { store: true },
    });

    if (!booking) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    if (booking.customerId !== session.userId) {
      return NextResponse.json({ error: '无权评价此订单' }, { status: 403 });
    }

    if (booking.status !== 'CHECKED_OUT') {
      return NextResponse.json({ error: '只能评价已离店订单' }, { status: 400 });
    }

    if (booking.isReviewed) {
      return NextResponse.json({ error: '该订单已评价' }, { status: 400 });
    }

    // 创建评价
    await prisma.bookingReview.create({
      data: {
        rating,
        comment: comment || null,
        customerId: session.userId,
        bookingId,
        storeId: storeId || booking.storeId,
      },
    });

    // 更新订单的评价状态
    await prisma.booking.update({
      where: { id: bookingId },
      data: { isReviewed: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('创建评价失败:', error);
    return NextResponse.json({ error: '创建评价失败' }, { status: 500 });
  }
}
