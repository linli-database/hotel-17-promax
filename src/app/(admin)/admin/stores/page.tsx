'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Store {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
  _count: {
    rooms: number;
    assignedStaff: number;
    bookings: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface StoreForm {
  name: string;
  address: string;
}

const emptyForm: StoreForm = {
  name: '',
  address: '',
};

export default function StoresManagementPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StoreForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/admin/stores');
      if (res.ok) {
        const data = await res.json();
        setStores(data.stores);
      }
    } catch (error) {
      console.error('获取门店列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (store: Store) => {
    setEditingId(store.id);
    setForm({
      name: store.name,
      address: store.address || '',
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
        ? `/api/admin/stores/${editingId}`
        : '/api/admin/stores';

      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        await fetchStores();
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

  const handleToggleActive = async (store: Store) => {
    try {
      const res = await fetch(`/api/admin/stores/${store.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !store.isActive }),
      });

      if (res.ok) {
        await fetchStores();
      } else {
        const error = await res.json();
        alert(error.error || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败');
    }
  };

  const handleDelete = async (store: Store) => {
    const hasData = store._count.rooms > 0 || store._count.assignedStaff > 0 || store._count.bookings > 0;
    
    if (hasData) {
      alert('该门店有关联数据，无法删除');
      return;
    }

    if (!confirm(`确定要删除门店"${store.name}"吗？此操作不可恢复。`)) return;

    try {
      const res = await fetch(`/api/admin/stores/${store.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setStores(stores.filter(s => s.id !== store.id));
      } else {
        const error = await res.json();
        alert(error.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  const activeStores = stores.filter(s => s.isActive);
  const inactiveStores = stores.filter(s => !s.isActive);
  const totalRooms = stores.reduce((sum, s) => sum + s._count.rooms, 0);
  const totalStaff = stores.reduce((sum, s) => sum + s._count.assignedStaff, 0);

  return (
    <div className="space-y-6">
      {/* 页面标题卡片 */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <span className="bg-emerald-500/20 p-2 rounded-lg">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </span>
              门店管理
            </h1>
            <p className="text-base-content/60 mt-1">管理集团旗下所有酒店门店</p>
          </div>
          <button className="btn btn-primary gap-2 shadow-lg" onClick={openCreateModal}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            新建门店
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat bg-base-100 rounded-xl shadow">
          <div className="stat-figure text-emerald-500">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="stat-title">门店总数</div>
          <div className="stat-value text-emerald-600">{stores.length}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow">
          <div className="stat-figure text-success">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-title">营业中</div>
          <div className="stat-value text-success">{activeStores.length}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow">
          <div className="stat-figure text-primary">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <div className="stat-title">房间总数</div>
          <div className="stat-value text-primary">{totalRooms}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow">
          <div className="stat-figure text-secondary">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="stat-title">员工总数</div>
          <div className="stat-value text-secondary">{totalStaff}</div>
        </div>
      </div>

      {/* 门店列表 */}
      {stores.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body items-center text-center py-16">
            <div className="text-6xl mb-4">🏨</div>
            <h3 className="text-xl font-semibold">暂无门店</h3>
            <p className="text-base-content/60">点击上方&ldquo;新建门店&rdquo;按钮创建第一个门店</p>
          </div>
        </div>
      ) : (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr className="bg-base-200">
                    <th>门店名称</th>
                    <th>地址</th>
                    <th className="text-center">房间数</th>
                    <th className="text-center">员工数</th>
                    <th className="text-center">预订数</th>
                    <th className="text-center">状态</th>
                    <th className="text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map((store) => (
                    <tr key={store.id} className="hover">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={`avatar placeholder ${store.isActive ? 'online' : 'offline'}`}>
                            <div className="bg-emerald-500/20 text-emerald-600 rounded-lg w-10 h-10">
                              <span className="text-lg">{store.name.charAt(0)}</span>
                            </div>
                          </div>
                          <div className="font-medium">{store.name}</div>
                        </div>
                      </td>
                      <td>
                        <span className="text-base-content/70">
                          {store.address || '—'}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="badge badge-primary badge-outline">{store._count.rooms}</span>
                      </td>
                      <td className="text-center">
                        <span className="badge badge-secondary badge-outline">{store._count.assignedStaff}</span>
                      </td>
                      <td className="text-center">
                        <span className="badge badge-accent badge-outline">{store._count.bookings}</span>
                      </td>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          className="toggle toggle-success toggle-sm"
                          checked={store.isActive}
                          onChange={() => handleToggleActive(store)}
                          title={store.isActive ? '点击停用' : '点击启用'}
                        />
                      </td>
                      <td>
                        <div className="flex justify-center gap-1">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => router.push(`/admin/stores/${store.id}/rooms`)}
                            title="管理房间"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            房间
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => openEditModal(store)}
                            title="编辑"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            className="btn btn-ghost btn-sm text-error"
                            onClick={() => handleDelete(store)}
                            disabled={store._count.rooms > 0 || store._count.assignedStaff > 0 || store._count.bookings > 0}
                            title={store._count.rooms > 0 || store._count.assignedStaff > 0 ? '有关联数据，无法删除' : '删除'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 停用门店提示 */}
      {inactiveStores.length > 0 && (
        <div className="alert alert-warning shadow-lg">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>有 {inactiveStores.length} 个门店已停用：{inactiveStores.map(s => s.name).join('、')}</span>
        </div>
      )}

      {/* 创建/编辑模态框 */}
      {showModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={closeModal}
            >✕</button>

            <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
              <span className="bg-emerald-500/20 p-2 rounded-lg">
                {editingId ? (
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                )}
              </span>
              {editingId ? '编辑门店' : '新建门店'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 门店名称 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">门店名称 <span className="text-error">*</span></span>
                </label>
                <input
                  type="text"
                  className="input input-bordered focus:input-primary"
                  placeholder="如：北京王府井店、上海陆家嘴店"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              {/* 门店地址 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">门店地址</span>
                </label>
                <textarea
                  className="textarea textarea-bordered focus:textarea-primary h-24"
                  placeholder="门店详细地址..."
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
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
                  {editingId ? '保存修改' : '创建门店'}
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
