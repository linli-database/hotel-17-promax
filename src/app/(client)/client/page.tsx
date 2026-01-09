'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Store = {
  id: string;
  name: string;
  address: string | null;
  avgRating: number | null;
  reviewCount: number;
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

type StoreReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  customerName: string;
  booking: {
    checkIn: string;
    checkOut: string;
    roomType: {
      id: string;
      name: string;
      basePrice: string;
    } | null;
  } | null;
};

// 预定义的设施列表
const DEFAULT_AMENITIES = [
  '空调',
  'WiFi',
  '电视',
  '独立卫浴',
  '迷你吧',
  '保险箱',
  '熨斗',
  '咖啡机',
  '浴缸',
  '阳台',
  '海景',
  '城市景观',
];

// 星星评分组件
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`text-lg ${
            star <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'
          }`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

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
  
  // 筛选条件
  const [selectedRoomTypeName, setSelectedRoomTypeName] = useState<string>('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [showFilteredResults, setShowFilteredResults] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [allRoomTypeNames, setAllRoomTypeNames] = useState<string[]>([]);

  // 评论弹窗状态
  const [reviewModalStore, setReviewModalStore] = useState<Store | null>(null);
  const [storeReviews, setStoreReviews] = useState<StoreReview[]>([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewLoading, setReviewLoading] = useState(false);

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

  // 获取所有房型列表
  useEffect(() => {
    const fetchRoomTypes = async () => {
      try {
        const res = await fetch('/api/client/room-types-list');
        if (res.ok) {
          const data = await res.json();
          setAllRoomTypeNames(data.roomTypes.map((rt: any) => rt.name) || []);
        }
      } catch (err) {
        console.error('获取房型列表失败:', err);
      }
    };
    fetchRoomTypes();
  }, []);

  // 获取指定门店的房型信息
  const handleStoreSelect = async (store: Store) => {
    // 如果当前点击的门店与已选门店相同，则取消选择
    if (selectedStore && selectedStore.id === store.id) {
      setSelectedStore(null);
      setRoomTypes([]);
      setError(null);
      return;
    }

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

  // 应用高级筛选
  const handleApplyFilter = async () => {
    if (!checkIn || !checkOut) {
      setError('请先选择入住和离店日期');
      return;
    }

    setFilterLoading(true);
    try {
      const res = await fetch('/api/client/filter-stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkIn,
          checkOut,
          roomTypeName: selectedRoomTypeName || null,
          amenities: selectedAmenities.length > 0 ? selectedAmenities : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFilteredStores(data.stores || []);
        setShowFilteredResults(true);
        setError(null);
      } else {
        const data = await res.json();
        setError(data.error || '筛选失败');
      }
    } catch (err) {
      setError('筛选失败');
    } finally {
      setFilterLoading(false);
    }
  };

  // 清除筛选结果
  const handleClearFilter = () => {
    setShowFilteredResults(false);
    setFilteredStores([]);
  };

  // 加载门店评论
  const loadStoreReviews = async (store: Store, page = 1) => {
    if (!store || !store.id) {
      setError('门店ID缺失');
      return;
    }
    setReviewLoading(true);
    try {
      const res = await fetch(
        `/api/stores/${encodeURIComponent(store.id)}/reviews?page=${page}&pageSize=5`
      );
      if (res.ok) {
        const data = await res.json();
        setStoreReviews(data.reviews || []);
        setReviewTotal(data.total || 0);
        setReviewPage(data.page || 1);
      }
    } catch (err) {
      console.error('加载评论失败', err);
    } finally {
      setReviewLoading(false);
    }
  };

  // 切换设施选择
  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
  };

  // 根据筛选条件过滤房型
  const filteredRoomTypes = roomTypes.filter((roomType) => {
    // 房型名称筛选
    if (selectedRoomTypeName && roomType.name !== selectedRoomTypeName) {
      return false;
    }

    // 设施筛选（选中的设施必须都包含）
    if (selectedAmenities.length > 0) {
      const hasAllAmenities = selectedAmenities.every((amenity) =>
        roomType.amenities.includes(amenity)
      );
      if (!hasAllAmenities) {
        return false;
      }
    }

    return true;
  });

  // 决定显示哪些门店
  const displayStores = showFilteredResults ? filteredStores : stores;

  return (
    <div className="space-y-8">
      {/* 日期选择 */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h2 className="card-title">选择入住时间</h2>
          <div className="flex flex-row gap-4">
            <div className="form-control flex-1">
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
            <div className="form-control flex-1">
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

          <br></br>
          <h2 className="card-title">高级筛选</h2>
          
          <div className="space-y-4">
            {/* 房间类型筛选 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">房间类型</span>
              </label>
              <select
                className="select select-bordered"
                value={selectedRoomTypeName}
                onChange={(e) => setSelectedRoomTypeName(e.target.value)}
              >
                <option value="">全部类型</option>
                {allRoomTypeNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* 设施筛选 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">房间设施（可多选）</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_AMENITIES.map((amenity) => (
                  <label key={amenity} className="cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary checkbox-sm mr-2"
                      checked={selectedAmenities.includes(amenity)}
                      onChange={() => toggleAmenity(amenity)}
                    />
                    <span className="label-text">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 筛选按钮 */}
            <div className="flex gap-2">
              <button
                className="btn btn-primary"
                onClick={handleApplyFilter}
                disabled={filterLoading}
              >
                {filterLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  '确定筛选'
                )}
              </button>
              {showFilteredResults && (
                <button
                  className="btn btn-outline"
                  onClick={handleClearFilter}
                >
                  清除筛选
                </button>
              )}
            </div>

            {/* 清空筛选按钮 */}
            {(selectedRoomTypeName || selectedAmenities.length > 0) && !showFilteredResults && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setSelectedRoomTypeName('');
                  setSelectedAmenities([]);
                }}
              >
                清空条件
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 门店列表 */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">
          {showFilteredResults ? '筛选结果' : '选择门店'}
        </h2>
        {loading || filterLoading ? (
          <div className="flex justify-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : showFilteredResults && displayStores.length === 0 ? (
          <div className="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>没有符合筛选条件的门店</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayStores.map((store) => (
              <div
                key={store.id}
                className={`card bg-base-100 shadow-md hover:shadow-xl transition-shadow cursor-pointer ${
                  selectedStore?.id === store.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => {
                  if (showFilteredResults) {
                    // 在筛选结果中点击门店，直接显示房型
                    setSelectedStore(store);
                    setRoomTypes((store as any).roomTypes || []);
                  } else {
                    handleStoreSelect(store);
                  }
                }}
              >
                <div className="card-body">
                  <h3 className="card-title">{store.name}</h3>
                  <p className="text-sm text-base-content/70">{store.address || '暂无地址'}</p>
                  
                  {/* 评分显示 */}
                  {store.reviewCount > 0 ? (
                    <div className="flex items-center gap-2 mt-2">
                      <StarRating rating={store.avgRating ?? 0} />
                      <span className="text-sm font-semibold">
                        {store.avgRating ?? '暂无评分'}
                      </span>
                      <button
                        className="text-xs text-primary underline underline-offset-4"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReviewModalStore(store);
                          loadStoreReviews(store, 1);
                        }}
                      >
                        {store.reviewCount} 条评价（点击查看）
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-base-content/50 mt-2">暂无评价</div>
                  )}
                  
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">
              {selectedStore.name} - 可选房型
            </h2>
            {showFilteredResults && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setSelectedStore(null);
                  setRoomTypes([]);
                }}
              >
                返回筛选结果
              </button>
            )}
          </div>
          {error && (
            <div className="alert alert-warning mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          {loadingRoomTypes || filterLoading ? (
            <div className="flex justify-center">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : roomTypes.length === 0 ? (
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>暂无可用房型</span>
            </div>
          ) : filteredRoomTypes.length === 0 ? (
            <div className="alert alert-warning">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>没有符合筛选条件的房型，请调整筛选条件</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRoomTypes.map((roomType) => (
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

      {/* 门店评论弹窗 */}
      {reviewModalStore && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{reviewModalStore.name} 的评论</h3>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setReviewModalStore(null);
                  setStoreReviews([]);
                }}
              >
                关闭
              </button>
            </div>

            {reviewLoading ? (
              <div className="flex justify-center py-6">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : storeReviews.length === 0 ? (
              <div className="alert alert-info">
                <span>暂无评论</span>
              </div>
            ) : (
              <div className="space-y-4">
                {storeReviews.map((rev) => (
                  <div key={rev.id} className="border border-base-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StarRating rating={rev.rating} />
                        <span className="text-sm text-base-content/70">{rev.customerName}</span>
                      </div>
                      <span className="text-xs text-base-content/50">
                        {new Date(rev.createdAt).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    {rev.booking && (
                      <div className="text-xs text-base-content/60 mt-1 space-y-0.5">
                        <div>入住：{rev.booking.checkIn.split('T')[0]} 至 {rev.booking.checkOut.split('T')[0]}</div>
                        {rev.booking.roomType && (
                          <div>房型：{rev.booking.roomType.name} (¥{rev.booking.roomType.basePrice}/晚)</div>
                        )}
                      </div>
                    )}
                    {rev.comment && (
                      <p className="mt-2 text-sm text-base-content/80 whitespace-pre-wrap">{rev.comment}</p>
                    )}
                  </div>
                ))}

                {/* 分页 */}
                {reviewTotal > 5 && (
                  <div className="flex items-center justify-between pt-2">
                    <button
                      className="btn btn-sm"
                      disabled={reviewPage <= 1 || reviewLoading}
                      onClick={() => loadStoreReviews(reviewModalStore, reviewPage - 1)}
                    >
                      上一页
                    </button>
                    <div className="text-sm text-base-content/60">
                      第 {reviewPage} / {reviewTotal > 0 ? Math.ceil(reviewTotal / 5) : 1} 页
                    </div>
                    <button
                      className="btn btn-sm"
                      disabled={reviewPage >= (reviewTotal > 0 ? Math.ceil(reviewTotal / 5) : 1) || reviewLoading}
                      onClick={() => loadStoreReviews(reviewModalStore, reviewPage + 1)}
                    >
                      下一页
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
