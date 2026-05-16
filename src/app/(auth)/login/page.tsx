"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import {
  Mail,
  Lock,
  ArrowRight,
  BookOpen,
  KeyRound,
  ChevronLeft,
} from "lucide-react";

type AuthMode = "login" | "forgot_password" | "verify_otp" | "reset_password";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetToken, setResetToken] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
        toast.success("Welcome back!");
        if (profile?.role === "manager") router.push("/manager/rooms");
        else router.push("/student/rooms");
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email first");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to send recovery code");
      toast.success("Recovery code sent to your email");
      setMode("verify_otp");
    } catch (err: any) {
      toast.error(err.message || "Failed to send recovery code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email, otpCode: otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid or expired code");
      setResetToken(data.resetToken);
      toast.success("Code verified!");
      setMode("reset_password");
    } catch (err: any) {
      toast.error(err.message || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");
      toast.success("Password updated! Please log in.");
      setMode("login");
      setPassword(newPassword);
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-surface font-body relative overflow-hidden">
      {/* Subtle background blobs */}
      <div className="fixed -top-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-primary/[0.08] blur-[120px] pointer-events-none z-0" />
      <div className="fixed -bottom-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-secondary/[0.05] blur-[100px] pointer-events-none z-0" />

      {/* Left Column - Intro Section */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 py-12 lg:px-16 xl:px-24 z-10 relative">
        <div className="max-w-md mx-auto lg:mx-0">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-surface-container-lowest text-primary rounded-2xl shadow-sm border border-outline-variant/10 flex items-center justify-center">
              <BookOpen size={24} strokeWidth={1.5} />
            </div>
            <h1 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight">
              Reading<span className="text-primary">Space</span>
            </h1>
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.2em] text-on-surface-variant/60 mb-10">
            Premium Study Environment
          </p>

          <div className="space-y-8">
            <div className="bg-surface-container-low/40 p-5 rounded-2xl border border-outline-variant/10 backdrop-blur-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-primary/60 mb-2">
                For Students
              </p>
              <p className="text-[14px] leading-relaxed font-medium text-on-surface/80">
                Students can join a reading space, mark and track attendance, manage notes, habits and stay focused — all in one place.
              </p>
            </div>

            <div className="bg-surface-container-low/40 p-5 rounded-2xl border border-outline-variant/10 backdrop-blur-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-tertiary/60 mb-2">
                For Managers
              </p>
              <p className="text-[14px] leading-relaxed font-medium text-on-surface/80">
                Managers handle rooms, members, payments and attendance — from a single dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Auth Card */}
      <div className="w-full lg:w-[55%] flex items-center justify-center px-5 pb-12 lg:py-12 z-10">
        <div className="w-full max-w-[380px] flex flex-col">
          {/* Card */}
          <div className="bg-surface-container-lowest/90 backdrop-blur-2xl rounded-3xl p-6 lg:p-8 border border-outline-variant/10 shadow-2xl shadow-primary/5">
            {/* ── Login ──────────────────────────────────────── */}
            {mode === "login" && (
              <form
                onSubmit={handleLogin}
                className="space-y-5 animate-in fade-in duration-300"
              >
                <div className="text-center mb-6 lg:hidden">
                  <h2 className="font-headline text-2xl font-bold text-on-surface">Welcome Back</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest mb-1.5 block pl-1">
                      Email
                    </label>
                    <div className="flex items-center gap-3 bg-surface-container-low/60 px-4 py-3 rounded-2xl border border-transparent focus-within:border-outline-variant/20 focus-within:bg-surface-container-lowest transition-all group">
                      <Mail
                        size={18}
                        className="text-primary/60 shrink-0 group-focus-within:text-primary transition-colors"
                      />
                      <input
                        suppressHydrationWarning
                        type="email"
                        required
                        className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] font-medium text-on-surface placeholder:text-on-surface-variant/30 outline-none"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5 px-1">
                      <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">
                        Password
                      </label>
                      <button
                        suppressHydrationWarning
                        type="button"
                        onClick={() => setMode("forgot_password")}
                        className="text-[10px] font-bold text-primary hover:opacity-70 transition-opacity"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="flex items-center gap-3 bg-surface-container-low/60 px-4 py-3 rounded-2xl border border-transparent focus-within:border-outline-variant/20 focus-within:bg-surface-container-lowest transition-all group">
                      <Lock
                        size={18}
                        className="text-primary/60 shrink-0 group-focus-within:text-primary transition-colors"
                      />
                      <input
                        suppressHydrationWarning
                        type="password"
                        required
                        className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] font-medium text-on-surface placeholder:text-on-surface-variant/30 outline-none"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <button
                  suppressHydrationWarning
                  type="submit"
                  disabled={loading}
                  className="w-full bg-on-surface text-surface py-4 rounded-2xl text-[13px] font-bold uppercase tracking-widest shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
                >
                  {loading ? "Signing in…" : "Sign In"}
                  {!loading && <ArrowRight size={16} className="opacity-70" />}
                </button>
              </form>
            )}

            {/* ── Forgot Password ──────────────────────────── */}
            {mode === "forgot_password" && (
              <form
                onSubmit={handleForgotPassword}
                className="space-y-5 animate-in fade-in duration-300"
              >
                <div className="text-center mb-6">
                  <h2 className="font-headline text-on-surface text-lg font-bold">
                    Forgot Password?
                  </h2>
                  <p className="text-sm text-on-surface-variant/60 mt-2 leading-relaxed">
                    We'll send a recovery code to your email.
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest mb-1.5 block pl-1">
                    Email
                  </label>
                  <div className="flex items-center gap-3 bg-surface-container-low/60 px-4 py-3 rounded-2xl border border-transparent focus-within:border-outline-variant/20 transition-all group">
                    <Mail size={18} className="text-primary/60 shrink-0 group-focus-within:text-primary" />
                    <input
                      suppressHydrationWarning
                      type="email"
                      required
                      className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] font-medium text-on-surface placeholder:text-on-surface-variant/30 outline-none"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-3 pt-2">
                  <button
                    suppressHydrationWarning
                    type="submit"
                    disabled={loading}
                    className="w-full bg-on-surface text-surface py-4 rounded-2xl text-[13px] font-bold uppercase tracking-widest hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {loading ? "Sending…" : "Send Code"}
                  </button>
                  <button
                    suppressHydrationWarning
                    type="button"
                    onClick={() => setMode("login")}
                    className="w-full py-3.5 bg-surface-container-lowest text-on-surface-variant rounded-2xl border border-outline-variant/20 text-[12px] font-bold uppercase tracking-widest hover:bg-surface-container-low transition-all flex items-center justify-center gap-1.5"
                  >
                    <ChevronLeft size={16} strokeWidth={2.5} /> Back
                  </button>
                </div>
              </form>
            )}

            {/* ── Verify OTP ───────────────────────────────── */}
            {mode === "verify_otp" && (
              <form
                onSubmit={handleVerifyOtp}
                className="space-y-5 animate-in fade-in duration-300"
              >
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 text-primary rounded-full mb-4">
                    <KeyRound size={24} strokeWidth={1.5} />
                  </div>
                  <h2 className="font-headline text-on-surface text-lg font-bold">
                    Enter Code
                  </h2>
                  <p className="text-sm text-on-surface-variant/60 mt-2">
                    Sent to{" "}
                    <span className="font-semibold text-on-surface-variant">
                      {email}
                    </span>
                  </p>
                </div>
                <input
                  suppressHydrationWarning
                  type="text"
                  required
                  maxLength={6}
                  className="w-full bg-surface-container-low/50 border border-outline-variant/10 focus:border-primary/30 focus:bg-surface-container-lowest rounded-2xl p-4 text-center text-3xl font-bold tracking-[0.4em] text-on-surface placeholder:text-on-surface-variant/20 transition-all outline-none"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.trim())}
                />
                <button
                  suppressHydrationWarning
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full bg-primary text-white py-4 rounded-2xl text-[13px] font-bold uppercase tracking-widest shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
                >
                  {loading ? "Verifying…" : "Verify Code"}
                </button>
              </form>
            )}

            {/* ── Reset Password ───────────────────────────── */}
            {mode === "reset_password" && (
              <form
                onSubmit={handleResetPassword}
                className="space-y-5 animate-in fade-in duration-300"
              >
                <div className="text-center mb-6">
                  <h2 className="font-headline text-on-surface text-lg font-bold">
                    Set New Password
                  </h2>
                  <p className="text-sm text-on-surface-variant/60 mt-2">
                    At least 8 characters.
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest mb-1.5 block pl-1">
                    New Password
                  </label>
                  <div className="flex items-center gap-3 bg-surface-container-low/60 px-4 py-3 rounded-2xl border border-transparent focus-within:border-outline-variant/20 transition-all group">
                    <Lock size={18} className="text-primary/60 shrink-0 group-focus-within:text-primary" />
                    <input
                      suppressHydrationWarning
                      type="password"
                      required
                      className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] font-medium text-on-surface placeholder:text-on-surface-variant/30 outline-none"
                      placeholder="At least 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  suppressHydrationWarning
                  type="submit"
                  disabled={loading}
                  className="w-full bg-on-surface text-surface py-4 rounded-2xl text-[13px] font-bold uppercase tracking-widest shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
                >
                  {loading ? "Updating…" : "Update Password"}
                </button>
              </form>
            )}

            {/* Sign up link */}
            {mode === "login" && (
              <div className="mt-6 pt-5 border-t border-outline-variant/10 text-center">
                <p className="text-sm text-on-surface-variant/60">
                  New here?{" "}
                  <Link
                    href="/signup"
                    className="text-primary font-bold hover:opacity-70 transition-opacity"
                  >
                    Create account
                  </Link>
                </p>
              </div>
            )}
          </div>

          <p className="text-center mt-6 text-[10px] text-on-surface-variant/30 font-bold tracking-widest uppercase">
            ReadingSpace © 2025
          </p>
        </div>
      </div>
    </div>
  );
}
