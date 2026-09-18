import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { verifyAndConsumeOtp } from "@/lib/otp";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const otp = credentials?.otp as string | undefined;

        if (!email) {
          console.log("[AUTH ERROR] Missing email in credentials");
          return null;
        }

        const normalizedEmail = email.toLowerCase().trim();
        console.log(`[AUTH ATTEMPT] Email: ${normalizedEmail}, Has OTP: ${!!otp}, Has Password: ${!!password}`);

        const user = await prisma.user.findFirst({
          where: {
            email: { equals: normalizedEmail, mode: "insensitive" },
          },
        });

        if (!user) {
          console.log(`[AUTH ERROR] User not found for email: ${normalizedEmail}`);
          return null;
        }

        // 1. Authenticate with OTP if provided
        if (otp && typeof otp === "string" && otp.trim().length > 0) {
          const otpResult = await verifyAndConsumeOtp(normalizedEmail, otp.trim(), "LOGIN");
          if (!otpResult.valid) {
            console.log(`[AUTH OTP REJECTED] ${otpResult.message}`);
            return null;
          }

          console.log(`[AUTH SUCCESS] User authenticated with OTP: ${user.email} (${user.role})`);
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            branchId: user.branchId,
          };
        }

        // 2. Authenticate with Password if provided
        if (password && typeof password === "string" && user.password) {
          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            console.log(`[AUTH PASSWORD REJECTED] Password mismatch for ${user.email}`);
            return null;
          }

          console.log(`[AUTH SUCCESS] User authenticated with Password: ${user.email} (${user.role})`);
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            branchId: user.branchId,
          };
        }

        console.log("[AUTH ERROR] Neither valid OTP nor Password provided");
        return null;
      },
    }),
  ],
});