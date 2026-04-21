'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, SendHorizontal, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  user_type: string;
  content: string;
  created_at: string;
}

interface RoomChatProps {
  roomId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserType: 'manager' | 'student';
}

export default function RoomChat({ roomId, currentUserId, currentUserName, currentUserType }: RoomChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load initial messages and subscribe
  useEffect(() => {
    let mounted = true;

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('room_messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (mounted) {
          setMessages(data || []);
        }
      } catch (err: any) {
        console.error('Failed to load messages', err);
        toast.error('Failed to connect to chat');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`room_messages_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          if (mounted) {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        }
      )
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
    try {
      const newMessage = {
        room_id: roomId,
        user_id: currentUserId,
        user_name: currentUserName,
        user_type: currentUserType,
        content: inputText.trim(),
      };

      const { error } = await supabase.from('room_messages').insert([newMessage]);
      if (error) throw error;
      
      setInputText('');
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-[40vh] items-center justify-center bg-surface w-full rounded-3xl border border-outline-variant/10">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-secondary/60">
          Connecting to secure channel...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[70vh] md:h-[600px] w-full bg-surface-container-lowest border border-outline-variant/10 shadow-sm rounded-3xl overflow-hidden relative">
      {/* Header Area inside Chat (Optional, could indicate status) */}
      <div className="px-5 py-3 border-b border-outline-variant/10 bg-surface-container-lowest flex items-center justify-between shrink-0 sticky top-0 z-10 backdrop-blur-md bg-opacity-80">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Live Room Discussion</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scroll-smooth">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-2">
            <span className="material-symbols-outlined text-4xl mb-2">forum</span>
            <p className="text-xs font-bold uppercase tracking-widest">No messages yet</p>
            <p className="text-[10px]">Start the conversation below.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.user_id === currentUserId;
            const isManager = msg.user_type === 'manager';
            const showHeader = index === 0 || messages[index - 1].user_id !== msg.user_id || 
                              new Date(msg.created_at).getTime() - new Date(messages[index-1].created_at).getTime() > 5 * 60000;

            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] ${isMe ? 'ml-auto' : ''}`}>
                {showHeader && (
                  <div className={`flex items-center gap-1.5 mb-1 mx-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[10px] font-bold text-on-surface-variant">
                      {isMe ? 'You' : msg.user_name}
                    </span>
                    {isManager && (
                      <span className="flex items-center gap-0.5 text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                        <ShieldCheck size={10} /> Mgr
                      </span>
                    )}
                    <span className="text-[9px] text-outline ml-1 opacity-60">
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </span>
                  </div>
                )}
                <div 
                  className={`px-4 py-2.5 rounded-2xl text-[13px] md:text-sm font-medium leading-relaxed break-words shadow-sm ${
                    isMe 
                      ? 'bg-primary text-white rounded-tr-sm' 
                      : isManager
                        ? 'bg-secondary/10 border border-secondary/20 text-on-surface rounded-tl-sm'
                        : 'bg-surface-container-low border border-outline-variant/10 text-on-surface rounded-tl-sm'
                  }`}
                  style={{ wordBreak: 'break-word' }}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 md:p-4 bg-surface-container-lowest border-t border-outline-variant/10 shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-surface-container-low border border-outline-variant/20 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all text-on-surface pr-12"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="absolute right-1.5 w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:hover:opacity-40 transition-all shrink-0"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <SendHorizontal size={16} className="-ml-0.5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
