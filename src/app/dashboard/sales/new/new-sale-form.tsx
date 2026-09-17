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

  const addItem = () => {
    if (medicines.length === 0) return;
    setItems((prev) => [...prev, { medicineId: medicines[0]?.id ?? "", quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!branchId) {
      setError("Please select a branch.");
      return;
    }

    if (items.length === 0) {
      setError("Please add at least one item.");
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.medicineId) {
        setError(`Please select a medicine for item #${i + 1}`);
        return;
      }
      if (!it.quantity || it.quantity < 1 || !Number.isInteger(it.quantity)) {
        setError(`Please enter a valid quantity (at least 1) for item #${i + 1}`);
        return;
      }
    }

    setLoading(true);

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId, items }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to create sale");
        setLoading(false);
        return;
      }

      // Redirect to sales history page upon successful sale creation
      router.push("/dashboard/sales");
      router.refresh();
    } catch {
      setError("An unexpected network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (branches.length === 0 || medicines.length === 0) {
    return (
      <div className="max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <p className="font-medium">Cannot process sale</p>
        <p className="mt-1 text-sm">
          {branches.length === 0
            ? "No branches exist. Please create a branch first."
            : "No medicines available in inventory. Please add medicines first."}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Branch</label>
        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">Items</label>
          <span className="text-xs text-slate-400">Deducted FIFO from earliest expiry</span>
        </div>
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <select
              value={item.medicineId}
              onChange={(e) => updateItem(index, { medicineId: e.target.value })}
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.manufacturer}) {m.requiresRx ? "[Rx]" : ""}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                step={1}
                required
                value={item.quantity || ""}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  updateItem(index, { quantity: isNaN(val) ? 1 : val });
                }}
                className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                placeholder="Qty"
              />
              <span className="text-xs text-slate-500">units</span>
            </div>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="rounded p-1 text-sm text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                title="Remove item"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
        >
          + Add another item
        </button>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-slate-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
      >
        {loading ? "Processing Sale..." : "Complete Sale"}
      </button>
    </form>
  );
}