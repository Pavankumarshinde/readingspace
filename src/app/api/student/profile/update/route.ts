import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  hashSecret,
  isSensitiveStudentUpdate,
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

    const updates = await req.json();
    const { otpProofToken } = updates;

    const allowedFields = ["name", "phone", "bio", "gender"];
    const safePayload: Record<string, unknown> = {};

    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        safePayload[key] = updates[key];
      }
    }

    if (Object.keys(safePayload).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update" },
        { status: 400 },
      );
    }

    if (isSensitiveStudentUpdate(safePayload)) {
      if (!otpProofToken || typeof otpProofToken !== "string") {
        return NextResponse.json(
          { error: "OTP verification is required for phone updates" },
          { status: 400 },
        );
      }

      const proofHash = hashSecret(otpProofToken);

      const { data: otpRow } = await supabase
        .from("profile_verification_otps")
        .select("id, proof_hash")
        .eq("user_id", user.id)
        .eq("purpose", "profile_update")
        .eq("proof_hash", proofHash)
        .is("consumed_at", null)
        .gte("proof_expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (
        !otpRow?.proof_hash ||
        !timingSafeEqualHex(otpRow.proof_hash, proofHash)
      ) {
        return NextResponse.json(
          { error: "Invalid or expired OTP proof" },
          { status: 400 },
        );
      }

      await supabase
        .from("profile_verification_otps")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", otpRow.id);
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(safePayload)
      .eq("id", user.id);

    if (updateError) {
      console.error("Profile Update Error:", updateError);
      return NextResponse.json(
        { error: "Failed to update profile data" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Profile safely updated",
    });
  } catch (err: any) {
    console.error("Server error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 },
    );
  }
}
