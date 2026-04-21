'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { format, isToday, isFuture } from 'date-fns'

interface Task {
  id: string
  title: string
  done: boolean
  priority: 'high' | 'medium' | 'low'
  category: string
  due_date: string | null
  created_at: string
}

interface TasksTabProps { userId: string }

const CATEGORIES = ['Study', 'Personal', 'Health', 'Other']
const PRIORITIES: { label: string; value: Task['priority']; color: string; dot: string }[] = [
  { label: 'High', value: 'high', color: 'text-red-600', dot: '🔴' },
  { label: 'Med', value: 'medium', color: 'text-yellow-600', dot: '🟡' },
  { label: 'Low', value: 'low', color: 'text-green-600', dot: '🟢' },
]
const FILTERS = ['All', 'Today', 'Upcoming', 'Done'] as const
type Filter = typeof FILTERS[number]

export default function TasksTab({ userId }: TasksTabProps) {
  const supabase = createClient()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('All')
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<Task['priority']>('medium')
  const [newCategory, setNewCategory] = useState('Study')
  const [newDueDate, setNewDueDate] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    fetchTasks()
  }, [userId])

  const fetchTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setTasks(data as Task[])
    setLoading(false)
  }

  const addTask = async () => {
    if (!newTitle.trim()) return
    const { data, error } = await supabase.from('tasks').insert({
      user_id: userId,
      title: newTitle.trim(),
      priority: newPriority,
      category: newCategory,
      due_date: newDueDate || null,
    }).select().single()
    if (error) { toast.error('Failed to add task'); return }
    setTasks([data as Task, ...tasks])
    setNewTitle('')
    setNewDueDate('')
    setShowAddForm(false)
    toast.success('Task added')
  }

  const toggleDone = async (task: Task) => {
    const { data, error } = await supabase.from('tasks').update({ done: !task.done }).eq('id', task.id).select().single()
    if (!error && data) setTasks(tasks.map(t => t.id === task.id ? data as Task : t))
  }

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(tasks.filter(t => t.id !== id))
    toast.success('Task removed')
  }

  const filteredTasks = tasks.filter(t => {
    if (filter === 'Done') return t.done
    if (filter === 'Today') return !t.done && t.due_date && isToday(new Date(t.due_date))
    if (filter === 'Upcoming') return !t.done && t.due_date && isFuture(new Date(t.due_date)) && !isToday(new Date(t.due_date))
    return !t.done || filter === 'All'
  })

  const priorityDot = (p: Task['priority']) => PRIORITIES.find(x => x.value === p)?.dot ?? '🟡'

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-6">
        <h2 className="font-headline text-3xl font-bold tracking-tight text-on-surface">Tasks</h2>
        <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mt-1">stay on top of your work</p>
      </div>

      {/* Quick Add */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-4 mb-5 shadow-sm">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add a new task… press Enter to save"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addTask() }}
            onFocus={() => setShowAddForm(true)}
            className="flex-1 bg-transparent border-none outline-none text-sm font-body text-on-surface placeholder:text-outline/40"
          />
          <button
            onClick={addTask}
            className="w-8 h-8 flex items-center justify-center bg-primary text-white rounded-lg hover:opacity-90 transition-all active:scale-95 shrink-0"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          </button>
        </div>

        {showAddForm && (
          <div className="mt-3 pt-3 border-t border-outline-variant/10 flex flex-wrap gap-3 items-center animate-in fade-in duration-200">
            {/* Priority */}
            <div className="flex gap-1">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  onClick={() => setNewPriority(p.value)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${newPriority === p.value ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
                >
                  {p.dot} {p.label}
                </button>
              ))}
            </div>
            {/* Category */}
            <div className="flex gap-1">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setNewCategory(c)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${newCategory === c ? 'bg-secondary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
                >
                  {c}
                </button>
              ))}
            </div>
            {/* Due date */}
            <input
              type="date"
              value={newDueDate}
              onChange={e => setNewDueDate(e.target.value)}
              className="bg-surface-container border-none rounded-lg px-3 py-1 text-[11px] font-body text-on-surface outline-none focus:ring-1 focus:ring-primary/30"
            />
            <button onClick={() => setShowAddForm(false)} className="ml-auto text-[10px] text-outline/60 hover:text-on-surface">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${filter === f ? 'bg-primary text-white shadow-sm' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Task List */}
      {loading ? (
        <div className="py-12 text-center text-secondary/40 text-sm">Loading tasks…</div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-16 flex flex-col items-center text-center">
          <span className="material-symbols-outlined text-outline/20 mb-3" style={{ fontSize: '48px' }}>task_alt</span>
          <p className="text-sm font-medium text-on-surface-variant/50">
            {filter === 'Done' ? 'No completed tasks yet' : 'All clear! Add a task above'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              className={`flex items-center gap-3 bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-3 group transition-all hover:shadow-sm ${task.done ? 'opacity-50' : ''}`}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleDone(task)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${task.done ? 'bg-primary border-primary' : 'border-outline/40 hover:border-primary'}`}
              >
                {task.done && <span className="material-symbols-outlined text-white" style={{ fontSize: '14px' }}>check</span>}
              </button>

              {/* Title */}
              <span className={`flex-1 text-sm font-medium text-on-surface ${task.done ? 'line-through text-on-surface-variant/50' : ''}`}>
                {task.title}
              </span>

              {/* Meta */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-base">{priorityDot(task.priority)}</span>
                <span className="px-2 py-0.5 bg-surface-container text-secondary text-[9px] font-bold uppercase tracking-wider rounded-full">
                  {task.category}
                </span>
                {task.due_date && (
                  <span className={`text-[10px] font-semibold ${isToday(new Date(task.due_date)) ? 'text-primary' : 'text-outline/60'}`}>
                    {format(new Date(task.due_date), 'MMM d')}
                  </span>
                )}
              </div>

              {/* Delete */}
              <button
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-outline/50 hover:text-error ml-1"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
