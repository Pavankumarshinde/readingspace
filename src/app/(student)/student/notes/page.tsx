'use client'

import { useState, useEffect } from 'react'
import { Plus, StickyNote, Clock, Save, Trash2, Calendar, X, Search, Edit3, ChevronRight, Hash, ArrowLeft, Loader2, Pin, PinOff, Palette } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

const NOTE_COLORS = [
  { name: 'Default', value: 'white', bg: 'bg-white', border: 'border-slate-200' },
  { name: 'Red', value: 'red', bg: 'bg-rose-50', border: 'border-rose-200' },
  { name: 'Blue', value: 'blue', bg: 'bg-sky-50', border: 'border-sky-200' },
  { name: 'Green', value: 'green', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { name: 'Yellow', value: 'yellow', bg: 'bg-amber-50', border: 'border-amber-200' },
  { name: 'Indigo', value: 'indigo', bg: 'bg-indigo-50', border: 'border-indigo-200' },
]

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
  const [isPinned, setIsPinned] = useState(false)
  const [color, setColor] = useState('white')

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
        .order('is_pinned', { ascending: false })
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
    setIsPinned(false)
    setColor('white')
  }

  const openEditNote = (note: any) => {
    setActiveNote(note)
    setTitle(note.title)
    setContent(note.content)
    setTags(note.tags || [])
    setTagInput('')
    setIsPinned(note.is_pinned || false)
    setColor(note.color || 'white')
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
          tags,
          is_pinned: isPinned,
          color
        })
        .select()
        .single()

      if (error) {
        toast.error('Failed to save note')
        return
      }
      setNotes([data, ...notes].sort((a,b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)))
      toast.success('Note archived')
    } else if (activeNote) {
      const { data, error } = await supabase
        .from('notes')
        .update({ title, content, tags, is_pinned: isPinned, color, updated_at: new Date().toISOString() })
        .eq('id', activeNote.id)
        .select()
        .single()

      if (error) {
        toast.error('Failed to update note')
        return
      }
      const updatedNotes = notes.map(note => note.id === activeNote.id ? data : note)
      setNotes(updatedNotes.sort((a,b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)))
      toast.success('Note synchronized')
    }

    setIsAdding(false)
    setActiveNote(null)
  }

  const togglePinInline = async (e: React.MouseEvent, note: any) => {
    e.stopPropagation()
    const { data, error } = await supabase
      .from('notes')
      .update({ is_pinned: !note.is_pinned })
      .eq('id', note.id)
      .select()
      .single()
    
    if (!error && data) {
      const updatedNotes = notes.map(n => n.id === note.id ? data : n)
      setNotes(updatedNotes.sort((a,b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)))
      toast.success(data.is_pinned ? 'Pinned' : 'Unpinned')
    }
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

  const pinnedNotes = filteredNotes.filter(n => n.is_pinned)
  const otherNotes = filteredNotes.filter(n => !n.is_pinned)

  const NoteCard = ({ note }: { note: any }) => {
    const colorConfig = NOTE_COLORS.find(c => c.value === (note.color || 'white')) || NOTE_COLORS[0]
    return (
      <article 
        onClick={() => openEditNote(note)}
        className={`card p-5 flex flex-col group ${colorConfig.bg} ${colorConfig.border} hover:shadow-lg cursor-pointer h-[240px] relative overflow-hidden transition-all`}
      >
          <div className="flex justify-between items-start mb-3 z-10">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/60 backdrop-blur-sm rounded-full border border-slate-100 shadow-sm">
               <Calendar size={10} className="text-primary" />
               <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">
                  {format(new Date(note.created_at), 'dd MMM, HH:mm')}
               </span>
            </div>
            <button 
              onClick={(e) => togglePinInline(e, note)}
              className={`p-1.5 rounded-full hover:bg-black/5 transition-colors ${note.is_pinned ? 'text-primary' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`}
            >
              {note.is_pinned ? <Pin size={16} /> : <Pin size={16} />}
            </button>
          </div>
          
          <h3 className="font-headline font-extrabold text-lg text-on-surface group-hover:text-primary transition-colors tracking-tight line-clamp-1 mb-2">
            {note.title}
          </h3>
          <p className="text-sm font-medium text-slate-500 leading-relaxed line-clamp-4 opacity-80">
            {note.content}
          </p>
          
          <div className="mt-auto pt-4 flex flex-wrap gap-1.5 z-10">
            {(note.tags || []).length > 0 ? (note.tags || []).map((tag: string) => (
               <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-white/40 text-on-surface-variant text-[9px] font-extrabold uppercase tracking-wider rounded-md border border-black/5">
                  <Hash size={8} />
                  {tag}
               </span>
            )) : null}
          </div>
      </article>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700 pb-20 px-6 font-sans">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
        <div>
           <h2 className="font-headline text-2xl font-extrabold text-on-surface tracking-tight leading-none text-slate-900">Study Notes</h2>
           <div className="flex items-center gap-2 mt-1.5 ">
              <p className="text-[10px] md:text-xs font-semibold text-indigo-600 opacity-90 uppercase tracking-wider">Your personal library</p>
              <div className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-black rounded-full border border-indigo-100 uppercase tracking-widest">
                 {notes.length} Notes
              </div>
           </div>
        </div>
        <button 
          onClick={openAddNote}
          className="btn-primary py-2 px-6 rounded-xl text-[10px] shadow-lg shadow-primary/20"
        >
          <Plus size={18} />
          <span>Capture Knowledge</span>
        </button>
      </header>

      {/* Advanced Search */}
      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={16} />
        <input
          type="text"
          placeholder="Filter by tags, titles, or content..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="input pl-12 pr-12 w-full py-2.5 text-[11px] font-bold bg-white border-slate-100 placeholder:text-slate-300"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="space-y-8">
         {pinnedNotes.length > 0 && (
            <section className="space-y-3">
               <div className="flex items-center gap-2 px-1">
                  <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                    <Pin size={10} strokeWidth={3} />
                  </div>
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Pinned</h4>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {pinnedNotes.map(note => <NoteCard key={note.id} note={note} />)}
               </div>
            </section>
         )}

         <section className="space-y-3">
            {pinnedNotes.length > 0 && (
               <div className="flex items-center gap-2 px-1 pt-2">
                  <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center text-slate-400">
                    <StickyNote size={10} strokeWidth={3} />
                  </div>
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Recent</h4>
               </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
               {otherNotes.length === 0 && pinnedNotes.length === 0 ? (
                  <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dotted border-slate-200 flex flex-col items-center">
                     <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 mb-4 shadow-inner">
                        <StickyNote size={24} />
                     </div>
                     <h3 className="text-base font-black text-on-surface uppercase tracking-tight">No notes yet</h3>
                     <p className="text-[10px] font-bold text-slate-400 max-w-[200px] mb-6 leading-relaxed uppercase tracking-widest opacity-60">
                        Capture your thoughts and sync across devices instantly.
                     </p>
                     {!searchQuery && (
                        <button onClick={openAddNote} className="px-5 py-2 bg-primary text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                           Create First Note
                        </button>
                     )}
                  </div>
               ) : (
                  otherNotes.map(note => <NoteCard key={note.id} note={note} />)
               )}
            </div>
         </section>
      </div>

      {/* Editor Surface */}
      {(activeNote || isAdding) && (
        <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-xl flex flex-col animate-in fade-in slide-in-from-bottom duration-500">
           <header className="bg-transparent border-b border-black/5 px-6 h-14 flex justify-between items-center w-full">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => { setActiveNote(null); setIsAdding(false); }} 
                  className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all bg-white"
                >
                  <ArrowLeft size={14} />
                </button>
                <div className="flex flex-col">
                  <h2 className="text-[11px] font-black text-on-surface uppercase tracking-widest leading-none">
                    {isAdding ? 'New Archive' : 'Sync Knowledge'}
                  </h2>
                  <p className="text-[8px] font-bold text-indigo-600 mt-1 uppercase tracking-wider">Keep in library</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                 <button 
                   onClick={() => setIsPinned(!isPinned)}
                   className={`p-2 rounded-xl transition-all ${isPinned ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:bg-slate-100'}`}
                 >
                   {isPinned ? <Pin size={18} /> : <Pin size={18} />}
                 </button>
                 <div className="h-4 w-px bg-slate-200 mx-1" />
                 <button 
                  onClick={handleSave} 
                  className="btn-primary py-2 px-6 rounded-xl text-[10px]"
                >
                  <Save size={16} />
                  <span>Sync</span>
                </button>
              </div>
           </header>
          
           <div className={`flex-1 overflow-y-auto w-full transition-colors duration-500 ${(NOTE_COLORS.find(c => c.value === color) || NOTE_COLORS[0]).bg}`}>
             <div className="max-w-3xl mx-auto px-6 py-8 space-y-6 pb-20">
                <input 
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-transparent border-none text-2xl md:text-3xl font-black text-on-surface placeholder:text-slate-300 focus:ring-0 px-0 focus:outline-none tracking-tight font-headline uppercase" 
                  placeholder="HEADING..."
               />

                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-transparent border-none text-on-surface font-semibold leading-relaxed text-sm md:text-base focus:ring-0 px-0 focus:outline-none resize-none min-h-[350px]" 
                  placeholder="Capture details..."
                />

                {/* Floating Tool Bar */}
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/95 backdrop-blur-xl p-3 rounded-2xl border border-slate-200 shadow-2xl animate-in zoom-in slide-in-from-bottom duration-500">
                   <div className="flex items-center gap-1.5 px-2 border-r border-slate-100">
                      {NOTE_COLORS.map(c => (
                         <button 
                            key={c.value}
                            onClick={() => setColor(c.value)}
                            className={`w-4 h-4 rounded-full border transition-transform hover:scale-125 ${c.bg} ${color === c.value ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200'}`}
                         />
                      ))}
                   </div>
                   
                   <div className="flex items-center gap-2">
                       <Hash size={14} className="text-slate-400" />
                       <input 
                         type="text"
                         value={tagInput}
                         onChange={(e) => {
                            if (e.target.value.endsWith(',')) {
                               const tag = e.target.value.replace(',', '').trim();
                               if (tag && !tags.includes(tag)) setTags([...tags, tag]);
                               setTagInput('');
                            } else {
                               setTagInput(e.target.value);
                            }
                         }}
                         onBlur={() => {
                            if (tagInput.trim() && !tags.includes(tagInput.trim())) {
                               setTags([...tags, tagInput.trim()]);
                               setTagInput('');
                            }
                         }}
                         onKeyDown={(e) => {
                            if (e.key === 'Enter' && tagInput.trim()) {
                               if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()]);
                               setTagInput('');
                            }
                         }}
                         className="bg-slate-50 border-none rounded-lg px-3 py-1.5 text-[9px] font-black text-on-surface placeholder:text-slate-300 focus:ring-1 focus:ring-secondary/20 transition-all w-28 uppercase" 
                         placeholder="TAGS..."
                       />
                   </div>

                   {tags.length > 0 && (
                      <div className="flex items-center gap-1 pl-3 border-l border-slate-100">
                         {tags.map(tag => (
                            <span key={tag} className="flex items-center gap-1 bg-secondary/10 text-secondary border border-secondary/20 px-2 py-0.5 rounded-md text-[8px] font-black uppercase transition-all">
                               {tag}
                               <button onClick={() => setTags(tags.filter(t => t !== tag))}>
                                  <X size={8} />
                                </button>
                            </span>
                         ))}
                      </div>
                   )}

                   {activeNote && (
                      <button 
                        onClick={handleDelete} 
                        className="ml-2 p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                      >
                        <Trash2 size={18} /> 
                      </button>
                   )}
                </div>
             </div>
           </div>
        </div>
      )}
    </div>
  )
}
