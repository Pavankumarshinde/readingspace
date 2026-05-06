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

    const { installmentId, subscriptionId, paymentStatus, paymentDate } =
      await req.json();

    if (!paymentStatus) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const validStatuses = ["paid", "due", "overdue"];
    if (!validStatuses.includes(paymentStatus)) {
      return NextResponse.json(
        { error: "Invalid payment status" },
        { status: 400 },
      );
    }

    const resolvedPaymentDate =
      paymentStatus === "paid"
        ? paymentDate
          ? new Date(paymentDate).toISOString()
          : new Date().toISOString()
        : null;

    const supabaseAdmin = await createAdminClient();

    // Update a specific installment by its own ID
    if (installmentId) {
      const { data: inst } = await supabase
        .from("installments")
        .select("id, room_id")
        .eq("id", installmentId)
        .single();

      if (!inst) {
        return NextResponse.json(
          { error: "Installment not found" },
          { status: 404 },
        );
      }

      // Verify manager owns the room
      const { data: roomCheck } = await supabase
        .from("rooms")
        .select("id")
        .eq("id", inst.room_id)
        .eq("manager_id", user.id)
        .single();

      if (!roomCheck) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      const { error } = await supabaseAdmin
        .from("installments")
        .update({
          status: paymentStatus,
          payment_date: resolvedPaymentDate,
        })
        .eq("id", installmentId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // Legacy path: update via subscription
    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Missing installmentId or subscriptionId" },
        { status: 400 },
      );
    }

    // Verify this subscription belongs to a room this manager owns
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id, start_date, end_date, room:rooms!inner(manager_id)")
      .eq("id", subscriptionId)
      .eq("room.manager_id", user.id)
      .single();

    if (!sub) {
      return NextResponse.json(
        { error: "Subscription not found or unauthorized" },
        { status: 404 },
      );
    }

    const { error: subErr } = await supabaseAdmin
      .from("subscriptions")
      .update({ payment_status: paymentStatus })
      .eq("id", subscriptionId);

    if (subErr) {
      return NextResponse.json({ error: subErr.message }, { status: 500 });
    }

    // Also update the matching installment
    await supabaseAdmin
      .from("installments")
      .update({
        status: paymentStatus,
        payment_date: resolvedPaymentDate,
      })
      .eq("subscription_id", subscriptionId)
      .eq("start_date", sub.start_date)
      .eq("end_date", sub.end_date);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
