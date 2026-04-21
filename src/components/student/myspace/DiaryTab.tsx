'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'

interface DiaryEntry {
  id: string
  content: string
  mood: string
  word_count: number
  entry_date: string
  created_at: string
}

interface DiaryTabProps { userId: string }

const MOODS = [
  { emoji: '😤', label: 'Stressed' },
  { emoji: '😐', label: 'Neutral' },
  { emoji: '😊', label: 'Good' },
  { emoji: '😄', label: 'Great' },
]

export default function DiaryTab({ userId }: DiaryTabProps) {
  const supabase = createClient()
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [content, setContent] = useState('')
  const [mood, setMood] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchEntries()
  }, [userId])

  const fetchEntries = async () => {
    const { data } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })
    if (data) setEntries(data as DiaryEntry[])
    setLoading(false)
  }

  const openNew = () => {
    setIsNew(true)
    setSelectedEntry(null)
    setContent('')
    setMood('')
  }

  const openEntry = (entry: DiaryEntry) => {
    setSelectedEntry(entry)
    setIsNew(false)
    setContent(entry.content)
    setMood(entry.mood)
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0

  const save = async () => {
    if (!content.trim()) { toast.error('Write something first'); return }
    setSaving(true)
    const today = format(new Date(), 'yyyy-MM-dd')

    if (isNew) {
      const { data, error } = await supabase.from('diary_entries').insert({
        user_id: userId,
        content,
        mood: mood || '😐',
        word_count: wordCount,
        entry_date: today,
      }).select().single()
      if (error) { toast.error('Failed to save'); setSaving(false); return }
      setEntries([data as DiaryEntry, ...entries])
      setSelectedEntry(data as DiaryEntry)
      setIsNew(false)
      toast.success('Entry saved')
    } else if (selectedEntry) {
      const { data, error } = await supabase.from('diary_entries').update({
        content, mood: mood || '😐', word_count: wordCount,
      }).eq('id', selectedEntry.id).select().single()
      if (error) { toast.error('Failed to update'); setSaving(false); return }
      setEntries(entries.map(e => e.id === selectedEntry.id ? data as DiaryEntry : e))
      setSelectedEntry(data as DiaryEntry)
      toast.success('Entry updated')
    }
    setSaving(false)
  }

  const deleteEntry = async () => {
    if (!selectedEntry) return
    await supabase.from('diary_entries').delete().eq('id', selectedEntry.id)
    setEntries(entries.filter(e => e.id !== selectedEntry.id))
    setSelectedEntry(null)
    setIsNew(false)
    setContent('')
    setMood('')
    toast.success('Entry deleted')
  }

  const editorOpen = isNew || !!selectedEntry

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-headline text-3xl font-bold tracking-tight text-on-surface">Diary</h2>
          <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mt-1">your private journal</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
          New Entry
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5">
        {/* Entry List */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-3 shadow-sm overflow-y-auto max-h-[600px]">
          {loading ? (
            <div className="py-8 text-center text-sm text-on-surface-variant/40">Loading…</div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center">
              <span className="material-symbols-outlined text-outline/20 block mb-2" style={{ fontSize: '36px' }}>book</span>
              <p className="text-xs text-on-surface-variant/40">No entries yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {entries.map(entry => {
                const active = selectedEntry?.id === entry.id
                return (
                  <button
                    key={entry.id}
                    onClick={() => openEntry(entry)}
                    className={`w-full text-left px-3 py-3 rounded-xl transition-all ${active ? 'bg-primary/10 border border-primary/20' : 'hover:bg-surface-container'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary/60">
                        {format(parseISO(entry.entry_date), 'MMM d, yyyy')}
                      </span>
                      <span className="text-base">{entry.mood}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                      {entry.content}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5 shadow-sm">
          {!editorOpen ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <span className="material-symbols-outlined text-outline/20 mb-3" style={{ fontSize: '48px' }}>edit_note</span>
              <p className="text-sm text-on-surface-variant/40 mb-4">Select an entry or start a new one</p>
              <button onClick={openNew} className="px-5 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:opacity-90 transition-all">
                Write Today's Entry
              </button>
            </div>
          ) : (
            <div className="animate-in fade-in duration-200">
              {/* Date Header */}
              <div className="mb-4 pb-3 border-b border-outline-variant/10">
                <p className="font-headline text-lg font-bold text-on-surface">
                  {selectedEntry
                    ? format(parseISO(selectedEntry.entry_date), 'EEEE, MMMM d, yyyy')
                    : format(new Date(), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-secondary/60 font-bold mt-0.5">
                  {selectedEntry ? 'Editing entry' : 'New entry'}
                </p>
              </div>

              {/* Mood Selector */}
              <div className="flex gap-2 mb-4">
                {MOODS.map(m => (
                  <button
                    key={m.emoji}
                    onClick={() => setMood(m.emoji)}
                    title={m.label}
                    className={`w-10 h-10 rounded-xl text-xl transition-all ${mood === m.emoji ? 'bg-primary/15 ring-2 ring-primary/30 scale-110' : 'bg-surface-container hover:bg-surface-container-high'}`}
                  >
                    {m.emoji}
                  </button>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="How was your day? What's on your mind…"
                className="w-full h-52 bg-surface-container/50 border-none rounded-xl p-4 text-sm leading-relaxed font-body text-on-surface placeholder:text-outline/30 focus:ring-1 focus:ring-primary/25 outline-none resize-none"
                autoFocus
              />

              {/* Footer */}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] text-outline/60 font-medium">
                  {wordCount} {wordCount === 1 ? 'word' : 'words'}
                </span>
                <div className="flex gap-2">
                  {selectedEntry && (
                    <button onClick={deleteEntry} className="px-4 py-2 text-xs font-bold text-error/70 hover:text-error hover:bg-error-container/20 rounded-lg transition-all">
                      Delete
                    </button>
                  )}
                  <button
                    onClick={save}
                    disabled={saving}
                    className="px-6 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save Entry'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
