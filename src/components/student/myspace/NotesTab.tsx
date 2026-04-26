'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

interface Note {
  id: string
  student_id: string
  title: string
  content: string
  tags: string[]
  is_pinned: boolean
  created_at: string
  updated_at?: string
}

interface NotesTabProps {
  userId: string
}

export default function NotesTab({ userId }: NotesTabProps) {
  const supabase = createClient()

  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const [activeNote, setActiveNote] = useState<Note | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isPinned, setIsPinned] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: notesData } = await supabase
        .from('notes')
        .select('*')
        .eq('student_id', userId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
      if (notesData) setNotes(notesData)
      setLoading(false)
    }
    init()
  }, [userId])

  const openAddNote = () => {
    setIsAdding(true)
    setTitle('')
    setContent('')
    setTags([])
    setTagInput('')
    setIsPinned(false)
    setActiveNote(null)
  }

  const openEditNote = (note: Note) => {
    setActiveNote(note)
    setTitle(note.title)
    setContent(note.content)
    setTags(note.tags || [])
    setTagInput('')
    setIsPinned(note.is_pinned || false)
  }

  const closeEditor = () => {
    setActiveNote(null)
    setIsAdding(false)
  }

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required')
      return
    }
    if (isAdding) {
      const { data, error } = await supabase
        .from('notes')
        .insert({ student_id: userId, title, content, tags, is_pinned: isPinned })
        .select()
        .single()
      if (error) { toast.error('Failed to save note'); return }
      setNotes([data, ...notes].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)))
      toast.success('Note saved')
    } else if (activeNote) {
      const { data, error } = await supabase
        .from('notes')
        .update({ title, content, tags, is_pinned: isPinned, updated_at: new Date().toISOString() })
        .eq('id', activeNote.id)
        .select()
        .single()
      if (error) { toast.error('Failed to update note'); return }
      setNotes(notes.map(n => n.id === activeNote.id ? data : n).sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)))
      toast.success('Note updated')
    }
    closeEditor()
  }

  const handleDelete = async (noteToDelete?: Note) => {
    const target = noteToDelete || activeNote
    if (!target) return
    const { error } = await supabase.from('notes').delete().eq('id', target.id)
    if (error) { toast.error('Deletion failed'); return }
    setNotes(notes.filter(n => n.id !== target.id))
    toast.success('Note deleted')
    if (!noteToDelete) closeEditor()
  }

  const togglePinInline = async (e: React.MouseEvent, note: Note) => {
    e.stopPropagation()
    const { data, error } = await supabase
      .from('notes').update({ is_pinned: !note.is_pinned }).eq('id', note.id).select().single()
    if (!error && data) {
      setNotes(notes.map(n => n.id === note.id ? data : n).sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)))
    }
  }

  const addTagFromInput = () => {
    const tag = tagInput.trim()
    if (tag && !tags.includes(tag)) setTags([...tags, tag])
    setTagInput('')
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-secondary/60">Loading your library...</span>
      </div>
    )
  }

  const filteredNotes = notes.filter(note =>
    note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const isEditorOpen = isAdding || !!activeNote

  return (
    <div className="w-full flex flex-col">
      {!isEditorOpen ? (
        <>
          {/* Sticky inner header: Title + Search — stays fixed in scroll area */}
          <div className="sticky top-0 z-10 bg-surface pb-3">
            {/* Title */}
            <div className="mb-4">
              <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface">Notes</h2>
              <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mt-0.5">Your saved thoughts</p>
            </div>
            {/* Search + Add */}
            <div className="flex items-center gap-3 w-full">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Search entries..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full h-10 bg-surface-container-low border-none rounded-lg px-4 pr-10 text-sm focus:ring-1 focus:ring-primary/40 outline-none placeholder:text-outline/50 transition-all font-body"
                />
                {searchQuery && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors"
                    onClick={() => setSearchQuery('')}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                  </button>
                )}
              </div>
              <button
                onClick={openAddNote}
                className="h-10 w-10 flex items-center justify-center bg-primary text-white rounded-lg hover:opacity-90 transition-all active:scale-95 shadow-sm shrink-0"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
              </button>
            </div>
          </div>

          {/* Note Grid */}
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="material-symbols-outlined text-outline/20 mb-4" style={{ fontSize: '52px' }}>description</span>
              <h3 className="font-headline text-lg font-bold text-on-surface mb-1">
                {searchQuery ? 'No results found' : 'No notes yet'}
              </h3>
              <p className="text-xs text-secondary/60 max-w-[250px] mb-6 leading-relaxed">
                {searchQuery ? 'Try a different search term.' : 'Capture your first thought.'}
              </p>
              {!searchQuery && (
                <button onClick={openAddNote} className="px-6 py-2.5 bg-primary text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm hover:opacity-90 active:scale-95 transition-all">
                  Create First Note
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredNotes.map(note => (
                <article
                  key={note.id}
                  onClick={() => openEditNote(note)}
                  className={`flex flex-col min-h-[160px] bg-surface-container-lowest rounded-xl p-4 shadow-[0px_4px_16px_rgba(30,27,22,0.04)] group relative cursor-pointer transition-all hover:shadow-[0px_6px_20px_rgba(30,27,22,0.08)] hover:-translate-y-0.5 ${
                    note.is_pinned ? 'border-l-2 border-primary border-t border-r border-b border-outline-variant/10' : 'border border-outline-variant/10'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-headline text-base font-bold leading-tight pr-6 text-on-surface line-clamp-2">{note.title}</h3>
                    <span className="text-[9px] font-medium text-secondary/50 whitespace-nowrap mt-1 font-body shrink-0 ml-2">
                      {format(new Date(note.created_at), 'MMM d, yy')}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-3 font-body mb-3">{note.content}</p>
                  {(note.tags || []).length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {(note.tags || []).map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 bg-surface-container text-secondary text-[8px] font-bold uppercase tracking-wider rounded">{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="mt-auto pt-3 flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity border-t border-transparent group-hover:border-outline-variant/10">
                    <button onClick={e => togglePinInline(e, note)} className="text-outline/60 hover:text-primary transition-colors inline-flex p-1">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: note.is_pinned ? "'FILL' 1" : "'FILL' 0", color: note.is_pinned ? 'var(--color-primary)' : undefined }}>push_pin</span>
                    </button>
                    <button onClick={e => { e.stopPropagation(); openEditNote(note) }} className="text-outline/60 hover:text-primary transition-colors inline-flex p-1">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                    </button>
                    <button onClick={async e => { e.stopPropagation(); await handleDelete(note) }} className="text-outline/60 hover:text-error transition-colors inline-flex p-1">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-300">
          <button onClick={closeEditor} className="flex items-center gap-2 mb-6 text-secondary hover:opacity-70 transition-opacity">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
            <span className="text-[11px] font-bold uppercase tracking-widest">Back to Notes</span>
          </button>

          <article className="w-full bg-surface-container-lowest rounded-2xl p-6 md:p-8 shadow-[0px_12px_32px_rgba(30,27,22,0.06)] border border-outline-variant/10">
            <div className="space-y-4">
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Title"
                className="w-full bg-transparent border-none p-0 text-3xl font-headline italic font-semibold text-on-surface placeholder:text-on-surface-variant/30 focus:ring-0 focus:outline-none"
                autoFocus
              />
              <div className="h-px w-12 bg-primary-fixed-dim/40 my-4" />
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Start writing..."
                className="w-full h-48 bg-transparent border-none p-0 text-base leading-relaxed font-body text-on-surface placeholder:text-on-surface-variant/25 focus:ring-0 focus:outline-none resize-none overflow-y-auto"
              />
              <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-surface-container-low mt-4">
                <span className="material-symbols-outlined text-secondary" style={{ fontSize: '18px' }}>sell</span>
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1.5 px-3 py-1 bg-surface-container text-secondary text-[10px] font-bold uppercase tracking-wider rounded">
                    {tag}
                    <button onClick={() => setTags(tags.filter(t => t !== tag))} className="ml-0.5 hover:text-error transition-colors">
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>close</span>
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTagFromInput() } }}
                  onBlur={addTagFromInput}
                  placeholder="Add tags..."
                  className="flex-grow bg-transparent border-none p-0 text-sm font-label text-secondary placeholder:text-secondary/30 focus:ring-0 focus:outline-none min-w-[120px]"
                />
                <button
                  onClick={() => setIsPinned(!isPinned)}
                  className={`ml-auto p-2 rounded-lg transition-colors ${isPinned ? 'bg-primary/10 text-primary' : 'text-outline/60 hover:text-primary hover:bg-surface-container'}`}
                >
                  <span className="material-symbols-outlined block" style={{ fontSize: '18px', fontVariationSettings: isPinned ? "'FILL' 1" : "'FILL' 0" }}>push_pin</span>
                </button>
              </div>
            </div>
            <div className="mt-8 flex justify-between items-center">
              {activeNote ? (
                <button onClick={() => handleDelete()} className="p-2.5 text-error/60 hover:text-error hover:bg-error-container/20 rounded-full transition-all">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                </button>
              ) : <div />}
              <button
                onClick={handleSave}
                className="bg-gradient-to-r from-primary to-primary-container text-white px-8 py-3 rounded-full text-xs font-bold tracking-widest hover:scale-105 transition-transform active:scale-95 shadow-md"
              >
                Save
              </button>
            </div>
          </article>
        </div>
      )}
    </div>
  )
}
