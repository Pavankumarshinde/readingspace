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

    // Use the atomic RPC transaction to insert profile, subscription, and installment
    const resolvedStatus = paymentStatus || "due";
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
      "enroll_student_transaction",
      {
        p_student_id: studentId,
        p_name: name.trim(),
        p_phone: phone?.trim() || "",
        p_email: placeholderEmail,
        p_room_id: room,
        p_seat_number: seat?.trim() || "Unassigned",
        p_start_date: startDate,
        p_end_date: endDate,
        p_payment_status: resolvedStatus,
      }
    );

    if (rpcError) {
      console.error("RPC Transaction Error:", rpcError);
      // Rollback: Delete the auth user if DB insertion failed
      await supabaseAdmin.auth.admin.deleteUser(studentId);
      
      return NextResponse.json(
        { error: `Enrollment failed: ${rpcError.message}. Auth user rolled back.` },
        { status: 500 }
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
