import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, name, tier, capacity, description, latitude, longitude, radius } = await req.json()

    if (!id || !name || !tier || !capacity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify ownership
    const { data: roomCheck } = await supabase
      .from('rooms')
      .select('id')
      .eq('id', id)
      .eq('manager_id', user.id)
      .single()

    if (!roomCheck) {
      return NextResponse.json({ error: 'Room not found or unauthorized' }, { status: 404 })
    }

    // Use Admin Client to bypass RLS recursion during insertion/verification
    const supabaseAdmin = await createAdminClient()

    // Update Room Record
    const { data: updatedRoom, error: updateError } = await supabaseAdmin
      .from('rooms')
      .update({
        name,
        tier,
        total_seats: parseInt(capacity, 10),
        description: description || '',
        latitude: latitude || null,
        longitude: longitude || null,
        radius: radius || 200.0
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Supabase Update Error:', updateError)
      return NextResponse.json({ error: 'Failed to update room: ' + updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, room: updatedRoom })
  } catch (err: any) {
    console.error('Unhandled API server error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
