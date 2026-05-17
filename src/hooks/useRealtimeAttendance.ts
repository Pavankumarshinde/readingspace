"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { AttendanceLog } from "@/types";

export function useRealtimeAttendance(roomId?: string) {
  const supabase = useMemo(() => createClient(), []);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  
  // Cache to store student details to prevent N+1 queries on realtime events
  const studentCache = useRef(new Map<string, { profile: any; seat_number: string }>());

  useEffect(() => {
    const fetchLogs = async () => {
      // 1. Fetch all subscriptions for this room to build the student cache
      if (roomId) {
        const { data: subs } = await supabase
          .from("subscriptions")
          .select(`
            student_id,
            seat_number,
            student:profiles(name, email)
          `)
          .eq("room_id", roomId)
          .eq("status", "active");

        if (subs) {
          subs.forEach((sub: any) => {
            studentCache.current.set(sub.student_id, {
              profile: sub.student,
              seat_number: sub.seat_number || "N/A",
            });
          });
        }
      }

      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
      }).format(new Date());

      let query = supabase
        .from("attendance_logs")
        .select(`*, student:profiles(name, email)`)
        .eq("date", today);

      if (roomId) query = query.eq("room_id", roomId);

      const { data } = await query.order("timestamp", {
        ascending: false,
      });

      if (data) {
        const logsWithSeats = data.map((log) => {
          const cached = studentCache.current.get(log.student_id);
          return {
            ...log,
            seat_number: cached?.seat_number || "N/A",
          };
        });

        setLogs(logsWithSeats as any[]);
      }
    };

    fetchLogs();

    const channel = supabase
      .channel("attendance-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "attendance_logs",
          filter: roomId ? `room_id=eq.${roomId}` : undefined,
        },
        async (payload) => {
          const newLog = payload.new as any;

          let details = studentCache.current.get(newLog.student_id);
          
          // Fallback if the student isn't in our initial cache (e.g., newly added)
          if (!details) {
            const [{ data: profile }, { data: sub }] = await Promise.all([
              supabase.from("profiles").select("name, email").eq("id", newLog.student_id).single(),
              supabase.from("subscriptions").select("seat_number").eq("student_id", newLog.student_id).eq("room_id", newLog.room_id).eq("status", "active").maybeSingle(),
            ]);
            details = { profile, seat_number: sub?.seat_number || "N/A" };
            studentCache.current.set(newLog.student_id, details);
          }

          const logWithDetails = {
            ...newLog,
            student: details.profile,
            seat_number: details.seat_number,
          };

          setLogs((prev) => [logWithDetails as any, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, supabase]);

  return logs;
}
