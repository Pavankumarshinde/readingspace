import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// POST /api/cron/auto-checkout
// Called by a scheduler (Vercel Cron, external cron, or manual trigger) at end of day.
// Closes all attendance_sessions that are still open (check_out_at IS NULL) from previous days.
// Also closes today's sessions if called after 23:30 IST.
//
// Secure this with CRON_SECRET in your environment variables.
// Header: Authorization: Bearer <CRON_SECRET>

const IST_OFFSET = 5.5 * 60 * 60 * 1000; // 5h30m in ms

function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function endOfDayIST(dateStr: string): string {
  // Returns ISO string for 23:59:59 IST on that date
  return new Date(`${dateStr}T23:59:59+05:30`).toISOString();
}

export async function POST(req: Request) {
  // Auth check
  const authHeader = req.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabaseAdmin = await createAdminClient();
    const today = todayIST();

    // 1. Find all open sessions from PREVIOUS days (definitely forgot to check out)
    const { data: previousOpenSessions, error: prevErr } = await supabaseAdmin
      .from("attendance_sessions")
      .select("id, date, student_id")
      .is("check_out_at", null)
      .lt("date", today); // strictly before today

    if (prevErr) throw prevErr;

    // 2. Check if current IST time is past 23:30 (if so, also close today's open sessions)
    const nowIST = new Date(Date.now() + IST_OFFSET);
    const istHour = nowIST.getUTCHours();
    const istMinute = nowIST.getUTCMinutes();
    const isPastEndOfDay = istHour === 23 && istMinute >= 30;

    let todayOpenSessions: any[] = [];
    if (isPastEndOfDay) {
      const { data: todaySessions, error: todayErr } = await supabaseAdmin
        .from("attendance_sessions")
        .select("id, date, student_id")
        .is("check_out_at", null)
        .eq("date", today);

      if (todayErr) throw todayErr;
      todayOpenSessions = todaySessions || [];
    }

    const allOpenSessions = [
      ...(previousOpenSessions || []),
      ...todayOpenSessions,
    ];

    if (allOpenSessions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No open sessions found. Nothing to close.",
        closed: 0,
      });
    }

    // 3. Close each session with end-of-day timestamp for its date using the bulk RPC
    const sessionsByDate: Record<string, string[]> = allOpenSessions.reduce((acc, session) => {
      if (!acc[session.date]) acc[session.date] = [];
      acc[session.date].push(session.id);
      return acc;
    }, {} as Record<string, string[]>);

    let succeeded = 0;
    let failed = 0;

    for (const [date, sessionIds] of Object.entries(sessionsByDate)) {
      const closeTime = endOfDayIST(date);
      const { data: updatedCount, error } = await supabaseAdmin.rpc(
        "bulk_close_attendance_sessions",
        {
          p_session_ids: sessionIds,
          p_close_time: closeTime,
        }
      );

      if (error) {
        console.error(`Bulk update failed for date ${date}:`, error);
        failed += sessionIds.length;
      } else {
        succeeded += updatedCount || 0;
      }
    }

    console.log(`Auto-checkout: closed ${succeeded} sessions, ${failed} failed`);

    return NextResponse.json({
      success: true,
      message: `Auto-checkout complete. Closed ${succeeded} open session(s).`,
      closed: succeeded,
      failed,
      previousDays: (previousOpenSessions || []).length,
      today: todayOpenSessions.length,
    });
  } catch (err: any) {
    console.error("Auto-checkout cron error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Also support GET for Vercel Cron (which sends GET requests)
export async function GET(req: Request) {
  return POST(req);
}
