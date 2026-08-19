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
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Inventory</h1>
        <p className="text-sm text-slate-500">Medicines, batches, and stock</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Medicine</th>
              <th className="px-4 py-3">Batch</th>
              <th className="px-4 py-3">Expiry</th>
              <th className="px-4 py-3">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {medicines.map((medicine) =>
              medicine.batches.map((batch) => (
                <tr key={batch.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{medicine.name}</p>
                    <p className="text-xs text-slate-400">{medicine.manufacturer}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{batch.batchNumber}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {batch.expiryDate.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {batch.branchStock.map((stock) => (
                      <span
                        key={stock.id}
                        className="mr-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600"
                      >
                        {stock.branch.name}: {stock.quantity}
                      </span>
                    ))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}