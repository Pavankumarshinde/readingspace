'use client'

import { useState, useEffect } from 'react'
import { Plus, StickyNote, Clock, ChevronRight, Save, Trash2, Calendar, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function StudentNotes() {
  const router = useRouter()
  const supabase = createClient()
  
  const [notes, setNotes] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const [activeNote, setActiveNote] = useState<any>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }
      setUser(authUser)

      const [{ data: notesData }, { data: profileData }] = await Promise.all([
        supabase
          .from('notes')
          .select('*')
          .eq('student_id', authUser.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()
      ])

      if (notesData) setNotes(notesData)
      if (profileData) setProfile(profileData)
      
      setLoading(false)
    }
    init()
  }, [router, supabase])

  const openAddNote = () => {
    setIsAdding(true)
    setTitle('')
    setContent('')
    setTags([])
    setTagInput('')
  }

  const openEditNote = (note: any) => {
    setActiveNote(note)
    setTitle(note.title)
    setContent(note.content)
    setTags(note.tags || [])
    setTagInput('')
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
          tags
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
      const { data, error } = await supabase
        .from('notes')
        .update({ title, content, tags, updated_at: new Date().toISOString() })
        .eq('id', activeNote.id)
        .select()
        .single()

      if (error) {
        toast.error('Failed to update log')
        return
      }
      setNotes(notes.map(note => note.id === activeNote.id ? data : note))
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

  const filteredNotes = notes.filter(note =>
    note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <header className="flex justify-between items-end">
        <div>
          <h2 className="section-header">Personal Logs</h2>
          <p className="section-sub mt-1">Thought repository</p>
        </div>
        <button 
          onClick={openAddNote}
          className="btn-sm-minimal"
        >
          <span className="material-symbols-outlined icon-xs">add</span>
          <span className="hidden sm:inline">New Entry</span>
        </button>
      </header>

      {/* Search Bar */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/50 text-base pointer-events-none select-none">
          search
        </span>
        <input
          type="text"
          placeholder="Search by title or content..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl pl-10 pr-10 py-2.5 text-sm text-on-surface placeholder:text-outline/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-outline/50 hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        )}
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {filteredNotes.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 bg-surface-container-low rounded-2xl border border-outline-variant/30">
               <span className="material-symbols-outlined text-4xl text-outline/30 mb-3 font-light">
                 {searchQuery ? 'search_off' : 'edit_note'}
               </span>
               <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest opacity-50">
                  {searchQuery ? `No notes matching "${searchQuery}"` : 'Repository empty'}
               </p>
               {searchQuery && (
                 <button
                   onClick={() => setSearchQuery('')}
                   className="mt-4 text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
                 >
                   Clear search
                 </button>
               )}
            </div>
         ) : (
            filteredNotes.map((note) => (
              <article 
                key={note.id}
                onClick={() => openEditNote(note)}
                className="bg-surface border border-outline-variant/30 rounded-xl p-5 relative overflow-hidden transition-all hover:border-outline-variant/70 cursor-pointer active:scale-[0.99] group shadow-sm hover:shadow-md"
              >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                       <span className="material-symbols-outlined text-secondary icon-xs">sticky_note_2</span>
                       <time className="font-mono text-[9px] text-outline tracking-widest uppercase font-bold">
                          {new Date(note.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                       </time>
                    </div>
                    <button className="btn-ghost scale-75 opacity-0 group-hover:opacity-100 transition-opacity">
                       <span className="material-symbols-outlined">more_vert</span>
                    </button>
                  </div>
                  
                  <h3 className="font-headline font-semibold text-sm text-on-surface mb-2 line-clamp-1 group-hover:text-primary transition-colors">{note.title}</h3>
                  <p className="text-on-surface-variant leading-relaxed text-[11px] mb-4 line-clamp-2 opacity-80">{note.content}</p>
                  
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {(note.tags || []).map((tag: string) => (
                       <span key={tag} className="px-2 py-0.5 bg-surface-container-low text-outline text-[8px] font-bold tracking-widest uppercase rounded border border-outline-variant/10">
                          {tag}
                       </span>
                    ))}
                  </div>
              </article>
            ))
         )}
      </div>

      {/* Floating Action Button (Mobile Only) */}
      <button 
        onClick={openAddNote}
        className="fixed bottom-24 right-6 w-12 h-12 rounded-xl bg-primary text-on-primary shadow-xl flex items-center justify-center active:scale-95 transition-all z-40 md:hidden"
      >
        <span className="material-symbols-outlined">add</span>
      </button>

      {/* Note Editor Overlay (Full Screen) */}
      {(activeNote || isAdding) && (
        <div className="fixed inset-0 z-[100] bg-surface flex flex-col animate-in animate-out fade-in slide-in-from-bottom duration-300">
           <header className="bg-surface px-6 py-4 flex justify-between items-center border-b border-outline-variant/10">
              <button onClick={() => { setActiveNote(null); setIsAdding(false); }} className="text-outline hover:text-primary transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
              <h2 className="font-headline font-black text-primary uppercase tracking-widest text-[10px]">Note Editor</h2>
              <button 
                onClick={handleSave} 
                className="bg-primary text-on-primary px-6 py-2 rounded-xl text-xs font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
              >
                SAVE
              </button>
           </header>
          
           <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-2xl mx-auto w-full">
              {/* Title Section */}
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-outline uppercase tracking-widest block pl-1">Subject Header</label>
                 <input 
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-4 text-2xl font-bold text-primary italic focus:ring-2 focus:ring-primary/10 transition-all placeholder:opacity-30" 
                    placeholder="Enter context..."
                 />
              </div>

              {/* Tag Section */}
              <div className="space-y-3">
                 <label className="text-[10px] font-black text-outline uppercase tracking-widest block pl-1">Tags & Metadata</label>
                 <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map(tag => (
                       <span key={tag} className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          {tag}
                          <button onClick={() => setTags(tags.filter(t => t !== tag))}>
                             <X size={10} />
                          </button>
                       </span>
                    ))}
                 </div>
                 <input 
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                       if (e.key === 'Enter' && tagInput.trim()) {
                          if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()]);
                          setTagInput('');
                       }
                    }}
                    className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-3 text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-outline/40" 
                    placeholder="Add a tag..."
                 />
              </div>

              {/* Content Section */}
              <div className="space-y-2 flex-1 min-h-[300px]">
                 <label className="text-[10px] font-black text-outline uppercase tracking-widest block pl-1">Observations</label>
                 <textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full h-full min-h-[300px] bg-surface-container-low border-none rounded-3xl p-6 text-on-surface font-medium leading-relaxed focus:ring-2 focus:ring-primary/10 transition-all resize-none shadow-inner" 
                    placeholder="Document your findings here..."
                 />
              </div>

              {/* Danger Zone */}
              {activeNote && (
                 <div className="pt-10 border-t border-outline-variant/10">
                    <button 
                      onClick={handleDelete} 
                      className="w-full py-4 text-error font-black text-[10px] uppercase tracking-widest bg-error/5 hover:bg-error/10 rounded-2xl transition-all flex items-center justify-center gap-2 group"
                    >
                      <Trash2 size={14} className="group-hover:scale-110 transition-transform" /> 
                      Delete this Note Permanently
                    </button>
                 </div>
              )}
           </div>
        </div>
      )}
    </div>
  )
}
