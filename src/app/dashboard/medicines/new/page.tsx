import { prisma } from "@/lib/prisma";
import { NewMedicineForm } from "./new-medicine-form";

export default async function NewMedicinePage() {
  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Add Medicine</h1>
        <p className="text-sm text-slate-500">
          Adds a new medicine along with its first batch and stock.
        </p>
      </div>

      <NewMedicineForm branches={branches} />
    </div>
  );
}