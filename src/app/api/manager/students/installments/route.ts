import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const roomId = searchParams.get("roomId");

    if (!studentId || !roomId) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    // Verify manager owns this room
    const { data: roomCheck } = await supabase
      .from("rooms")
      .select("id")
      .eq("id", roomId)
      .eq("manager_id", user.id)
      .single();

    if (!roomCheck) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch installments — source of truth for all payment/plan data
    const { data: installments, error: instError } = await supabase
      .from("installments")
      .select("*")
      .eq("student_id", studentId)
      .eq("room_id", roomId)
      .order("start_date", { ascending: false });

    if (instError) throw instError;

    // Fetch enrollment metadata from subscriptions (seat, tier, qr_version — NOT dates/status)
    const { data: enrollment } = await supabase
      .from("subscriptions")
      .select("id, seat_number, tier, membership_type, qr_version")
      .eq("student_id", studentId)
      .eq("room_id", roomId)
      .maybeSingle();

    return NextResponse.json({ installments, subscription: enrollment });
  } catch (err: any) {
    console.error("Error fetching installments:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
