'use client';

import { useState, ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

type Tab = {
  id: string;
  name: string;
  icon: ReactNode;
  path: string;
};

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  
  const tabs: Tab[] = [
    {
      id: 'home',
      name: '首页',
      path: '/client',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'bookings',
      name: '订单',
      path: '/client/bookings',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      id: 'profile',
      name: '我的',
      path: '/client/profile',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  // 改进路径匹配逻辑，更精确地确定当前激活的标签页
  const getActiveTab = () => {
    // 精确匹配路径
    if (pathname === '/client') return 'home';
    if (pathname === '/client/bookings') return 'bookings';
    if (pathname === '/client/profile') return 'profile';
    
    // 如果当前路径是这些路径的子路径，则也匹配
    if (pathname.startsWith('/client/bookings/')) return 'bookings';
    if (pathname.startsWith('/client/profile/')) return 'profile';
    
    // 默认返回首页
    return 'home';
  };

  const activeTab = getActiveTab();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 z-50 lg:hidden">
      <div className="flex justify-around items-center">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.path}
            className={`flex flex-col items-center justify-center w-full py-3 px-1 ${
              activeTab === tab.id ? 'text-primary' : 'text-base-content'
            }`}
          >
            <div className={`flex items-center justify-center w-6 h-6 mb-1 ${
              activeTab === tab.id ? 'text-primary' : 'text-base-content'
            }`}>
              {tab.icon}
            </div>
            <span className={`text-xs ${activeTab === tab.id ? 'font-bold text-primary' : 'text-base-content'}`}>
              {tab.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}