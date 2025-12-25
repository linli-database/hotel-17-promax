'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Store = { id: number; name: string };

type Room = {
  id: number;
  roomNo: string;
  capacity: number;
  basePrice: string;
  floor?: { name: string | null };
};

export default function BookPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState<number | ''>('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStores = async () => {
      const res = await fetch('/api/stores');
      if (!res.ok) return;
      const data = await res.json();
      setStores(data.stores ?? []);
      if (data.stores?.length) setStoreId(data.stores[0].id);
    };
    loadStores();
  }, []);

  const search = async () => {
    setError(null);
    setMessage(null);
    if (!storeId || !checkIn || !checkOut) {
      setError('请选择门店和日期');
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({
      storeId: String(storeId),
      checkIn,
      checkOut,
    });
    const res = await fetch(`/api/rooms/availability?${params.toString()}`);
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setRooms(data.rooms ?? []);
      setSelected([]);
      if ((data.rooms ?? []).length === 0) setMessage('暂无可用房间，请更换日期或门店');
      return;
    }
    const data = await res.json().catch(() => null);
    setError(data?.error ?? '查询失败');
  };

  const toggleRoom = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };

  const submit = async () => {
    setError(null);
    setMessage(null);
    if (selected.length === 0) {
      setError('请至少选择一个房间');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId,
        checkIn,
        checkOut,
        roomIds: selected,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setMessage('预约成功，跳转中...');
      router.replace('/client/bookings');
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => null);
    setError(data?.error ?? '预约失败');
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">预约房间</h1>
        <p className="text-sm text-slate-600">选择门店与日期，查询可用房间并提交预约。</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <label className="space-y-2 text-sm">
          <span className="font-medium">门店</span>
          <select
            className="w-full rounded border px-3 py-2 text-sm"
            value={storeId}
            onChange={(e) => setStoreId(Number(e.target.value))}
          >
            {stores.map((s) => (
              <option value={s.id} key={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">入住日期</span>
          <input
            type="date"
            className="w-full rounded border px-3 py-2 text-sm"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">退房日期</span>
          <input
            type="date"
            className="w-full rounded border px-3 py-2 text-sm"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </label>
        <div className="flex items-end">
          <button
            onClick={search}
            className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={loading}
          >
            查询可用房间
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {rooms.map((room) => {
          const selectedRoom = selected.includes(room.id);
          return (
            <button
              key={room.id}
              onClick={() => toggleRoom(room.id)}
              className={`w-full rounded-lg border px-4 py-3 text-left shadow-sm transition ${
                selectedRoom ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-lg font-semibold">房号 {room.roomNo}</p>
                  <p className="text-sm text-slate-600">
                    容量 {room.capacity} · 楼层 {room.floor?.name ?? '--'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-blue-700">¥{room.basePrice}</p>
                  <p className="text-xs text-slate-500">/晚</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {rooms.length > 0 ? (
        <div className="flex items-center justify-between rounded-lg border bg-white px-4 py-3 shadow-sm">
          <p className="text-sm text-slate-700">已选 {selected.length} 间</p>
          <button
            onClick={submit}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={loading || selected.length === 0}
          >
            提交预约
          </button>
        </div>
      ) : null}
    </div>
  );
}
