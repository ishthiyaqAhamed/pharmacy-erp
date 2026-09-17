import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SalesChart } from "./sales-chart";

function getStartOfDay(date: Date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfDay(date: Date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export default async function DashboardPage() {
  const session = await auth();

  const todayStart = getStartOfDay();
  const thirtyDaysLater = getEndOfDay();
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

  const sevenDaysAgoStart = getStartOfDay();
  sevenDaysAgoStart.setDate(sevenDaysAgoStart.getDate() - 6);

  const [lowStock, nearExpiry, todaySales, recentSales, topSellingRaw] = await Promise.all([
    prisma.branchStock.findMany({
      where: { quantity: { lte: 10 } },
      include: { batch: { include: { medicine: true } }, branch: true },
      orderBy: { quantity: "asc" },
    }),
    prisma.batch.findMany({
      where: {
        expiryDate: { lte: thirtyDaysLater, gte: new Date() },
      },
      include: { medicine: true },
      orderBy: { expiryDate: "asc" },
    }),
    prisma.sale.aggregate({
      where: {
        createdAt: { gte: todayStart },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.sale.findMany({
      where: {
        createdAt: { gte: sevenDaysAgoStart },
      },
      select: { totalAmount: true, createdAt: true },
    }),
    prisma.saleItem.groupBy({
      by: ["batchId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  const topBatchIds = topSellingRaw.map((t) => t.batchId);
  const topBatches = await prisma.batch.findMany({
    where: { id: { in: topBatchIds } },
    include: { medicine: true },
  });

  const topSelling = topSellingRaw.map((t) => {
    const batch = topBatches.find((b) => b.id === t.batchId);
    return {
      medicineName: batch?.medicine.name ?? "Unknown",
      quantitySold: t._sum.quantity ?? 0,
    };
  });

  const chartData: { day: string; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
    const dayTotal = recentSales
      .filter((s) => s.createdAt.toDateString() === d.toDateString())
      .reduce((sum, s) => sum + Number(s.totalAmount), 0);
    chartData.push({ day: dayLabel, total: Number(dayTotal.toFixed(2)) });
  }

  const todayTotal = Number(todaySales._sum.totalAmount ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome, {session?.user?.name ?? "User"}
        </h1>
        <p className="text-sm text-slate-500">
          You&apos;re logged in as {session?.user?.role ?? "Staff"}.
        </p>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Today&apos;s Sales</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            Rs. {todayTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-slate-400">{todaySales._count} transactions</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Low Stock Items</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">{lowStock.length}</p>
          <p className="mt-1 text-xs text-slate-400">quantity ≤ 10</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Expiring Within 30 Days</p>
          <p className="mt-1 text-2xl font-semibold text-red-600">{nearExpiry.length}</p>
          <p className="mt-1 text-xs text-slate-400">batches</p>
        </div>
      </div>

      {/* Analytics & Top Selling Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Last 7 Days Sales</h2>
          <SalesChart data={chartData} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Top Selling Medicines</h2>
          <ul className="divide-y divide-slate-100">
            {topSelling.map((item, index) => (
              <li key={index} className="flex items-center justify-between py-2 text-sm">
                <p className="font-medium text-slate-800">{item.medicineName}</p>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                  {item.quantitySold} sold
                </span>
              </li>
            ))}
            {topSelling.length === 0 && (
              <p className="py-2 text-sm text-slate-400">No sales recorded yet.</p>
            )}
          </ul>
        </div>
      </div>

      {/* Inventory Alerts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Low Stock</h2>
          <ul className="divide-y divide-slate-100">
            {lowStock.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{item.batch.medicine.name}</p>
                  <p className="text-xs text-slate-400">{item.branch.name} · Batch {item.batch.batchNumber}</p>
                </div>
                <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                  {item.quantity} left
                </span>
              </li>
            ))}
            {lowStock.length === 0 && (
              <p className="py-2 text-sm text-slate-400">Nothing running low.</p>
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Expiring Soon</h2>
          <ul className="divide-y divide-slate-100">
            {nearExpiry.map((batch) => (
              <li key={batch.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{batch.medicine.name}</p>
                  <p className="text-xs text-slate-400">Batch {batch.batchNumber}</p>
                </div>
                <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                  {batch.expiryDate.toLocaleDateString()}
                </span>
              </li>
            ))}
            {nearExpiry.length === 0 && (
              <p className="py-2 text-sm text-slate-400">Nothing expiring soon.</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}