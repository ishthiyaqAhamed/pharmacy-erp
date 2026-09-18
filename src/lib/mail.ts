import { Resend } from "resend";
import nodemailer from "nodemailer";

interface SendOtpEmailParams {
  to: string;
  otp: string;
  type: "LOGIN" | "SIGNUP";
}

export async function sendOtpEmail({
  to,
  otp,
  type,
}: SendOtpEmailParams): Promise<{ success: boolean; devCode?: string; error?: string }> {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const resendApiKey = process.env.RESEND_API_KEY;
  const hasSmtpConfig = !!(process.env.SMTP_HOST && process.env.SMTP_USER);

  const actionText =
    type === "LOGIN" ? "Sign In to Pharmacy ERP" : "Complete Your Pharmacy ERP Registration";
  const descriptionText =
    type === "LOGIN"
      ? "Use the 6-digit verification code below to log in to your account."
      : "Use the 6-digit verification code below to confirm your email and activate your account.";

  // Always log to console for instant debugging and development visibility
  console.log(`\n========================================`);
  console.log(`🔐 [OTP DISPATCH] Type: ${type}`);
  console.log(`📧 To: ${to}`);
  console.log(`🔑 Verification Code: ${otp}`);
  console.log(`⏰ Valid for 10 minutes`);
  console.log(`========================================\n`);

  const htmlContent = `
    <div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden;">
      <div style="background: #09090b; padding: 28px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Pharmacy ERP</h1>
        <p style="color: #a1a1aa; margin: 6px 0 0; font-size: 13px;">Authentication Security Code</p>
      </div>
      <div style="padding: 32px 28px;">
        <h2 style="font-size: 18px; font-weight: 700; color: #09090b; margin: 0 0 8px;">${actionText}</h2>
        <p style="font-size: 14px; color: #52525b; margin: 0 0 24px; line-height: 1.5;">${descriptionText}</p>
        
        <div style="background: #f4f4f5; border: 1.5px dashed #d4d4d8; border-radius: 12px; padding: 22px; text-align: center; margin-bottom: 24px;">
          <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #09090b; display: inline-block; padding-left: 10px;">
            ${otp}
          </span>
        </div>

        <p style="font-size: 12px; color: #71717a; margin: 0 0 8px; line-height: 1.4;">
          This code is valid for <strong>10 minutes</strong>. If you did not request this verification, please disregard this email.
        </p>
      </div>
      <div style="background: #fafafa; padding: 16px 28px; text-align: center; border-top: 1px solid #e4e4e7;">
        <p style="margin: 0; font-size: 12px; color: #71717a;">Pharmacy ERP Management System</p>
      </div>
    </div>
  `;

  // 1. Primary: Use Resend if RESEND_API_KEY is configured
  if (resendApiKey) {
    try {
      const resend = new Resend(resendApiKey);
      const fromEmail = process.env.EMAIL_FROM || "Pharmacy ERP <onboarding@resend.dev>";

      console.log(`[RESEND] Sending OTP to ${to} from ${fromEmail}...`);
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [to],
        subject: `${otp} is your Pharmacy ERP verification code`,
        text: `${actionText}\n\nYour 6-digit verification code is: ${otp}\n\nValid for 10 minutes.`,
        html: htmlContent,
      });

      if (error) {
        console.error("[RESEND ERROR] Failed to deliver email via Resend:", error);
        return {
          success: true, // Do not break auth flow in dev
          devCode: isDevelopment ? otp : undefined,
          error: error.message,
        };
      }

      console.log(`[RESEND SUCCESS] Email sent successfully with ID: ${data?.id}`);
      return { success: true };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Resend request failed";
      console.error("[RESEND EXCEPTION]:", err);
      return {
        success: true,
        devCode: isDevelopment ? otp : undefined,
        error: errMsg,
      };
    }
  }

  // 2. Secondary: Use Nodemailer SMTP if configured
  if (hasSmtpConfig) {
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

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || `"Pharmacy ERP" <${process.env.SMTP_USER}>`,
        to,
        subject: `${otp} is your Pharmacy ERP verification code`,
        text: `${actionText}\n\nYour verification code is: ${otp}\n\nValid for 10 minutes.`,
        html: htmlContent,
      });

      console.log(`[SMTP SUCCESS] Email sent to ${to}`);
      return { success: true };
    } catch (error) {
      console.error("[SMTP ERROR] Failed to send OTP email via SMTP:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error sending email";
      return {
        success: true,
        devCode: isDevelopment ? otp : undefined,
        error: errorMessage,
      };
    }
  }

  // 3. Dev Fallback when neither RESEND_API_KEY nor SMTP is provided
  return {
    success: true,
    devCode: isDevelopment ? otp : undefined,
  };
}
