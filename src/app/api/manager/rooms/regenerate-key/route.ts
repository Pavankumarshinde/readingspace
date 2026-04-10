import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { roomId } = await req.json()

    if (!roomId) {
      return NextResponse.json({ error: 'Missing Room ID' }, { status: 400 })
    }

    // 1. Verify Ownership
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('manager_id')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.manager_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Generate New Key (8 chars hex)
    const newKey = Math.random().toString(36).substring(2, 10).toUpperCase()

    // 3. Update using Admin Client to ensure it bypasses any potential RLS restrictions on 'join_key' direct update
    const supabaseAdmin = await createAdminClient()
    const { error: updateError } = await supabaseAdmin
      .from('rooms')
      .update({ join_key: newKey })
      .eq('id', roomId)

    if (updateError) {
      console.error('Update Key Error:', updateError)
      return NextResponse.json({ error: 'Failed to regenerate key' }, { status: 500 })
    }

    return NextResponse.json({ success: true, newKey })

  } catch (err: any) {
    console.error('Regenerate Key API Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
