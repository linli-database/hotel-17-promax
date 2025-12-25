'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Store = {
  id: string;
  name: string;
  address: string | null;
};

type RoomType = {
  id: string;
  name: string;
  description: string | null;
  basePrice: string;
  capacity: number;
  amenities: string[];
  availableCount: number;
};

export default function ClientHome() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRoomTypes, setLoadingRoomTypes] = useState(false);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [error, setError] = useState<string | null>(null);

  // 获取当前用户
  useEffect(() => {
    const fetchUser = async () => {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    };
    fetchUser();
  }, []);

  // 获取门店列表
  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/stores');
        if (res.ok) {
          const data = await res.json();
          setStores(data.stores || []);
        }
      } catch (err) {
        console.error('获取门店失败:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStores();
  }, []);

  // 获取指定门店的房型信息
  const handleStoreSelect = async (store: Store) => {
    setSelectedStore(store);
    setRoomTypes([]);
    setError(null);

    if (!checkIn || !checkOut) {
      setError('请先选择入住和离店日期');
      return;
    }

    setLoadingRoomTypes(true);
    try {
      const res = await fetch(
        `/api/client/room-types?storeId=${store.id}&checkIn=${checkIn}&checkOut=${checkOut}`
      );
      if (res.ok) {
        const data = await res.json();
        setRoomTypes(data.roomTypes || []);
      } else {
        const data = await res.json();
        setError(data.error || '获取房型失败');
      }
    } catch (err) {
      setError('获取房型失败');
    } finally {
      setLoadingRoomTypes(false);
    }
  };

  // 创建订单
  const handleBooking = async (roomType: RoomType) => {
    if (!user) {
      router.push('/client/login');
      return;
    }

    if (!selectedStore || !checkIn || !checkOut) {
      setError('请选择门店和入住时间');
      return;
    }

    try {
      const res = await fetch('/api/client/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: selectedStore.id,
          roomTypeId: roomType.id,
          checkIn,
          checkOut,
        }),
      });

      if (res.ok) {
        alert('预订成功！');
        router.push('/client/bookings');
      } else {
        const data = await res.json();
        alert(data.error || '预订失败');
      }
    } catch (err) {
      alert('预订失败');
    }
  };

  // 设置默认日期（明天到后天）
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    setCheckIn(tomorrow.toISOString().split('T')[0]);
    setCheckOut(dayAfter.toISOString().split('T')[0]);
  }, []);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">欢迎来到酒店预约系统</h1>
        <p className="text-base-content/70">选择您喜欢的门店和房型，开始您的旅程</p>
      </div>

      {/* 日期选择 */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h2 className="card-title">选择入住时间</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">入住日期</span>
              </label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="input input-bordered"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">离店日期</span>
              </label>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="input input-bordered"
                min={checkIn}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 门店列表 */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">选择门店</h2>
        {loading ? (
          <div className="flex justify-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map((store) => (
              <div
                key={store.id}
                className={`card bg-base-100 shadow-md hover:shadow-xl transition-shadow cursor-pointer ${
                  selectedStore?.id === store.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleStoreSelect(store)}
              >
                <div className="card-body">
                  <h3 className="card-title">{store.name}</h3>
                  <p className="text-sm text-base-content/70">{store.address || '暂无地址'}</p>
                  {selectedStore?.id === store.id && (
                    <div className="badge badge-primary">已选择</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 房型列表 */}
      {selectedStore && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">
            {selectedStore.name} - 可选房型
          </h2>
          {error && (
            <div className="alert alert-warning mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          {loadingRoomTypes ? (
            <div className="flex justify-center">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : roomTypes.length === 0 ? (
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>请选择入住和离店日期后查看可用房型</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roomTypes.map((roomType) => (
                <div key={roomType.id} className="card bg-base-100 shadow-lg">
                  <div className="card-body">
                    <h3 className="card-title">{roomType.name}</h3>
                    <p className="text-sm text-base-content/70">{roomType.description || '暂无描述'}</p>
                    <div className="space-y-2 my-4">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="text-sm">最多 {roomType.capacity} 人</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm">可用房间：{roomType.availableCount}</span>
                      </div>
                    </div>
                    {roomType.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {roomType.amenities.map((amenity, i) => (
                          <div key={i} className="badge badge-outline badge-sm">{amenity}</div>
                        ))}
                      </div>
                    )}
                    <div className="divider"></div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-bold text-primary">¥{roomType.basePrice}</span>
                        <span className="text-sm text-base-content/70">/晚</span>
                      </div>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleBooking(roomType)}
                        disabled={roomType.availableCount === 0}
                      >
                        {roomType.availableCount === 0 ? '已满房' : '立即预订'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
