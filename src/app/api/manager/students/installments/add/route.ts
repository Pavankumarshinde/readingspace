import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      studentId,
      roomId,
      subscriptionId,
      startDate,
      endDate,
      status,
      paymentDate,
      amount,
      notes,
    } = await req.json();

    if (!studentId || !roomId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (new Date(endDate) < new Date(startDate)) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 },
      );
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

    const resolvedStatus = status || "due";
    const resolvedPaymentDate =
      resolvedStatus === "paid"
        ? paymentDate
          ? new Date(paymentDate).toISOString()
          : new Date().toISOString()
        : null;

    const supabaseAdmin = await createAdminClient();
    const { error } = await supabaseAdmin.from("installments").insert({
      student_id: studentId,
      room_id: roomId,
      subscription_id: subscriptionId || null,
      start_date: startDate,
      end_date: endDate,
      status: resolvedStatus,
      payment_date: resolvedPaymentDate,
      amount: amount ? parseFloat(amount) : null,
      notes: notes || null,
    });

    if (error) {
      console.error("Installment insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error adding installment:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
