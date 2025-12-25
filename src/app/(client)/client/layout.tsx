'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import UserNav from './_components/UserNav';
import './globals.css';

export default function ClientLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: number; name: string | null; email: string; role: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return;
      const data = await res.json();
      setUser(data.user);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/client" className="font-semibold">
            Hotel Client
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/client">首页</Link>
            <Link href="/client/bookings">我的订单</Link>
            <UserNav user={user} />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
