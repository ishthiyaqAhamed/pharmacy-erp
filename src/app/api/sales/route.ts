import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { branchId, items } = body as {
    branchId: string;
    items: { medicineId: string; quantity: number }[];
  };

  if (!branchId || !items?.length) {
    return NextResponse.json({ error: "branchId and items are required" }, { status: 400 });
  }

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const saleItemsData: { batchId: string; quantity: number; unitPrice: number }[] = [];
      let totalAmount = 0;

      for (const item of items) {
        let remaining = item.quantity;

        // Get all stock for this medicine at this branch, earliest expiry first
        const stocks = await tx.branchStock.findMany({
          where: {
            branchId,
            batch: { medicineId: item.medicineId },
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

          saleItemsData.push({
            batchId: stock.batchId,
            quantity: deduct,
            unitPrice: Number(stock.batch.sellingPrice),
          });

          totalAmount += deduct * Number(stock.batch.sellingPrice);
          remaining -= deduct;
        }

        if (remaining > 0) {
          throw new Error(`Not enough stock for this medicine (short by ${remaining})`);
        }
      }

      return tx.sale.create({
        data: {
          branchId,
          soldById: session.user.id,
          totalAmount,
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