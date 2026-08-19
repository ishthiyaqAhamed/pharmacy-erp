import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Only create the branch + admin if they don't already exist
  let mainBranch = await prisma.branch.findFirst({ where: { name: "Colombo Branch" } });

  if (!mainBranch) {
    mainBranch = await prisma.branch.create({
      data: {
        name: "Colombo Branch",
        address: "123 Galle Road, Colombo",
        phone: "0112345678",
      },
    });

    const hashedPassword = await bcrypt.hash("password123", 10);
    await prisma.user.create({
      data: {
        name: "Admin User",
        email: "admin@pharmacy.lk",
        password: hashedPassword,
        role: "ADMIN",
        branchId: mainBranch.id,
      },
    });

    console.log("Created branch and admin user.");
  } else {
    console.log("Branch and admin already exist, skipping.");
  }

  // Medicines with batches and stock
  const medicinesData = [
    { name: "Paracetamol 500mg", manufacturer: "State Pharma", unit: "tablet", requiresRx: false },
    { name: "Amoxicillin 250mg", manufacturer: "Sunrise Labs", unit: "capsule", requiresRx: true },
    { name: "Cetirizine 10mg", manufacturer: "MediCare", unit: "tablet", requiresRx: false },
  ];

  for (const med of medicinesData) {
    const existing = await prisma.medicine.findFirst({ where: { name: med.name } });
    if (existing) {
      console.log(`Medicine "${med.name}" already exists, skipping.`);
      continue;
    }

    const medicine = await prisma.medicine.create({ data: med });

    // Create two batches per medicine — one expiring soon, one expiring later
    const soonBatch = await prisma.batch.create({
      data: {
        medicineId: medicine.id,
        batchNumber: "B-SOON-01",
        expiryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
        costPrice: 5,
        sellingPrice: 10,
      },
    });

    const laterBatch = await prisma.batch.create({
      data: {
        medicineId: medicine.id,
        batchNumber: "B-LATER-01",
        expiryDate: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000), // 200 days from now
        costPrice: 5,
        sellingPrice: 10,
      },
    });

    // Add stock at the branch — small quantity for the soon-to-expire batch (demo low-stock alert)
    await prisma.branchStock.create({
      data: { branchId: mainBranch.id, batchId: soonBatch.id, quantity: 8 },
    });
    await prisma.branchStock.create({
      data: { branchId: mainBranch.id, batchId: laterBatch.id, quantity: 100 },
    });

    console.log(`Created medicine "${med.name}" with 2 batches.`);
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });