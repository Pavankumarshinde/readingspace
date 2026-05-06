import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/student/attendance/sessions?roomId=X&month=YYYY-MM
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");
    const month = searchParams.get("month"); // YYYY-MM
    const date = searchParams.get("date");   // YYYY-MM-DD

    if (!roomId) return NextResponse.json({ error: "roomId required" }, { status: 400 });

    let query = supabase
      .from("attendance_sessions")
      .select("id, date, check_in_at, check_out_at, marked_by, is_auto_checkout")
      .eq("student_id", user.id)
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
    console.error("Sessions fetch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
