import Link from 'next/link';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { parseSessionToken } from '@/lib/server/auth';
import UserNav from './_components/UserNav';

export const dynamic = 'force-dynamic';

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('hotel_session')?.value;
  if (!token) return null;
  const payload = parseSessionToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, name: true, email: true, role: true },
  });
  return user;
}

export default async function ClientLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

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
