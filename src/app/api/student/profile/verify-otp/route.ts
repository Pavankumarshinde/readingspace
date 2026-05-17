import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  generateProofToken,
  getExpiryIso,
  getOtpConfig,
  hashSecret,
  timingSafeEqualHex,
} from "@/lib/security/otp";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { otpCode } = await req.json();

    if (!otpCode || typeof otpCode !== "string") {
      return NextResponse.json({ error: "OTP is required" }, { status: 400 });
    }

    const { data: otpRow } = await supabase
      .from("profile_verification_otps")
      .select("*")
      .eq("user_id", user.id)
      .eq("purpose", "profile_update")
      .is("used_at", null)
      .is("consumed_at", null)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpRow) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 },
      );
    }

    const maxAttempts =
      typeof otpRow.max_attempts === "number"
        ? otpRow.max_attempts
        : getOtpConfig().maxAttempts;
    const attempts =
      typeof otpRow.attempt_count === "number" ? otpRow.attempt_count : 0;

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: "Too many attempts. Request a new OTP." },
        { status: 429 },
      );
    }

    const incomingHash = hashSecret(otpCode.trim());
    const storedHash = otpRow.otp_hash || "";

    if (!storedHash || !timingSafeEqualHex(storedHash, incomingHash)) {
      await supabase
        .from("profile_verification_otps")
        .update({ attempt_count: attempts + 1 })
        .eq("id", otpRow.id);

      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 },
      );
    }

    const proofToken = generateProofToken();
    const proofHash = hashSecret(proofToken);

    const { error: updateError } = await supabase
      .from("profile_verification_otps")
      .update({
        used_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
        proof_hash: proofHash,
        proof_expires_at: getExpiryIso(getOtpConfig().proofTtlMinutes),
      })
      .eq("id", otpRow.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to verify OTP" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "OTP verified securely",
      proofToken,
      expiresInSec: getOtpConfig().proofTtlMinutes * 60,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 },
    );
  }
}
