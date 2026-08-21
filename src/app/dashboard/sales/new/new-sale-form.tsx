"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Branch, Medicine } from "@prisma/client";

type LineItem = { medicineId: string; quantity: number };

export function NewSaleForm({
  branches,
  medicines,
}: {
  branches: Branch[];
  medicines: Medicine[];
}) {
  const router = useRouter();
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [items, setItems] = useState<LineItem[]>([
    { medicineId: medicines[0]?.id ?? "", quantity: 1 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const updateItem = (index: number, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const addItem = () =>
    setItems((prev) => [...prev, { medicineId: medicines[0]?.id ?? "", quantity: 1 }]);

  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId, items }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create sale");
      return;
    }

    router.push("/dashboard/medicines");
    router.refresh();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl space-y-5 rounded-xl border border-slate-200 bg-white p-6"
    >
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Branch</label>
        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-700">Items</label>
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <select
              value={item.medicineId}
              onChange={(e) => updateItem(index, { medicineId: e.target.value })}
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
              className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          + Add item
        </button>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? "Processing..." : "Complete Sale"}
      </button>
    </form>
  );
}