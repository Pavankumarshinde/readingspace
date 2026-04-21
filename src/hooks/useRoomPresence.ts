'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimePresenceState } from '@supabase/supabase-js'

export type PresenceUser = {
  user_id: string
  name: string
  avatar_color?: string
  online_at: string
}

export function useRoomPresence(roomId: string, user: { id: string; name: string }) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!roomId || !user.id) return

    const channelId = `room_presence_${roomId}`
    const channel = supabase.channel(channelId)

    // Define listeners first
    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState()
        const transformed: PresenceUser[] = []
        
        Object.values(newState).forEach((presences: any) => {
          presences.forEach((p: PresenceUser) => {
            if (!transformed.find(u => u.user_id === p.user_id)) {
              transformed.push(p)
            }
          })
        })
        
        setOnlineUsers(transformed)
      })

    // Subscribe
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: user.id,
          name: user.name,
          online_at: new Date().toISOString(),
        })
      }
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, user.id, user.name, supabase])

  return {
    onlineUsers,
    isOnline: (userId: string) => onlineUsers.some(u => u.user_id === userId),
    onlineCount: onlineUsers.length
  }
}
