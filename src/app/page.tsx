import Link from 'next/link';

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-12 text-slate-900">
      <div className="text-center space-y-4">
        <p className="text-sm uppercase tracking-wide text-slate-500">Hotel 预约与管理</p>
        <h1 className="text-3xl font-semibold">请选择入口</h1>
        <p className="text-sm text-slate-600">
          客户端用于搜索与预约；管理端用于房态、订单与房务处理。
        </p>
      </div>
      <div className="mt-10 grid w-full gap-4 md:grid-cols-2">
        <Link
          href="/client"
          className="group rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-lg font-semibold">客户端</p>
              <p className="text-sm text-slate-600">浏览房源、选择日期、提交预约、查看订单</p>
            </div>
            <span className="text-xl transition group-hover:translate-x-1">→</span>
          </div>
        </Link>
        <Link
          href="/admin"
          className="group rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-lg font-semibold">管理端</p>
              <p className="text-sm text-slate-600">房态管理、预约处理、房务任务与统计看板</p>
            </div>
            <span className="text-xl transition group-hover:translate-x-1">→</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
