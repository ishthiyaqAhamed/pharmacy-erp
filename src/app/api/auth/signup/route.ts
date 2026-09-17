import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyAndConsumeOtp } from "@/lib/otp";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, otp, role, branchId } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    if (!otp || typeof otp !== "string" || otp.trim().length !== 6) {
      return NextResponse.json({ error: "Please provide a valid 6-digit verification code." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in instead." },
        { status: 409 }
      );
    }

    // Verify and consume the OTP token
    const otpVerification = await verifyAndConsumeOtp(normalizedEmail, otp, "SIGNUP");
    if (!otpVerification.valid) {
      return NextResponse.json(
        { error: otpVerification.message || "Invalid or expired verification code." },
        { status: 400 }
      );
    }

    // Hash password if supplied
    let hashedPassword: string | null = null;
    if (password && typeof password === "string" && password.trim().length > 0) {
      if (password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
      }
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Role validation
    const validRoles = Object.values(Role);
    const assignedRole = validRoles.includes(role) ? (role as Role) : Role.CASHIER;

    // Check branch or fallback
    let assignedBranchId: string | null = branchId || null;
    if (assignedBranchId) {
      const branchExists = await prisma.branch.findUnique({ where: { id: assignedBranchId } });
      if (!branchExists) {
        assignedBranchId = null;
      }
    }

    if (!assignedBranchId) {
      // Find first existing branch as fallback if available
      const defaultBranch = await prisma.branch.findFirst();
      if (defaultBranch) {
        assignedBranchId = defaultBranch.id;
      }
    }

    // Create user in database
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword ?? null,
        role: assignedRole,
        branchId: assignedBranchId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Account created successfully!",
      user,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Failed to create account. Please try again." }, { status: 500 });
  }
}
