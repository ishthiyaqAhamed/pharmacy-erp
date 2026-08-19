import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create a branch first, since a User can optionally belong to one
  const mainBranch = await prisma.branch.create({
    data: {
      name: "Colombo Branch",
      address: "123 Galle Road, Colombo",
      phone: "0112345678",
    },
  });

  // Hash the password before storing it — never save plain text passwords
  const hashedPassword = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@pharmacy.lk",
      password: hashedPassword,
      role: "ADMIN",
      branchId: mainBranch.id,
    },
  });

  console.log("Seed complete. Created branch:", mainBranch.name);
  console.log("Created admin user:", admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });