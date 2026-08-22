import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function SalesPage() {
  const sales = await prisma.sale.findMany({
    include: {
      branch: true,
      items: { include: { batch: { include: { medicine: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Sales</h1>
          <p className="text-sm text-slate-500">Transaction history</p>
        </div>
        <Link
          href="/dashboard/sales/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          New Sale
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td className="px-4 py-3 text-slate-600">
                  {sale.createdAt.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-slate-600">{sale.branch.name}</td>
                <td className="px-4 py-3 text-slate-600">
                  {sale.items.map((i) => i.batch.medicine.name).join(", ")}
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  Rs. {sale.totalAmount.toString()}
                </td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-400" colSpan={4}>
                  No sales yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}