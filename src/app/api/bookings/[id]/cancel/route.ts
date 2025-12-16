import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BookingStatus } from '@/generated/prisma/client';
import { getSession } from '@/lib/server/session';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== 'CUSTOMER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bookingId = Number(params.id);
  if (!bookingId) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, customerId: true, status: true },
  });

  if (!booking || booking.customerId !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (![BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(booking.status)) {
    return NextResponse.json({ error: 'Cannot cancel this booking' }, { status: 400 });
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
    select: { id: true, status: true },
  });

  return NextResponse.json({ booking: updated });
}
