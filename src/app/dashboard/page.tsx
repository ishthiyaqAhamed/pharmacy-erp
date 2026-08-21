import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

export default async function DashboardPage() {
  const session = await auth();

  const [lowStock, nearExpiry, todaySales] = await Promise.all([
    prisma.branchStock.findMany({
      where: { quantity: { lte: 10 } },
      include: { batch: { include: { medicine: true } }, branch: true },
      orderBy: { quantity: "asc" },
    }),
    prisma.batch.findMany({
      where: {
        expiryDate: { lte: daysFromNow(30), gte: new Date() },
      },
      include: { medicine: true },
      orderBy: { expiryDate: "asc" },
    }),
    prisma.sale.aggregate({
      where: {
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome, {session?.user.name}
        </h1>
        <p className="text-sm text-slate-500">You're logged in as {session?.user.role}.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Today&apos;s Sales</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            Rs. {todaySales._sum.totalAmount?.toString() ?? "0"}
          </p>
          <p className="text-xs text-slate-400">{todaySales._count} transactions</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Low Stock Items</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">{lowStock.length}</p>
          <p className="text-xs text-slate-400">quantity ≤ 10</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Expiring Within 30 Days</p>
          <p className="mt-1 text-2xl font-semibold text-red-600">{nearExpiry.length}</p>
          <p className="text-xs text-slate-400">batches</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Low Stock</h2>
          <ul className="divide-y divide-slate-100">
            {lowStock.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{item.batch.medicine.name}</p>
                  <p className="text-xs text-slate-400">{item.branch.name}</p>
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

        <div className="rounded-xl border border-slate-200 bg-white p-5">
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