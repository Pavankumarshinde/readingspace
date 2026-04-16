import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { hashSecret, isLikelyUUID, timingSafeEqualHex } from '@/lib/security/otp'

export async function POST(req: Request) {
  try {
    const { resetToken, newPassword } = await req.json()

    if (!resetToken || typeof resetToken !== 'string') {
      return NextResponse.json({ error: 'Reset token is required' }, { status: 400 })
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const admin = await createAdminClient()

    const incomingHash = hashSecret(resetToken)

    const { data: matchedRow } = await admin
      .from('profile_verification_otps')
      .select('id, user_id, proof_hash, proof_expires_at, consumed_at, purpose')
      .eq('purpose', 'forgot_password')
      .eq('proof_hash', incomingHash)
      .is('consumed_at', null)
      .gte('proof_expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!matchedRow || !matchedRow.proof_hash || !timingSafeEqualHex(matchedRow.proof_hash, incomingHash)) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 })
    }

    if (!isLikelyUUID(matchedRow.user_id)) {
      return NextResponse.json({ error: 'Invalid reset token mapping' }, { status: 400 })
    }

    const { error: passwordError } = await admin.auth.admin.updateUserById(matchedRow.user_id, {
      password: newPassword,
    })

    if (passwordError) {
      return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
    }

    await admin
      .from('profile_verification_otps')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', matchedRow.id)

    return NextResponse.json({ success: true, message: 'Password reset successful.' })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
