import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, email, phone, room, seat, startDate, endDate, sendInvite, membershipType = 'digital' } = await req.json()

    if (!name || !email || !room || !startDate || !endDate) {
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
          phone: phone || '',
          membership_type: membershipType
        }
      })

      if (authError) {
        console.error('Error creating auth user:', authError)
        return NextResponse.json({ error: `Failed to create student user: ${authError.message}`, details: authError }, { status: 500 })
      }

      studentId = authData.user.id
      
      // Note: The profile row is automatically created by the `handle_new_user` Postgres trigger!
    }

    // MANDATORY SYNC: Explicitly 'upsert' the profile to handle race conditions with triggers.
    const { error: profileUpsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({ 
        id: studentId,
        name, 
        email, // email is also needed for upsert if it's new
        phone: phone || '',
        membership_type: membershipType 
      }, { onConflict: 'id' })

    if (profileUpsertError) {
       console.error('Warning: Profile sync failure:', profileUpsertError)
       // We'll not fail the subscription process but log for visibility
    }

    // 3. endDate is now directly provided in the request payload.

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
      invite_sent: membershipType === 'managed' ? false : sendInvite,
      membership_type: membershipType
    })

    if (subError) {
      console.error('Error creating subscription:', subError)
      if (subError.code === '23505') {
        return NextResponse.json({ error: 'Student already has a subscription for this room' }, { status: 400 })
      }
      return NextResponse.json({ error: `Failed to create subscription: ${subError.message}`, details: subError }, { status: 500 })
    }

    // 5. Optionally send an email invite using Resend
    // SKIP if Managed
    if (sendInvite && membershipType !== 'managed') {
      try {
        let inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`;
        
        try {
          const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: email,
          });
          if (linkData?.properties?.action_link) {
            // we attach a param so the client knows it's an invite from manager if needed,
            // but the action link itself already logs them in / lets them set password
            inviteLink = linkData.properties.action_link;
          }
        } catch (e) {
          console.error("Error generating secure link:", e);
        }

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
    return NextResponse.json({ error: `Internal server error: ${err.message}`, details: err }, { status: 500 })
  }
}
