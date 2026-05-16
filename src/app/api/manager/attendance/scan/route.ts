import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// IST helpers
const todayIST = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

const nowUTC = () => new Date().toISOString();

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { studentId, roomId, version } = await req.json();
    if (!studentId || !roomId)
      return NextResponse.json({ error: "Invalid QR data" }, { status: 400 });

    // 1. Verify manager owns the room
    const { data: roomCheck } = await supabase
      .from("rooms").select("id, name").eq("id", roomId).eq("manager_id", user.id).single();
    if (!roomCheck)
      return NextResponse.json({ error: "Unauthorized or room not found" }, { status: 403 });

    // 2. Verify QR version (enrollment metadata — still from subscriptions)
    const { data: enrollment } = await supabase
      .from("subscriptions").select("qr_version")
      .eq("student_id", studentId).eq("room_id", roomId).single();
    if (!enrollment)
      return NextResponse.json({ error: "Student is not enrolled in this room" }, { status: 404 });
    if ((enrollment.qr_version || 0) !== (version || 0))
      return NextResponse.json({ error: "This QR code has been regenerated and is no longer valid." }, { status: 401 });

    // 3. Gate on active paid installment (installments = source of truth for payment status)
    const today = todayIST();
    const { data: activeInstallment } = await supabase
      .from("installments")
      .select("id")
      .eq("student_id", studentId)
      .eq("room_id", roomId)
      .eq("status", "paid")
      .lte("start_date", today)
      .gte("end_date", today)
      .limit(1)
      .maybeSingle();

    if (!activeInstallment)
      return NextResponse.json({ error: "No active paid installment. Please contact the manager." }, { status: 403 });

    // 4. Get student profile
    const { data: profile } = await supabase
      .from("profiles").select("name, email").eq("id", studentId).single();

    const supabaseAdmin = await createAdminClient();

    // 5. Check for open session today (check_out_at IS NULL)
    const { data: openSession } = await supabaseAdmin
      .from("attendance_sessions")
      .select("id")
      .eq("student_id", studentId)
      .eq("room_id", roomId)
      .eq("date", today)
      .is("check_out_at", null)
      .maybeSingle();

    if (openSession) {
      // CHECK OUT — close the open session
      const checkOutTime = nowUTC();
      await supabaseAdmin
        .from("attendance_sessions")
        .update({ check_out_at: checkOutTime })
        .eq("id", openSession.id);

      return NextResponse.json({
        success: true,
        action: "check_out",
        message: `${profile?.name || "Student"} checked out`,
        student: profile,
        check_out_at: checkOutTime,
      });
    }

    // CHECK IN — create new session
    const checkInTime = nowUTC();
    const { error: sessionError } = await supabaseAdmin
      .from("attendance_sessions")
      .insert({
        student_id: studentId,
        room_id: roomId,
        date: today,
        check_in_at: checkInTime,
        marked_by: "manager",
      });

    if (sessionError) {
      console.error("Session insert error:", sessionError);
      return NextResponse.json({ error: "Failed to log session" }, { status: 500 });
    }

    // Also insert into legacy attendance_logs if not already there today
    const { data: existingLog } = await supabase
      .from("attendance_logs").select("id")
      .eq("student_id", studentId).eq("room_id", roomId).eq("date", today).maybeSingle();

    if (!existingLog) {
      await supabaseAdmin.from("attendance_logs").insert({
        student_id: studentId, room_id: roomId, marked_by: "manager", date: today,
      });
    }

    return NextResponse.json({
      success: true,
      action: "check_in",
      message: `${profile?.name || "Student"} checked in`,
      student: profile,
      check_in_at: checkInTime,
    });
  } catch (err: any) {
    console.error("Attendance Scan Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
