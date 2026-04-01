'use client'

import { useState, useEffect } from 'react'
import { Plus, StickyNote, Clock, Save, Trash2, Calendar, X, Search, Edit3, ChevronRight, Hash, ArrowLeft, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

export default function StudentNotes() {
  const router = useRouter()
  const supabase = createClient()
  
  const [notes, setNotes] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
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

      const { data: notesData } = await supabase
        .from('notes')
        .select('*')
        .eq('student_id', authUser.id)
        .order('created_at', { ascending: false })

      if (notesData) setNotes(notesData)
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
        toast.error('Failed to save note')
        return
      }
      setNotes([data, ...notes])
      toast.success('Note archived')
    } else if (activeNote) {
      const { data, error } = await supabase
        .from('notes')
        .update({ title, content, tags, updated_at: new Date().toISOString() })
        .eq('id', activeNote.id)
        .select()
        .single()

      if (error) {
        toast.error('Failed to update note')
        return
      }
      setNotes(notes.map(note => note.id === activeNote.id ? data : note))
      toast.success('Note synchronized')
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
        toast.error('Deletion failed')
        return
      }
      setNotes(notes.filter(note => note.id !== activeNote.id))
      toast.success('Note removed')
      setActiveNote(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-slate-50 text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <span className="text-xs font-bold uppercase tracking-widest opacity-60">Syncing your library...</span>
      </div>
    )
  }

  const filteredNotes = notes.filter(note =>
    note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-32 px-8">
      {/* Precision Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <p className="text-primary text-xs font-bold uppercase tracking-widest mb-1.5 opacity-80">Knowledge Management</p>
           <h2 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight">Your Notes</h2>
           <p className="text-sm font-medium text-slate-500 mt-2">Organize your thoughts, study plans, and academic reminders.</p>
        </div>
        <button 
          onClick={openAddNote}
          className="btn-primary"
        >
          <Plus size={20} />
          <span>Create New Note</span>
        </button>
      </header>

      {/* Advanced Search */}
      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
        <input
          type="text"
          placeholder="Filter by keywords or titles..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="input pl-14 pr-12 w-full py-5"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Dynamic Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
         {filteredNotes.length === 0 ? (
            <div className="col-span-full py-32 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6 shadow-inner">
                  <StickyNote size={40} />
               </div>
               <h3 className="text-xl font-extrabold text-on-surface">No digital notes found</h3>
               <p className="text-sm font-medium text-slate-400 max-w-xs mb-8">
                  {searchQuery ? `No results for "${searchQuery}". Try a broader term.` : 'Your personal library is empty. Start capturing knowledge today.'}
               </p>
               {searchQuery ? (
                 <button onClick={() => setSearchQuery('')} className="text-xs font-extrabold text-primary uppercase tracking-widest hover:underline">
                   Clear Filter
                 </button>
               ) : (
                 <button onClick={openAddNote} className="px-8 py-3.5 bg-slate-100 text-slate-600 rounded-2xl text-xs font-extrabold uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm">
                   Create First Note
                 </button>
               )}
            </div>
         ) : (
            filteredNotes.map((note) => (
              <article 
                key={note.id}
                onClick={() => openEditNote(note)}
                className="card p-10 flex flex-col group hover:border-primary/30 cursor-pointer h-[280px] shadow-sm relative overflow-hidden"
              >
                  {/* Subtle Grain Texture/Details */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-[60px] -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex justify-between items-start mb-6 z-10">
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100 shadow-sm">
                       <Calendar size={12} className="text-primary" />
                       <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                          {format(new Date(note.created_at), 'dd MMM')}
                       </span>
                    </div>
                  </div>
                  
                  <h3 className="font-headline font-extrabold text-2xl text-on-surface group-hover:text-primary transition-colors tracking-tight line-clamp-1 mb-3">
                    {note.title}
                  </h3>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed line-clamp-3 opacity-80">
                    {note.content}
                  </p>
                  
                  <div className="mt-auto pt-6 flex flex-wrap gap-2 z-10">
                    {(note.tags || []).length > 0 ? (note.tags || []).map((tag: string) => (
                       <span key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-secondary/5 text-secondary text-[10px] font-extrabold uppercase tracking-wider rounded-lg border border-secondary/10">
                          <Hash size={10} />
                          {tag}
                       </span>
                    )) : (
                      <span className="text-[10px] font-bold text-slate-300 italic">No tags added</span>
                    )}
                  </div>
              </article>
            ))
         )}
      </div>

      {/* Editor Surface */}
      {(activeNote || isAdding) && (
        <div className="fixed inset-0 z-[100] bg-slate-50/98 backdrop-blur-md flex flex-col animate-in fade-in slide-in-from-bottom duration-500">
           <header className="bg-white/80 border-b border-slate-200 px-8 h-20 flex justify-between items-center w-full">
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => { setActiveNote(null); setIsAdding(false); }} 
                  className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-100 transition-all"
                >
                  <ArrowLeft size={18} />
                </button>
                <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-[0.3em]">{isAdding ? 'Drafting Note' : 'Editing Note'}</h2>
              </div>
              
              <div className="flex items-center gap-4">
                 <button 
                  onClick={handleSave} 
                  className="btn-primary py-2.5 px-8 rounded-2xl shadow-xl shadow-primary/20"
                >
                  <Save size={18} />
                  <span>Archive</span>
                </button>
              </div>
           </header>
          
           <div className="flex-1 overflow-y-auto w-full">
             <div className="max-w-4xl mx-auto px-8 py-16 space-y-12 pb-40">
                {/* Title Input */}
                <div className="space-y-4">
                   <label className="text-xs font-extrabold text-primary uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1 h-3 bg-primary rounded-full" />
                      Note Title
                   </label>
                    <input 
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-transparent border-none text-5xl font-extrabold text-on-surface placeholder:text-slate-200 focus:ring-0 px-0 focus:outline-none tracking-tight" 
                      placeholder="Start with a heading..."
                   />
                </div>

                {/* Tags Interaction */}
                <div className="space-y-6 p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                   <div className="flex items-center justify-between">
                      <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                         <Hash size={14} className="text-secondary" />
                         Category Tags
                      </label>
                      <span className="text-[10px] font-bold text-slate-300 italic">Press Enter to add</span>
                   </div>
                   
                   <div className="flex flex-wrap gap-3">
                      {tags.map(tag => (
                         <span key={tag} className="flex items-center gap-2 bg-secondary/5 text-secondary border border-secondary/10 px-4 py-2 rounded-2xl text-xs font-extrabold transition-all hover:bg-secondary hover:text-white">
                            {tag}
                            <button onClick={() => setTags(tags.filter(t => t !== tag))}>
                               <X size={14} />
                            </button>
                         </span>
                      ))}
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
                        className="bg-slate-50 border-none rounded-2xl px-5 py-2 text-xs font-bold text-on-surface placeholder:text-slate-300 focus:ring-2 focus:ring-secondary/20 transition-all min-w-[150px]" 
                        placeholder="Add tag..."
                      />
                   </div>
                </div>

                {/* Markdown Editor (Visual only for now) */}
                <div className="space-y-6">
                   <label className="text-xs font-extrabold text-primary uppercase tracking-widest flex items-center gap-2 px-1">
                      <div className="w-1 h-3 bg-primary rounded-full" />
                      Content Surface
                   </label>
                    <textarea 
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-[3rem] p-12 text-on-surface font-medium leading-relaxed text-lg focus:ring-8 focus:ring-primary/5 focus:border-primary/30 transition-all resize-none shadow-xl shadow-slate-200/50 min-h-[500px]" 
                      placeholder="Start capturing your ideas here..."
                   />
                </div>

                {/* Deactivation Zone */}
                {activeNote && (
                   <div className="pt-12 border-t border-slate-200">
                      <button 
                        onClick={handleDelete} 
                        className="w-full py-5 text-rose-500 font-extrabold text-xs uppercase tracking-[0.3em] bg-rose-50 hover:bg-rose-500 hover:text-white rounded-[2rem] transition-all flex items-center justify-center gap-3 border border-rose-100 shadow-sm"
                      >
                        <Trash2 size={20} /> 
                        Permanently Remove Note
                      </button>
                   </div>
                )}
             </div>
           </div>
        </div>
      )}
    </div>
  )
}
