'use client';

import { useEffect, useState } from 'react';

interface Room {
  id: string;
  roomNo: string;
  floor: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'DIRTY' | 'OUT_OF_SERVICE';
  roomType: {
    name: string;
    basePrice: number;
  };
  currentBooking?: {
    id: string;
    customer: {
      name: string;
    };
    checkIn: string;
    checkOut: string;
  };
}

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
  roomType: {
    name: string;
  };
  assignedRoom?: {
    roomNo: string;
  };
  createdAt: string;
}

interface Store {
  id: string;
  name: string;
}

const statusMap = {
  AVAILABLE: { label: '空闲', color: 'badge-success' },
  OCCUPIED: { label: '占用', color: 'badge-warning' },
  DIRTY: { label: '待清洁', color: 'badge-info' },
  OUT_OF_SERVICE: { label: '停用', color: 'badge-error' },
};

const bookingStatusMap = {
  PENDING: { label: '待确认', color: 'badge-warning' },
  CONFIRMED: { label: '已确认', color: 'badge-info' },
  CHECKED_IN: { label: '已入住', color: 'badge-success' },
  CHECKED_OUT: { label: '已离店', color: 'badge-secondary' },
  COMPLETED: { label: '已完成', color: 'badge-accent' },
  CANCELLED: { label: '已取消', color: 'badge-error' },
  NO_SHOW: { label: '未入住', color: 'badge-ghost' },
};

