import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subscriptionId } = await req.json()

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID required' }, { status: 400 })
    }

    // Increment qr_version
    const { data: sub, error: fetchError } = await supabase
      .from('subscriptions')
      .select('qr_version')
      .eq('id', subscriptionId)
      .single()

    if (fetchError) throw fetchError

    const nextVersion = (sub.qr_version || 0) + 1

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ qr_version: nextVersion })
      .eq('id', subscriptionId)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, version: nextVersion })
  } catch (err: any) {
    console.error('Regenerate Student Pass Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
