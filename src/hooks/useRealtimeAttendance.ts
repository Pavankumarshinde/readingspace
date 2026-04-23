'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AttendanceLog } from '@/types'

export function useRealtimeAttendance(roomId?: string) {
  const supabase = createClient()
  const [logs, setLogs] = useState<AttendanceLog[]>([])

  useEffect(() => {
    // Initial fetch
    const fetchLogs = async () => {
      // Fetch logs with student profiles and seat numbers
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
      
      let query = supabase
        .from('attendance_logs')
        .select(`
          *,
          student:profiles(name, email)
        `)
        .eq('date', today)
      
      if (roomId) query = query.eq('room_id', roomId)
      
      const { data, error } = await query.order('timestamp', { ascending: false })
      
      if (data) {
        // Since we need seat_number from subscriptions, and Supabase doesn't support 
        // nested joins easily without many-to-one established, we fetch seats separately or with a specific join.
        // Actually, we can join subscriptions if we have the foreign key relationship.
        
        // Let's try to fetch seats for all found students in this room
        const { data: seats } = await supabase
          .from('subscriptions')
          .select('student_id, seat_number')
          .eq('room_id', roomId || '')
          .eq('status', 'active')

        const seatMap = new Map(seats?.map(s => [s.student_id, s.seat_number]))
        
        const logsWithSeats = data.map(log => ({
          ...log,
          seat_number: seatMap.get(log.student_id) || 'N/A'
        }))

        setLogs(logsWithSeats as any[])
      }
    }

    fetchLogs()

    // Realtime subscription
    const channel = supabase
      .channel('attendance-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_logs',
          filter: roomId ? `room_id=eq.${roomId}` : undefined,
        },
        async (payload) => {
          const newLog = payload.new as any
          
          // Fetch student profile AND seat number for the new log
          const [{ data: profile }, { data: sub }] = await Promise.all([
            supabase
              .from('profiles')
              .select('name, email')
              .eq('id', newLog.student_id)
              .single(),
            supabase
              .from('subscriptions')
              .select('seat_number')
              .eq('student_id', newLog.student_id)
              .eq('room_id', newLog.room_id)
              .eq('status', 'active')
              .maybeSingle()
          ])
            
          const logWithDetails = {
            ...newLog,
            student: profile,
            seat_number: sub?.seat_number || 'N/A'
          }
          
          setLogs((prev) => [logWithDetails as any, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId])

  return logs
}
