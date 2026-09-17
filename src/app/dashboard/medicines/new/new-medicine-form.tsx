"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Branch } from "@prisma/client";

export function NewMedicineForm({ branches }: { branches: Branch[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    manufacturer: "",
    unit: "tablet",
    requiresRx: false,
    batchNumber: "",
    expiryDate: "",
    costPrice: "",
    sellingPrice: "",
    branchId: branches[0]?.id ?? "",
    quantity: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.branchId) {
      setError("Please select a branch. If no branch exists, create one first.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/medicines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to add medicine");
        setLoading(false);
        return;
      }

      router.push("/dashboard/medicines");
      router.refresh();
    } catch {
      setError("An unexpected network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (branches.length === 0) {
    return (
      <div className="max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <p className="font-medium">No branches available</p>
        <p className="mt-1 text-sm">
          You must create at least one branch before adding medicines to inventory.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Medicine Name</label>
        <input
          name="name"
          required
          value={form.name}
          onChange={handleChange}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          placeholder="e.g. Paracetamol 500mg"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Manufacturer</label>
        <input
          name="manufacturer"
          required
          value={form.manufacturer}
          onChange={handleChange}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          placeholder="e.g. State Pharma"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Unit</label>
          <input
            name="unit"
            required
            value={form.unit}
            onChange={handleChange}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="tablet, capsule, bottle..."
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              name="requiresRx"
              checked={form.requiresRx}
              onChange={handleChange}
              className="rounded text-slate-900 focus:ring-slate-500"
            />
            Requires prescription
          </label>
        </div>
      </div>

      <hr className="border-slate-200" />
      <p className="text-sm font-medium text-slate-700">First Batch Details</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Batch Number</label>
          <input
            name="batchNumber"
            required
            value={form.batchNumber}
            onChange={handleChange}
            list="batch-format-suggestions"
            placeholder="e.g. B-2026-001"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
          <datalist id="batch-format-suggestions">
            <option value={`B-${new Date().getFullYear()}-001`} />
            <option value={`B-${new Date().getFullYear()}-002`} />
            <option value="LOT-001" />
            <option value="BATCH-A" />
          </datalist>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Expiry Date</label>
          <input
            type="date"
            name="expiryDate"
            required
            value={form.expiryDate}
            onChange={handleChange}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Cost Price (Rs.)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="costPrice"
            required
            value={form.costPrice}
            onChange={handleChange}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Selling Price (Rs.)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="sellingPrice"
            required
            value={form.sellingPrice}
            onChange={handleChange}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Branch</label>
          <select
            name="branchId"
            value={form.branchId}
            onChange={handleChange}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Initial Quantity</label>
          <input
            type="number"
            name="quantity"
            min="0"
            step="1"
            required
            value={form.quantity}
            onChange={handleChange}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="0"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
      >
        {loading ? "Adding..." : "Add Medicine"}
      </button>
    </form>
  );
}