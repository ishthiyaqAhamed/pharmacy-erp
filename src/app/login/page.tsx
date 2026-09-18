"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const prefillEmail = searchParams.get("email") || "";

  const [authMode, setAuthMode] = useState<"otp" | "password">("otp");

  // Form states initialized directly from searchParams
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");

  // OTP states
  const [otpStep, setOtpStep] = useState<"email" | "code">("email");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const [devPreviewCode, setDevPreviewCode] = useState<string | null>(null);

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(
    registered ? "Account created successfully! Please sign in with your email." : null
  );

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer effect
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Handle requesting OTP for login
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    setError(null);
    setInfoMessage(null);
    setLoading(true);
    setDevPreviewCode(null);

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          type: "LOGIN",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send verification code.");
        if (data.remainingSeconds) {
          setCountdown(data.remainingSeconds);
        }
        return;
      }

      setOtpStep("code");
      setCountdown(30);
      setInfoMessage(`We sent a 6-digit code to ${cleanEmail}`);
      if (data.devCode) {
        setDevPreviewCode(data.devCode);
      }

      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Robust OTP digit change
  const handleDigitChange = (index: number, val: string) => {
    const digitsOnly = val.replace(/\D/g, "");

    // If empty
    if (!digitsOnly) {
      const newDigits = [...otpDigits];
      newDigits[index] = "";
      setOtpDigits(newDigits);
      return;
    }

    // If user pasted or typed multiple digits
    if (digitsOnly.length > 1) {
      const pastedChars = digitsOnly.slice(0, 6).split("");
      const newDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        if (pastedChars[i] !== undefined) {
          newDigits[i] = pastedChars[i];
        }
      }
      setOtpDigits(newDigits);
      const targetFocus = Math.min(pastedChars.length, 5);
      otpInputRefs.current[targetFocus]?.focus();
      return;
    }

    // Single digit entry
    const newDigits = [...otpDigits];
    newDigits[index] = digitsOnly;
    setOtpDigits(newDigits);

    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Dedicated paste handler
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedText) return;

    const newDigits = [...otpDigits];
    const chars = pastedText.split("");
    for (let i = 0; i < 6; i++) {
      newDigits[i] = chars[i] || "";
    }
    setOtpDigits(newDigits);
    const targetFocus = Math.min(chars.length, 5);
    otpInputRefs.current[targetFocus]?.focus();
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (otpDigits[index] === "" && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = "";
        setOtpDigits(newDigits);
        otpInputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...otpDigits];
        newDigits[index] = "";
        setOtpDigits(newDigits);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleAutofillDevCode = () => {
    if (!devPreviewCode || devPreviewCode.length !== 6) return;
    const digits = devPreviewCode.split("");
    setOtpDigits(digits);
    otpInputRefs.current[5]?.focus();
  };

  // Handle OTP verification & Login
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = otpDigits.join("");
    if (enteredCode.length !== 6) {
      setError("Please enter all 6 digits of the verification code.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        otp: enteredCode,
        redirect: false,
      });

      if (!result || result.error) {
        setError("Invalid or expired verification code. Please check and try again.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred during login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle standard password login (Admin Portal)
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError("Invalid email or password.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred while signing in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-12 text-zinc-900">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-zinc-300 bg-white p-8 shadow-xl">
        
        {/* Header Branding */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-black text-white shadow-sm">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-black">Pharmacy ERP</h1>
          <p className="mt-1 text-sm text-zinc-500">Sign in to manage inventory & sales</p>
        </div>

        {/* Tab Switcher: User (OTP) vs Admin Portal */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 border border-zinc-200">
          <button
            type="button"
            onClick={() => {
              setAuthMode("otp");
              setError(null);
            }}
            className={`rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer ${
              authMode === "otp"
                ? "bg-black text-white shadow-sm"
                : "text-zinc-600 hover:text-black"
            }`}
          >
            Sign in as User
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("password");
              setError(null);
            }}
            className={`rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer ${
              authMode === "password"
                ? "bg-black text-white shadow-sm"
                : "text-zinc-600 hover:text-black"
            }`}
          >
            Admin Portal
          </button>
        </div>

        {/* Alert Error Box */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-black bg-zinc-50 p-3.5 text-sm text-black">
            <svg className="h-5 w-5 shrink-0 text-black mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Info Box */}
        {infoMessage && (
          <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-3 text-xs font-medium text-zinc-700">
            {infoMessage}
          </div>
        )}

        {/* Dev OTP Helper Banner */}
        {devPreviewCode && (
          <div className="flex items-center justify-between rounded-xl border border-zinc-300 bg-zinc-50 px-3.5 py-2.5 text-xs text-zinc-900">
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase tracking-wider text-zinc-500">Dev Code:</span>
              <span className="font-mono text-sm font-bold tracking-widest text-black">{devPreviewCode}</span>
            </div>
            <button
              type="button"
              onClick={handleAutofillDevCode}
              className="rounded border border-black bg-black px-2.5 py-1 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Fill Code
            </button>
          </div>
        )}

        {/* USER OTP AUTHENTICATION FLOW */}
        {authMode === "otp" && (
          <div>
            {otpStep === "email" ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-black placeholder-zinc-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                    placeholder="user@pharmacy.lk"
                  />
                  <p className="text-xs text-zinc-500">We will email you a 6-digit one-time code.</p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-black py-2.5 text-sm font-semibold text-white shadow-md hover:bg-zinc-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Sending code...</span>
                    </>
                  ) : (
                    "Send One-Time Code"
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="flex items-center justify-between text-xs text-zinc-600">
                  <span className="truncate max-w-[200px]">Sent to: <strong className="text-black">{email}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep("email");
                      setOtpDigits(["", "", "", "", "", ""]);
                      setDevPreviewCode(null);
                    }}
                    className="text-black hover:underline font-semibold cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                {/* 6 Digit Input Boxes */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 text-center block">
                    Enter 6-Digit Code
                  </label>
                  <div className="flex justify-between gap-2" onPaste={handlePaste}>
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpInputRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                        className="h-12 w-12 rounded-xl border border-zinc-300 bg-white text-center font-mono text-xl font-bold text-black outline-none focus:border-black focus:ring-2 focus:ring-black/20 transition-all shadow-sm"
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpDigits.join("").length !== 6}
                  className="w-full rounded-xl bg-black py-2.5 text-sm font-semibold text-white shadow-md hover:bg-zinc-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    "Verify & Sign In"
                  )}
                </button>

                {/* Resend Action */}
                <div className="text-center text-xs text-zinc-500">
                  {countdown > 0 ? (
                    <span>Resend code in <strong className="text-black">{countdown}s</strong></span>
                  ) : (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSendOtp()}
                      className="font-semibold text-black hover:underline cursor-pointer"
                    >
                      Resend Code
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* ADMIN PASSWORD AUTHENTICATION FLOW */}
        {authMode === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">Admin Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-black placeholder-zinc-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                placeholder="admin@pharmacy.lk"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-black placeholder-zinc-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-black py-2.5 text-sm font-semibold text-white shadow-md hover:bg-zinc-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Signing in...</span>
                </>
              ) : (
                "Sign In to Admin Portal"
              )}
            </button>
          </form>
        )}

        {/* Bottom Link to Signup */}
        <div className="border-t border-zinc-200 pt-4 text-center text-xs text-zinc-600">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-bold text-black hover:underline">
            Sign up now
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-zinc-100 text-zinc-900">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}