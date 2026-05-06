"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { format, parseISO, isToday } from "date-fns";
import { Search, Save, Trash2, Clock, X, ChevronRight } from "lucide-react";

interface DiaryEntry {
  id: string;
  content: string;
  word_count: number;
  entry_date: string;
  created_at: string;
}

interface DiaryTabProps {
  userId: string;
}

export default function DiaryTab({ userId }: DiaryTabProps) {
  const supabase = createClient();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  // Inline "Write today" box state
  const [todayContent, setTodayContent] = useState("");
  const [expandedToday, setExpandedToday] = useState(false);
  const todayRef = useRef<HTMLTextAreaElement>(null);

  // Selected entry for full edit
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    fetchEntries();
  }, [userId]);

  const fetchEntries = async () => {
    const { data } = await supabase
      .from("diary_entries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) setEntries(data as DiaryEntry[]);
    setLoading(false);
  };

  const wordCount = (text: string) =>
    text.trim() ? text.trim().split(/\s+/).length : 0;

  const saveToday = async () => {
    if (!todayContent.trim()) {
      toast.error("Write something first");
      return;
    }
    setSaving(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("diary_entries")
      .insert({
        user_id: userId,
        content: todayContent,
        word_count: wordCount(todayContent),
        entry_date: today,
      })
      .select()
      .single();
    if (error) {
      toast.error("Failed to save");
      setSaving(false);
      return;
    }
    setEntries([data as DiaryEntry, ...entries]);
    setTodayContent("");
    setExpandedToday(false);
    toast.success("Entry saved ✓");
    setSaving(false);
  };

  const openEntry = (entry: DiaryEntry) => {
    setSelectedEntry(entry);
    setEditContent(entry.content);
  };

  const saveEdit = async () => {
    if (!selectedEntry || !editContent.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("diary_entries")
      .update({ content: editContent, word_count: wordCount(editContent) })
      .eq("id", selectedEntry.id)
      .select()
      .single();
    if (error) {
      toast.error("Failed to update");
      setSaving(false);
      return;
    }
    setEntries(entries.map((e) => (e.id === selectedEntry.id ? (data as DiaryEntry) : e)));
    setSelectedEntry(data as DiaryEntry);
    toast.success("Updated ✓");
    setSaving(false);
  };

  const deleteEntry = async () => {
    if (!selectedEntry) return;
    await supabase.from("diary_entries").delete().eq("id", selectedEntry.id);
    setEntries(entries.filter((e) => e.id !== selectedEntry.id));
    setSelectedEntry(null);
    setEditContent("");
    toast.success("Deleted");
  };

  const filteredEntries = entries.filter((e) =>
    e.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Full-screen editor when an old entry is selected ─────────────────────
  if (selectedEntry) {
    return (
      <div className="w-full flex flex-col" style={{ minHeight: "calc(100dvh - 180px)" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface/30">
              {format(parseISO(selectedEntry.created_at), "EEEE, MMM d · h:mm a")}
            </p>
            <h2 className="font-headline text-on-surface text-base font-medium mt-0.5">
              {isToday(parseISO(selectedEntry.created_at)) ? "Today" : format(parseISO(selectedEntry.created_at), "MMM d, yyyy")}
            </h2>
          </div>
          <button
            onClick={() => { setSelectedEntry(null); setEditContent(""); }}
            className="p-2 rounded-xl text-on-surface-variant/40 hover:text-on-surface hover:bg-surface-container transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Textarea */}
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          autoFocus
          className="flex-1 w-full bg-transparent border-none text-[15px] leading-loose font-medium text-on-surface placeholder:text-on-surface/10 outline-none resize-none p-0"
          placeholder="Write here..."
        />

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-outline-variant/10 flex items-center justify-between">
          <span className="text-[10px] text-on-surface/30 font-bold">
            {wordCount(editContent)} words
          </span>
          <div className="flex gap-2">
            <button
              onClick={deleteEntry}
              className="p-2.5 rounded-xl text-on-surface/20 hover:text-red-500 hover:bg-red-50 transition-all"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={saveEdit}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              <Save size={13} />
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main list view ───────────────────────────────────────────────────────
  return (
    <div className="w-full">
      {/* Sticky Top Section */}
      <div className="sticky top-0 z-10 bg-surface pb-5 pt-1 space-y-4">
        {/* Title */}
        <div>
          <h2 className="font-headline tracking-tight text-on-surface text-base font-medium">
            Diary
          </h2>
          <p className="text-[10px] uppercase tracking-[0.3em] text-on-surface/40 font-black mt-0.5">
            Your private journal
          </p>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/25"
            size={14}
          />
          <input
            type="text"
            placeholder="Search entries…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium text-on-surface outline-none focus:ring-1 focus:ring-primary/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface/30 hover:text-on-surface transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Write about today – compact inline box */}
        <div
          className={`bg-surface-container-lowest border rounded-2xl transition-all duration-200 ${
            expandedToday
              ? "border-primary/20 shadow-sm"
              : "border-outline-variant/15"
          }`}
        >
          {!expandedToday ? (
            // Collapsed placeholder
            <button
              onClick={() => {
                setExpandedToday(true);
                setTimeout(() => todayRef.current?.focus(), 50);
              }}
              className="w-full text-left px-5 py-4"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 mb-1">
                Today
              </p>
              <p className="text-sm text-on-surface/30 font-medium">
                Write about today…
              </p>
            </button>
          ) : (
            // Expanded write box
            <div className="p-4 flex flex-col gap-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/70">
                  {format(new Date(), "EEEE, MMM d")}
                </p>
                <button
                  onClick={() => { setExpandedToday(false); setTodayContent(""); }}
                  className="text-on-surface/25 hover:text-on-surface transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <textarea
                ref={todayRef}
                value={todayContent}
                onChange={(e) => setTodayContent(e.target.value)}
                rows={5}
                placeholder="How was your day?"
                className="w-full bg-transparent resize-none text-sm leading-relaxed font-medium text-on-surface placeholder:text-on-surface/20 outline-none"
              />
              <div className="flex items-center justify-between border-t border-outline-variant/10 pt-3">
                <span className="text-[10px] text-on-surface/30 font-bold">
                  {wordCount(todayContent)} words
                </span>
                <button
                  onClick={saveToday}
                  disabled={saving || !todayContent.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
                >
                  <Save size={12} />
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Past entries */}
      <div>
        {!searchQuery && (
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-on-surface/30 mb-3">
            Previous Entries
          </p>
        )}

        {loading ? (
          <div className="py-10 text-center text-[10px] font-black uppercase tracking-widest text-on-surface/20">
            Loading…
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-12 text-center text-on-surface/20">
            <p className="text-xs font-bold uppercase tracking-widest">
              {searchQuery ? "No results found" : "No entries yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEntries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => openEntry(entry)}
                className="w-full text-left bg-surface-container-lowest border border-outline-variant/10 rounded-2xl px-4 py-3.5 hover:border-primary/20 hover:bg-white hover:shadow-sm transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Clock size={9} className="text-on-surface/25" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-on-surface/30">
                      {format(parseISO(entry.created_at), "MMM d · h:mm a")}
                    </span>
                  </div>
                  <ChevronRight
                    size={13}
                    className="text-on-surface/15 group-hover:text-primary/50 transition-colors"
                  />
                </div>
                <p className="text-[13px] text-on-surface-variant leading-relaxed line-clamp-2 font-medium">
                  {entry.content}
                </p>
                <span className="mt-1.5 inline-block text-[9px] font-black uppercase tracking-widest text-on-surface/20">
                  {entry.word_count} words
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
