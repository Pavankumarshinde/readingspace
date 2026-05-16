import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET /api/manager/attendance/sessions?roomId=X&date=YYYY-MM-DD
export async function GET(req: Request) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseAdmin = await createAdminClient();

    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");
    const date = searchParams.get("date");
    const month = searchParams.get("month"); // YYYY-MM
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;

    if (!roomId) return NextResponse.json({ error: "roomId required" }, { status: 400 });

    const { data: roomCheck } = await supabaseAuth
      .from("rooms").select("id").eq("id", roomId).eq("manager_id", user.id).single();
    if (!roomCheck) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    let query = supabaseAdmin
      .from("attendance_sessions")
      .select("*, student:profiles(name, email)", { count: "exact" })
      .eq("room_id", roomId)
      .order("check_in_at", { ascending: false });

    if (dateFrom && dateTo) {
      query = query.gte("date", dateFrom).lte("date", dateTo);
    } else if (date) {
      query = query.eq("date", date);
    } else if (month) {
      const [year, mStr] = month.split("-");
      let y = parseInt(year);
      let m = parseInt(mStr);
      let nextM = m + 1;
      let nextY = y;
      if (nextM > 12) {
        nextM = 1;
        nextY = y + 1;
      }
      const nextMonthStr = `${nextY}-${String(nextM).padStart(2, "0")}-01`;
      query = query.gte("date", `${month}-01`).lt("date", nextMonthStr);
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1);
    if (error) throw error;

    return NextResponse.json({ sessions: data || [], total: count || 0, page, limit });
  } catch (err: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
