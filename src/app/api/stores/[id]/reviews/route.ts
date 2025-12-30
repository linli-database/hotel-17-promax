import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/stores/[id]/reviews?page=1&pageSize=5
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storeId } = await params;
    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const pageSize = Math.min(
        Math.max(parseInt(searchParams.get('pageSize') || '5', 10), 1),
        20
    );

    if (!storeId) {
        return NextResponse.json({ error: '缺少门店ID' }, { status: 400 });
    }
    const [total, reviews] = await Promise.all([
      prisma.bookingReview.count({ where: { storeId } }),
      prisma.bookingReview.findMany({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          customer: { select: { name: true, email: true } },
          booking: {
            select: {
              checkIn: true,
              checkOut: true,
              roomType: {
                select: {
                  id: true,
                  name: true,
                  basePrice: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const formatted = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      customerName: r.customer?.name || r.customer?.email || '匿名用户',
      booking: r.booking
        ? {
            checkIn: r.booking.checkIn.toISOString(),
            checkOut: r.booking.checkOut.toISOString(),
            roomType: r.booking.roomType
              ? {
                  id: r.booking.roomType.id,
                  name: r.booking.roomType.name,
                  basePrice: r.booking.roomType.basePrice.toString(),
                }
              : null,
          }
        : null,
    }));

    return NextResponse.json({
      total,
      page,
      pageSize,
      reviews: formatted,
    });
  } catch (error) {
    console.error('获取门店评价失败:', error instanceof Error ? error.stack : error);
    return NextResponse.json({ error: '获取门店评价失败' }, { status: 500 });
  }
}
