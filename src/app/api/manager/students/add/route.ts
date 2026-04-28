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

    const { name, phone, room, seat, startDate, endDate } = await req.json();

    // Log the payload for debugging
    console.log("Received payload:", {
      name,
      phone,
      room,
      seat,
      startDate,
      endDate,
    });

    // ... Validation ...
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
      console.log("Room check failed:", roomError);
      return NextResponse.json(
        { error: "Room not found or unauthorized" },
        { status: 403 },
      );
    }

    const supabaseAdmin = await createAdminClient();
    const placeholderEmail = generateManagedPlaceholderEmail(name.trim(), room);
    const placeholderPassword = generateManagedPassword();

    console.log("Creating auth user with email:", placeholderEmail);

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
    console.log("Auth user created:", studentId);

    const { error: profileUpsertError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: studentId,
          name: name.trim(),
          phone: phone?.trim() || "",
          membership_type: "managed",
          email: placeholderEmail, // Might be required by DB schema
        },
        { onConflict: "id" },
      );

    if (profileUpsertError) {
      console.error("Profile Upsert Error:", profileUpsertError);
      // Usually non-fatal if trigger handles it, but maybe schema fails
    }

    // Dup check
    const { data: existingSub, error: subCheckErr } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("student_id", studentId)
      .eq("room_id", room)
      .eq("status", "active")
      .maybeSingle();

    if (subCheckErr) console.error("Sub check error:", subCheckErr);

    if (existingSub) {
      return NextResponse.json(
        { error: "Student already has active subscription" },
        { status: 400 },
      );
    }

    console.log(
      "Inserting subscription for student:",
      studentId,
      "room:",
      room,
    );
    const { error: subError } = await supabase.from("subscriptions").insert({
      student_id: studentId,
      room_id: room,
      seat_number: seat?.trim() || "Unassigned",
      tier: "standard",
      start_date: startDate,
      end_date: endDate,
      status: "active",
      invite_sent: false,
      membership_type: "managed",
    });

    if (subError) {
      console.error("Sub Insert Error:", subError);
      return NextResponse.json(
        { error: `Sub Insert Error: ${subError.message}`, details: subError },
        { status: 500 },
      );
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
