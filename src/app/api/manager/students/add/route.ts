import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  generateManagedPlaceholderEmail,
  generateManagedPassword,
} from "@/lib/security/otp";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, phone, room, seat, startDate, endDate, paymentStatus } =
      await req.json();

    // Validation
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Student name is required" },
        { status: 400 },
      );
    }
    if (!room || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Room, start date, and end date are required" },
        { status: 400 },
      );
    }
    if (new Date(endDate) < new Date(startDate)) {
      return NextResponse.json(
        { error: "End date must be on or after the start date" },
        { status: 400 },
      );
    }

    // Verify manager owns the room
    const { data: roomCheck, error: roomError } = await supabase
      .from("rooms")
      .select("id, name")
      .eq("id", room)
      .eq("manager_id", user.id)
      .single();

    if (roomError || !roomCheck) {
      return NextResponse.json(
        { error: "Room not found or unauthorized" },
        { status: 403 },
      );
    }

    const supabaseAdmin = await createAdminClient();
    const placeholderEmail = generateManagedPlaceholderEmail(name.trim(), room);
    const placeholderPassword = generateManagedPassword();

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: placeholderEmail,
        password: placeholderPassword,
        email_confirm: true,
        user_metadata: {
          name: name.trim(),
          role: "student",
          phone: phone?.trim() || "",
          membership_type: "managed",
        },
      });

    if (authError) {
      console.error("Auth Error:", authError);
      return NextResponse.json(
        { error: `Auth error: ${authError.message}` },
        { status: 500 },
      );
    }

    const studentId = authData.user.id;

    await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: studentId,
          name: name.trim(),
          phone: phone?.trim() || "",
          membership_type: "managed",
          email: placeholderEmail,
        },
        { onConflict: "id" },
      );

    // Dup check — already enrolled?
    const { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("student_id", studentId)
      .eq("room_id", room)
      .maybeSingle();

    if (existingSub) {
      return NextResponse.json(
        { error: "Student is already enrolled in this room" },
        { status: 400 },
      );
    }

    // Create enrollment record.
    // start_date / end_date are stored here to satisfy the DB NOT NULL constraint.
    // They are NOT used by app logic — the installments table is the source of truth
    // for all payment, plan period, and status data.
    const { data: subData, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        student_id: studentId,
        room_id: room,
        seat_number: seat?.trim() || "Unassigned",
        tier: "standard",
        membership_type: "managed",
        invite_sent: false,
        // Shadow copies for DB schema compat — app reads these from installments
        start_date: startDate,
        end_date: endDate,
      })
      .select("id")
      .single();

    if (subError || !subData) {
      console.error("Sub Insert Error:", subError);
      return NextResponse.json(
        { error: `Enrollment failed: ${subError?.message}` },
        { status: 500 },
      );
    }

    // Create the first installment — this is the authoritative payment record.
    // start_date, end_date, and payment status live exclusively here.
    const resolvedStatus = paymentStatus || "due";
    const { error: installmentError } = await supabaseAdmin
      .from("installments")
      .insert({
        student_id: studentId,
        room_id: room,
        subscription_id: subData.id,
        start_date: startDate,
        end_date: endDate,
        status: resolvedStatus,
        payment_date:
          resolvedStatus === "paid" ? new Date().toISOString() : null,
      });

    if (installmentError) {
      console.error("Installment Insert Error:", installmentError);
      // Enrollment succeeded — manager can add installment via Plan & Billing modal
    }

    return NextResponse.json({
      success: true,
      message: "Student successfully enrolled",
    });
  } catch (err: any) {
    console.error("Unhandled server error in students/add:", err);
    return NextResponse.json(
      { error: `Internal server error: ${err.message}` },
      { status: 500 },
    );
  }
}
