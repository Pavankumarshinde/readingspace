import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  generateOtp,
  getCooldownIso,
  getExpiryIso,
  getOtpConfig,
  hashSecret,
  normalizeEmail,
} from '@/lib/security/otp'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user.email) {
      return NextResponse.json({ error: 'Profile email is required to send OTP' }, { status: 400 })
    }

    const config = getOtpConfig()

    const { data: latestOtp } = await supabase
      .from('profile_verification_otps')
      .select('id, cooldown_until, created_at')
      .eq('user_id', user.id)
      .eq('purpose', 'profile_update')
      .is('used_at', null)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestOtp?.cooldown_until && new Date(latestOtp.cooldown_until).getTime() > Date.now()) {
      return NextResponse.json({ error: 'Please wait before requesting another OTP' }, { status: 429 })
    }

    const otpCode = generateOtp(config.otpLength)
    const otpHash = hashSecret(otpCode)

    const { error: dbError } = await supabase.from('profile_verification_otps').insert({
      user_id: user.id,
      email: normalizeEmail(user.email),
      otp_hash: otpHash,
      expires_at: getExpiryIso(config.otpTtlMinutes),
      purpose: 'profile_update',
      attempt_count: 0,
      max_attempts: config.maxAttempts,
      cooldown_until: getCooldownIso(config.cooldownSeconds),
      target_identifier: normalizeEmail(user.email),
    })

    if (dbError) {
      console.error('OTP DB Error:', dbError)
      return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 })
    }

    try {
      const { error: resendError } = await resend.emails.send({
        from: 'ReadingSpace Security <onboarding@resend.dev>',
        to: [user.email],
        subject: `Manager Verification Code: ${otpCode}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; color: #1f1f1f;">
            <h2>Manager Identity Verification</h2>
            <p>You requested to edit your ReadingSpace facility profile. Use the verification code below to authorize this change.</p>
            <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 4px; border-radius: 8px; margin: 24px 0;">
              ${otpCode}
            </div>
            <p style="color: #666; font-size: 14px;">This code will expire in ${config.otpTtlMinutes} minutes.</p>
          </div>
        `,
      })
      if (resendError) {
        console.error('Resend API Error:', resendError)
      }
    } catch (emailError) {
      console.warn('Resend failed:', emailError)
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`Manager OTP for ${user.email}: ${otpCode}`)
    }

    return NextResponse.json({ success: true, message: 'OTP sent' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
