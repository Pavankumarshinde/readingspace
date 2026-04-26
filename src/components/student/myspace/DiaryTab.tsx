'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import { Search, Plus, Trash2, Save, Clock, Book } from 'lucide-react'

interface DiaryEntry {
  id: string
  content: string
  word_count: number
  entry_date: string
  created_at: string
}

interface DiaryTabProps { userId: string }

export default function DiaryTab({ userId }: DiaryTabProps) {
  const supabase = createClient()
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [content, setContent] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchEntries()
  }, [userId])

  const fetchEntries = async () => {
    const { data } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setEntries(data as DiaryEntry[])
    setLoading(false)
  }

  const openNew = () => {
    setIsNew(true)
    setSelectedEntry(null)
    setContent('')
  }

  const openEntry = (entry: DiaryEntry) => {
    setSelectedEntry(entry)
    setIsNew(false)
    setContent(entry.content)
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
        content, word_count: wordCount,
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
    toast.success('Entry deleted')
  }

  const filteredEntries = entries.filter(e => 
    e.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const editorOpen = isNew || !!selectedEntry

  return (
    <div className="w-full">
      {/* Sticky inner header: Diary title + New Entry btn + Search */}
      <div className="sticky top-0 z-10 bg-surface pb-1">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface">Diary</h2>
            <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mt-0.5">Your private journal</p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/10"
          >
            <Plus size={14} />
            New Entry
          </button>
        </div>
        {/* Search — only meaningful on mobile list view */}
        <div className="relative lg:hidden">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/20" size={14} />
          <input
            type="text"
            placeholder="Search diary…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-on-surface outline-none focus:ring-1 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Entry List Column */}
        <div className="flex flex-col gap-4">
          {/* Desktop search (inside the column) */}
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/20" size={14} />
            <input
              type="text"
              placeholder="Search diary…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-on-surface outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>

          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-2 shadow-sm overflow-y-auto max-h-[600px] custom-scrollbar">
            {loading ? (
              <div className="py-8 text-center text-[10px] font-black uppercase tracking-widest text-on-surface/20">Loading…</div>
            ) : filteredEntries.length === 0 ? (
              <div className="py-12 text-center">
                <Book className="mx-auto text-outline/10 mb-2" size={32} />
                <p className="text-xs text-on-surface-variant/30 font-bold uppercase tracking-tighter">Empty Archive</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredEntries.map(entry => {
                  const active = selectedEntry?.id === entry.id
                  return (
                    <button
                      key={entry.id}
                      onClick={() => openEntry(entry)}
                      className={`w-full text-left px-4 py-4 rounded-xl transition-all ${active ? 'bg-primary/5 border border-primary/20 shadow-sm' : 'hover:bg-surface-container/50'}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Clock size={10} className="text-primary/40" />
                        <span className="text-[10px] font-black text-on-surface/40 uppercase tracking-widest">
                          {format(parseISO(entry.created_at), 'MMM d · h:mm a')}
                        </span>
                      </div>
                      <p className="text-[13px] text-on-surface-variant line-clamp-2 leading-relaxed font-medium">
                        {entry.content}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Editor Area */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-6 shadow-sm min-h-[500px] flex flex-col">
          {!editorOpen ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-surface-container rounded-[2rem] flex items-center justify-center mb-6">
                 <Book className="text-on-surface/10" size={40} />
              </div>
              <p className="text-sm font-bold text-on-surface/30 mb-6">SELECT AN ENTRY OR START FRESH</p>
              <button onClick={openNew} className="px-8 py-3 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/10">
                Write New Entry
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Date/Time Header */}
              <div className="mb-6 flex items-center justify-between border-b border-outline-variant/5 pb-4">
                <div>
                  <h3 className="font-headline text-2xl font-bold text-on-surface">
                    {selectedEntry
                      ? format(parseISO(selectedEntry.created_at), 'EEEE, MMMM d')
                      : format(new Date(), 'EEEE, MMMM d')}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock size={12} className="text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                       {selectedEntry 
                         ? format(parseISO(selectedEntry.created_at), 'h:mm a') 
                         : format(new Date(), 'h:mm a')}
                    </span>
                  </div>
                </div>
                <span className="px-4 py-1.5 bg-surface-container rounded-full text-[9px] font-black uppercase tracking-widest text-on-surface/40">
                  {selectedEntry ? 'Saved Entry' : 'New Entry'}
                </span>
              </div>

              {/* Textarea */}
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="TYPE HERE..."
                className="flex-1 w-full bg-transparent border-none p-0 text-[15px] leading-loose font-medium text-on-surface placeholder:text-on-surface/5 outline-none resize-none"
                autoFocus
              />

              {/* Toolbar */}
              <div className="mt-8 pt-6 border-t border-outline-variant/5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest text-on-surface/20">QUANTITY</span>
                  <span className="text-xs font-bold text-on-surface/40">
                    {wordCount} {wordCount === 1 ? 'word' : 'words'}
                  </span>
                </div>
                
                <div className="flex gap-3">
                  {selectedEntry && (
                    <button 
                      onClick={deleteEntry} 
                      className="p-3 text-on-surface/20 hover:text-red-500 hover:bg-red-50 transition-all rounded-xl"
                      title="Delete Entry"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                  <button
                    onClick={save}
                    disabled={saving}
                    className="flex items-center gap-3 px-8 py-3.5 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:shadow-2xl hover:shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Save size={16} />
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
