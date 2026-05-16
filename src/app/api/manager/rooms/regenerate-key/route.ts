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

    const { roomId } = await req.json();

    if (!roomId) {
      return NextResponse.json({ error: "Missing Room ID" }, { status: 400 });
    }

    // 1. Verify Ownership
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("manager_id")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.manager_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Generate New Key and Update (With Retry Loop for Collisions)
    const supabaseAdmin = await createAdminClient();
    let newKey = "";
    let updateError = null;
    const MAX_RETRIES = 5;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      newKey = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const { error } = await supabaseAdmin
        .from("rooms")
        .update({ join_key: newKey })
        .eq("id", roomId);

      if (!error) {
        updateError = null;
        break; // Success
      }

      // 23505 is PostgreSQL unique_violation
      if (error.code !== "23505") {
        updateError = error;
        break; // Fail on non-collision errors immediately
      }
      
      updateError = error; // Will be returned if we exhaust retries
    }

    if (updateError) {
      console.error("Update Key Error:", updateError);
      return NextResponse.json(
        { error: "Failed to regenerate key" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, newKey });
  } catch (err: any) {
    console.error("Regenerate Key API Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
