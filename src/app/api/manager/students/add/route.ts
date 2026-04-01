import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, email, phone, room, duration, seat, startDate, sendInvite } = await req.json()

    if (!name || !email || !room || !duration || !startDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify manager owns the selected room
    const { data: roomCheck } = await supabase
      .from('rooms')
      .select('id, name')
      .eq('id', room)
      .eq('manager_id', user.id)
      .single()

    if (!roomCheck) {
      return NextResponse.json({ error: 'Room not found or unauthorized' }, { status: 403 })
    }

    // Create Admin Client to bypass RLS for checking/creating profile
    const supabaseAdmin = await createAdminClient()

    // 1. Check if user already exists
    let studentId = ''
    const { data: existingProfiles, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)

    if (checkError) {
      console.error('Error checking existing profile:', checkError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (existingProfiles && existingProfiles.length > 0) {
      studentId = existingProfiles[0].id
    } else {
      // 2. Create the user using Supabase Auth Admin
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          name,
          role: 'student',
          phone: phone || ''
        }
      })

      if (authError) {
        console.error('Error creating auth user:', authError)
        return NextResponse.json({ error: 'Failed to create student user' }, { status: 500 })
      }

      studentId = authData.user.id
      
      // Note: The profile row is automatically created by the `handle_new_user` Postgres trigger!
    }

    // 3. Compute endDate from duration (in months)
    const startObj = new Date(startDate)
    const endObj = new Date(startObj)
    endObj.setMonth(endObj.getMonth() + parseInt(duration, 10))
    const endDate = endObj.toISOString().split('T')[0]

    // 4. Create the Subscription record
    // We can use the admin client or the manager user's client.
    // Managers are allowed to insert subscriptions for their rooms.
    const { error: subError } = await supabase.from('subscriptions').insert({
      student_id: studentId,
      room_id: room,
      seat_number: seat || 'Unassigned',
      tier: 'standard', // default for now
      start_date: startDate,
      end_date: endDate,
      status: 'active',
      invite_sent: sendInvite
    })

    if (subError) {
      console.error('Error creating subscription:', subError)
      // Check if it's a unique constraint violation
      if (subError.code === '23505') {
        return NextResponse.json({ error: 'Student already has a subscription for this room' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to create subscription record' }, { status: 500 })
    }

    // 5. Optionally send an email invite using Resend
    if (sendInvite) {
      try {
        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentName: name,
            studentEmail: email,
            roomName: roomCheck.name,
            seatNumber: seat || 'Unassigned',
            inviteLink
          })
        })
      } catch (e) {
        console.error('Failed to send invite email:', e)
        // We'll not fail the whole request just because email failed
      }
    }

    return NextResponse.json({ success: true, message: 'Student successfully added' })
  } catch (err: any) {
    console.error('Unhandled server error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
