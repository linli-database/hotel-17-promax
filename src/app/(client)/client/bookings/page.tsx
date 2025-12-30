'use client';

import { useEffect, useState, useTransition } from 'react';
import { BookingStatus } from '@/generated/prisma/client';

type Booking = {
  id: string;
  status: BookingStatus;
  checkIn: string;
  checkOut: string;
  totalPrice: string;
  cancelReason?: string | null;
  store?: { name: string; id: string };
  roomType?: { name: string };
  bookingRooms: { room: { roomNo: string } }[];
  createdAt: string;
  isReviewed: boolean;
};

const statusMap: Record<BookingStatus, string> = {
  PENDING: '待入住',
  CONFIRMED: '已确认',
  CHECKED_IN: '已入住',
  CHECKED_OUT: '已离店',
  CANCELLED: '已取消',
};

function StatusBadge({ status }: { status: BookingStatus }) {
  let badgeClass = 'badge';
  
  switch (status) {
    case 'PENDING':
      badgeClass += ' badge-warning';
      break;
    case 'CONFIRMED':
      badgeClass += ' badge-info';
      break;
    case 'CHECKED_IN':
      badgeClass += ' badge-success';
      break;
    case 'CHECKED_OUT':
      badgeClass += ' badge-neutral';
      break;
    case 'CANCELLED':
      badgeClass += ' badge-error';
      break;
    default:
      badgeClass += ' badge-ghost';
  }
  
  return <span className={badgeClass}>{statusMap[status]}</span>;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [cancelReason, setCancelReason] = useState('');
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // 评价相关state
  const [reviewingBooking, setReviewingBooking] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/client/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings ?? []);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? '加载失败');
      }
    } catch (err) {
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = (id: string) => {
    setCancelingId(id);
    setCancelReason('');
  };

  const confirmCancel = async () => {
    if (!cancelingId) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/client/bookings/${cancelingId}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: cancelReason || '用户取消' }),
        });

        if (res.ok) {
          alert('订单已取消');
          loadBookings();
        } else {
          const data = await res.json();
          alert(data.error || '取消失败');
        }
      } catch (err) {
        alert('取消失败');
      } finally {
        setCancelingId(null);
        setCancelReason('');
      }
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    const nights = Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
    );
    return nights;
  };

  // 根据状态筛选订单
  const filteredBookings = statusFilter
    ? bookings.filter((booking) => booking.status === statusFilter)
    : bookings;

  // 提交评价
  const handleSubmitReview = async () => {
    if (!reviewingBooking) return;
    
    setSubmittingReview(true);
    try {
      const res = await fetch('/api/client/bookings/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: reviewingBooking.id,
          storeId: reviewingBooking.store?.id,
          rating,
          comment: comment.trim() || null,
        }),
      });

      if (res.ok) {
        alert('评价成功！感谢您的反馈');
        setReviewingBooking(null);
        setRating(5);
        setComment('');
        loadBookings(); // 重新加载订单列表
      } else {
        const data = await res.json();
        alert(data.error || '评价失败');
      }
    } catch (err) {
      alert('评价失败');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-2">我的订单</h1>
          <div className="flex items-center justify-between">
            <p className="text-base-content/70">查看与管理您的预约</p>
            <select
              className="select select-bordered select-sm w-40"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">全部状态</option>
                  {Object.entries(statusMap).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
      </div>    
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : null}

      {error && !loading ? (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      ) : null}

      {!loading && bookings.length === 0 ? (
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body text-center py-12">
            <svg className="w-16 h-16 mx-auto text-base-content/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg text-base-content/70">暂无订单</p>
            <p className="text-sm text-base-content/50">开始预订您的第一间客房吧！</p>
          </div>
        </div>
      ) : null}

      {!loading && bookings.length > 0 && filteredBookings.length === 0 ? (
        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>没有符合筛选条件的订单</span>
        </div>
      ) : null}

      {!loading && filteredBookings.length > 0 ? (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <div key={booking.id} className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
              <div className="card-body">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="card-title">{booking.store?.name}</h3>
                      <StatusBadge status={booking.status} />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        </svg>
                        <span>房型：{booking.roomType?.name || '未指定'}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>
                          {formatDate(booking.checkIn)} 至 {formatDate(booking.checkOut)}
                          （{calculateNights(booking.checkIn, booking.checkOut)} 晚）
                        </span>
                      </div>

                      {booking.bookingRooms.length > 0 && (
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>
                            房间号：{booking.bookingRooms.map((br) => br.room.roomNo).join(', ')}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-semibold">总价：¥{booking.totalPrice}</span>
                      </div>
                    </div>

                    {booking.cancelReason && (
                      <div className="alert alert-error alert-sm">
                        <span>取消原因：{booking.cancelReason}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {booking.status === 'PENDING' && (
                      <button
                        className="btn btn-error btn-sm"
                        onClick={() => handleCancelBooking(booking.id)}
                        disabled={pending}
                      >
                        取消订单
                      </button>
                    )}
                    {booking.status === 'CHECKED_OUT' && !booking.isReviewed && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setReviewingBooking(booking)}
                      >
                        去评价
                      </button>
                    )}
                    {booking.status === 'CHECKED_OUT' && booking.isReviewed && (
                      <div className="badge badge-success">已评价</div>
                    )}
                    <div className="text-xs text-base-content/50 text-right">
                      创建时间：{formatDate(booking.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* 评价订单对话框 */}
      {reviewingBooking && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">评价您的住宿体验</h3>
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">评分</span>
                </label>
                <div className="flex gap-2 items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="text-3xl hover:scale-110 transition-transform"
                    >
                      {star <= rating ? (
                        <span className="text-yellow-400">★</span>
                      ) : (
                        <span className="text-gray-300">☆</span>
                      )}
                    </button>
                  ))}
                  <span className="ml-2 text-lg font-semibold">{rating} 分</span>
                </div>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">评价内容（可选）</span>
                </label>
                <textarea
                  className="textarea textarea-bordered h-32"
                  placeholder="分享您的入住体验..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={500}
                ></textarea>
                <label className="label">
                  <span className="label-text-alt">{comment.length}/500</span>
                </label>
              </div>
            </div>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setReviewingBooking(null);
                  setRating(5);
                  setComment('');
                }}
                disabled={submittingReview}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitReview}
                disabled={submittingReview}
              >
                {submittingReview ? <span className="loading loading-spinner"></span> : '提交评价'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 取消订单对话框 */}
      {cancelingId && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">取消订单</h3>
            <div className="form-control">
              <label className="label">
                <span className="label-text">取消原因（可选）</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24"
                placeholder="请输入取消原因..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              ></textarea>
            </div>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setCancelingId(null)}
                disabled={pending}
              >
                返回
              </button>
              <button
                className="btn btn-error"
                onClick={confirmCancel}
                disabled={pending}
              >
                {pending ? <span className="loading loading-spinner"></span> : '确认取消'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
