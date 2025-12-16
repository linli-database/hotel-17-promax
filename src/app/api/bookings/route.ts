import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BookingStatus, BookingCreator, RoomOperationalStatus } from '@/generated/prisma/client';
import { getSession } from '@/lib/server/session';

function parseDates(checkInStr: string, checkOutStr: string) {
  const checkIn = new Date(checkInStr);
  const checkOut = new Date(checkOutStr);
  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) return null;
  if (checkOut <= checkIn) return null;
  return { checkIn, checkOut };
}

function diffNights(checkIn: Date, checkOut: Date) {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'CUSTOMER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bookings = await prisma.booking.findMany({
    where: { customerId: session.userId },
    orderBy: { createdAt: 'desc' },
    include: {
      store: { select: { name: true } },
      bookingRooms: {
        include: { room: { select: { roomNo: true } } },
      },
    },
  });

  return NextResponse.json({ bookings });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'CUSTOMER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const roomIds: number[] = Array.isArray(body.roomIds) ? body.roomIds.map((r: any) => Number(r)).filter(Boolean) : [];
  const storeId = Number(body.storeId);
  const dateParsed = parseDates(body.checkIn, body.checkOut);

  if (!storeId || !dateParsed || roomIds.length === 0) {
    return NextResponse.json({ error: 'Missing or invalid params' }, { status: 400 });
  }

  const { checkIn, checkOut } = dateParsed;

  // verify rooms belong to store and available status
  const rooms = await prisma.room.findMany({
    where: {
      id: { in: roomIds },
      storeId,
      isActive: true,
      status: RoomOperationalStatus.AVAILABLE,
    },
    select: { id: true, basePrice: true },
  });
  if (rooms.length !== roomIds.length) {
    return NextResponse.json({ error: 'Some rooms are not available or invalid' }, { status: 400 });
  }

  // conflict check
  const conflicts = await prisma.bookingRoom.findFirst({
    where: {
      roomId: { in: roomIds },
      booking: {
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
    },
    include: { room: true, booking: true },
  });
  if (conflicts) {
    return NextResponse.json({ error: 'Rooms no longer available' }, { status: 409 });
  }

  const nights = diffNights(checkIn, checkOut);
  const total = rooms.reduce((sum, r) => sum + Number(r.basePrice) * nights, 0);

  const booking = await prisma.booking.create({
    data: {
      status: BookingStatus.PENDING,
      checkIn,
      checkOut,
      totalPrice: total.toFixed(2),
      createdByRole: BookingCreator.CUSTOMER,
      customer: { connect: { id: session.userId } },
      store: { connect: { id: storeId } },
      bookingRooms: {
        create: roomIds.map((id) => ({ room: { connect: { id } } })),
      },
    },
    include: {
      store: { select: { name: true } },
      bookingRooms: { include: { room: { select: { roomNo: true } } } },
    },
  });

  return NextResponse.json({ booking }, { status: 201 });
}
