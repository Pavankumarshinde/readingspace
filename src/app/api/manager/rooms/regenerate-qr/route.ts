import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
      return NextResponse.json({ error: "Room ID required" }, { status: 400 });
    }

    // Increment qr_version
    const { data: room, error: fetchError } = await supabase
      .from("rooms")
      .select("qr_version")
      .eq("id", roomId)
      .single();

    if (fetchError) throw fetchError;

    const nextVersion = (room.qr_version || 0) + 1;

    const { error: updateError } = await supabase
      .from("rooms")
      .update({ qr_version: nextVersion })
      .eq("id", roomId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, version: nextVersion });
  } catch (err: any) {
    console.error("Regenerate Room QR Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
