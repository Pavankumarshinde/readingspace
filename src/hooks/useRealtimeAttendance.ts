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
      let query = supabase.from('attendance_logs').select('*')
      if (roomId) query = query.eq('room_id', roomId)
      
      const { data } = await query.order('timestamp', { ascending: false })
      if (data) setLogs(data as AttendanceLog[])
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
          
          // Fetch student profile for the new log
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', newLog.student_id)
            .single()
            
          const logWithProfile = {
            ...newLog,
            student: profile
          }
          
          setLogs((prev) => [logWithProfile as AttendanceLog, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId])

  return logs
}
