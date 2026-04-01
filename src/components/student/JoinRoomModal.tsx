'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { Key } from 'lucide-react'

interface JoinRoomModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function JoinRoomModal({ open, onClose, onSuccess }: JoinRoomModalProps) {
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: roomData, error: roomError } = await supabase
        .rpc('verify_room_key', { p_key: key })
      
      const room = Array.isArray(roomData) ? roomData[0] : roomData

      if (roomError || !room) {
        throw new Error('Invalid join key. Please check and try again.')
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('You must be logged in')

      const { error: requestError } = await supabase
        .from('join_requests')
        .insert({
          student_id: user.id,
          room_id: room.id,
          status: 'pending'
        })

      if (requestError) {
        if (requestError.code === '23505') throw new Error('You already have a pending request for this room')
        throw requestError
      }

      toast.success(`Request sent to ${room.name}!`)
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to join room')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Join a Reading Room">
      <form onSubmit={handleJoin} className="flex flex-col gap-6">
        <p className="text-[14px] text-[var(--text-secondary)] -mt-2">
          Enter the 8-character unique key provided by your room manager to request access.
        </p>

        <div className="search-wrapper">
           <Key size={20} className="search-icon" />
           <input 
             type="text" 
             className="input tracking-widest font-bold" 
             placeholder="e.g. SuN782x" 
             maxLength={8}
             required 
             value={key}
             onChange={(e) => setKey(e.target.value)}
           />
        </div>

        <div className="flex flex-col gap-3">
           <button type="submit" disabled={loading || key.length < 4} className="btn-primary py-4 rounded-xl font-bold">
              {loading ? 'Verifying Key...' : 'Request to Join'}
           </button>
           <button type="button" onClick={onClose} className="btn-ghost py-3 text-[var(--text-muted)] font-semibold">
              Cancel
           </button>
        </div>
      </form>
    </Modal>
  )
}
