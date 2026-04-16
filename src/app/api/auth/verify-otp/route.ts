import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  generateProofToken,
  getExpiryIso,
  getOtpConfig,
  hashSecret,
  isEmailIdentifier,
  normalizeEmail,
  normalizePhone,
  timingSafeEqualHex,
} from '@/lib/security/otp'

export async function POST(req: Request) {
  try {
    const { identifier, otpCode } = await req.json()

    if (!identifier || typeof identifier !== 'string' || !otpCode || typeof otpCode !== 'string') {
      return NextResponse.json({ error: 'Identifier and OTP are required' }, { status: 400 })
    }

    const trimmedIdentifier = identifier.trim()
    const admin = await createAdminClient()

    const profileLookup = isEmailIdentifier(trimmedIdentifier)
      ? admin
          .from('profiles')
          .select('id, email')
          .eq('email', normalizeEmail(trimmedIdentifier))
          .limit(1)
          .maybeSingle()
      : admin
          .from('profiles')
          .select('id, email')
          .eq('phone', normalizePhone(trimmedIdentifier))
          .limit(1)
          .maybeSingle()

    const { data: profile } = await profileLookup

    if (!profile?.id || !profile.email) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
    }

    const { data: otpRow } = await admin
      .from('profile_verification_otps')
      .select('*')
      .eq('user_id', profile.id)
      .eq('purpose', 'forgot_password')
      .is('used_at', null)
      .is('consumed_at', null)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!otpRow) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
    }

    const maxAttempts = typeof otpRow.max_attempts === 'number' ? otpRow.max_attempts : getOtpConfig().maxAttempts
    const attempts = typeof otpRow.attempt_count === 'number' ? otpRow.attempt_count : 0

    if (attempts >= maxAttempts) {
      return NextResponse.json({ error: 'Too many attempts. Please request a new OTP.' }, { status: 429 })
    }

    const incomingHash = hashSecret(otpCode.trim())
    const storedHash: string = otpRow.otp_hash || ''

    if (!storedHash || !timingSafeEqualHex(storedHash, incomingHash)) {
      await admin
        .from('profile_verification_otps')
        .update({ attempt_count: attempts + 1 })
        .eq('id', otpRow.id)

      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
    }

    const resetToken = generateProofToken()
    const resetHash = hashSecret(resetToken)

    const { error: updateError } = await admin
      .from('profile_verification_otps')
      .update({
        used_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
        proof_hash: resetHash,
        proof_expires_at: getExpiryIso(getOtpConfig().proofTtlMinutes),
      })
      .eq('id', otpRow.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      resetToken,
      expiresInSec: getOtpConfig().proofTtlMinutes * 60,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
