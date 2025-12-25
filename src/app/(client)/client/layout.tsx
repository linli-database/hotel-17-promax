'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import './globals.css';

export default function ClientLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name: string | null; email: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (err) {
        console.error('获取用户信息失败:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleLogout = async () => {
    if (!confirm('确定要退出登录吗？')) return;
    
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/client/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-base-200">
      <header className="navbar bg-base-100 shadow-md sticky top-0 z-50">
        <div className="navbar-start">
          <div className="dropdown">
            <label tabIndex={0} className="btn btn-ghost lg:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
            </label>
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
              <li><Link href="/client">首页</Link></li>
              <li><Link href="/client/bookings">我的订单</Link></li>
              {user && <li><Link href="/client/profile">个人中心</Link></li>}
            </ul>
          </div>
          <Link href="/client" className="btn btn-ghost normal-case text-xl">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            酒店预订系统
          </Link>
        </div>
        
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1">
            <li><Link href="/client">首页</Link></li>
            <li><Link href="/client/bookings">我的订单</Link></li>
            {user && <li><Link href="/client/profile">个人中心</Link></li>}
          </ul>
        </div>
        
        <div className="navbar-end gap-2">
          {loading ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : user ? (
            <>
              <div className="dropdown dropdown-end">
                <label tabIndex={0} className="btn btn-ghost btn-circle avatar placeholder">
                  <div className="bg-primary text-primary-content rounded-full w-10">
                    <span className="text-xl">{user.name?.[0] || user.email[0].toUpperCase()}</span>
                  </div>
                </label>
                <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
                  <li className="menu-title">
                    <span>{user.name || user.email}</span>
                  </li>
                  <li><Link href="/client/profile">个人中心</Link></li>
                  <li><Link href="/client/bookings">我的订单</Link></li>
                  <li><button onClick={handleLogout}>退出登录</button></li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <Link href="/client/login" className="btn btn-ghost btn-sm">
                登录
              </Link>
              <Link href="/client/register" className="btn btn-primary btn-sm">
                注册
              </Link>
            </>
          )}
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">{children}</main>
      
      <footer className="footer footer-center p-10 bg-base-100 text-base-content mt-12">
        <aside>
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="font-bold">
            酒店预订系统
          </p> 
          <p>为您提供优质的住宿体验</p>
          <p>Copyright © 2025 - All rights reserved</p>
        </aside>
      </footer>
    </div>
  );
}
