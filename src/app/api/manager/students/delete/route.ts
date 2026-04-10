import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subscriptionId } = await req.json()

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Missing subscription ID' }, { status: 400 })
    }

    // 1. Verify manager owns the room associated with this subscription
    // We'll use Admin client to fetch the room_id and manager_id linkage
    const supabaseAdmin = await createAdminClient()
    
    const { data: sub, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('room_id, rooms(manager_id)')
      .eq('id', subscriptionId)
      .single()

    if (subError || !sub) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    if ((sub.rooms as any).manager_id !== user.id) {
       return NextResponse.json({ error: 'Unauthorized: You do not manage this room' }, { status: 403 })
    }

    // 2. Delete the subscription
    const { error: deleteError } = await supabaseAdmin
      .from('subscriptions')
      .delete()
      .eq('id', subscriptionId)

    if (deleteError) {
      console.error('Delete subscription error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete mission' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Student removed from room' })

  } catch (err: any) {
    console.error('Unhandled Student Deletion API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
