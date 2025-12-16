import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/admin" className="text-lg font-semibold">
            Hotel Admin
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin/rooms">房间</Link>
            <Link href="/admin/bookings">预约</Link>
            <Link href="/admin/housekeeping">房务</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
