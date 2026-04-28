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
      return NextResponse.json({ error: "Missing room ID" }, { status: 400 });
    }

    // Use Admin Client to ensure we can delete despite potential RLS complexities if any
    const supabaseAdmin = await createAdminClient();

    // 1. Double check ownership
    const { data: room, error: fetchError } = await supabaseAdmin
      .from("rooms")
      .select("manager_id")
      .eq("id", roomId)
      .single();

    if (fetchError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.manager_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized ownership check failed" },
        { status: 403 },
      );
    }

    // 2. Perform Cascading Delete (DB level handles the children)
    const { error: deleteError } = await supabaseAdmin
      .from("rooms")
      .delete()
      .eq("id", roomId);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      return NextResponse.json(
        { error: "Deletion operation failed in DB" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Room and associated data purged",
    });
  } catch (err: any) {
    console.error("Unhandled Deletion API server error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
