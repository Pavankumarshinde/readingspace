'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import { Plus, CheckCircle2, History, Clock, Trash2, Calendar as CalIcon, X } from 'lucide-react'

interface Task {
  id: string
  title: string
  done: boolean
  priority: 'high' | 'medium' | 'low'
  category: string
  due_date: string | null
  created_at: string
  completed_at: string | null
}

interface TasksTabProps { userId: string }

const CATEGORIES = ['Study', 'Personal', 'Health', 'Other']
const PRIORITIES: { label: string; value: Task['priority']; color: string; dot: string }[] = [
  { label: 'High', value: 'high', color: 'text-red-600', dot: '🔴' },
  { label: 'Medium', value: 'medium', color: 'text-yellow-600', dot: '🟡' },
  { label: 'Low', value: 'low', color: 'text-green-600', dot: '🟢' },
]

const FILTERS = ['All', 'Active', 'Done'] as const
type Filter = typeof FILTERS[number]

export default function TasksTab({ userId }: TasksTabProps) {
  const supabase = createClient()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('All')
  
  // Form State
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<Task['priority']>('medium')
  const [newCategory, setNewCategory] = useState('Study')
  const [newDueDate, setNewDueDate] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setTasks(data as Task[])
    setLoading(false)
  }, [userId, supabase])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const addTask = async () => {
    if (!newTitle.trim()) return
    const { data, error } = await supabase.from('tasks').insert({
      user_id: userId,
      title: newTitle.trim(),
      priority: newPriority,
      category: newCategory,
      due_date: newDueDate || null,
      completed_at: null
    }).select().single()
    
    if (error) { toast.error('Failed to add task'); return }
    setTasks([data as Task, ...tasks])
    setNewTitle('')
    setNewDueDate('')
    setShowAddForm(false)
    toast.success('Task Added')
  }

  const toggleDone = async (task: Task) => {
    const isNowDone = !task.done
    const updateData = {
      done: isNowDone,
      completed_at: isNowDone ? new Date().toISOString() : null
    }

    const { data, error } = await supabase.from('tasks').update(updateData).eq('id', task.id).select().single()
    if (!error && data) {
      setTasks(tasks.map(t => t.id === task.id ? data as Task : t))
      toast.success(isNowDone ? 'Task Completed' : 'Task Re-opened')
    }
  }

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(tasks.filter(t => t.id !== id))
    toast.success('Task Deleted')
  }

  const filteredTasks = tasks.filter(t => {
    if (filter === 'Done') return t.done
    if (filter === 'Active') return !t.done
    return true
  })

  // --- UI Helpers ---
  const formatFullDate = (ds: string) => format(parseISO(ds), 'MMM d, h:mm a')
  const priorityDot = (p: Task['priority']) => PRIORITIES.find(x => x.value === p)?.dot ?? '🟡'

  return (
    <div className="w-full max-w-4xl mx-auto pb-20">
      {/* Sticky inner header: Title + Filter — stays fixed in scroll area */}
      <div className="sticky top-0 z-10 bg-surface pb-1">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface">Tasks</h2>
            <p className="text-[10px] uppercase tracking-[0.3em] text-on-surface/40 font-black mt-0.5">Stay on top of work</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${showAddForm ? 'bg-surface-container-high text-on-surface rotate-45' : 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95'}`}
          >
            <Plus size={20} />
          </button>
        </div>
        {/* Filter pills */}
        <div className="flex gap-1 p-1 bg-surface-container-low border border-outline-variant/10 rounded-xl w-full">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white shadow-sm text-primary' : 'text-on-surface/40 hover:text-on-surface'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Add Task Form */}
      {showAddForm && (
        <div className="mb-8 p-8 bg-surface-container-lowest border border-outline-variant/15 rounded-3xl shadow-xl animate-in slide-in-from-top-4 duration-300">
           <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6">
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface/30 mb-2 block">Task Title</label>
                    <input 
                      type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="What needs to be done??" autoFocus
                      className="w-full bg-surface-container/50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-on-surface outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                 </div>
                 <div className="flex flex-wrap gap-6">
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface/30 mb-3 block">Priority</label>
                       <div className="flex gap-2">
                          {PRIORITIES.map(p => (
                             <button key={p.value} onClick={() => setNewPriority(p.value)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${newPriority === p.value ? 'ring-2 ring-primary ring-offset-2' : 'bg-surface-container/50 grayscale hover:grayscale-0'}`}>
                                {p.dot}
                             </button>
                          ))}
                       </div>
                    </div>
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface/30 mb-3 block">Category</label>
                       <div className="flex gap-2">
                          {CATEGORIES.map(c => (
                             <button key={c} onClick={() => setNewCategory(c)} className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all ${newCategory === c ? 'bg-white border-primary border text-primary shadow-sm' : 'bg-surface-container/50 text-on-surface/40 hover:bg-surface-container'}`}>
                                {c}
                             </button>
                          ))}
                       </div>
                    </div>
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface/30 mb-2 block">Due Date</label>
                       <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="bg-surface-container/50 border-none rounded-xl px-4 py-2 text-[11px] font-bold text-on-surface outline-none" />
                    </div>
                 </div>
              </div>
              <div className="flex items-end">
                 <button onClick={addTask} className="px-10 py-5 bg-primary text-white rounded-3xl text-sm font-black uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">Add Task</button>
              </div>
           </div>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-4">
         {loading ? (
           <div className="py-20 text-center text-[11px] font-black uppercase tracking-[0.3em] text-on-surface/20">Loading tasks…</div>
         ) : filteredTasks.length === 0 ? (
           <div className="py-24 text-center border border-dashed border-outline-variant/10 rounded-[3rem]">
              <span className="text-4xl block mb-4 opacity-10">📂</span>
              <p className="text-[11px] font-black uppercase tracking-[0.4em] text-on-surface/20">No tasks found</p>
           </div>
         ) : (
           filteredTasks.map(task => (
             <div key={task.id} className={`group relative bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all ${task.done ? 'opacity-60 bg-surface-container/20 grayscale-[0.2]' : ''}`}>
               <div className="flex items-start gap-5">
                  <button onClick={() => toggleDone(task)} className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all shrink-0 ${task.done ? 'bg-primary text-white scale-110 shadow-lg' : 'bg-surface-container border border-outline/20 text-on-surface/10 hover:border-primary/40'}`}>
                     {task.done ? <CheckCircle2 size={18} /> : null}
                  </button>

                  <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{task.category}</span>
                        <span className="w-1 h-1 rounded-full bg-on-surface/10" />
                        <span className="text-[10px] font-bold text-on-surface/40">{priorityDot(task.priority)} Priority</span>
                     </div>
                     <h3 className={`text-base font-bold text-on-surface mb-3 leading-tight ${task.done ? 'line-through opacity-40' : ''}`}>{task.title}</h3>
                     
                     {/* Timestamps */}
                     <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 pt-4 border-t border-outline-variant/5">
                        <div className="flex items-center gap-1.5">
                           <Clock size={12} className="text-on-surface/20" />
                           <div className="flex flex-col">
                              <span className="text-[8px] font-black uppercase tracking-widest text-on-surface/30">Added On</span>
                              <span className="text-[10px] font-medium text-on-surface/50 font-mono tracking-tighter">{formatFullDate(task.created_at)}</span>
                           </div>
                        </div>
                        {task.done && task.completed_at && (
                           <div className="flex items-center gap-1.5 animate-in fade-in transition-all">
                              <History size={12} className="text-primary/40" />
                              <div className="flex flex-col">
                                 <span className="text-[8px] font-black uppercase tracking-widest text-primary/40">Completed At</span>
                                 <span className="text-[10px] font-black text-primary/70 font-mono tracking-tighter">{formatFullDate(task.completed_at)}</span>
                              </div>
                           </div>
                        )}
                        {task.due_date && (
                           <div className="flex items-center gap-1.5 ml-auto">
                              <CalIcon size={12} className="text-orange-500/40" />
                              <div className="flex flex-col items-end">
                                 <span className="text-[8px] font-black uppercase tracking-widest text-orange-500/40">Due Date</span>
                                 <span className="text-[10px] font-black text-on-surface font-mono tracking-tighter">{format(parseISO(task.due_date), 'MMM d, yyyy')}</span>
                              </div>
                           </div>
                        )}
                     </div>
                  </div>

                  <button onClick={() => deleteTask(task.id)} className="p-2 text-on-surface/10 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                     <Trash2 size={16} />
                  </button>
               </div>
             </div>
           ))
         )}
      </div>
    </div>
  )
}