export default function StoreManagementPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 筛选状态
  const [filters, setFilters] = useState({
    status: 'active', // active, all
    checkInDate: '',
    checkOutDate: '',
    customerName: '',
    bookingStatus: '',
  });

  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [assigningBooking, setAssigningBooking] = useState<string | null>(null);

  useEffect(() => {
    fetchStoreData();
  }, []);

  const fetchStoreData = async () => {
    try {
      // 获取前台所属门店信息
      const storeRes = await fetch('/api/staff/store');
      if (storeRes.ok) {
        const storeData = await storeRes.json();
        setStore(storeData);
        
        // 同时获取房间和订单数据
        const [roomsRes, bookingsRes] = await Promise.all([
          fetch(`/api/staff/store/rooms`),
          fetch(`/api/staff/store/bookings`)
        ]);

        if (roomsRes.ok) {
          const roomsData = await roomsRes.json();
          // 转换数据结构以匹配前端期望的格式
          const formattedRooms = roomsData.map((room: any) => ({
            ...room,
            currentBooking: room.bookingRooms?.[0]?.booking ? {
              id: room.bookingRooms[0].booking.id,
              customer: room.bookingRooms[0].booking.customer,
              checkIn: room.bookingRooms[0].booking.checkIn,
              checkOut: room.bookingRooms[0].booking.checkOut,
            } : null
          }));
          setRooms(formattedRooms);
        }

        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          // 转换订单数据结构
          const formattedBookings = bookingsData.map((booking: any) => ({
            ...booking,
            assignedRoom: booking.bookingRooms?.[0]?.room ? {
              roomNo: booking.bookingRooms[0].room.roomNo
            } : null
          }));
          setBookings(formattedBookings);
        }
      }
    } catch (error) {
      console.error('获取门店数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRoomStatus = async (roomId: string, status: string) => {
    try {
      const res = await fetch(`/api/staff/rooms/${roomId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        await fetchStoreData(); // 刷新数据
      }
    } catch (error) {
      console.error('更新房间状态失败:', error);
    }
  };

  const assignRoom = async (bookingId: string, roomId: string) => {
    try {
      const res = await fetch(`/api/staff/bookings/${bookingId}/assign-room`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
      });

      if (res.ok) {
        await fetchStoreData(); // 刷新数据
        setAssigningBooking(null);
        setSelectedRoom('');
      }
    } catch (error) {
      console.error('分配房间失败:', error);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const res = await fetch(`/api/staff/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        await fetchStoreData(); // 刷新数据
      }
    } catch (error) {
      console.error('更新订单状态失败:', error);
    }
  };

  // 筛选订单
  const filteredBookings = bookings.filter(booking => {
    // 默认只显示活跃订单（未完成的）
    if (filters.status === 'active') {
      if (['CHECKED_OUT', 'COMPLETED', 'CANCELLED'].includes(booking.status)) {
        return false;
      }
    }

    // 其他筛选条件
    if (filters.customerName && !booking.customer?.name.includes(filters.customerName)) {
      return false;
    }

    if (filters.bookingStatus && booking.status !== filters.bookingStatus) {
      return false;
    }

    if (filters.checkInDate && booking.checkIn < filters.checkInDate) {
      return false;
    }

    if (filters.checkOutDate && booking.checkOut > filters.checkOutDate) {
      return false;
    }

    return true;
  });

  // 按楼层分组房间
  const groupedRooms = rooms.reduce((groups, room) => {
    const floor = room.floor;
    if (!groups[floor]) {
      groups[floor] = [];
    }
    groups[floor].push(room);
    return groups;
  }, {} as Record<number, Room[]>);

  const floors = Object.keys(groupedRooms).map(Number).sort((a, b) => a - b);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-base-content">本店管理</h1>
          <p className="text-base-content/70 mt-2">{store?.name}</p>
        </div>
      </div>

      {/* 房间状态全览 */}
      <div className="card bg-base-100 shadow-xl mb-8">
        <div className="card-body">
          <div className="flex justify-between items-center mb-6">
            <h2 className="card-title text-xl">房间状态总览</h2>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-success rounded"></div>
                <span>空闲 ({rooms.filter(r => r.status === 'AVAILABLE').length})</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-warning rounded"></div>
                <span>占用 ({rooms.filter(r => r.status === 'OCCUPIED').length})</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-info rounded"></div>
                <span>待清洁 ({rooms.filter(r => r.status === 'DIRTY').length})</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-error rounded"></div>
                <span>停用 ({rooms.filter(r => r.status === 'OUT_OF_SERVICE').length})</span>
              </div>
            </div>
          </div>

          {/* 房间网格展示 */}
          <div className="space-y-8">
            {floors.map(floor => (
              <div key={floor} className="border border-base-300 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="badge badge-neutral badge-lg">{floor}F</span>
                    第{floor}层
                  </h3>
                  <div className="text-sm text-base-content/60">
                    {groupedRooms[floor].length} 间房间
                  </div>
                </div>
                
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
                  {groupedRooms[floor]
                    .sort((a, b) => a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true }))
                    .map(room => (
                      <div
                        key={room.id}
                        className={`card p-3 cursor-pointer transition-all hover:scale-105 border-2 ${
                          room.status === 'AVAILABLE' 
                            ? 'bg-success text-success-content border-success'
                            : room.status === 'OCCUPIED'
                            ? 'bg-warning text-warning-content border-warning'  
                            : room.status === 'DIRTY'
                            ? 'bg-info text-info-content border-info'
                            : 'bg-error text-error-content border-error'
                        }`}
                        title={`${room.roomNo} - ${room.roomType.name} - ${statusMap[room.status].label}`}
                      >
                        <div className="text-center">
                          <div className="font-bold text-lg">{room.roomNo}</div>
                          <div className="text-xs opacity-90">{room.roomType.name}</div>
                          
                          {room.currentBooking && (
                            <div className="text-xs mt-1 opacity-80">
                              {room.currentBooking.customer.name}
                            </div>
                          )}
                          
                          {room.status === 'DIRTY' && (
                            <button
                              className="btn btn-xs mt-1 bg-base-100 text-base-content border-base-300 hover:bg-base-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateRoomStatus(room.id, 'AVAILABLE');
                              }}
                            >
                              清洁完成
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>

          {rooms.length === 0 && (
            <div className="text-center py-16 text-base-content/60">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-lg">暂无房间数据</p>
              <p className="text-sm">请联系管理员添加房间</p>
            </div>
          )}
        </div>
      </div>

      {/* 订单管理 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title text-xl">订单管理</h2>
            <div className="badge badge-primary">
              {filteredBookings.length} 条订单
            </div>
          </div>

          {/* 筛选条件 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 p-4 bg-base-200 rounded-lg">
            <div className="form-control">
              <label className="label label-text-sm">显示类型</label>
              <select
                className="select select-sm select-bordered"
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
              >
                <option value="active">未完成订单</option>
                <option value="all">全部订单</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label label-text-sm">订单状态</label>
              <select
                className="select select-sm select-bordered"
                value={filters.bookingStatus}
                onChange={(e) => setFilters({...filters, bookingStatus: e.target.value})}
              >
                <option value="">全部状态</option>
                <option value="PENDING">待确认</option>
                <option value="CONFIRMED">已确认</option>
                <option value="CHECKED_IN">已入住</option>
                <option value="CHECKED_OUT">已离店</option>
                <option value="CANCELLED">已取消</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label label-text-sm">客户姓名</label>
              <input
                type="text"
                className="input input-sm input-bordered"
                value={filters.customerName}
                onChange={(e) => setFilters({...filters, customerName: e.target.value})}
                placeholder="搜索客户姓名"
              />
            </div>

            <div className="form-control">
              <label className="label label-text-sm">入住日期</label>
              <input
                type="date"
                className="input input-sm input-bordered"
                value={filters.checkInDate}
                onChange={(e) => setFilters({...filters, checkInDate: e.target.value})}
              />
            </div>

            <div className="form-control">
              <label className="label label-text-sm">离店日期</label>
              <input
                type="date"
                className="input input-sm input-bordered"
                value={filters.checkOutDate}
                onChange={(e) => setFilters({...filters, checkOutDate: e.target.value})}
              />
            </div>
          </div>

          {/* 订单表格 */}
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>订单号</th>
                  <th>客户</th>
                  <th>房型</th>
                  <th>房间</th>
                  <th>入住-离店</th>
                  <th>金额</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map(booking => (
                  <tr key={booking.id}>
                    <td className="font-mono text-sm">{booking.id.slice(-8)}</td>
                    <td>
                      <div>
                        <div className="font-medium">{booking.customer?.name || '未知'}</div>
                        <div className="text-sm text-base-content/60">{booking.customer?.phone}</div>
                      </div>
                    </td>
                    <td>{booking.roomType.name}</td>
                    <td>
                      {booking.assignedRoom ? (
                        <span className="badge badge-success">{booking.assignedRoom.roomNo}</span>
                      ) : (
                        <span className="text-base-content/60">未分配</span>
                      )}
                    </td>
                    <td>
                      <div className="text-sm">
                        {new Date(booking.checkIn).toLocaleDateString()}
                        <br />
                        {new Date(booking.checkOut).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="font-semibold">¥{booking.totalPrice}</td>
                    <td>
                      <div className={`badge ${bookingStatusMap[booking.status].color}`}>
                        {bookingStatusMap[booking.status].label}
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        {booking.status === 'CONFIRMED' && !booking.assignedRoom && (
                          <button
                            className="btn btn-xs btn-primary"
                            onClick={() => setAssigningBooking(booking.id)}
                          >
                            分配房间
                          </button>
                        )}
                        
                        {booking.status === 'CONFIRMED' && booking.assignedRoom && (
                          <button
                            className="btn btn-xs btn-success"
                            onClick={() => updateBookingStatus(booking.id, 'CHECKED_IN')}
                          >
                            确认入住
                          </button>
                        )}
                        
                        {booking.status === 'CHECKED_IN' && (
                          <button
                            className="btn btn-xs btn-warning"
                            onClick={() => updateBookingStatus(booking.id, 'CHECKED_OUT')}
                          >
                            办理离店
                          </button>
                        )}
                        
                        {['PENDING', 'CONFIRMED'].includes(booking.status) && (
                          <button
                            className="btn btn-xs btn-error btn-outline"
                            onClick={() => updateBookingStatus(booking.id, 'CANCELLED')}
                          >
                            取消
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 分配房间模态框 */}
      {assigningBooking && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">分配房间</h3>
            
            <div className="form-control mb-4">
              <label className="label">选择房间</label>
              <select
                className="select select-bordered"
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
              >
                <option value="">请选择房间</option>
                {rooms
                  .filter(room => room.status === 'AVAILABLE')
                  .map(room => (
                    <option key={room.id} value={room.id}>
                      {room.roomNo} - {room.roomType.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setAssigningBooking(null)}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                disabled={!selectedRoom}
                onClick={() => assignRoom(assigningBooking, selectedRoom)}
              >
                确认分配
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}