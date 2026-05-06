import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET /api/manager/attendance/sessions?roomId=X&date=YYYY-MM-DD
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");
    const date = searchParams.get("date");
    const month = searchParams.get("month"); // YYYY-MM

    if (!roomId) return NextResponse.json({ error: "roomId required" }, { status: 400 });

    const { data: roomCheck } = await supabase
      .from("rooms").select("id").eq("id", roomId).eq("manager_id", user.id).single();
    if (!roomCheck) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    let query = supabase
      .from("attendance_sessions")
      .select("*, student:profiles(name, email)")
      .eq("room_id", roomId)
      .order("check_in_at", { ascending: false });

    if (date) {
      query = query.eq("date", date);
    } else if (month) {
      query = query.gte("date", `${month}-01`).lte("date", `${month}-31`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ sessions: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
