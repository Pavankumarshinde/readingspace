import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
      return NextResponse.json(
        { error: "Missing roomId" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch installments for this student+room
    const { data: installments, error } = await supabase
      .from("installments")
      .select("id, start_date, end_date, status, payment_date, amount, notes")
      .eq("student_id", user.id)
      .eq("room_id", roomId)
      .order("end_date", { ascending: false });

    if (error) throw error;

    // Compute payment-based status and effective expiry from installments
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const paid = (installments || []).filter((i: any) => i.status === "paid");

    const activePaid = paid.filter((ins: any) => {
      const s = new Date(ins.start_date);
      s.setHours(0, 0, 0, 0);
      const e = new Date(ins.end_date);
      e.setHours(23, 59, 59, 999);
      return s <= today && today <= e;
    });

    const effectiveExpiry =
      paid.length > 0
        ? paid.reduce(
            (max: string, ins: any) =>
              ins.end_date > max ? ins.end_date : max,
            paid[0].end_date
          )
        : null;

    const allInst = installments || [];
    const planStart =
      allInst.length > 0
        ? allInst.reduce((min: string, i: any) => (i.start_date < min ? i.start_date : min), allInst[0].start_date)
        : null;

    const planEnd =
      paid.length > 0
        ? paid.reduce((max: string, i: any) => (i.end_date > max ? i.end_date : max), paid[0].end_date)
        : allInst.length > 0
          ? allInst.reduce((max: string, i: any) => (i.end_date > max ? i.end_date : max), allInst[0].end_date)
          : null;

    const isActive = activePaid.length > 0;

    return NextResponse.json({
      installments,
      paymentStatus: {
        isActive,
        effectiveExpiry,
        planStart,
        planEnd,
        status: isActive ? "active" : "expired",
      },
    });
  } catch (err: any) {
    console.error("Error fetching student installments:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
