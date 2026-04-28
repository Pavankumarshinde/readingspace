import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { studentId, roomId, version } = await req.json();

    if (!studentId || !roomId) {
      return NextResponse.json({ error: "Invalid QR data" }, { status: 400 });
    }

    // 1. Verify manager owns the room
    const { data: roomCheck, error: roomError } = await supabase
      .from("rooms")
      .select("id, name")
      .eq("id", roomId)
      .eq("manager_id", user.id)
      .single();

    if (roomError || !roomCheck) {
      return NextResponse.json(
        { error: "Unauthorized or room not found" },
        { status: 403 },
      );
    }

    // 2. Verify QR Version
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("qr_version, status")
      .eq("student_id", studentId)
      .eq("room_id", roomId)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: "Active subscription not found" },
        { status: 404 },
      );
    }

    if (subscription.status !== "active") {
      return NextResponse.json(
        { error: "Subscription is not active" },
        { status: 403 },
      );
    }

    if ((subscription.qr_version || 0) !== (version || 0)) {
      return NextResponse.json(
        { error: "This QR code has been regenerated and is no longer valid." },
        { status: 401 },
      );
    }

    // 2. Log attendance
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
    }).format(new Date());

    // Check if already marked for today
    const { data: existing } = await supabase
      .from("attendance_logs")
      .select("id")
      .eq("student_id", studentId)
      .eq("room_id", roomId)
      .eq("date", today)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Attendance already marked for today" },
        { status: 409 },
      );
    }

    const { data: attendance, error: attendanceError } = await supabase
      .from("attendance_logs")
      .insert({
        student_id: studentId,
        room_id: roomId,
        marked_by: "manager",
        date: today,
      })
      .select(
        `
 id,
 timestamp,
 profiles(name, email)
 `,
      )
      .single();

    if (attendanceError) {
      console.error("Attendance log error:", attendanceError);
      return NextResponse.json(
        { error: "Failed to log attendance" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Attendance marked for ${(attendance.profiles as any)?.name || "Student"}`,
      student: attendance.profiles,
    });
  } catch (err: any) {
    console.error("Attendance Scan Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
