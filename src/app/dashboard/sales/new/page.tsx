import { prisma } from "@/lib/prisma";
import { NewSaleForm } from "./new-sale-form";

export default async function NewSalePage() {
  const [branches, medicines] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
    prisma.medicine.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">New Sale</h1>
        <p className="text-sm text-slate-500">
          Stock is deducted from the earliest-expiring batch first.
        </p>
      </div>

      <NewSaleForm branches={branches} medicines={medicines} />
    </div>
  );
}