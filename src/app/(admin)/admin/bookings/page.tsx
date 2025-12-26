'use client';

import { useEffect, useState } from 'react';

interface Booking {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  customer?: {
    name: string;
    phone: string;
    email: string;
  };
  roomType?: {
    name: string;
  };
  store: {
    name: string;
  };
  bookingRooms?: {
    room: {
      roomNo: string;
    };
  }[];
  createdAt: string;
  createdByRole: 'CUSTOMER' | 'STAFF' | 'ADMIN';
}

interface Store {
  id: string;
  name: string;
}

interface RoomType {
  id: string;
  name: string;
}

const statusMap = {
  PENDING: { label: '待入住', color: 'badge-warning' },
  CONFIRMED: { label: '已确认', color: 'badge-info' },
  CHECKED_IN: { label: '已入住', color: 'badge-success' },
  CHECKED_OUT: { label: '已离店', color: 'badge-secondary' },
  COMPLETED: { label: '已完成', color: 'badge-accent' },
  CANCELLED: { label: '已取消', color: 'badge-error' },
  NO_SHOW: { label: '未入住', color: 'badge-ghost' },
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 筛选状态
  const [filters, setFilters] = useState({
    storeId: '',
    status: '',
    roomTypeId: '',
    checkInDate: '',
    checkOutDate: '',
    customerName: '',
    createdByRole: '',
  });

  // 分页状态
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [filters, pagination.page]);

  const fetchInitialData = async () => {
    try {
      const [storesRes, roomTypesRes] = await Promise.all([
        fetch('/api/admin/stores'),
        fetch('/api/admin/room-types')
      ]);

      if (storesRes.ok) {
        const storesData = await storesRes.json();
        setStores(storesData.stores || []);
      }

      if (roomTypesRes.ok) {
        const roomTypesData = await roomTypesRes.json();
        setRoomTypes(roomTypesData.roomTypes || []);
      }
    } catch (error) {
      console.error('获取初始数据失败:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
      });

      const response = await fetch(`/api/admin/bookings?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings);
        setPagination(prev => ({ ...prev, total: data.total }));
      } else {
        console.error('获取订单失败:', await response.text());
      }
    } catch (error) {
      console.error('获取订单失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        await fetchBookings(); // 刷新列表
      } else {
        console.error('更新订单状态失败:', await response.text());
      }
    } catch (error) {
      console.error('更新订单状态失败:', error);
    }
  };

  const cancelBooking = async (bookingId: string, reason: string) => {
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'CANCELLED',
          cancelReason: reason 
        }),
      });

      if (response.ok) {
        await fetchBookings(); // 刷新列表
      } else {
        console.error('取消订单失败:', await response.text());
      }
    } catch (error) {
      console.error('取消订单失败:', error);
    }
  };

  const deleteBooking = async (bookingId: string) => {
    if (!confirm('确定要删除这个订单吗？此操作不可恢复。')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchBookings(); // 刷新列表
      } else {
        console.error('删除订单失败:', await response.text());
      }
    } catch (error) {
      console.error('删除订单失败:', error);
    }
  };

  const resetFilters = () => {
    setFilters({
      storeId: '',
      status: '',
      roomTypeId: '',
      checkInDate: '',
      checkOutDate: '',
      customerName: '',
      createdByRole: '',
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">订单管理</h1>
        <div className="flex gap-2">
          <button 
            className="btn btn-outline btn-sm" 
            onClick={resetFilters}
          >
            重置筛选
          </button>
          <button 
            className="btn btn-primary btn-sm" 
            onClick={fetchBookings}
          >
            刷新
          </button>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title text-lg mb-4">筛选条件</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 门店筛选 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">门店</span>
              </label>
              <select 
                className="select select-bordered"
                value={filters.storeId}
                onChange={(e) => setFilters(prev => ({ ...prev, storeId: e.target.value }))}
              >
                <option value="">全部门店</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>

            {/* 状态筛选 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">状态</span>
              </label>
              <select 
                className="select select-bordered"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">全部状态</option>
                {Object.entries(statusMap).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* 房型筛选 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">房型</span>
              </label>
              <select 
                className="select select-bordered"
                value={filters.roomTypeId}
                onChange={(e) => setFilters(prev => ({ ...prev, roomTypeId: e.target.value }))}
              >
                <option value="">全部房型</option>
                {roomTypes.map(roomType => (
                  <option key={roomType.id} value={roomType.id}>{roomType.name}</option>
                ))}
              </select>
            </div>

            {/* 创建者筛选 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">创建者</span>
              </label>
              <select 
                className="select select-bordered"
                value={filters.createdByRole}
                onChange={(e) => setFilters(prev => ({ ...prev, createdByRole: e.target.value }))}
              >
                <option value="">全部</option>
                <option value="CUSTOMER">客户</option>
                <option value="STAFF">前台</option>
                <option value="ADMIN">管理员</option>
              </select>
            </div>

            {/* 入住日期筛选 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">入住日期（从）</span>
              </label>
              <input 
                type="date" 
                className="input input-bordered"
                value={filters.checkInDate}
                onChange={(e) => setFilters(prev => ({ ...prev, checkInDate: e.target.value }))}
              />
            </div>

            {/* 离店日期筛选 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">离店日期（到）</span>
              </label>
              <input 
                type="date" 
                className="input input-bordered"
                value={filters.checkOutDate}
                onChange={(e) => setFilters(prev => ({ ...prev, checkOutDate: e.target.value }))}
              />
            </div>

            {/* 客户姓名筛选 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">客户姓名</span>
              </label>
              <input 
                type="text" 
                placeholder="搜索客户姓名..." 
                className="input input-bordered"
                value={filters.customerName}
                onChange={(e) => setFilters(prev => ({ ...prev, customerName: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 订单列表 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title">订单列表</h2>
            <div className="text-sm text-base-content/60">
              共 {pagination.total} 条记录
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>订单ID</th>
                    <th>客户信息</th>
                    <th>门店</th>
                    <th>房型</th>
                    <th>房间号</th>
                    <th>入住日期</th>
                    <th>离店日期</th>
                    <th>总价</th>
                    <th>状态</th>
                    <th>创建者</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(booking => (
                    <tr key={booking.id}>
                      <td className="font-mono text-sm">
                        {booking.id.substring(0, 8)}...
                      </td>
                      <td>
                        <div>
                          <div className="font-semibold">{booking.customer?.name || '未知'}</div>
                          <div className="text-sm text-base-content/60">
                            {booking.customer?.phone}
                          </div>
                        </div>
                      </td>
                      <td>{booking.store.name}</td>
                      <td>{booking.roomType?.name || '-'}</td>
                      <td>
                        {booking.bookingRooms?.map(br => br.room.roomNo).join(', ') || '未分配'}
                      </td>
                      <td>{new Date(booking.checkIn).toLocaleDateString()}</td>
                      <td>{new Date(booking.checkOut).toLocaleDateString()}</td>
                      <td>¥{booking.totalPrice}</td>
                      <td>
                        <div className={`badge ${statusMap[booking.status].color}`}>
                          {statusMap[booking.status].label}
                        </div>
                      </td>
                      <td>
                        <div className="badge badge-neutral badge-sm">
                          {booking.createdByRole === 'CUSTOMER' ? '客户' : 
                           booking.createdByRole === 'STAFF' ? '前台' : '管理员'}
                        </div>
                      </td>
                      <td>{new Date(booking.createdAt).toLocaleString()}</td>
                      <td>
                        <div className="flex gap-1">
                          <button 
                            className="btn btn-xs btn-primary"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowDetailsModal(true);
                            }}
                          >
                            详情
                          </button>
                          
                          {booking.status === 'PENDING' && (
                            <button 
                              className="btn btn-xs btn-error"
                              onClick={() => {
                                const reason = prompt('请输入取消原因:');
                                if (reason) {
                                  cancelBooking(booking.id, reason);
                                }
                              }}
                            >
                              取消
                            </button>
                          )}
                          
                          <div className="dropdown dropdown-end">
                            <div tabIndex={0} role="button" className="btn btn-xs btn-ghost">
                              ⋮
                            </div>
                            <ul className="dropdown-content menu bg-base-100 rounded-box z-[1] w-32 p-2 shadow">
                              <li>
                                <button 
                                  className="text-error"
                                  onClick={() => deleteBooking(booking.id)}
                                >
                                  删除订单
                                </button>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {bookings.length === 0 && !loading && (
                <div className="text-center py-20 text-base-content/60">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg">暂无订单数据</p>
                  <p className="text-sm">当前筛选条件下没有找到订单</p>
                </div>
              )}
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <div className="join">
                <button 
                  className="join-item btn btn-sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  «
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    className={`join-item btn btn-sm ${page === pagination.page ? 'btn-active' : ''}`}
                    onClick={() => setPagination(prev => ({ ...prev, page }))}
                  >
                    {page}
                  </button>
                ))}
                
                <button 
                  className="join-item btn btn-sm"
                  disabled={pagination.page >= totalPages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 详情模态框 */}
      {showDetailsModal && selectedBooking && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">订单详情</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold">订单ID</label>
                  <p className="font-mono text-sm">{selectedBooking.id}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold">状态</label>
                  <div className={`badge ${statusMap[selectedBooking.status].color} mt-1`}>
                    {statusMap[selectedBooking.status].label}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold">客户姓名</label>
                  <p>{selectedBooking.customer?.name || '未知'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold">联系电话</label>
                  <p>{selectedBooking.customer?.phone || '-'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold">邮箱</label>
                <p>{selectedBooking.customer?.email || '-'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold">门店</label>
                  <p>{selectedBooking.store.name}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold">房型</label>
                  <p>{selectedBooking.roomType?.name || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold">入住日期</label>
                  <p>{new Date(selectedBooking.checkIn).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold">离店日期</label>
                  <p>{new Date(selectedBooking.checkOut).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold">分配房间</label>
                <p>{selectedBooking.bookingRooms?.map(br => br.room.roomNo).join(', ') || '未分配'}</p>
              </div>

              <div>
                <label className="text-sm font-semibold">总价</label>
                <p className="text-xl font-bold text-primary">¥{selectedBooking.totalPrice}</p>
              </div>

              <div>
                <label className="text-sm font-semibold">创建时间</label>
                <p>{new Date(selectedBooking.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="modal-action">
              <button 
                className="btn"
                onClick={() => setShowDetailsModal(false)}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}