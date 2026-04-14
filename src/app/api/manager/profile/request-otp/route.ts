import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); 

    const { error: dbError } = await supabase
      .from('profile_verification_otps')
      .insert([{ user_id: user.id, email: user.email, otp_code: otpCode, expires_at: expiresAt }]);

    if (dbError) {
      console.error('OTP DB Error:', dbError);
      return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 });
    }

    try {
      const { error: emailError } = await resend.emails.send({
        from: 'ReadingSpace Security <noreply@readingspace.app>',
        to: [user.email || ''], 
        subject: `Manager Verification Code: ${otpCode}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; color: #1f1f1f;">
            <h2>Manager Identity Verification</h2>
            <p>You requested to edit your ReadingSpace facility profile. Use the verification code below to authorize this change.</p>
            <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 4px; border-radius: 8px; margin: 24px 0;">
              ${otpCode}
            </div>
            <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `,
      });

      if (emailError) console.warn('Resend failed:', emailError);
    } catch (e) {
      console.warn('Resend Exception:', e);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`\n\n=== DEVELOPMENT OTP FOR MANAGER ${user.email} ===\n${otpCode}\n=======================================\n`);
    }

    return NextResponse.json({ success: true, message: 'OTP sent' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
