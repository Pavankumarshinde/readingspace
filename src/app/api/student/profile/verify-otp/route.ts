import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { otpCode } = await req.json();

    if (!otpCode) {
      return NextResponse.json({ error: 'OTP is required' }, { status: 400 });
    }

    // Lookup OTP
    const { data: otps, error: fetchError } = await supabase
      .from('profile_verification_otps')
      .select('*')
      .eq('user_id', user.id)
      .eq('otp_code', otpCode)
      .is('used_at', null)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('OTP Check Error:', fetchError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!otps || otps.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    const validOtp = otps[0];

    // Mark as used
    const { error: updateError } = await supabase
      .from('profile_verification_otps')
      .update({ used_at: new Date().toISOString() })
      .eq('id', validOtp.id);

    if (updateError) {
      console.error('Failed to mark OTP as used:', updateError);
    }

    return NextResponse.json({ success: true, message: 'OTP verified securely' });

  } catch (err: any) {
    console.error('Server error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
