import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateDistance } from "@/lib/utils/distance";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId, latitude, longitude, version } = await req.json();

    if (!roomId || !latitude || !longitude) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    // 1. Fetch Room Geofence Data and QR Version
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("name, latitude, longitude, radius, qr_version")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // 2. Verify QR Version
    if ((room.qr_version || 0) !== (version || 0)) {
      return NextResponse.json(
        {
          error:
            "This station QR code is outdated. Please scan the latest QR code displayed in the room.",
        },
        { status: 401 },
      );
    }

    // 2. Verify Geofence (if configured)
    if (room.latitude && room.longitude) {
      const distance = calculateDistance(
        latitude,
        longitude,
        room.latitude,
        room.longitude,
      );

      const allowedRadius = room.radius || 200.0; // Default 200m

      if (distance > allowedRadius) {
        return NextResponse.json(
          {
            error: `Verification failed: You are ${Math.round(distance)}m away from ${room.name}. Required range is ${allowedRadius}m.`,
          },
          { status: 403 },
        );
      }
    }

    // 3. Log Attendance
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
    }).format(new Date());

    // Check if already marked for today (to avoid duplicates from accidental scan)
    const { data: existing } = await supabase
      .from("attendance_logs")
      .select("id")
      .eq("student_id", user.id)
      .eq("room_id", roomId)
      .eq("date", today)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Attendance already marked for today" },
        { status: 409 },
      );
    }

    const { error: insertError } = await supabase
      .from("attendance_logs")
      .insert({
        student_id: user.id,
        room_id: roomId,
        marked_by: "self",
        date: today,
      });

    if (insertError) {
      console.error("Attendance Log Error:", insertError);
      return NextResponse.json(
        { error: "Failed to record attendance" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Welcome to ${room.name}! Attendance verified.`,
    });
  } catch (err: any) {
    console.error("Check-in API Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
