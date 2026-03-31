import { Resend } from 'resend';
import { InviteEmail } from '@/components/emails/InviteEmail';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { studentName, studentEmail, roomName, seatNumber, inviteLink } = await req.json();

    const { data, error } = await resend.emails.send({
      from: 'ReadingSpace <noreply@readingspace.app>',
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
