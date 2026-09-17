import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { branchId, items } = body as {
      branchId?: string;
      items?: { medicineId: string; quantity: number }[];
    };

    const trimmedBranchId = typeof branchId === "string" ? branchId.trim() : "";

    if (!trimmedBranchId) {
      return NextResponse.json({ error: "Branch ID is required" }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required in the sale" }, { status: 400 });
    }

    // Consolidate and validate items
    const consolidatedMap = new Map<string, number>();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it || typeof it.medicineId !== "string" || !it.medicineId.trim()) {
        return NextResponse.json(
          { error: `Item #${i + 1} has an invalid or missing medicine selection` },
          { status: 400 }
        );
      }
      const qty = Number(it.quantity);
      if (isNaN(qty) || !Number.isInteger(qty) || qty <= 0) {
        return NextResponse.json(
          { error: `Item #${i + 1} must have a positive whole quantity` },
          { status: 400 }
        );
      }
      const medId = it.medicineId.trim();
      consolidatedMap.set(medId, (consolidatedMap.get(medId) ?? 0) + qty);
    }

    // Verify branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: trimmedBranchId },
    });
    if (!branch) {
      return NextResponse.json({ error: "Selected branch does not exist" }, { status: 404 });
    }

    const sale = await prisma.$transaction(async (tx) => {
      const saleItemsData: { batchId: string; quantity: number; unitPrice: number }[] = [];
      let totalAmount = 0;

      for (const [medicineId, totalQuantity] of consolidatedMap.entries()) {
        let remaining = totalQuantity;

        const medicine = await tx.medicine.findUnique({
          where: { id: medicineId },
          select: { name: true },
        });
        const medicineName = medicine?.name ?? "Selected medicine";

        // Get all stock for this medicine at this branch, earliest expiry first (FIFO)
        const stocks = await tx.branchStock.findMany({
          where: {
            branchId: trimmedBranchId,
            batch: { medicineId },
            quantity: { gt: 0 },
          },
          include: { batch: true },
          orderBy: { batch: { expiryDate: "asc" } },
        });

        for (const stock of stocks) {
          if (remaining <= 0) break;

          const deduct = Math.min(remaining, stock.quantity);

          await tx.branchStock.update({
            where: { id: stock.id },
            data: { quantity: { decrement: deduct } },
          });

          const unitPrice = Number(stock.batch.sellingPrice);

          saleItemsData.push({
            batchId: stock.batchId,
            quantity: deduct,
            unitPrice,
          });

          totalAmount += deduct * unitPrice;
          remaining -= deduct;
        }

        if (remaining > 0) {
          throw new Error(`Insufficient stock for "${medicineName}" (short by ${remaining} unit${remaining > 1 ? "s" : ""})`);
        }
      }

      // Round to 2 decimal places to prevent float rounding inaccuracies
      const roundedTotalAmount = Math.round(totalAmount * 100) / 100;

      return tx.sale.create({
        data: {
          branchId: trimmedBranchId,
          soldById: session.user.id,
          totalAmount: roundedTotalAmount,
          items: { create: saleItemsData },
        },
        include: { items: true },
      });
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create sale";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}