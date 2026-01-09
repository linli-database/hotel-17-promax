'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import './globals.css';
import BottomNav from './_components/BottomNav';

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
    <div className="min-h-screen bg-base-200 pb-20 lg:pb-0"> {/* 为底部导航留出空间 */}
      <header className="navbar bg-base-100 shadow-md sticky top-0 z-50">
        <div className="navbar-start">
          <Link href="/client" className="btn btn-ghost normal-case text-xl">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="hidden sm:inline">酒店预订系统</span>
            <span className="sm:hidden">酒店</span>
          </Link>
        </div>
        
        {/* 桌面端导航菜单 */}
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1">
            <li>
              <Link href="/client">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                首页
              </Link>
            </li>
            {user && (
              <>
                <li>
                  <Link href="/client/bookings">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    我的订单
                  </Link>
                </li>
                <li>
                  <Link href="/client/profile">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    个人中心
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
        
        <div className="navbar-end gap-2">
          {loading ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : user ? (
            <>
              {/* 桌面端用户菜单 */}
              <div className="dropdown dropdown-end hidden lg:block">
                <label tabIndex={0} className="btn btn-ghost btn-circle avatar placeholder">
                  <div className="bg-primary text-primary-content rounded-full w-10 h-10 flex items-center justify-center leading-none">
                    <span className="text-xl">{user.name?.[0] || user.email[0].toUpperCase()}</span>
                  </div>
                </label>
                <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
                  <li className="menu-title">
                    <span>{user.name || user.email}</span>
                  </li>
                  <li>
                    <Link href="/client/profile">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      个人中心
                    </Link>
                  </li>
                  <li>
                    <Link href="/client/bookings">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      我的订单
                    </Link>
                  </li>
                  <div className="divider my-0"></div>
                  <li>
                    <button onClick={handleLogout} className="text-error">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      退出登录
                    </button>
                  </li>
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
      
      {/* 仅在移动设备上显示底部导航 */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-20"></div> {/* 为底部导航预留空间 */}
      <BottomNav />
      
      {/* <footer className="footer footer-center p-10 bg-base-100 text-base-content mt-12 hidden lg:block">
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
      </footer> */}
    </div>
  );
}
