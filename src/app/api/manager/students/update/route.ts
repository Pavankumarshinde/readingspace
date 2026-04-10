import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      subscriptionId, 
      name, 
      phone, 
      seat, 
      startDate, 
      endDate, 
      membershipType,
      status 
    } = await req.json()

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Missing subscription ID' }, { status: 400 })
    }

    // 1. Verify ownership and fetch student_id
    const supabaseAdmin = await createAdminClient()
    const { data: sub, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('student_id, rooms(manager_id)')
      .eq('id', subscriptionId)
      .single()

    if (subError || !sub) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    if ((sub.rooms as any).manager_id !== user.id) {
       return NextResponse.json({ error: 'Unauthorized: manager ownership failed' }, { status: 403 })
    }

    // 2. Update the Subscription
    const { error: subUpdateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        seat_number: seat,
        start_date: startDate,
        end_date: endDate,
        membership_type: membershipType || 'digital',
        status: status || 'active'
      })
      .eq('id', subscriptionId)

    if (subUpdateError) {
      console.error('Subscription update error:', subUpdateError)
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
    }

    // 3. Update the Profile (Name & Phone) using 'upsert' to handle edge cases
    const profileUpsert: any = { id: sub.student_id }
    if (name) profileUpsert.name = name
    if (phone !== undefined) profileUpsert.phone = phone
    if (membershipType) profileUpsert.membership_type = membershipType

    const { error: profileUpsertError } = await supabaseAdmin
      .from('profiles')
      .upsert(profileUpsert, { onConflict: 'id' })

    if (profileUpsertError) {
      console.error('Profile sync error during update:', profileUpsertError)
    }

    return NextResponse.json({ success: true, message: 'Student details updated' })

  } catch (err: any) {
    console.error('Unhandled Student Update API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
