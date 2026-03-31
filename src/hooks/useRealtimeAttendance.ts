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
        (payload) => {
          setLogs((prev) => [payload.new as AttendanceLog, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId])

  return logs
}
