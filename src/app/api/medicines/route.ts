import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    name,
    manufacturer,
    unit,
    requiresRx,
    batchNumber,
    expiryDate,
    costPrice,
    sellingPrice,
    branchId,
    quantity,
  } = body;

  if (!name || !manufacturer || !unit || !batchNumber || !expiryDate || !branchId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const medicine = await tx.medicine.create({
        data: { name, manufacturer, unit, requiresRx: requiresRx ?? false },
      });

      const batch = await tx.batch.create({
        data: {
          medicineId: medicine.id,
          batchNumber,
          expiryDate: new Date(expiryDate),
          costPrice: Number(costPrice),
          sellingPrice: Number(sellingPrice),
        },
      });

      await tx.branchStock.create({
        data: { branchId, batchId: batch.id, quantity: Number(quantity) },
      });

      return medicine;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add medicine";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}