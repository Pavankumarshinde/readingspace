import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/server";
import {
  buildGenericOtpSendMessage,
  generateOtp,
  getCooldownIso,
  getExpiryIso,
  getOtpConfig,
  hashSecret,
  isEmailIdentifier,
  normalizeEmail,
  normalizePhone,
} from "@/lib/security/otp";

// nodemailer requires Node.js net/tls/dns — must use nodejs runtime
export const runtime = "nodejs";

const ipRateLimit = new Map<string, { count: number; expiresAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRateLimit.get(ip);
  if (record && record.expiresAt > now) {
    if (record.count >= 5) return false;
    record.count++;
  } else {
    // 5 requests per minute per IP
    ipRateLimit.set(ip, { count: 1, expiresAt: now + 60 * 1000 }); 
  }
  return true;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const { identifier } = await req.json();

    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json(
        { error: "Email or phone is required" },
        { status: 400 },
      );
    }

    const trimmedIdentifier = identifier.trim();
    const admin = await createAdminClient();

    const normalizedEmail = isEmailIdentifier(trimmedIdentifier)
      ? normalizeEmail(trimmedIdentifier)
      : null;

    const normalizedPhone = !isEmailIdentifier(trimmedIdentifier)
      ? normalizePhone(trimmedIdentifier)
      : null;

    if (normalizedPhone !== null && !normalizedPhone) {
      return NextResponse.json(
        { error: "Invalid identifier" },
        { status: 400 },
      );
    }

    const profileLookup = normalizedEmail
      ? admin
          .from("profiles")
          .select("id, email")
          .eq("email", normalizedEmail)
          .limit(1)
          .maybeSingle()
      : admin
          .from("profiles")
          .select("id, email")
          .eq("phone", normalizedPhone || "")
          .limit(1)
          .maybeSingle();

    const { data: profile } = await profileLookup;

    if (!profile?.id || !profile.email) {
      return NextResponse.json(buildGenericOtpSendMessage());
    }

    const targetEmail = normalizeEmail(profile.email);
    const config = getOtpConfig();

    const { data: latestOtp } = await admin
      .from("profile_verification_otps")
      .select("id, cooldown_until, created_at")
      .eq("user_id", profile.id)
      .eq("purpose", "forgot_password")
      .is("consumed_at", null)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      latestOtp?.cooldown_until &&
      new Date(latestOtp.cooldown_until).getTime() > Date.now()
    ) {
      return NextResponse.json(buildGenericOtpSendMessage());
    }

    const otpCode = generateOtp(config.otpLength);
    const otpHash = hashSecret(otpCode);

    const { error: insertError } = await admin
      .from("profile_verification_otps")
      .insert({
        user_id: profile.id,
        email: targetEmail,
        otp_hash: otpHash,
        purpose: "forgot_password",
        expires_at: getExpiryIso(config.otpTtlMinutes),
        cooldown_until: getCooldownIso(config.cooldownSeconds),
        max_attempts: config.maxAttempts,
        attempt_count: 0,
        target_identifier: targetEmail,
      });

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to generate OTP" },
        { status: 500 },
      );
    }

    try {
      const resend = new Resend(process.env.RESEND_API_KEY!);
      
      await resend.emails.send({
        from: "ReadingSpace Security <noreply@readingspace.app>",
        to: [targetEmail],
        subject: `Your Password Reset Code: ${otpCode}`,
        html: `
<div style="font-family: 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; background: #fffaf5; border-radius: 16px; padding: 40px; color: #1f1f1f; border: 1px solid #f0ebe0;">
  <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #8B2500;">Password Reset</h2>
  <p style="color: #555; font-size: 15px; margin-bottom: 24px;">Use the code below to reset your <strong>ReadingSpace</strong> account password. Do not share this code with anyone.</p>
  <div style="background: #fff; border: 1px solid #e8ddd0; padding: 28px 20px; text-align: center; font-size: 38px; font-weight: 800; letter-spacing: 10px; border-radius: 12px; color: #8B2500; margin-bottom: 24px;">
    ${otpCode}
  </div>
  <p style="color: #888; font-size: 13px;">This code expires in <strong>${config.otpTtlMinutes} minutes</strong>. If you did not request this, you can safely ignore this email.</p>
  <hr style="border: none; border-top: 1px solid #f0ebe0; margin: 28px 0;" />
  <p style="color: #bbb; font-size: 11px; text-align: center;">READINGSPACE © 2025 · PREMIUM STUDY ENVIRONMENT</p>
</div>
`,
      });
    } catch (emailError) {
      console.error("Failed to dispatch forgot-password OTP email:", emailError);
      // Don't fail the request — OTP is already stored, user can retry
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`Forgot-password OTP for ${targetEmail}: ${otpCode}`);
    }

    return NextResponse.json(buildGenericOtpSendMessage());
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

