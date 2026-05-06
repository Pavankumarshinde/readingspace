import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

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
      subscriptionId,
      name,
      phone,
      seat,
      startDate,
      endDate,
      membershipType,
      status,
      paymentStatus,
    } = await req.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Missing subscription ID" },
        { status: 400 },
      );
    }

    // 1. Verify ownership and fetch student_id
    const supabaseAdmin = await createAdminClient();
    const { data: sub, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("student_id, room_id, start_date, end_date, rooms(manager_id)")
      .eq("id", subscriptionId)
      .single();

    if (subError || !sub) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    if ((sub.rooms as any).manager_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized: manager ownership failed" },
        { status: 403 },
      );
    }

    // 2. Update the Subscription
    const { error: subUpdateError } = await supabaseAdmin
      .from("subscriptions")
      .update({
        seat_number: seat,
        start_date: startDate,
        end_date: endDate,
        membership_type: membershipType || "digital",
        status: status || "active",
        payment_status: paymentStatus !== undefined ? paymentStatus : undefined,
      })
      .eq("id", subscriptionId);

    if (subUpdateError) {
      console.error("Subscription update error:", subUpdateError);
      return NextResponse.json(
        { error: "Failed to update subscription" },
        { status: 500 },
      );
    }

    // 2.5 Handle Installments if dates changed or forced
    if (startDate && endDate) {
      // Check if an installment for these exact dates already exists
      const { data: existingInstallment } = await supabaseAdmin
        .from("installments")
        .select("id")
        .eq("subscription_id", subscriptionId)
        .eq("start_date", startDate)
        .eq("end_date", endDate)
        .maybeSingle();

      if (!existingInstallment) {
        // Date changed (likely a renewal), log a new installment
        await supabaseAdmin.from("installments").insert({
          student_id: sub.student_id,
          room_id: sub.room_id,
          subscription_id: subscriptionId,
          start_date: startDate,
          end_date: endDate,
          status: paymentStatus || "due",
          payment_date: paymentStatus === "paid" ? new Date().toISOString() : null,
        });
      } else if (paymentStatus) {
        // Update the existing installment's status
        await supabaseAdmin
          .from("installments")
          .update({
            status: paymentStatus,
            payment_date: paymentStatus === "paid" ? new Date().toISOString() : null,
          })
          .eq("id", existingInstallment.id);
      }
    }

    // 3. Update the Profile (Name & Phone) using 'upsert' to handle edge cases
    const profileUpsert: any = { id: sub.student_id };
    if (name) profileUpsert.name = name;
    if (phone !== undefined) profileUpsert.phone = phone;
    if (membershipType) profileUpsert.membership_type = membershipType;

    const { error: profileUpsertError } = await supabaseAdmin
      .from("profiles")
      .upsert(profileUpsert, { onConflict: "id" });

    if (profileUpsertError) {
      console.error("Profile sync error during update:", profileUpsertError);
    }

    return NextResponse.json({
      success: true,
      message: "Student details updated",
    });
  } catch (err: any) {
    console.error("Unhandled Student Update API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
