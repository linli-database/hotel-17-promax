'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface RoomType {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  capacity: number;
  amenities: string[];
}

interface Room {
  id: string;
  roomNo: string;
  floor: number;
  capacity: number;
  basePrice: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'OUT_OF_SERVICE';
  isActive: boolean;
  roomType: RoomType;
  _count: {
    bookingRooms: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface Store {
  id: string;
  name: string;
}

interface RoomForm {
  roomNo: string;
  floor: string;
  roomTypeId: string;
  basePrice: string;
  capacity: string;
  status?: string; // 只在编辑模式下使用
}

const emptyForm: RoomForm = {
  roomNo: '',
  floor: '1',
  roomTypeId: '',
  basePrice: '',
  capacity: '',
};

const statusMap = {
  AVAILABLE: { label: '空闲', color: 'badge-success' },
  OCCUPIED: { label: '占用', color: 'badge-warning' },
  CLEANING: { label: '待清洁', color: 'badge-info' },
  OUT_OF_SERVICE: { label: '停用', color: 'badge-error' },
};

export default function RoomsManagementPage() {
  const router = useRouter();
  const params = useParams();
  const storeId = params.id as string;

  const [store, setStore] = useState<Store | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RoomForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchRooms = async () => {
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/rooms`);
      if (res.ok) {
        const data = await res.json();
        setStore(data.store);
        setRooms(data.rooms);
      } else {
        console.error('获取房间列表失败');
      }
    } catch (error) {
      console.error('获取房间列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomTypes = async () => {
    try {
      const res = await fetch('/api/admin/room-types');
      if (res.ok) {
        const data = await res.json();
        // API 返回的是 { roomTypes: [...] } 格式
        const roomTypesArray = data.roomTypes || data;
        if (Array.isArray(roomTypesArray)) {
          setRoomTypes(roomTypesArray);
        } else {
          console.error('房型数据格式错误:', data);
          setRoomTypes([]);
        }
      } else {
        console.error('获取房型列表失败:', res.status);
        setRoomTypes([]);
      }
    } catch (error) {
      console.error('获取房型列表失败:', error);
      setRoomTypes([]);
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchRoomTypes();
  }, [storeId]);

  const generateRoomNumber = (floor: number) => {
    const floorRooms = rooms.filter(room => room.floor === floor);
    const existingNumbers = floorRooms.map(room => parseInt(room.roomNo));
    let newNumber = floor * 100 + 1;
    
    while (existingNumbers.includes(newNumber)) {
      newNumber++;
    }
    
    return newNumber.toString();
  };

  const openCreateModal = () => {
    const suggestedFloor = parseInt(form.floor) || 1;
    const suggestedRoomNo = generateRoomNumber(suggestedFloor);
    
    setForm({
      ...emptyForm,
      floor: suggestedFloor.toString(),
      roomNo: suggestedRoomNo,
    });
    setEditingId(null);
    setShowModal(true);
  };

  const openEditModal = (room: Room) => {
    setForm({
      roomNo: room.roomNo,
      floor: room.floor.toString(),
      roomTypeId: room.roomType.id,
      basePrice: room.basePrice.toString(),
      capacity: room.capacity.toString(),
      status: room.status,
    });
    setEditingId(room.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleFloorChange = (floor: string) => {
    const floorNum = parseInt(floor) || 1;
    const suggestedRoomNo = generateRoomNumber(floorNum);
    
    setForm(prev => ({
      ...prev,
      floor,
      roomNo: suggestedRoomNo,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);

    try {
      const url = editingId
        ? `/api/admin/stores/${storeId}/rooms/${editingId}`
        : `/api/admin/stores/${storeId}/rooms`;

      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          floor: parseInt(form.floor),
          basePrice: form.basePrice ? parseFloat(form.basePrice) : undefined,
          capacity: form.capacity ? parseInt(form.capacity) : undefined,
        }),
      });

      if (res.ok) {
        await fetchRooms();
        closeModal();
      } else {
        const error = await res.json();
        alert(error.error || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (room: Room) => {
    if (room._count.bookingRooms > 0) {
      alert('该房间有活跃的预订，无法删除');
      return;
    }

    if (!confirm(`确认删除房间 ${room.roomNo} 吗？`)) return;

    try {
      const res = await fetch(`/api/admin/stores/${storeId}/rooms/${room.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchRooms();
      } else {
        const error = await res.json();
        alert(error.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

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
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="btn btn-ghost btn-circle"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-base-content">
            {store?.name} - 房间管理
          </h1>
          <p className="text-base-content/70 mt-2">
            管理门店的所有房间，共 {rooms.length} 间房间
          </p>
        </div>
        <button
          className="btn btn-primary btn-lg shadow-lg hover:shadow-xl transition-all"
          onClick={openCreateModal}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新增房间
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="stats shadow bg-base-100">
          <div className="stat">
            <div className="stat-figure text-primary">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="stat-title">总房间数</div>
            <div className="stat-value text-primary">{rooms.length}</div>
          </div>
        </div>

        <div className="stats shadow bg-base-100">
          <div className="stat">
            <div className="stat-figure text-success">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-title">空闲房间</div>
            <div className="stat-value text-success">
              {rooms.filter(room => room.status === 'AVAILABLE').length}
            </div>
          </div>
        </div>

        <div className="stats shadow bg-base-100">
          <div className="stat">
            <div className="stat-figure text-warning">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="stat-title">占用房间</div>
            <div className="stat-value text-warning">
              {rooms.filter(room => room.status === 'OCCUPIED').length}
            </div>
          </div>
        </div>

        <div className="stats shadow bg-base-100">
          <div className="stat">
            <div className="stat-figure text-info">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="stat-title">待清洁</div>
            <div className="stat-value text-info">
              {rooms.filter(room => room.status === 'CLEANING').length}
            </div>
          </div>
        </div>

        <div className="stats shadow bg-base-100">
          <div className="stat">
            <div className="stat-figure text-accent">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-5-5-5 5" />
              </svg>
            </div>
            <div className="stat-title">楼层数</div>
            <div className="stat-value text-accent">{floors.length}</div>
          </div>
        </div>
      </div>

      {/* Rooms by Floor */}
      {rooms.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-4 opacity-20">
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-base-content/70 mb-2">暂无房间</h3>
          <p className="text-base-content/50 mb-6">点击&ldquo;新增房间&rdquo;按钮开始添加第一个房间</p>
        </div>
      ) : (
        <div className="space-y-8">
          {floors.map(floor => (
            <div key={floor} className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-2xl mb-6">
                  <span className="badge badge-primary badge-lg">{floor}F</span>
                  第{floor}层 ({groupedRooms[floor].length} 间房间)
                </h2>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {groupedRooms[floor]
                    .sort((a, b) => a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true }))
                    .map(room => (
                      <div
                        key={room.id}
                        className="card bg-base-200 border border-base-300 hover:shadow-md transition-shadow"
                      >
                        <div className="card-body p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xl font-bold text-primary">
                              {room.roomNo}
                            </h3>
                            <div className={`badge ${statusMap[room.status].color}`}>
                              {statusMap[room.status].label}
                            </div>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-base-content/60">房型：</span>
                              <span className="font-medium">{room.roomType.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-base-content/60">价格：</span>
                              <span className="font-medium text-success">¥{room.basePrice}/晚</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-base-content/60">人数：</span>
                              <span className="font-medium">{room.capacity}人</span>
                            </div>
                          </div>

                          <div className="card-actions justify-end mt-4">
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => openEditModal(room)}
                              title="编辑"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              className="btn btn-error btn-outline btn-sm"
                              onClick={() => handleDelete(room)}
                              disabled={room._count.bookingRooms > 0}
                              title={room._count.bookingRooms > 0 ? '有活跃预订，无法删除' : '删除'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Room Modal */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-2xl mb-6 text-primary">
              {editingId ? '编辑房间' : '新增房间'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {/* Floor */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">楼层</span>
                    <span className="label-text-alt text-error">*</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={form.floor}
                    onChange={(e) => handleFloorChange(e.target.value)}
                    min="1"
                    max="50"
                    required
                  />
                </div>

                {/* Room Number */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">房间号</span>
                    <span className="label-text-alt text-error">*</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={form.roomNo}
                    onChange={(e) => setForm({ ...form, roomNo: e.target.value })}
                    placeholder="例如：101"
                    required
                  />
                </div>
              </div>

              {/* Room Type */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">房型</span>
                  <span className="label-text-alt text-error">*</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={form.roomTypeId}
                  onChange={(e) => setForm({ ...form, roomTypeId: e.target.value })}
                  required
                >
                  <option value="">请选择房型</option>
                  {Array.isArray(roomTypes) && roomTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name} (¥{type.basePrice}/晚, {type.capacity}人)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Base Price */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">价格</span>
                  </label>
                  <div className="input-group">
                    <span className="bg-base-200">¥</span>
                    <input
                      type="number"
                      className="input input-bordered w-full"
                      value={form.basePrice}
                      onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                      placeholder="留空使用房型默认价格"
                      step="0.01"
                      min="0"
                    />
                    <span className="bg-base-200">/晚</span>
                  </div>
                </div>

                {/* Capacity */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">入住人数</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    placeholder="留空使用房型默认人数"
                    min="1"
                    max="10"
                  />
                </div>
              </div>

              {/* 只在编辑模式显示房间状态设置 */}
              {editingId && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">房间状态</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={form.status || 'AVAILABLE'}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="AVAILABLE">空闲</option>
                    <option value="OCCUPIED">占用</option>
                    <option value="CLEANING">待清洁</option>
                    <option value="OUT_OF_SERVICE">停用</option>
                  </select>
                  <label className="label">
                    <span className="label-text-alt text-warning">
                      注意：占用和待清洁状态通常由系统自动管理
                    </span>
                  </label>
                </div>
              )}
            </form>

            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={closeModal}
                disabled={submitting}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    {editingId ? '更新中...' : '创建中...'}
                  </>
                ) : (
                  editingId ? '更新房间' : '创建房间'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}