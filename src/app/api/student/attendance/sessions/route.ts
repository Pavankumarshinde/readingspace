import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET /api/student/attendance/sessions?roomId=X&month=YYYY-MM&date=YYYY-MM-DD
//
// Strategy:
// 1. Always fetch from attendance_sessions (supports multiple sessions/day with check-out times)
// 2. Only fall back to attendance_logs for dates where NO sessions exist at all (old data)
export async function GET(req: Request) {
  try {
    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseAdmin = await createAdminClient();

    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");
    const month = searchParams.get("month"); // YYYY-MM
    const date = searchParams.get("date"); // YYYY-MM-DD

    if (!roomId) return NextResponse.json({ error: "roomId required" }, { status: 400 });

    // Build date range bounds
    let dateFrom: string;
    let dateTo: string;

    if (date) {
      dateFrom = date;
      dateTo = date;
    } else if (month) {
      const [year, mStr] = month.split("-");
      const y = parseInt(year);
      const m = parseInt(mStr);
      const nextM = m === 12 ? 1 : m + 1;
      const nextY = m === 12 ? y + 1 : y;
      dateFrom = `${month}-01`;
      dateTo = `${nextY}-${String(nextM).padStart(2, "0")}-01`;
    } else {
      return NextResponse.json({ error: "month or date required" }, { status: 400 });
    }

    // ─── 1. Always fetch attendance_sessions (supports multiple sessions/day + check-out) ───
    let sessionsQuery = supabaseAdmin
      .from("attendance_sessions")
      .select("id, date, check_in_at, check_out_at, marked_by, is_auto_checkout")
      .eq("student_id", user.id)
      .eq("room_id", roomId)
      .order("check_in_at", { ascending: false });

    if (date) {
      sessionsQuery = sessionsQuery.eq("date", date);
    } else {
      sessionsQuery = sessionsQuery.gte("date", dateFrom).lt("date", dateTo);
    }

    const { data: sessionsData, error: sessErr } = await sessionsQuery;

    if (!sessErr && sessionsData && sessionsData.length > 0) {
      // We have real sessions — return them directly (includes all check-in/out pairs)
      return NextResponse.json({ sessions: sessionsData, source: "sessions" });
    }

    // ─── 2. Fall back to attendance_logs ONLY for dates with no sessions at all ────────────
    // (legacy data before attendance_sessions was introduced)
    let logsQuery = supabaseAdmin
      .from("attendance_logs")
      .select("id, date, timestamp, marked_by")
      .eq("student_id", user.id)
      .eq("room_id", roomId)
      .order("date", { ascending: false });

    if (date) {
      logsQuery = logsQuery.eq("date", date);
    } else {
      logsQuery = logsQuery.gte("date", dateFrom).lt("date", dateTo);
    }

    const { data: logsData, error: logsErr } = await logsQuery;
    if (logsErr) throw logsErr;

    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

    // Synthesize sessions from legacy logs (one entry per day, no real check-out time)
    const synthesized = (logsData || []).map((log: any) => {
      const checkInAt = log.timestamp || `${log.date}T09:00:00+05:30`;
      const checkOutAt =
        log.date < today
          ? `${log.date}T23:59:59+05:30` // auto-closed for past days (legacy)
          : null; // still open today

      return {
        id: log.id,
        date: log.date,
        check_in_at: checkInAt,
        check_out_at: checkOutAt,
        marked_by: log.marked_by,
        is_auto_checkout: log.date < today,
      };
    });

    return NextResponse.json({ sessions: synthesized, source: "logs" });
  } catch (err: any) {
    console.error("Sessions fetch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
