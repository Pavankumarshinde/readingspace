import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { studentId, roomId } = await req.json()

    if (!studentId || !roomId) {
      return NextResponse.json({ error: 'Invalid QR data' }, { status: 400 })
    }

    // 1. Verify manager owns the room
    const { data: roomCheck, error: roomError } = await supabase
      .from('rooms')
      .select('id, name')
      .eq('id', roomId)
      .eq('manager_id', user.id)
      .single()

    if (roomError || !roomCheck) {
      return NextResponse.json({ error: 'Unauthorized or room not found' }, { status: 403 })
    }

    // 2. Log attendance
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance_logs')
      .insert({
        student_id: studentId,
        room_id: roomId,
        marked_by: 'manager'
      })
      .select(`
        id,
        timestamp,
        profiles(name, email)
      `)
      .single()

    if (attendanceError) {
      console.error('Attendance log error:', attendanceError)
      return NextResponse.json({ error: 'Failed to log attendance' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Attendance marked for ${(attendance.profiles as any)?.name || 'Student'}`,
      student: attendance.profiles
    })

  } catch (err: any) {
    console.error('Attendance Scan Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
