import { Resend } from "resend";
import { InviteEmail } from "@/components/emails/InviteEmail";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { studentName, studentEmail, roomName, seatNumber, inviteLink, roomId } =
      await req.json();

    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: roomCheck } = await supabase
      .from("rooms")
      .select("id")
      .eq("id", roomId)
      .eq("manager_id", user.id)
      .single();

    if (!roomCheck) {
      return NextResponse.json({ error: "Unauthorized: You do not own this room." }, { status: 403 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY!);
    const { data, error } = await resend.emails.send({
      from: "ReadingSpace <noreply@readingspace.app>",
      to: [studentEmail],
      subject: `You're invited to ${roomName}!`,
      react: InviteEmail({ studentName, roomName, seatNumber, inviteLink }),
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
