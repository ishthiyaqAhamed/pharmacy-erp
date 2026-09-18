import { prisma } from "@/lib/prisma";

export function generateOtpCode(length: number = 6): string {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += digits[Math.floor(Math.random() * 10)];
  }
  return code;
}

export async function canRequestOtp(
  email: string,
  type: "LOGIN" | "SIGNUP"
): Promise<{ allowed: boolean; remainingSeconds?: number }> {
  const normalizedEmail = email.toLowerCase().trim();
  const latestToken = await prisma.otpToken.findFirst({
    where: {
      email: { equals: normalizedEmail, mode: "insensitive" },
      type,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!latestToken) {
    return { allowed: true };
  }

  const secondsSinceCreated = Math.floor(
    (Date.now() - new Date(latestToken.createdAt).getTime()) / 1000
  );
  const cooldownSeconds = 30; // 30 seconds cooldown between requests

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
  expiresInMinutes: number = 10
): Promise<{ code: string; expiresAt: Date }> {
  const normalizedEmail = email.toLowerCase().trim();
  const code = generateOtpCode(6);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  // Clean up any existing tokens for this email and type
  await prisma.otpToken.deleteMany({
    where: {
      email: { equals: normalizedEmail, mode: "insensitive" },
      type,
    },
  });

  // Create new OTP token
  const token = await prisma.otpToken.create({
    data: {
      email: normalizedEmail,
      code,
      type,
      expiresAt,
    },
  });

  console.log(`[OTP GENERATED] Created token for ${normalizedEmail} (${type}): Code = ${code}, Expires = ${expiresAt.toISOString()}`);

  return { code: token.code, expiresAt: token.expiresAt };
}

export async function verifyAndConsumeOtp(
  email: string,
  code: string,
  type: "LOGIN" | "SIGNUP"
): Promise<{ valid: boolean; message?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const trimmedCode = code.trim();

  console.log(`[OTP VERIFY] Attempting verification for email: ${normalizedEmail}, type: ${type}, code: ${trimmedCode}`);

  const token = await prisma.otpToken.findFirst({
    where: {
      email: { equals: normalizedEmail, mode: "insensitive" },
      type,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!token) {
    console.log(`[OTP VERIFY FAILED] No token found in database for email: ${normalizedEmail}, type: ${type}`);
    return { valid: false, message: "No verification code was requested for this email." };
  }

  const now = new Date();
  if (now > new Date(token.expiresAt)) {
    console.log(`[OTP VERIFY FAILED] Token expired at ${token.expiresAt.toISOString()}, now is ${now.toISOString()}`);
    await prisma.otpToken.delete({ where: { id: token.id } });
    return { valid: false, message: "Verification code has expired. Please request a new one." };
  }

  if (token.code !== trimmedCode) {
    console.log(`[OTP VERIFY FAILED] Code mismatch: expected ${token.code}, received ${trimmedCode}`);
    return { valid: false, message: "Invalid verification code. Please check and try again." };
  }

  // Token is valid! Consume it
  await prisma.otpToken.delete({
    where: { id: token.id },
  });

  console.log(`[OTP VERIFY SUCCESS] Successfully verified and consumed token for ${normalizedEmail}`);
  return { valid: true };
}
