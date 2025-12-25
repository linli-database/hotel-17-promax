'use client';

import { useEffect, useState } from 'react';

interface User {
  id: string;
  role: 'ADMIN' | 'STAFF';
}

interface Stats {
  todayCheckIns: number;
  todayCheckOuts: number;
  pendingCleanings: number;
  totalBookings: number;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  // TODO: 后续添加统计数据API
  const [stats] = useState<Stats>({
    todayCheckIns: 0,
    todayCheckOuts: 0,
    pendingCleanings: 0,
    totalBookings: 0
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
      }
    };

    fetchUser();
  }, []);

  return (
    <div className="space-y-6">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="card-title text-2xl mb-4">
            仪表盘
            {user && (
              <div className="badge badge-primary">
                {user.role === 'ADMIN' ? '管理员' : '前台'}
              </div>
            )}
          </h1>
          
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="stat bg-primary text-primary-content rounded-lg">
              <div className="stat-figure">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="stat-title">今日入住</div>
              <div className="stat-value">{stats.todayCheckIns}</div>
              <div className="stat-desc">预计客人</div>
            </div>

            <div className="stat bg-secondary text-secondary-content rounded-lg">
              <div className="stat-figure">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <div className="stat-title">今日离店</div>
              <div className="stat-value">{stats.todayCheckOuts}</div>
              <div className="stat-desc">办理退房</div>
            </div>

            <div className="stat bg-accent text-accent-content rounded-lg">
              <div className="stat-figure">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="stat-title">待清扫房间</div>
              <div className="stat-value">{stats.pendingCleanings}</div>
              <div className="stat-desc">房间</div>
            </div>

            <div className="stat bg-info text-info-content rounded-lg">
              <div className="stat-figure">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="stat-title">总预订</div>
              <div className="stat-value">{stats.totalBookings}</div>
              <div className="stat-desc">全部订单</div>
            </div>
          </div>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-lg mb-4">快速操作</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="btn btn-outline btn-primary">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              新预订
            </button>
            <button className="btn btn-outline btn-secondary">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              入住登记
            </button>
            <button className="btn btn-outline btn-accent">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              办理退房
            </button>
            <button className="btn btn-outline btn-info">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              房间清扫
            </button>
          </div>
        </div>
      </div>

      {/* 最近预订 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-lg mb-4">最近预订</h2>
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>预订号</th>
                  <th>客户</th>
                  <th>房间</th>
                  <th>入住日期</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-gray-500">暂无数据</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
