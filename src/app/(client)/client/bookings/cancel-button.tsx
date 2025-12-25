'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export default function CancelButton({
  bookingId,
  disabled,
}: {
  bookingId: number;
  disabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const cancel = () => {
    startTransition(async () => {
      await fetch(`/api/bookings/${bookingId}/cancel`, { method: 'POST' });
      router.refresh();
    });
  };

  if (disabled) {
    return (
      <button className="rounded border border-slate-200 px-3 py-1 text-xs text-slate-500" disabled>
        不可取消
      </button>
    );
  }

  return (
    <button
      onClick={cancel}
      className="rounded border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 disabled:opacity-60"
      disabled={pending}
    >
      取消预约
    </button>
  );
}
