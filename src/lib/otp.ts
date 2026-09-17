import { prisma } from "@/lib/prisma";

export function generateOtpCode(length: number = 6): string {
  // Generate a random 6-digit numerical code
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += digits[Math.floor(Math.random() * 10)];
  }
  return code;
}

export async function canRequestOtp(email: number | string, type: "LOGIN" | "SIGNUP"): Promise<{ allowed: boolean; remainingSeconds?: number }> {
  const normalizedEmail = String(email).toLowerCase().trim();
  const latestToken = await prisma.otpToken.findFirst({
    where: {
      email: normalizedEmail,
      type,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!latestToken) {
    return { allowed: true };
  }

  const secondsSinceCreated = Math.floor((Date.now() - new Date(latestToken.createdAt).getTime()) / 1000);
  const cooldownSeconds = 45; // 45 seconds cooldown before requesting a new OTP

  if (secondsSinceCreated < cooldownSeconds) {
    return {
      allowed: false,
      remainingSeconds: cooldownSeconds - secondsSinceCreated,
    };
  }

  return { allowed: true };
}

export async function createOtpToken(
  email: string,
  type: "LOGIN" | "SIGNUP",
  expiresInMinutes: number = 5
): Promise<{ code: string; expiresAt: Date }> {
  const normalizedEmail = email.toLowerCase().trim();
  const code = generateOtpCode(6);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  // Clean up any existing tokens for this email and type
  await prisma.otpToken.deleteMany({
    where: {
      email: normalizedEmail,
      type,
    },
  });

  // Create new OTP token
  await prisma.otpToken.create({
    data: {
      email: normalizedEmail,
      code,
      type,
      expiresAt,
    },
  });

  return { code, expiresAt };
}

export async function verifyAndConsumeOtp(
  email: string,
  code: string,
  type: "LOGIN" | "SIGNUP"
): Promise<{ valid: boolean; message?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const trimmedCode = code.trim();

  const token = await prisma.otpToken.findFirst({
    where: {
      email: normalizedEmail,
      type,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!token) {
    return { valid: false, message: "No verification code was requested for this email." };
  }

  if (new Date() > new Date(token.expiresAt)) {
    // Delete expired token
    await prisma.otpToken.delete({ where: { id: token.id } });
    return { valid: false, message: "Verification code has expired. Please request a new one." };
  }

  if (token.code !== trimmedCode) {
    return { valid: false, message: "Invalid verification code. Please check and try again." };
  }

  // Token is valid! Consume it so it cannot be reused.
  await prisma.otpToken.delete({
    where: { id: token.id },
  });

  return { valid: true };
}
