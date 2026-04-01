import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subscriptionId, paymentStatus } = await req.json()

    if (!subscriptionId || !paymentStatus) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const validStatuses = ['paid', 'due', 'overdue']
    if (!validStatuses.includes(paymentStatus)) {
      return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 })
    }

    // Verify this subscription belongs to a room this manager owns
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, room:rooms!inner(manager_id)')
      .eq('id', subscriptionId)
      .eq('room.manager_id', user.id)
      .single()

    if (!sub) {
      return NextResponse.json({ error: 'Subscription not found or unauthorized' }, { status: 404 })
    }

    const supabaseAdmin = await createAdminClient()
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({ payment_status: paymentStatus })
      .eq('id', subscriptionId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
