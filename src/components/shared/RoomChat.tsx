import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  SendHorizontal,
  ShieldCheck,
  Pencil,
  Trash2,
  X,
  Check,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useRoomPresence } from "@/hooks/useRoomPresence";

interface Message {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  user_type: string;
  content: string;
  created_at: string;
  updated_at?: string;
}

interface TypingUser {
  id: string;
  name: string;
}

interface RoomChatProps {
  roomId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserType: "manager" | "student";
  onlineUsers: any[];
  isOnline: (userId: string) => boolean;
}

const getUserColor = (userId: string) => {
  const colors = [
    "bg-indigo-500",
    "bg-rose-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-sky-500",
    "bg-violet-500",
    "bg-fuchsia-500",
    "bg-teal-500",
  ];
  let hash = 0;
  for (let i = 0; i < (userId || "").length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function RoomChat({
  roomId,
  currentUserId,
  currentUserName,
  currentUserType,
  onlineUsers,
  isOnline,
}: RoomChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (!loading) scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    let mounted = true;

    const checkNotificationPermissions = async () => {
      try {
        const { LocalNotifications } =
          await import("@capacitor/local-notifications");
        const p = await LocalNotifications.checkPermissions();
        if (p.display !== "granted") {
          await LocalNotifications.requestPermissions();
        }
      } catch (e) {
        console.log("Capacitor LocalNotifications not available");
        // Fallback to web standard Notification API
        if (typeof window !== "undefined" && "Notification" in window) {
          if (
            Notification.permission !== "granted" &&
            Notification.permission !== "denied"
          ) {
            Notification.requestPermission();
          }
        }
      }
    };

    checkNotificationPermissions();

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("room_messages")
          .select("*")
          .eq("room_id", roomId)
          .order("created_at", { ascending: true });

        if (error) throw error;
        if (mounted) setMessages(data || []);
      } catch (err: any) {
        toast.error("Failed to load messages");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`room_messages_${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (!mounted) return;
          if (payload.eventType === "INSERT") {
            setMessages((prev) => [...prev, payload.new as Message]);
          } else if (payload.eventType === "UPDATE") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === payload.new.id ? { ...m, ...payload.new } : m,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter((m) => m.id === payload.old.id));
          }
        },
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (!mounted) return;
        setTypingUsers((prev) => {
          const others = prev.filter((u) => u.id !== payload.userId);
          if (payload.isTyping) {
            return [...others, { id: payload.userId, name: payload.userName }];
          }
          return others;
        });
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [roomId, supabase]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    setIsSending(true);
    const content = inputText.trim();
    setInputText("");

    // Stop typing indicator
    handleTyping(false);

    try {
      const { error } = await supabase.from("room_messages").insert([
        {
          room_id: roomId,
          user_id: currentUserId,
          user_name: currentUserName,
          user_type: currentUserType,
          content,
        },
      ]);
      if (error) {
        setInputText(content);
        throw error;
      }
    } catch (err) {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    supabase.channel(`room_messages_${roomId}`).send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId, userName: currentUserName, isTyping },
    });
  };

  const handleEditMessage = async (msg: Message) => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === msg.content) {
      setEditingId(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("room_messages")
        .update({ content: trimmed })
        .eq("id", msg.id);

      if (error) throw error;
      setEditingId(null);
      toast.success("Message updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update message");
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm("Permanently delete this message?")) return;
    try {
      const { error } = await supabase
        .from("room_messages")
        .delete()
        .eq("id", msgId);
      if (error) throw error;
      toast.success("Message deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete message");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-[40vh] items-center justify-center bg-surface w-full rounded-3xl border border-outline-variant/10">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-secondary/60">
          Initializing secure channel...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-185px)] md:h-[calc(100vh-200px)] w-full bg-surface-container-lowest border-none md:border md:border-outline-variant/20 shadow-none md:shadow-sm rounded-none md:rounded-3xl overflow-hidden relative">
      {/* Header */}
      <div className="px-5 py-4 border-b border-outline-variant/10 bg-white flex items-center justify-between shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          <div className="flex flex-col">
            <h3 className="text-on-surface text-base font-medium">
              Live Room Stream
            </h3>
            <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest mt-0.5">
              {onlineUsers.length} active users
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-secondary/40 uppercase tracking-widest bg-secondary/5 px-2 py-1 rounded-md">
            {messages.length} Messages
          </span>
        </div>
      </div>

      {/* Chat Area */}
      <div className="scroll-area p-4 md:p-6 space-y-6 bg-surface scroll-smooth custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30 mt-[-20px]">
            <div className="w-16 h-16 bg-surface-container-low rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl">
                chat_bubble
              </span>
            </div>
            <p className="text-xs font-black uppercase tracking-[0.2em]">
              Silence is golden
            </p>
            <p className="text-[10px] mt-2 font-bold text-outline uppercase tracking-wider">
              Be the first to break it
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.user_id === currentUserId;
            const isManager = msg.user_type === "manager";
            const prevMsg = messages[index - 1];
            const nextMsg = messages[index + 1];

            // Grouping logic: show details only if first in sequence or > 5 min gap
            const isNewBlock =
              !prevMsg ||
              prevMsg.user_id !== msg.user_id ||
              new Date(msg.created_at).getTime() -
                new Date(prevMsg.created_at).getTime() >
                5 * 60000;

            const isLastInBlock = !nextMsg || nextMsg.user_id !== msg.user_id;

            const initials =
              msg.user_name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "?";

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isMe ? "flex-row-reverse" : ""} group ${isNewBlock ? "mt-4" : "mt-1"}`}
              >
                {/* Avatar Column */}
                <div
                  className={`w-8 h-8 shrink-0 flex items-center justify-center ${!isMe && isNewBlock ? "" : "invisible"} relative`}
                >
                  <div
                    className={`w-8 h-8 rounded-full ${getUserColor(msg.user_id)} text-white flex items-center justify-center text-[10px] font-black`}
                  >
                    {initials}
                  </div>
                  {isOnline(msg.user_id) && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                  )}
                </div>

                <div
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[85%] sm:max-w-[75%]`}
                >
                  {/* Sender Name & Role */}
                  {!isMe && isNewBlock && (
                    <div className="flex items-center gap-2 mb-1.5 px-1">
                      <span className="text-[10px] font-black text-on-surface/70 uppercase tracking-tight">
                        {msg.user_name}
                      </span>
                      {isManager && (
                        <span className="flex items-center gap-0.5 text-[7px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest border border-primary/5">
                          <ShieldCheck size={8} /> Manager
                        </span>
                      )}
                    </div>
                  )}

                  <div className="relative group/bubble flex items-center gap-2 w-full">
                    {/* Message Controls (Hover) */}
                    <div
                      className={`flex gap-1 transition-all duration-200 ${isMe ? "flex-row-reverse -mr-2 group-hover/bubble:mr-2" : "-ml-2 group-hover/bubble:ml-2"} opacity-0 group-hover/bubble:opacity-100`}
                    >
                      {isMe && (
                        <button
                          onClick={() => {
                            setEditingId(msg.id);
                            setEditText(msg.content);
                          }}
                          className="w-7 h-7 rounded-lg bg-white shadow-lg border border-outline-variant/10 flex items-center justify-center text-primary hover:bg-primary/5 active:scale-95"
                          title="Edit message"
                        >
                          <Pencil size={11} />
                        </button>
                      )}
                      {(isMe || currentUserType === "manager") && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="w-7 h-7 rounded-lg bg-white shadow-lg border border-outline-variant/10 flex items-center justify-center text-rose-500 hover:bg-rose-50 active:scale-95"
                          title="Delete message"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col max-w-full">
                      {editingId === msg.id ? (
                        <div className="flex flex-col gap-2 bg-white p-3 rounded-2xl border-2 border-primary/20 shadow-2xl min-w-[240px] animate-in zoom-in-95 duration-200">
                          <textarea
                            autoFocus
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full text-sm p-1 outline-none resize-none bg-transparent font-medium"
                            rows={3}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleEditMessage(msg);
                              }
                              if (e.key === "Escape") setEditingId(null);
                            }}
                          />
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-slate-500 hover:bg-slate-100 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleEditMessage(msg)}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-primary text-white shadow-md hover:opacity-90 transition-all flex items-center gap-1.5"
                            >
                              <Check size={12} /> Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`group/content px-4 py-2.5 rounded-2xl text-[13px] md:text-sm font-medium leading-relaxed break-words relative ${
                            isMe
                              ? `bg-primary border border-primary text-white ${isLastInBlock ? "rounded-tr-none" : ""}`
                              : `bg-white border border-outline-variant/10 text-on-surface ${isLastInBlock ? "rounded-tl-none" : ""}`
                          }`}
                        >
                          {msg.content}

                          {/* Timestamp Overlay / Footer */}
                          {isLastInBlock && (
                            <div
                              className={`mt-1.5 flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest ${isMe ? "text-white/60 justify-end" : "text-outline/40"}`}
                            >
                              {msg.updated_at &&
                                msg.updated_at !== msg.created_at && (
                                  <span className="flex items-center gap-0.5">
                                    <Pencil size={8} /> Edited
                                  </span>
                                )}
                              <span>
                                {format(new Date(msg.created_at), "HH:mm")}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 px-2 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></span>
            </div>
            <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest">
              {typingUsers.length === 1
                ? `${typingUsers[0].name} is typing...`
                : `${typingUsers.length} people are typing...`}
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer / Input */}
      <div className="p-2 md:p-4 bg-surface border-t border-outline-variant/10 shrink-0">
        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-3 relative"
        >
          <div className="flex-1 relative group">
            <input
              type="text"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                handleTyping(true);
                if (typingTimeoutRef.current)
                  clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(
                  () => handleTyping(false),
                  2000,
                );
              }}
              placeholder="Send a secure message..."
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-full px-5 py-3.5 md:py-4.5 text-sm focus:outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all text-on-surface pr-14 placeholder:text-outline/40 placeholder:font-bold placeholder:uppercase placeholder:text-[10px] placeholder:tracking-[0.1em]"
              disabled={isSending}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !loading &&
                  inputText.trim()
                ) {
                  // Standard submit behavior handles this
                }
              }}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-[34px] h-[34px] md:w-11 md:h-11 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 transition-all z-10"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <SendHorizontal size={18} className="translate-x-0.5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
