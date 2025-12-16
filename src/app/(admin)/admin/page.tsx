export default function AdminDashboard() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">管理端仪表盘</h1>
      <p className="text-sm text-slate-700">在这里管理门店、房间、预约与房务任务。</p>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">今日入住</p>
          <p className="text-2xl font-semibold">--</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">今日离店</p>
          <p className="text-2xl font-semibold">--</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">待清扫房间</p>
          <p className="text-2xl font-semibold">--</p>
        </div>
      </div>
    </div>
  );
}
