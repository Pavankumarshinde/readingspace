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

    const { data: installments, error } = await supabase
      .from("installments")
      .select("*")
      .eq("student_id", user.id)
      .eq("room_id", roomId)
      .order("end_date", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ installments });
  } catch (err: any) {
    console.error("Error fetching student installments:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
