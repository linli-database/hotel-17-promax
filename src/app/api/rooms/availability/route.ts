import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BookingStatus, RoomOperationalStatus } from '@/generated/prisma/client';
import { getSession } from '@/lib/server/session';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'CUSTOMER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const storeId = Number(searchParams.get('storeId'));
  const checkInStr = searchParams.get('checkIn');
  const checkOutStr = searchParams.get('checkOut');

  if (!storeId || !checkInStr || !checkOutStr) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const checkIn = new Date(checkInStr);
  const checkOut = new Date(checkOutStr);
  if (!(checkIn instanceof Date) || isNaN(checkIn.getTime()) || !(checkOut instanceof Date) || isNaN(checkOut.getTime())) {
    return NextResponse.json({ error: 'Invalid dates' }, { status: 400 });
  }
  if (checkOut <= checkIn) {
    return NextResponse.json({ error: 'checkOut must be after checkIn' }, { status: 400 });
  }

  const rooms = await prisma.room.findMany({
    where: {
      storeId,
      isActive: true,
      status: RoomOperationalStatus.AVAILABLE,
      bookingRooms: {
        none: {
          booking: {
            status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
            checkIn: { lt: checkOut },
            checkOut: { gt: checkIn },
          },
        },
      },
    },
    select: {
      id: true,
      roomNo: true,
      capacity: true,
      basePrice: true,
      floor: { select: { name: true } },
    },
    orderBy: { roomNo: 'asc' },
  });

  return NextResponse.json({ rooms });
}
