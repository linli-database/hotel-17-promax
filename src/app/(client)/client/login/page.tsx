'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClientLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) {
      router.replace('/client');
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => null);
    setError(data?.error ?? '登录失败');
  };

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">登录</h1>
        <p className="text-sm text-slate-600">使用邮箱和密码登录您的账户</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <label className="text-sm font-medium">邮箱</label>
          <input
            type="email"
            className="w-full rounded border px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">密码</label>
          <input
            type="password"
            className="w-full rounded border px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          disabled={loading}
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
    </div>
  );
}
