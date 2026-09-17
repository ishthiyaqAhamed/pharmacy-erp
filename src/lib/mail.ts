import nodemailer from "nodemailer";

interface SendOtpEmailParams {
  to: string;
  otp: string;
  type: "LOGIN" | "SIGNUP";
}

export async function sendOtpEmail({ to, otp, type }: SendOtpEmailParams): Promise<{ success: boolean; devCode?: string; error?: string }> {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const hasSmtpConfig = !!(process.env.SMTP_HOST && process.env.SMTP_USER);

  const actionText = type === "LOGIN" ? "Sign In to Pharmacy ERP" : "Complete Your Pharmacy ERP Registration";
  const descriptionText =
    type === "LOGIN"
      ? "Use the verification code below to log in to your account."
      : "Use the verification code below to confirm your email and activate your account.";

  // Always log to console in development for convenient testing
  console.log(`\n========================================`);
  console.log(`🔐 [OTP DISPATCH] Type: ${type}`);
  console.log(`📧 To: ${to}`);
  console.log(`🔑 Verification Code: ${otp}`);
  console.log(`⏰ Valid for 5 minutes`);
  console.log(`========================================\n`);

  if (!hasSmtpConfig) {
    // Return dev code for demo / environment without configured SMTP
    return {
      success: true,
      devCode: isDevelopment ? otp : undefined,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #0f172a; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.5px;">Pharmacy ERP</h1>
          <p style="color: #94a3b8; margin: 6px 0 0; font-size: 13px;">Security Verification Code</p>
        </div>
        <div style="padding: 32px 28px;">
          <h2 style="font-size: 17px; font-weight: 600; color: #1e293b; margin: 0 0 8px;">${actionText}</h2>
          <p style="font-size: 14px; color: #475569; margin: 0 0 24px; line-height: 1.5;">${descriptionText}</p>
          
          <div style="background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f172a; display: inline-block; padding-left: 8px;">
              ${otp}
            </span>
          </div>

          <p style="font-size: 12px; color: #64748b; margin: 0 0 16px;">This code will expire in <strong>5 minutes</strong>. If you did not request this code, please ignore this email.</p>
        </div>
        <div style="background: #f1f5f9; padding: 14px 28px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 12px; color: #64748b;">Pharmacy ERP Management System</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Pharmacy ERP" <${process.env.SMTP_USER}>`,
      to,
      subject: `${otp} is your Pharmacy ERP verification code`,
      text: `${actionText}\n\nYour verification code is: ${otp}\n\nThis code expires in 5 minutes.`,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send OTP email via SMTP:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error sending email";
    return {
      success: true, // Gracefully fallback so dev flow is not blocked
      devCode: isDevelopment ? otp : undefined,
      error: errorMessage,
    };
  }
}
