import Link from 'next/link';
import type { ReactNode } from 'react';

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/client" className="font-semibold">
            Hotel Client
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/client">首页</Link>
            <Link href="/client/bookings">我的订单</Link>
            <Link href="/client/login">登录</Link>
            <Link href="/client/register" className="font-semibold text-blue-600">
              注册
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
