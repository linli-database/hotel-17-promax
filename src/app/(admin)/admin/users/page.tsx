'use client';

import { useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'STAFF';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  store?: {
    name: string;
  } | null;
}

interface Store {
  id: string;
  name: string;
}

interface CreateUserForm {
  email: string;
  password: string;
  name: string;
  role: 'ADMIN' | 'STAFF';
  storeId?: string;
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    email: '',
    password: '',
    name: '',
    role: 'STAFF',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, storesRes] = await Promise.all([
          fetch('/api/admin/users'),
          fetch('/api/stores'),
        ]);

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData.users);
        }

        if (storesRes.ok) {
          const storesData = await storesRes.json();
          setStores(storesData.stores || []);
        }
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      if (res.ok) {
        const data = await res.json();
        setUsers([data.user, ...users]);
        setShowCreateModal(false);
        setCreateForm({ email: '', password: '', name: '', role: 'STAFF' });
      } else {
        const error = await res.json();
        alert(error.error || '创建用户失败');
      }
    } catch (error) {
      console.error('创建用户失败:', error);
      alert('创建用户失败');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: editingUser.email,
          name: editingUser.name,
          isActive: editingUser.isActive,
          storeId: editingUser.store?.name ? stores.find(s => s.name === editingUser.store?.name)?.id : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(users.map(u => u.id === editingUser.id ? data.user : u));
        setShowEditModal(false);
        setEditingUser(null);
      } else {
        const error = await res.json();
        alert(error.error || '更新用户失败');
      }
    } catch (error) {
      console.error('更新用户失败:', error);
      alert('更新用户失败');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('确定要删除这个用户吗？')) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
      } else {
        const error = await res.json();
        alert(error.error || '删除用户失败');
      }
    } catch (error) {
      console.error('删除用户失败:', error);
      alert('删除用户失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-6">
            <h1 className="card-title text-2xl">用户管理</h1>
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              新建用户
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>邮箱</th>
                  <th>姓名</th>
                  <th>角色</th>
                  <th>门店</th>
                  <th>状态</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.name || '未设置'}</td>
                    <td>
                      <div className={`badge ${
                        user.role === 'ADMIN' ? 'badge-primary' : 'badge-secondary'
                      }`}>
                        {user.role === 'ADMIN' ? '管理员' : '前台'}
                      </div>
                    </td>
                    <td>{user.role === 'ADMIN' ? '-' : (user.store?.name || '未分配')}</td>
                    <td>
                      <div className={`badge ${
                        user.isActive ? 'badge-success' : 'badge-error'
                      }`}>
                        {user.isActive ? '活跃' : '禁用'}
                      </div>
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-sm btn-outline btn-primary"
                          onClick={() => {
                            setEditingUser(user);
                            setShowEditModal(true);
                          }}
                        >
                          编辑
                        </button>
                        <button
                          className="btn btn-sm btn-outline btn-error"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-base-content/70">
                      暂无用户数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 创建用户模态框 */}
      {showCreateModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">创建新用户</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">邮箱 *</span>
                </label>
                <input
                  type="email"
                  className="input input-bordered"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">密码 *</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">姓名</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">角色 *</span>
                </label>
                <select
                  className="select select-bordered"
                  value={createForm.role}
                  onChange={(e) => setCreateForm({...createForm, role: e.target.value as 'ADMIN' | 'STAFF'})}
                >
                  <option value="ADMIN">管理员</option>
                  <option value="STAFF">前台</option>
                </select>
              </div>
              
              {createForm.role === 'STAFF' && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">分配门店</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={createForm.storeId || ''}
                    onChange={(e) => setCreateForm({...createForm, storeId: e.target.value || undefined})}
                  >
                    <option value="">请选择门店</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="modal-action">
                <button type="button" className="btn" onClick={() => setShowCreateModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 编辑用户模态框 */}
      {showEditModal && editingUser && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">编辑用户</h3>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">邮箱</span>
                </label>
                <input
                  type="email"
                  className="input input-bordered"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">姓名</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">状态</span>
                </label>
                <label className="cursor-pointer label">
                  <span className="label-text">激活用户</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={editingUser.isActive}
                    onChange={(e) => setEditingUser({...editingUser, isActive: e.target.checked})}
                  />
                </label>
              </div>
              
              <div className="modal-action">
                <button type="button" className="btn" onClick={() => setShowEditModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}