import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, tier, capacity, description, latitude, longitude, radius } = await req.json()
 
    if (!name || !tier || !capacity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
 
    // Use Admin Client to bypass RLS recursion during insertion/verification
    const supabaseAdmin = await createAdminClient()
 
    // Insert Room Record into DB matching schema
    const { data: newRoom, error: insertError } = await supabaseAdmin
      .from('rooms')
      .insert({
        manager_id: user.id,
        name,
        tier,
        total_seats: parseInt(capacity, 10),
        description: description || '',
        latitude: latitude || null,
        longitude: longitude || null,
        radius: radius || 200.0
      })
      .select()
      .single()

    if (insertError) {
      console.error('Supabase Insert Error:', insertError)
      return NextResponse.json({ error: 'Failed to create room: ' + insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, room: newRoom })
  } catch (err: any) {
    console.error('Unhandled API server error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
