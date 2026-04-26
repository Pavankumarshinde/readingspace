import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/server'
import {
  buildGenericOtpSendMessage,
  generateOtp,
  getCooldownIso,
  getExpiryIso,
  getOtpConfig,
  hashSecret,
  isEmailIdentifier,
  normalizeEmail,
  normalizePhone,
} from '@/lib/security/otp'


export async function POST(req: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY!)
  try {
    const { identifier } = await req.json()

    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json({ error: 'Email or phone is required' }, { status: 400 })
    }

    const trimmedIdentifier = identifier.trim()
    const admin = await createAdminClient()

    const normalizedEmail = isEmailIdentifier(trimmedIdentifier)
      ? normalizeEmail(trimmedIdentifier)
      : null

    const normalizedPhone = !isEmailIdentifier(trimmedIdentifier)
      ? normalizePhone(trimmedIdentifier)
      : null

    if (normalizedPhone !== null && !normalizedPhone) {
      return NextResponse.json({ error: 'Invalid identifier' }, { status: 400 })
    }

    const profileLookup = normalizedEmail
      ? admin
          .from('profiles')
          .select('id, email')
          .eq('email', normalizedEmail)
          .limit(1)
          .maybeSingle()
      : admin
          .from('profiles')
          .select('id, email')
          .eq('phone', normalizedPhone || '')
          .limit(1)
          .maybeSingle()

    const { data: profile } = await profileLookup

    if (!profile?.id || !profile.email) {
      return NextResponse.json(buildGenericOtpSendMessage())
    }

    const targetEmail = normalizeEmail(profile.email)
    const config = getOtpConfig()

    const { data: latestOtp } = await admin
      .from('profile_verification_otps')
      .select('id, cooldown_until, created_at')
      .eq('user_id', profile.id)
      .eq('purpose', 'forgot_password')
      .is('consumed_at', null)
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestOtp?.cooldown_until && new Date(latestOtp.cooldown_until).getTime() > Date.now()) {
      return NextResponse.json(buildGenericOtpSendMessage())
    }

    const otpCode = generateOtp(config.otpLength)
    const otpHash = hashSecret(otpCode)

    const { error: insertError } = await admin.from('profile_verification_otps').insert({
      user_id: profile.id,
      email: targetEmail,
      otp_hash: otpHash,
      purpose: 'forgot_password',
      expires_at: getExpiryIso(config.otpTtlMinutes),
      cooldown_until: getCooldownIso(config.cooldownSeconds),
      max_attempts: config.maxAttempts,
      attempt_count: 0,
      target_identifier: targetEmail,
    })

    if (insertError) {
      return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 })
    }

    try {
      const { error: resendError } = await resend.emails.send({
        from: 'ReadingSpace Security <onboarding@resend.dev>',
        to: [targetEmail],
        subject: `Password Reset Verification Code: ${otpCode}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; color: #1f1f1f;">
            <h2>Password Reset Verification</h2>
            <p>Use the code below to reset your ReadingSpace account password.</p>
            <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 4px; border-radius: 8px; margin: 24px 0;">
              ${otpCode}
            </div>
            <p style="color: #666; font-size: 14px;">This code expires in ${config.otpTtlMinutes} minutes.</p>
          </div>
        `,
      })
      if (resendError) {
        console.error('Resend API Error:', resendError)
      }
    } catch (emailError) {
      console.warn('Failed to dispatch forgot-password OTP:', emailError)
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`Forgot-password OTP for ${targetEmail}: ${otpCode}`)
    }

    return NextResponse.json(buildGenericOtpSendMessage())
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
