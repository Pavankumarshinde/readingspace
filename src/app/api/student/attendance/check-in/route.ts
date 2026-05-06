import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { calculateDistance } from "@/lib/utils/distance";

const todayIST = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const nowIST = () => new Date().toISOString();
const endOfDayIST = (dateStr: string) =>
  new Date(`${dateStr}T23:59:59+05:30`).toISOString();

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { roomId, latitude, longitude, version } = await req.json();
    if (!roomId || !latitude || !longitude)
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });

    // 1. Fetch room details
    const { data: room } = await supabase
      .from("rooms").select("name, latitude, longitude, radius, qr_version").eq("id", roomId).single();
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // 2. QR Version check
    if ((room.qr_version || 0) !== (version || 0))
      return NextResponse.json({ error: "This station QR code is outdated. Please scan the latest QR code displayed in the room." }, { status: 401 });

    // 3. Geofence
    if (room.latitude && room.longitude) {
      const distance = calculateDistance(latitude, longitude, room.latitude, room.longitude);
      const allowed = room.radius || 200.0;
      if (distance > allowed)
        return NextResponse.json({
          error: `Verification failed: You are ${Math.round(distance)}m away from ${room.name}. Required range is ${allowed}m.`,
        }, { status: 403 });
    }

    const today = todayIST();
    const supabaseAdmin = await createAdminClient();

    // 4. Check for open session today
    const { data: openSession } = await supabaseAdmin
      .from("attendance_sessions")
      .select("id")
      .eq("student_id", user.id)
      .eq("room_id", roomId)
      .eq("date", today)
      .is("check_out_at", null)
      .maybeSingle();

    if (openSession) {
      // CHECK OUT
      const checkOutTime = nowIST();
      await supabaseAdmin
        .from("attendance_sessions")
        .update({ check_out_at: checkOutTime })
        .eq("id", openSession.id);

      return NextResponse.json({
        success: true,
        action: "check_out",
        message: `Checked out of ${room.name}. See you tomorrow!`,
        check_out_at: checkOutTime,
      });
    }

    // CHECK IN
    const checkInTime = nowIST();
    const { error: sessionError } = await supabaseAdmin
      .from("attendance_sessions")
      .insert({
        student_id: user.id,
        room_id: roomId,
        date: today,
        check_in_at: checkInTime,
        marked_by: "self",
      });

    if (sessionError) {
      console.error("Session insert error:", sessionError);
      return NextResponse.json({ error: "Failed to record session" }, { status: 500 });
    }

    // Legacy attendance_logs (backward compat — only first check-in of day)
    const { data: existingLog } = await supabase
      .from("attendance_logs").select("id")
      .eq("student_id", user.id).eq("room_id", roomId).eq("date", today).maybeSingle();

    if (!existingLog) {
      await supabaseAdmin.from("attendance_logs").insert({
        student_id: user.id, room_id: roomId, marked_by: "self", date: today,
      });
    }

    return NextResponse.json({
      success: true,
      action: "check_in",
      message: `Welcome to ${room.name}! Attendance verified.`,
      check_in_at: checkInTime,
    });
  } catch (err: any) {
    console.error("Check-in API Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
