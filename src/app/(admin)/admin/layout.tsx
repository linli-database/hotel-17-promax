'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';
import './globals.css';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: 'ADMIN' | 'STAFF';
}

const navigation = [
  { 
    name: '仪表盘', 
    href: '/admin', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
      </svg>
    ),
    roles: ['ADMIN', 'STAFF'] 
  },
  { 
    name: '本店管理', 
    href: '/admin/store-management', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
      </svg>
    ),
    roles: ['STAFF'] 
  },
  { 
    name: '门店管理', 
    href: '/admin/stores', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    roles: ['ADMIN'] 
  },
  { 
    name: '房型管理', 
    href: '/admin/room-types', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
      </svg>
    ),
    roles: ['ADMIN'] 
  },
  { 
    name: '用户管理', 
    href: '/admin/users', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    ),
    roles: ['ADMIN'] 
  },
  { 
    name: '订单管理', 
    href: '/admin/bookings', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    roles: ['ADMIN', 'STAFF'] 
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/admin/login');
          return;
        }
        const data = await res.json();
        if (data.user.role !== 'ADMIN' && data.user.role !== 'STAFF') {
          router.push('/admin/login');
          return;
        }
        setUser(data.user);
      } catch {
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role || '')
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="drawer lg:drawer-open">
      <input 
        id="mobile-drawer-toggle" 
        type="checkbox" 
        className="drawer-toggle" 
        checked={mobileSidebarOpen} 
        onChange={(e) => setMobileSidebarOpen(e.target.checked)} 
      />
      
      <div className="drawer-content flex flex-col">
        {/* 顶部导航栏 */}
        <div className="navbar bg-base-100 border-b border-base-200 shadow-sm">
          <div className="flex-none">
            <label htmlFor="mobile-drawer-toggle" className="btn btn-square btn-ghost lg:hidden">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </label>
            
            {/* 桌面端折叠按钮 */}
            <button 
              className="btn btn-square btn-ghost hidden lg:flex"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <svg className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-base-content">
              🏨 酒店管理系统
            </h1>
          </div>
          
          <div className="flex-none">
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
                <div className="avatar placeholder">
                  <div className="bg-primary text-primary-content rounded-full w-8">
                    <span className="text-sm font-medium">{user.name?.[0] || user.email[0].toUpperCase()}</span>
                  </div>
                </div>
              </div>
              <ul tabIndex={0} className="menu menu-sm dropdown-content bg-base-100 rounded-box z-50 mt-3 w-60 p-2 shadow-lg border border-base-200">
                <li className="menu-title px-4 py-2">
                  <div className="flex flex-col">
                    <span className="font-medium text-base-content">{user.name || '未设置名称'}</span>
                    <span className="text-xs text-base-content/70">{user.email}</span>
                    <div className="mt-1">
                      <span className={`badge badge-xs ${user.role === 'ADMIN' ? 'badge-primary' : 'badge-secondary'}`}>
                        {user.role === 'ADMIN' ? '管理员' : '前台'}
                      </span>
                    </div>
                  </div>
                </li>
                <li><hr className="my-1" /></li>
                <li>
                  <button onClick={handleLogout} className="text-error hover:bg-error/10">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    退出登录
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 主要内容区域 */}
        <main className="flex-1 p-6 bg-base-200/50">
          {children}
        </main>
      </div>

      {/* 侧边栏 */}
      <div className="drawer-side z-40">
        <label htmlFor="mobile-drawer-toggle" aria-label="close sidebar" className="drawer-overlay lg:hidden"></label>
        <aside className={`min-h-full bg-base-100 border-r border-base-200 transition-all duration-300 ${
          sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
        } w-64`}>
          <div className="flex flex-col h-full">
            {/* 侧边栏头部 */}
            <div className="p-4 border-b border-base-200">
              <div className={`transition-opacity duration-300 ${sidebarCollapsed ? 'lg:opacity-0 lg:hidden' : 'opacity-100'}`}>
                <div className="font-bold text-xl text-primary">管理面板</div>
                <div className="text-sm text-base-content/70 mt-1">Hotel Management</div>
              </div>
              <div className={`transition-opacity duration-300 ${sidebarCollapsed ? 'lg:opacity-100 lg:block' : 'lg:opacity-0 lg:hidden'} hidden`}>
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-content font-bold text-sm">H</span>
                </div>
              </div>
            </div>

            {/* 导航菜单 */}
            <nav className="flex-1 p-3">
              <ul className="space-y-1">
                {filteredNavigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link 
                        href={item.href}
                        className={`flex items-center px-3 py-3 rounded-lg transition-all duration-200 group relative ${
                          isActive 
                            ? 'bg-primary text-primary-content shadow-sm' 
                            : 'text-base-content/80 hover:bg-base-200 hover:text-base-content'
                        }`}
                        title={sidebarCollapsed ? item.name : undefined}
                      >
                        <div className={`flex-shrink-0 ${isActive ? 'text-primary-content' : 'text-base-content/60 group-hover:text-base-content'}`}>
                          {item.icon}
                        </div>
                        <span className={`ml-3 font-medium transition-opacity duration-300 ${
                          sidebarCollapsed ? 'lg:opacity-0 lg:hidden' : 'opacity-100'
                        }`}>
                          {item.name}
                        </span>
                        
                        {/* 折叠状态下的悬浮提示 */}
                        {sidebarCollapsed && (
                          <div className="absolute left-full ml-2 px-3 py-1 bg-base-content text-base-100 text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 hidden lg:block">
                            {item.name}
                          </div>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </aside>
      </div>
    </div>
  );
}
