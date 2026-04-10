'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { StudentBrandHeader } from '@/components/student/StudentHeader'

export default function StudentNotes() {
  const router = useRouter()
  const supabase = createClient()

  const [notes, setNotes] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Editor state
  const [activeNote, setActiveNote] = useState<any>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isPinned, setIsPinned] = useState(false)

  useEffect(() => {
    async function init() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
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
    setActiveNote(null)
  }

  const openEditNote = (note: any) => {
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
    if (!user) return

    if (isAdding) {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          student_id: user.id,
          title,
          content,
          tags,
          is_pinned: isPinned,
        })
        .select()
        .single()

      if (error) {
        toast.error('Failed to save note')
        return
      }
      setNotes(
        [data, ...notes].sort(
          (a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)
        )
      )
      toast.success('Note saved')
    } else if (activeNote) {
      const { data, error } = await supabase
        .from('notes')
        .update({
          title,
          content,
          tags,
          is_pinned: isPinned,
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeNote.id)
        .select()
        .single()

      if (error) {
        toast.error('Failed to update note')
        return
      }
      const updated = notes.map((n) => (n.id === activeNote.id ? data : n))
      setNotes(
        updated.sort(
          (a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)
        )
      )
      toast.success('Note updated')
    }

    closeEditor()
  }

  const handleDelete = async () => {
    if (!activeNote) return
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', activeNote.id)

    if (error) {
      toast.error('Deletion failed')
      return
    }
    setNotes(notes.filter((n) => n.id !== activeNote.id))
    toast.success('Note deleted')
    closeEditor()
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
      const updated = notes.map((n) => (n.id === note.id ? data : n))
      setNotes(
        updated.sort(
          (a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)
        )
      )
    }
  }

  const addTagFromInput = () => {
    const tag = tagInput.trim()
    if (tag && !tags.includes(tag)) setTags([...tags, tag])
    setTagInput('')
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-surface">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-secondary/60">
          Loading your library...
        </span>
      </div>
    )
  }

  const filteredNotes = notes.filter(
    (note) =>
      note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const isEditorOpen = isAdding || !!activeNote

  return (
    <>
      {/* Mobile-only brand header - hidden on mobile when editor open */}
      <div className={isEditorOpen ? 'hidden md:block' : ''}>
        <StudentBrandHeader />
      </div>

      <main className={`relative max-w-lg mx-auto md:max-w-none md:px-8 xl:max-w-[1400px] ${
        isEditorOpen ? 'pt-6 pb-28 md:pt-8 md:pb-12 px-4' : 'pt-16 pb-28 md:pt-8 md:pb-12 px-4'
      }`}>
        {!isEditorOpen ? (
          <>
            {/* Hero */}
            <div className="mt-4 md:mt-0 mb-6 md:mb-8 text-left">
              <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tight leading-none text-on-surface">
                Study Notes
              </h2>
              <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mt-1.5 md:mt-2">
                your personal library
              </p>
            </div>

            {/* Search + Add Row */}
            <div className="flex items-center gap-3 mb-6 md:mb-8 w-full">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Search entries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 md:h-12 bg-surface-container-low border-none rounded-lg px-4 pr-12 text-sm focus:ring-1 focus:ring-primary/40 outline-none placeholder:text-outline/50 transition-all font-body"
                />
                <span
                  className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none"
                  style={{ fontSize: '20px' }}
                >
                  {searchQuery ? 'close' : 'tune'}
                </span>
                {searchQuery && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors text-outline hover:text-on-surface"
                    onClick={() => setSearchQuery('')}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      close
                    </span>
                  </button>
                )}
              </div>
              <button
                onClick={openAddNote}
                className="h-11 w-11 md:h-12 md:w-12 flex items-center justify-center bg-primary text-white rounded-lg hover:opacity-90 transition-all active:scale-95 shadow-sm shrink-0"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '24px' }}
                >
                  add
                </span>
              </button>
            </div>

            {/* Note List */}
            {filteredNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center w-full">
                <span
                  className="material-symbols-outlined text-outline/20 mb-4"
                  style={{ fontSize: '56px' }}
                >
                  description
                </span>
                <h3 className="font-headline text-lg font-bold text-on-surface mb-1">
                  {searchQuery ? 'No results found' : 'No notes yet'}
                </h3>
                <p className="text-xs text-secondary/60 max-w-[250px] mb-6 leading-relaxed">
                  {searchQuery
                    ? 'Try a different search term.'
                    : 'Capture your first thought.'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={openAddNote}
                    className="px-6 py-2.5 bg-primary text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm hover:opacity-90 active:scale-95 transition-all"
                  >
                    Create First Note
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 w-full">
                {filteredNotes.map((note) => (
                  <article
                    key={note.id}
                    onClick={() => openEditNote(note)}
                    className={`flex flex-col h-full min-h-[160px] bg-surface-container-lowest rounded-xl p-4 md:p-5 shadow-[0px_4px_16px_rgba(30,27,22,0.04)] group relative cursor-pointer transition-all hover:shadow-[0px_6px_20px_rgba(30,27,22,0.08)] hover:-translate-y-0.5 ${
                      note.is_pinned
                        ? 'border-l-2 border-primary border-t border-r border-b border-outline-variant/10'
                        : 'border border-outline-variant/10'
                    }`}
                  >
                    {/* Header row */}
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-headline text-lg md:text-xl font-bold leading-tight pr-6 text-on-surface line-clamp-2">
                        {note.title}
                      </h3>
                      <span className="text-[9px] font-medium text-secondary/50 whitespace-nowrap mt-1 font-body shrink-0 ml-2">
                        {format(new Date(note.created_at), 'MMM d, yy')}
                      </span>
                    </div>

                    {/* Preview */}
                    <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-3 font-body mb-3">
                      {note.content}
                    </p>

                    {/* Tags */}
                    {(note.tags || []).length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {(note.tags || []).map((tag: string) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-surface-container text-secondary text-[8px] font-bold uppercase tracking-wider rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action row — reveals on hover, pushed to bottom */}
                    <div className="mt-auto pt-3 flex justify-end items-center gap-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity border-t border-transparent group-hover:border-outline-variant/10">
                      <button
                        onClick={(e) => togglePinInline(e, note)}
                        className="text-outline/60 hover:text-primary transition-colors inline-flex p-1"
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{
                            fontSize: '18px',
                            fontVariationSettings: note.is_pinned
                              ? "'FILL' 1"
                              : "'FILL' 0",
                            color: note.is_pinned ? 'var(--color-primary)' : undefined,
                          }}
                        >
                          push_pin
                        </span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditNote(note)
                        }}
                        className="text-outline/60 hover:text-primary transition-colors inline-flex p-1"
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: '18px' }}
                        >
                          edit
                        </span>
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          setActiveNote(note)
                          await handleDelete()
                        }}
                        className="text-outline/60 hover:text-error transition-colors inline-flex p-1"
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: '18px' }}
                        >
                          delete
                        </span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Back button */}
            <button
              onClick={closeEditor}
              className="flex items-center gap-2 mb-6 text-secondary hover:opacity-70 transition-opacity"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '20px' }}
              >
                arrow_back
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest">
                Back to Notes
              </span>
            </button>

            {/* Card */}
            <article className="w-full bg-surface-container-lowest rounded-2xl p-6 md:p-8 shadow-[0px_12px_32px_rgba(30,27,22,0.06)] border border-outline-variant/10">
              <div className="space-y-4">
                {/* Title */}
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note Heading"
                  className="w-full bg-transparent border-none p-0 text-3xl md:text-4xl font-headline italic font-semibold text-on-surface placeholder:text-on-surface-variant/30 focus:ring-0 focus:outline-none"
                  autoFocus
                />

                {/* Decorative short divider */}
                <div className="h-px w-12 bg-primary-fixed-dim/40 my-4" />

                {/* Body */}
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Begin your note..."
                  className="w-full h-48 md:h-56 bg-transparent border-none p-0 text-base md:text-lg leading-relaxed font-body text-on-surface placeholder:text-on-surface-variant/25 focus:ring-0 focus:outline-none resize-none overflow-y-auto custom-scrollbar"
                />

                {/* Tags row */}
                <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-surface-container-low mt-4">
                  <span
                    className="material-symbols-outlined text-secondary"
                    style={{ fontSize: '18px' }}
                  >
                    sell
                  </span>
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1.5 px-3 py-1 bg-surface-container text-secondary text-[10px] font-bold uppercase tracking-wider rounded"
                    >
                      {tag}
                      <button
                        onClick={() =>
                          setTags(tags.filter((t) => t !== tag))
                        }
                        className="ml-0.5 hover:text-error transition-colors flex items-center justify-center p-0.5"
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: '12px' }}
                        >
                          close
                        </span>
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault()
                        addTagFromInput()
                      }
                    }}
                    onBlur={addTagFromInput}
                    placeholder="Add tags..."
                    className="flex-grow bg-transparent border-none p-0 text-sm md:text-base font-label text-secondary placeholder:text-secondary/30 focus:ring-0 focus:outline-none min-w-[120px]"
                  />

                  {/* Pin toggle */}
                  <button
                    onClick={() => setIsPinned(!isPinned)}
                    className={`ml-auto p-2 rounded-lg transition-colors ${
                      isPinned
                        ? 'bg-primary/10 text-primary'
                        : 'text-outline/60 hover:text-primary hover:bg-surface-container'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined block"
                      style={{
                        fontSize: '18px',
                        fontVariationSettings: isPinned
                          ? "'FILL' 1"
                          : "'FILL' 0",
                      }}
                    >
                      push_pin
                    </span>
                  </button>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="mt-8 flex justify-between items-center">
                {activeNote ? (
                  <button
                    onClick={handleDelete}
                    className="p-2.5 text-error/60 hover:text-error hover:bg-error-container/20 rounded-full transition-all flex items-center gap-2"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '20px' }}
                    >
                      delete
                    </span>
                  </button>
                ) : (
                  <div />
                )}
                <button
                  onClick={handleSave}
                  className="bg-gradient-to-r from-primary to-primary-container text-white px-8 md:px-10 py-3 rounded-full text-xs font-bold tracking-widest hover:scale-105 transition-transform active:scale-95 shadow-md flex items-center gap-2"
                >
                  SAVE
                </button>
              </div>
            </article>
          </div>
        )}
      </main>
    </>
  )
}
