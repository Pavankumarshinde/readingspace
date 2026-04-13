'use client'

import { useState, useEffect } from 'react'
import { Search, Users, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

export default function ManagerStudentDirectory() {
  const [searchTerm, setSearchTerm] = useState('')
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: dbRooms } = await supabase.from('rooms').select('id, name').eq('manager_id', user.id)
      
      if (!dbRooms || dbRooms.length === 0) {
        setLoading(false)
        return
      }

      const roomMap = Object.fromEntries(dbRooms.map(r => [r.id, r.name]))

      const { data: subsData } = await supabase
        .from('subscriptions')
        .select(`
          id, seat_number, start_date, end_date, status, room_id,
          student:profiles!inner(id, name, email)
        `)
        .in('room_id', Object.keys(roomMap))
        .order('created_at', { ascending: false })

      if (subsData) {
        const formatted = subsData.map((sub: any) => ({
          id: sub.id,
          name: sub.student?.name || 'Unknown',
          email: sub.student?.email,
          roomName: roomMap[sub.room_id] || 'Unknown Room',
          status: sub.status || 'active',
          seatNumber: sub.seat_number || 'Unassigned',
          end_date: sub.end_date
        }))
        setStudents(formatted)
      }
      setLoading(false)
    }

    fetchData()
  }, [])

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const activeCount = filteredStudents.filter(s => s.status === 'active').length

  return (
    <main className="pt-4 pb-28 md:pt-8 md:pb-12 px-4 max-w-lg mx-auto md:max-w-none md:px-8 xl:max-w-[1400px]">
      <header className="mb-6 animate-in fade-in py-2">
         <h1 className="font-headline text-3xl md:text-5xl font-bold tracking-tight text-on-surface mb-2">
            Global Directory
         </h1>
         <p className="text-on-surface-variant text-sm max-w-md leading-relaxed font-bold">
            Listing {activeCount} active members across all your rooms. To manage members or approve requests, visit a specific room.
         </p>
      </header>

      <div className="space-y-6 animate-in fade-in duration-300">
         <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-3xl border border-outline-variant/10 shadow-sm">
            <div className="relative flex-1 w-full max-w-md">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={18} />
               <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest rounded-xl border border-outline-variant/10 text-sm outline-none focus:ring-2 focus:ring-primary/20"
               />
            </div>
            <Link href="/manager/rooms" className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-sm">
               Go to Rooms <ArrowRight size={16} />
            </Link>
         </div>

         {loading ? (
            <div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
         ) : filteredStudents.length === 0 ? (
            <div className="text-center py-20 bg-white border border-outline-variant/10 rounded-3xl shadow-sm">
               <Users className="mx-auto text-on-surface-variant/20 mb-3" size={48} />
               <p className="font-bold text-on-surface-variant">No members found</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {filteredStudents.map(student => (
                  <div key={student.id} className="p-5 bg-white border border-outline-variant/10 rounded-2xl shadow-sm flex items-center justify-between">
                     <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-black text-xl shrink-0">
                           {student.name.substring(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex flex-col items-start gap-1">
                           <h3 className="font-bold text-on-surface truncate w-full text-base">{student.name}</h3>
                           <p className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-surface-container-low text-on-surface-variant rounded-md truncate max-w-full">
                              {student.roomName}
                           </p>
                        </div>
                     </div>
                     <div className="flex flex-col items-end shrink-0 gap-1">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                           student.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                           {student.status}
                        </span>
                        <div className="text-right mt-1">
                           <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Seat</p>
                           <p className="font-black text-on-surface text-lg leading-none">{student.seatNumber}</p>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>
    </main>
  )
}
