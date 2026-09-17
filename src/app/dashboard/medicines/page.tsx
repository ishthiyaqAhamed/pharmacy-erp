import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function MedicinesPage() {
  const medicines = await prisma.medicine.findMany({
    include: {
      batches: {
        include: {
          branchStock: {
            include: { branch: true },
          },
        },
        orderBy: { expiryDate: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500">Medicines, batches, and stock</p>
        </div>
        <Link
          href="/dashboard/medicines/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
        >
          Add Medicine
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Medicine</th>
              <th className="px-4 py-3">Batch</th>
              <th className="px-4 py-3">Price (Sell / Cost)</th>
              <th className="px-4 py-3">Expiry</th>
              <th className="px-4 py-3">Stock by Branch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {medicines.map((medicine) => {
              if (medicine.batches.length === 0) {
                return (
                  <tr key={medicine.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-800">{medicine.name}</p>
                        {medicine.requiresRx && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                            Rx
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {medicine.manufacturer} · {medicine.unit}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-400 italic" colSpan={4}>
                      No batches added yet
                    </td>
                  </tr>
                );
              }

              return medicine.batches.map((batch) => (
                <tr key={batch.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800">{medicine.name}</p>
                      {medicine.requiresRx && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                          Rx
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {medicine.manufacturer} · {medicine.unit}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {batch.batchNumber}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    Rs. {Number(batch.sellingPrice).toFixed(2)}
                    <span className="text-xs text-slate-400 block">
                      Cost: Rs. {Number(batch.costPrice).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(batch.expiryDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {batch.branchStock.length > 0 ? (
                        batch.branchStock.map((stock) => (
                          <span
                            key={stock.id}
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              stock.quantity <= 10
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {stock.branch.name}: {stock.quantity}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">0 in stock</span>
                      )}
                    </div>
                  </td>
                </tr>
              ));
            })}
            {medicines.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-slate-400" colSpan={5}>
                  No medicines found in inventory. Click &quot;Add Medicine&quot; to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}