"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

interface Branch {
  id: string;
  name: string;
  address: string;
}

export default function SignupPage() {
  const router = useRouter();

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("PHARMACIST");
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);

  // OTP states
  const [step, setStep] = useState<"details" | "verify">("details");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const [devPreviewCode, setDevPreviewCode] = useState<string | null>(null);

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Fetch available branches on mount
  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await fetch("/api/branches/public");
        if (res.ok) {
          const data = await res.json();
          setBranches(data);
          if (data.length > 0) {
            setBranchId(data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load branches:", err);
      }
    }
    loadBranches();
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Request OTP for Signup
  const handleRequestSignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim()) {
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
          email: email.trim(),
          type: "SIGNUP",
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

      setStep("verify");
      setCountdown(45);
      setInfoMessage(`We sent a 6-digit confirmation code to ${email.trim()}`);
      if (data.devCode) {
        setDevPreviewCode(data.devCode);
      }

      // Auto-focus first digit
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP digit changes
  const handleDigitChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, "");
    if (!cleanVal) {
      const newDigits = [...otpDigits];
      newDigits[index] = "";
      setOtpDigits(newDigits);
      return;
    }

    if (cleanVal.length > 1) {
      const pasted = cleanVal.slice(0, 6).split("");
      const newDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        if (pasted[i]) newDigits[i] = pasted[i];
      }
      setOtpDigits(newDigits);
      const nextIndex = Math.min(pasted.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);

    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleAutofillDevCode = () => {
    if (!devPreviewCode || devPreviewCode.length !== 6) return;
    const digits = devPreviewCode.split("");
    setOtpDigits(digits);
    otpInputRefs.current[5]?.focus();
  };

  // Submit and verify signup
  const handleVerifyAndSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredOtp = otpDigits.join("");
    if (enteredOtp.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const signupRes = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password || undefined,
          role,
          branchId: branchId || undefined,
          otp: enteredOtp,
        }),
      });

      const signupData = await signupRes.json();

      if (!signupRes.ok) {
        setError(signupData.error || "Verification failed. Please check the code.");
        return;
      }

      if (password) {
        const loginRes = await signIn("credentials", {
          email: email.trim(),
          password,
          redirect: false,
        });

        if (loginRes?.error) {
          router.push("/login?registered=true");
          return;
        }
      } else {
        router.push("/login?registered=true");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-12 text-zinc-900">
      <div className="w-full max-w-lg space-y-6 rounded-2xl border border-zinc-300 bg-white p-8 shadow-xl">
        
        {/* Header Branding */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-black text-white shadow-sm">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-black">Create Account</h1>
          <p className="mt-1 text-sm text-zinc-500">Register new staff member with OTP verification</p>
        </div>

        {/* Stepper Progress Indicator */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
              step === "details" ? "bg-black text-white" : "bg-zinc-800 text-white"
            }`}>
              {step === "verify" ? "✓" : "1"}
            </div>
            <span className="text-xs font-semibold text-black">Details</span>
          </div>
          <div className="h-0.5 w-12 bg-zinc-300" />
          <div className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
              step === "verify" ? "bg-black text-white" : "bg-zinc-200 text-zinc-600"
            }`}>
              2
            </div>
            <span className={`text-xs font-semibold ${step === "verify" ? "text-black" : "text-zinc-500"}`}>
              Verify OTP
            </span>
          </div>
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

        {/* Dev OTP Helper */}
        {devPreviewCode && (
          <div className="flex items-center justify-between rounded-xl border border-zinc-300 bg-zinc-50 px-3.5 py-2.5 text-xs text-zinc-900">
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase tracking-wider text-zinc-500">Dev Code:</span>
              <span className="font-mono text-sm font-bold tracking-widest text-black">{devPreviewCode}</span>
            </div>
            <button
              type="button"
              onClick={handleAutofillDevCode}
              className="rounded border border-black bg-black px-2 py-1 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Fill Code
            </button>
          </div>
        )}

        {/* STEP 1: USER DETAILS */}
        {step === "details" ? (
          <form onSubmit={handleRequestSignupOtp} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-black placeholder-zinc-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  placeholder="Kasun Perera"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">Work Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-black placeholder-zinc-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  placeholder="kasun@pharmacy.lk"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">Staff Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                >
                  <option value="PHARMACIST">Pharmacist</option>
                  <option value="CASHIER">Cashier</option>
                  <option value="BRANCH_MANAGER">Branch Manager</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">Assigned Branch</label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                >
                  {branches.length > 0 ? (
                    branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Main Branch</option>
                  )}
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">Password</label>
                  <span className="text-[11px] text-zinc-500">(Optional for password login)</span>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-black placeholder-zinc-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-black py-2.5 text-sm font-semibold text-white shadow-md hover:bg-zinc-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Sending Code...</span>
                </>
              ) : (
                "Continue with Verification"
              )}
            </button>
          </form>
        ) : (
          /* STEP 2: VERIFY OTP */
          <form onSubmit={handleVerifyAndSignup} className="space-y-5">
            <div className="flex items-center justify-between text-xs text-zinc-600">
              <span className="truncate max-w-[240px]">Code sent to: <strong className="text-black">{email}</strong></span>
              <button
                type="button"
                onClick={() => {
                  setStep("details");
                  setOtpDigits(["", "", "", "", "", ""]);
                  setDevPreviewCode(null);
                }}
                className="text-black hover:underline font-semibold"
              >
                Change Details
              </button>
            </div>

            {/* 6 Digit Input Boxes */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 text-center block">
                Enter 6-Digit OTP Code
              </label>
              <div className="flex justify-between gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
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
                  <span>Creating Account...</span>
                </>
              ) : (
                "Verify & Complete Registration"
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
                  onClick={(e) => handleRequestSignupOtp(e)}
                  className="font-semibold text-black hover:underline cursor-pointer"
                >
                  Resend Code
                </button>
              )}
            </div>
          </form>
        )}

        {/* Bottom Link to Login */}
        <div className="border-t border-zinc-200 pt-4 text-center text-xs text-zinc-600">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-black hover:underline">
            Sign in
          </Link>
        </div>

      </div>
    </div>
  );
}
