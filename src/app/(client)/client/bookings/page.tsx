'use client';

import { useEffect, useState, useTransition } from 'react';
import { BookingStatus } from '@/generated/prisma/client';

type Booking = {
  id: number;
  status: BookingStatus;
  checkIn: string;
  checkOut: string;
  totalPrice: string;
  store?: { name: string | null };
  bookingRooms: { id: number; room: { roomNo: string } }[];
};

const statusMap: Record<BookingStatus, string> = {
  PENDING: '待确认',
  CONFIRMED: '已确认',
  CHECKED_IN: '已入住',
  CHECKED_OUT: '已离店',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  NO_SHOW: '未到店',
};

function StatusBadge({ status }: { status: BookingStatus }) {
  const color =
    status === 'CANCELLED'
      ? 'bg-slate-100 text-slate-700'
      : status === 'PENDING'
        ? 'bg-amber-100 text-amber-700'
        : status === 'CONFIRMED'
          ? 'bg-blue-100 text-blue-700'
          : status === 'CHECKED_IN'
            ? 'bg-green-100 text-green-700'
            : 'bg-slate-100 text-slate-700';
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${color}`}>{statusMap[status]}</span>;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await fetch('/api/bookings');
      setLoading(false);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings ?? []);
        return;
      }
      const data = await res.json().catch(() => null);
      setError(data?.error ?? '加载失败');
    };
    load();
  }, []);

  const cancel = (id: number) => {
    startTransition(async () => {
      await fetch(`/api/bookings/${id}/cancel`, { method: 'POST' });
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings ?? []);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">我的订单</h1>
        <p className="text-sm text-slate-600">查看与管理您的预约。</p>
      </div>

      {loading ? <p className="text-sm text-slate-600">加载中...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="space-y-4">
        {bookings.map((booking) => (
          <div key={booking.id} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="text-sm font-semibold">{booking.store?.name ?? '门店'}</p>
                <p className="text-sm text-slate-600">
                  {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={booking.status} />
                {['PENDING', 'CONFIRMED'].includes(booking.status) ? (
                  <button
                    onClick={() => cancel(booking.id)}
                    className="rounded border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 disabled:opacity-60"
                    disabled={pending}
                  >
                    取消预约
                  </button>
                ) : (
                  <button className="rounded border border-slate-200 px-3 py-1 text-xs text-slate-500" disabled>
                    不可取消
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-700">
              {booking.bookingRooms.map((br) => (
                <span key={br.id} className="rounded border border-slate-200 px-2 py-1">
                  房号 {br.room.roomNo}
                </span>
              ))}
            </div>
            <div className="mt-3 text-sm text-slate-600">总价 ¥{booking.totalPrice}</div>
          </div>
        ))}

        {!loading && bookings.length === 0 ? (
          <p className="text-sm text-slate-600">暂无预约，去预约房间吧。</p>
        ) : null}
      </div>
    </div>
  );
}
