"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { format, parseISO } from "date-fns";
import {
  Plus,
  CheckCircle2,
  History,
  Clock,
  Trash2,
  Calendar as CalIcon,
  X,
  ChevronsUp,
  Equal,
  ChevronsDown,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  done: boolean;
  priority: "high" | "medium" | "low";
  category: string;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
}

interface TasksTabProps {
  userId: string;
}

const CATEGORIES = ["Study", "Personal", "Health", "Other"];
const PRIORITIES: {
  label: string;
  value: Task["priority"];
  color: string;
  icon: any;
}[] = [
  { label: "High", value: "high", color: "text-red-600", icon: ChevronsUp },
  { label: "Medium", value: "medium", color: "text-orange-500", icon: Equal },
  { label: "Low", value: "low", color: "text-emerald-500", icon: ChevronsDown },
];

const FILTERS = ["All", "Active", "Done"] as const;
type Filter = (typeof FILTERS)[number];

export default function TasksTab({ userId }: TasksTabProps) {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("All");

  // Form State
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("medium");
  const [newCategory, setNewCategory] = useState("Study");
  const [newDueDate, setNewDueDate] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) setTasks(data as Task[]);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = async () => {
    if (!newTitle.trim()) return;
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: userId,
        title: newTitle.trim(),
        priority: newPriority,
        category: newCategory,
        due_date: newDueDate || null,
        completed_at: null,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to add task");
      return;
    }
    setTasks([data as Task, ...tasks]);
    setNewTitle("");
    setNewDueDate("");
    setShowAddForm(false);
    toast.success("Task Added");
  };

  const toggleDone = async (task: Task) => {
    const isNowDone = !task.done;
    const updateData = {
      done: isNowDone,
      completed_at: isNowDone ? new Date().toISOString() : null,
    };

    const { data, error } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", task.id)
      .select()
      .single();
    if (!error && data) {
      setTasks(tasks.map((t) => (t.id === task.id ? (data as Task) : t)));
      toast.success(isNowDone ? "Task Completed" : "Task Re-opened");
    }
  };

  const deleteTask = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    setTasks(tasks.filter((t) => t.id !== id));
    toast.success("Task Deleted");
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === "Done") return t.done;
    if (filter === "Active") return !t.done;
    return true;
  });

  // --- UI Helpers ---
  const formatFullDate = (ds: string) => format(parseISO(ds), "MMM d, h:mm a");
  const PriorityIcon = (p: Task["priority"]) => {
    const priority = PRIORITIES.find((x) => x.value === p);
    if (!priority) return <Equal size={12} />;
    const Icon = priority.icon;
    return <Icon size={12} className={priority.color} />;
  };

  return (
    <div className="w-full max-w-4xl mx-auto pb-20">
      {/* Sticky inner header: Title + Filter — stays fixed in scroll area */}
      <div className="sticky top-0 z-10 bg-surface pb-1">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-headline tracking-tight text-on-surface text-base font-medium">
              Tasks
            </h2>
            <p className="text-[10px] uppercase tracking-[0.3em] text-on-surface/40 font-black mt-0.5">
              Stay on top of work
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${showAddForm ? "bg-surface-container-high text-on-surface rotate-45" : "bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"}`}
          >
            <Plus size={20} />
          </button>
        </div>
        {/* Filter pills */}
        <div className="flex gap-1 p-1 bg-surface-container-low border border-outline-variant/10 rounded-xl w-full">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${filter === f ? "bg-white shadow-sm text-primary" : "text-on-surface/40 hover:text-on-surface"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Add Task Form */}
      {showAddForm && (
        <div className="mb-6 p-4 md:p-5 bg-surface-container-lowest border border-outline-variant/15 rounded-2xl shadow-md animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col gap-4">
            <div>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="What needs to be done?"
                autoFocus
                className="w-full bg-transparent border-b border-outline-variant/10 px-1 py-2 text-sm font-semibold text-on-surface outline-none focus:border-primary/40 transition-all placeholder:text-outline/40 placeholder:font-normal"
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-2">
                <label className="text-[9px] font-bold uppercase tracking-wider text-secondary">
                  Priority
                </label>
                <div className="flex gap-1.5">
                  {PRIORITIES.map((p) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.value}
                        onClick={() => setNewPriority(p.value)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${newPriority === p.value ? `ring-1 ring-offset-1 bg-surface-container/50 ${p.color.replace("text-", "ring-")}` : "bg-surface-container/30 grayscale hover:grayscale-0 opacity-60 hover:opacity-100"}`}
                      >
                        <Icon size={12} className={newPriority === p.value ? p.color : "text-secondary"} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[9px] font-bold uppercase tracking-wider text-secondary">
                  Category
                </label>
                <div className="flex gap-1.5">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewCategory(c)}
                      className={`px-2.5 py-1 rounded-md text-[9px] font-bold transition-all ${newCategory === c ? "bg-primary/10 text-primary" : "bg-surface-container/30 text-secondary hover:bg-surface-container/50"}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[9px] font-bold uppercase tracking-wider text-secondary">
                  Due
                </label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="bg-surface-container/30 border-none rounded-md px-2 py-1 text-[10px] font-medium text-on-surface outline-none focus:bg-surface-container/50 transition-colors"
                />
              </div>
            </div>
            <div className="flex justify-end mt-2">
              <button
                onClick={addTask}
                className="px-5 py-2 bg-primary text-white rounded-lg text-[11px] font-bold uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-sm"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center text-[11px] font-black uppercase tracking-[0.3em] text-on-surface/20">
            Loading tasks…
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-outline-variant/10 rounded-[3rem]">
            <span className="text-4xl block mb-4 opacity-10">📂</span>
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-on-surface/20">
              No tasks found
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`group relative bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-4 shadow-sm hover:shadow-md transition-all ${task.done ? "opacity-60 bg-surface-container/20 grayscale-[0.2]" : ""}`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleDone(task)}
                  className={`w-6 h-6 mt-0.5 rounded flex items-center justify-center transition-all shrink-0 ${task.done ? "bg-primary text-white shadow-sm" : "bg-surface-container border border-outline/20 text-on-surface/10 hover:border-primary/40"}`}
                >
                  {task.done ? <CheckCircle2 size={14} /> : null}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-[9px] font-bold text-primary uppercase tracking-wider">
                      {task.category}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-on-surface/10" />
                    <span className="flex items-center">
                      {PriorityIcon(task.priority)}
                    </span>
                  </div>
                  <h3
                    className={`text-sm font-semibold text-on-surface mb-2 leading-snug ${task.done ? "line-through opacity-50" : ""}`}
                  >
                    {task.title}
                  </h3>

                  {/* Timestamps */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 opacity-70">
                    <div className="flex items-center gap-1">
                      <Clock size={10} className="text-secondary" />
                      <span className="text-[9px] font-medium text-secondary">
                        {formatFullDate(task.created_at)}
                      </span>
                    </div>
                    {task.done && task.completed_at && (
                      <div className="flex items-center gap-1">
                        <History size={10} className="text-primary/60" />
                        <span className="text-[9px] font-medium text-primary/80">
                          {formatFullDate(task.completed_at)}
                        </span>
                      </div>
                    )}
                    {task.due_date && (
                      <div className="flex items-center gap-1 ml-auto">
                        <CalIcon size={10} className="text-orange-500/60" />
                        <span className="text-[9px] font-medium text-orange-600/80">
                          {format(parseISO(task.due_date), "MMM d, yy")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => deleteTask(task.id)}
                  className="p-1.5 text-secondary/30 hover:text-error opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-error/10"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
