'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  user:
    | {
        id: number;
        name: string | null;
        email: string;
        role: string;
      }
    | null;
};

export default function UserNav({ user }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    setLoading(false);
    router.push('/client/login');
    router.refresh();
  };

  if (!user) {
    return (
      <>
        <Link href="/client/login">登录</Link>
        <Link href="/client/register" className="font-semibold text-blue-600">
          注册
        </Link>
      </>
    );
  }

  const displayName = user.name?.trim() || user.email;

  return (
    <div className="flex items-center gap-3">
      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
        已登录
      </span>
      <span className="text-sm text-slate-700">欢迎，{displayName}</span>
      <button
        onClick={handleLogout}
        className="rounded border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
        disabled={loading}
      >
        退出
      </button>
    </div>
  );
}
