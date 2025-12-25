'use client';

import { useEffect, useState } from 'react';

interface RoomType {
  id: string;
  name: string;
  description: string | null;
  basePrice: string;
  capacity: number;
  amenities: string[];
  isActive: boolean;
  _count: {
    rooms: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface RoomTypeForm {
  name: string;
  description: string;
  basePrice: string;
  capacity: number;
  amenities: string[];
}

const defaultAmenities = [
  { name: '空调', icon: '❄️' },
  { name: 'WiFi', icon: '📶' },
  { name: '电视', icon: '📺' },
  { name: '独立卫浴', icon: '🚿' },
  { name: '迷你吧', icon: '🍷' },
  { name: '保险箱', icon: '🔐' },
  { name: '熨斗', icon: '👔' },
  { name: '咖啡机', icon: '☕' },
  { name: '浴缸', icon: '🛁' },
  { name: '阳台', icon: '🌅' },
  { name: '海景', icon: '🌊' },
  { name: '城市景观', icon: '🏙️' },
];

const emptyForm: RoomTypeForm = {
  name: '',
  description: '',
  basePrice: '',
  capacity: 2,
  amenities: [],
};

export default function RoomTypesManagementPage() {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RoomTypeForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchRoomTypes = async () => {
    try {
      const res = await fetch('/api/admin/room-types');
      if (res.ok) {
        const data = await res.json();
        setRoomTypes(data.roomTypes);
      }
    } catch (error) {
      console.error('获取房型列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomTypes();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (roomType: RoomType) => {
    setEditingId(roomType.id);
    setForm({
      name: roomType.name,
      description: roomType.description || '',
      basePrice: roomType.basePrice,
      capacity: roomType.capacity,
      amenities: roomType.amenities,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingId 
        ? `/api/admin/room-types/${editingId}` 
        : '/api/admin/room-types';
      
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          basePrice: parseFloat(form.basePrice),
        }),
      });

      if (res.ok) {
        await fetchRoomTypes();
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

  const handleDelete = async (roomType: RoomType) => {
    if (roomType._count.rooms > 0) {
      alert(`该房型下有 ${roomType._count.rooms} 个房间，无法删除`);
      return;
    }
    
    if (!confirm(`确定要删除房型"${roomType.name}"吗？此操作不可恢复。`)) return;

    try {
      const res = await fetch(`/api/admin/room-types/${roomType.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setRoomTypes(roomTypes.filter(rt => rt.id !== roomType.id));
      } else {
        const error = await res.json();
        alert(error.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  const toggleAmenity = (amenity: string) => {
    const newAmenities = form.amenities.includes(amenity)
      ? form.amenities.filter(a => a !== amenity)
      : [...form.amenities, amenity];
    setForm({ ...form, amenities: newAmenities });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题卡片 */}
      <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <span className="bg-primary/20 p-2 rounded-lg">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </span>
              房型管理
            </h1>
            <p className="text-base-content/60 mt-1">管理集团统一的房型配置，各门店房间可选用这些房型</p>
          </div>
          <button className="btn btn-primary gap-2 shadow-lg" onClick={openCreateModal}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            新建房型
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat bg-base-100 rounded-xl shadow">
          <div className="stat-title">房型总数</div>
          <div className="stat-value text-primary">{roomTypes.length}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow">
          <div className="stat-title">关联房间</div>
          <div className="stat-value text-secondary">{roomTypes.reduce((sum, rt) => sum + rt._count.rooms, 0)}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow">
          <div className="stat-title">最低价格</div>
          <div className="stat-value text-accent text-2xl">
            ¥{roomTypes.length > 0 ? Math.min(...roomTypes.map(rt => parseFloat(rt.basePrice))).toFixed(0) : '0'}
          </div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow">
          <div className="stat-title">最高价格</div>
          <div className="stat-value text-warning text-2xl">
            ¥{roomTypes.length > 0 ? Math.max(...roomTypes.map(rt => parseFloat(rt.basePrice))).toFixed(0) : '0'}
          </div>
        </div>
      </div>

      {/* 房型列表 */}
      {roomTypes.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body items-center text-center py-16">
            <div className="text-6xl mb-4">🏨</div>
            <h3 className="text-xl font-semibold">暂无房型</h3>
            <p className="text-base-content/60">点击上方&ldquo;新建房型&rdquo;按钮创建第一个房型</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {roomTypes.map((roomType) => (
            <div key={roomType.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 group">
              <div className="card-body">
                {/* 头部 */}
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="card-title text-lg">{roomType.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="badge badge-outline badge-sm">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        最多 {roomType.capacity} 人
                      </div>
                      <div className="badge badge-ghost badge-sm">
                        {roomType._count.rooms} 个房间
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      ¥{parseFloat(roomType.basePrice).toFixed(0)}
                    </div>
                    <div className="text-xs text-base-content/50">/晚</div>
                  </div>
                </div>

                {/* 描述 */}
                <p className="text-sm text-base-content/70 line-clamp-2 min-h-[2.5rem]">
                  {roomType.description || '暂无描述'}
                </p>

                {/* 设施标签 */}
                {roomType.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {roomType.amenities.slice(0, 5).map((amenity, idx) => {
                      const found = defaultAmenities.find(a => a.name === amenity);
                      return (
                        <span key={idx} className="badge badge-sm bg-base-200 border-0">
                          {found?.icon} {amenity}
                        </span>
                      );
                    })}
                    {roomType.amenities.length > 5 && (
                      <span className="badge badge-sm badge-primary badge-outline">
                        +{roomType.amenities.length - 5}
                      </span>
                    )}
                  </div>
                )}

                {/* 分隔线 */}
                <div className="divider my-2"></div>

                {/* 操作按钮 */}
                <div className="flex justify-end gap-2">
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => openEditModal(roomType)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    编辑
                  </button>
                  <button
                    className="btn btn-sm btn-ghost text-error"
                    onClick={() => handleDelete(roomType)}
                    disabled={roomType._count.rooms > 0}
                    title={roomType._count.rooms > 0 ? '该房型下有房间，无法删除' : ''}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 创建/编辑模态框 */}
      {showModal && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <button 
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={closeModal}
            >✕</button>
            
            <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
              <span className="bg-primary/20 p-2 rounded-lg">
                {editingId ? (
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                )}
              </span>
              {editingId ? '编辑房型' : '新建房型'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 房型名称 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">房型名称 <span className="text-error">*</span></span>
                </label>
                <input
                  type="text"
                  className="input input-bordered focus:input-primary"
                  placeholder="如：标准双床房、豪华大床房、行政套房"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              {/* 价格和人数 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">建议价格 (元/晚) <span className="text-error">*</span></span>
                  </label>
                  <label className="input input-bordered flex items-center gap-2 focus-within:input-primary">
                    <span className="text-base-content/50">¥</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="grow"
                      placeholder="299.00"
                      value={form.basePrice}
                      onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                      required
                    />
                  </label>
                  <label className="label">
                    <span className="label-text-alt text-base-content/50">各房间可覆盖此价格</span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">最大入住人数</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered focus:input-primary"
                    min="1"
                    max="10"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 2 })}
                  />
                </div>
              </div>

              {/* 描述 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">房型描述</span>
                </label>
                <textarea
                  className="textarea textarea-bordered focus:textarea-primary h-24"
                  placeholder="描述房型特点、面积、床型等信息..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* 设施配置 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">标准设施配置</span>
                  <span className="label-text-alt text-base-content/50">已选 {form.amenities.length} 项</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-4 bg-base-200/50 rounded-xl">
                  {defaultAmenities.map((amenity) => (
                    <label 
                      key={amenity.name} 
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                        form.amenities.includes(amenity.name) 
                          ? 'bg-primary/20 text-primary' 
                          : 'hover:bg-base-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm checkbox-primary"
                        checked={form.amenities.includes(amenity.name)}
                        onChange={() => toggleAmenity(amenity.name)}
                      />
                      <span className="text-sm whitespace-nowrap">
                        {amenity.icon} {amenity.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="modal-action">
                <button type="button" className="btn" onClick={closeModal}>
                  取消
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting && <span className="loading loading-spinner loading-sm"></span>}
                  {editingId ? '保存修改' : '创建房型'}
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={closeModal}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}