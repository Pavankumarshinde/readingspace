'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, StickyNote, Clock, ChevronRight, Save, Trash2, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function StudentNotes() {
  const router = useRouter()
  const supabase = createClient()
  
  const [notes, setNotes] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [activeNote, setActiveNote] = useState<any>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }
      setUser(authUser)

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('student_id', authUser.id)
        .order('created_at', { ascending: false })

      if (error) {
        toast.error('Failed to load logs')
      } else {
        setNotes(data || [])
      }
      setLoading(false)
    }
    init()
  }, [router, supabase])

  const openAddNote = () => {
    setIsAdding(true)
    setTitle('')
    setContent('')
  }

  const openEditNote = (note: any) => {
    setActiveNote(note)
    setTitle(note.title)
    setContent(note.content)
  }

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required')
      return;
    }

    if (!user) return;

    if (isAdding) {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          student_id: user.id,
          title,
          content,
          tags: []
        })
        .select()
        .single()

      if (error) {
        toast.error('Failed to save log')
        return
      }
      setNotes([data, ...notes])
      toast.success('Log saved successfully!')
    } else if (activeNote) {
      const { error } = await supabase
        .from('notes')
        .update({ title, content, updated_at: new Date().toISOString() })
        .eq('id', activeNote.id)

      if (error) {
        toast.error('Failed to update log')
        return
      }
      setNotes(notes.map(note => note.id === activeNote.id ? { ...note, title, content } : note))
      toast.success('Log updated successfully!')
    }

    setIsAdding(false)
    setActiveNote(null)
  }

  const handleDelete = async () => {
    if (activeNote) {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', activeNote.id)

      if (error) {
        toast.error('Failed to delete log')
        return
      }
      setNotes(notes.filter(note => note.id !== activeNote.id))
      toast.success('Log deleted successfully!')
      setActiveNote(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* TopAppBar */}
      <header className="bg-surface/80 backdrop-blur-xl flex justify-between items-center px-6 py-4 w-full sticky top-0 z-40 border-b border-outline-variant/10">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary fill-icon">sticky_note_2</span>
          <h1 className="font-headline font-bold text-xl tracking-tight text-primary italic">Scholar Logs</h1>
        </div>
        <button 
          onClick={openAddNote}
          className="w-10 h-10 rounded-full bg-primary text-on-primary flex-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus size={20} />
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-8 pb-32 w-full space-y-6">
        {/* Search Bar */}
        <div className="search-wrapper">
           <Search size={18} className="search-icon" />
           <input type="text" className="input py-3" placeholder="Search your logs..." />
        </div>

        {/* Notes Grid/List */}
        <div className="grid grid-cols-1 gap-4">
           {notes.map((note) => (
             <div 
               key={note.id} 
               onClick={() => openEditNote(note)}
               className="card p-5 flex-between group hover:border-primary/30 cursor-pointer active:scale-[0.99] transition-all bg-surface-container-lowest"
             >
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-primary/5 text-primary rounded-2xl flex-center group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                      <StickyNote size={20} />
                   </div>
                   <div className="flex flex-col">
                      <h3 className="text-[15px] font-bold text-primary font-headline italic">{note.title}</h3>
                      <div className="flex items-center gap-2 text-outline-variant">
                         <Calendar size={12} />
                         <span className="text-[10px] font-bold uppercase tracking-widest">{new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                   </div>
                </div>
                <ChevronRight size={18} className="text-outline-variant group-hover:translate-x-1 transition-transform" />
             </div>
           ))}
        </div>

        {/* Empty State */}
        {notes.length === 0 && (
           <div className="flex flex-col items-center justify-center py-20 opacity-40">
              <span className="material-symbols-outlined text-[64px] mb-4">edit_note</span>
              <p className="font-bold text-primary uppercase tracking-[0.2em] text-[12px]">No logs recorded yet</p>
           </div>
        )}
      </main>

      {/* Note Editor Overlay */}
      {(activeNote || isAdding) && (
        <div className="fixed inset-0 z-[100] bg-surface flex flex-col animate-in fade-in slide-in-from-bottom duration-300">
           <header className="bg-surface px-6 py-4 flex-between border-b border-outline-variant/10">
              <button onClick={() => { setActiveNote(null); setIsAdding(false); }} className="text-on-surface-variant font-bold text-sm uppercase tracking-widest hover:text-primary transition-colors">
                Cancel
              </button>
              <h2 className="font-headline font-bold text-primary italic">Note Editor</h2>
              <button onClick={handleSave} className="bg-primary text-on-primary px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all">
                SAVE
              </button>
           </header>
           <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              <div>
                 <label className="input-label">Subject Title</label>
                 <input 
                   type="text"
                   value={title}
                   onChange={(e) => setTitle(e.target.value)}
                   className="w-full bg-surface-container-low p-4 rounded-2xl text-lg font-bold text-primary border-none focus:ring-2 focus:ring-primary/10 transition-all italic" 
                   placeholder="e.g. Organic Chemistry Reagents"
                 />
              </div>
              <div className="flex-1 min-h-[300px]">
                 <label className="input-label">Observations & Findings</label>
                 <textarea 
                   value={content}
                   onChange={(e) => setContent(e.target.value)}
                   className="w-full h-full bg-surface-container-low p-5 rounded-3xl text-on-surface font-medium border-none focus:ring-2 focus:ring-primary/10 transition-all resize-none leading-relaxed"
                   placeholder="Start documenting your research here..."
                 />
              </div>
           </div>
           <footer className="p-6 bg-surface-container-lowest border-t border-outline-variant/10 flex justify-end">
              {activeNote && (
                 <button onClick={handleDelete} className="flex items-center gap-2 text-error font-bold text-xs uppercase tracking-widest hover:bg-error/5 px-4 py-2 rounded-xl transition-all">
                    <Trash2 size={14} />
                    DELETE
                 </button>
              )}
           </footer>
        </div>
      )}
    </div>
  )
}
