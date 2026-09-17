import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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

    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedManufacturer = typeof manufacturer === "string" ? manufacturer.trim() : "";
    const trimmedUnit = typeof unit === "string" ? unit.trim() : "";
    const trimmedBatchNumber = typeof batchNumber === "string" ? batchNumber.trim() : "";
    const trimmedBranchId = typeof branchId === "string" ? branchId.trim() : "";

    if (!trimmedName || !trimmedManufacturer || !trimmedUnit || !trimmedBatchNumber || !trimmedBranchId) {
      return NextResponse.json(
        { error: "Name, manufacturer, unit, batch number, and branch are required" },
        { status: 400 }
      );
    }

    const parsedExpiry = new Date(expiryDate);
    if (!expiryDate || isNaN(parsedExpiry.getTime())) {
      return NextResponse.json(
        { error: "Valid expiry date is required" },
        { status: 400 }
      );
    }

    const numCostPrice = Number(costPrice);
    const numSellingPrice = Number(sellingPrice);
    const numQuantity = Number(quantity);

    if (isNaN(numCostPrice) || numCostPrice < 0) {
      return NextResponse.json(
        { error: "Cost price must be a non-negative number" },
        { status: 400 }
      );
    }

    if (isNaN(numSellingPrice) || numSellingPrice < 0) {
      return NextResponse.json(
        { error: "Selling price must be a non-negative number" },
        { status: 400 }
      );
    }

    if (isNaN(numQuantity) || numQuantity < 0 || !Number.isInteger(numQuantity)) {
      return NextResponse.json(
        { error: "Quantity must be a non-negative whole number" },
        { status: 400 }
      );
    }

    // Verify branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: trimmedBranchId },
    });
    if (!branch) {
      return NextResponse.json({ error: "Selected branch does not exist" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Reuse existing medicine if name and manufacturer match, otherwise create
      let medicine = await tx.medicine.findFirst({
        where: {
          name: { equals: trimmedName, mode: "insensitive" },
          manufacturer: { equals: trimmedManufacturer, mode: "insensitive" },
        },
      });

      if (!medicine) {
        medicine = await tx.medicine.create({
          data: {
            name: trimmedName,
            manufacturer: trimmedManufacturer,
            unit: trimmedUnit,
            requiresRx: Boolean(requiresRx),
          },
        });
      }

      // Check if batch already exists for this medicine
      let batch = await tx.batch.findUnique({
        where: {
          medicineId_batchNumber: {
            medicineId: medicine.id,
            batchNumber: trimmedBatchNumber,
          },
        },
      });

      if (!batch) {
        batch = await tx.batch.create({
          data: {
            medicineId: medicine.id,
            batchNumber: trimmedBatchNumber,
            expiryDate: parsedExpiry,
            costPrice: numCostPrice,
            sellingPrice: numSellingPrice,
          },
        });
      }

      // Upsert branch stock
      await tx.branchStock.upsert({
        where: {
          branchId_batchId: {
            branchId: trimmedBranchId,
            batchId: batch.id,
          },
        },
        create: {
          branchId: trimmedBranchId,
          batchId: batch.id,
          quantity: numQuantity,
        },
        update: {
          quantity: { increment: numQuantity },
        },
      });

      return medicine;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add medicine";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}