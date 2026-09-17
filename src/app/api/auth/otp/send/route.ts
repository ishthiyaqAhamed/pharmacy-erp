import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canRequestOtp, createOtpToken } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, type } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: "Please provide a valid email format." }, { status: 400 });
    }

    if (type !== "LOGIN" && type !== "SIGNUP") {
      return NextResponse.json({ error: "Invalid OTP type. Expected LOGIN or SIGNUP." }, { status: 400 });
    }

    // Check user existence according to auth flow
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (type === "LOGIN" && !existingUser) {
      return NextResponse.json(
        { error: "No account found with this email. Please create an account first." },
        { status: 404 }
      );
    }

    if (type === "SIGNUP" && existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in instead." },
        { status: 409 }
      );
    }

    // Check rate limit / cooldown
    const rateCheck = await canRequestOtp(normalizedEmail, type);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Please wait ${rateCheck.remainingSeconds}s before requesting a new code.`,
          remainingSeconds: rateCheck.remainingSeconds,
        },
        { status: 429 }
      );
    }

    // Generate and store OTP
    const { code } = await createOtpToken(normalizedEmail, type, 5);

    // Send Email
    const mailResult = await sendOtpEmail({
      to: normalizedEmail,
      otp: code,
      type,
    });

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}.`,
      devCode: mailResult.devCode, // populated in dev/preview for quick debugging
    });
  } catch (error: any) {
    console.error("Error sending OTP:", error);
    return NextResponse.json({ error: "Failed to send verification code. Please try again." }, { status: 500 });
  }
}
