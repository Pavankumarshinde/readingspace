"use client";

import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Initial check
    if (typeof navigator !== "undefined") {
      setIsOffline(!navigator.onLine);
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-[9999] bg-rose-500/90 backdrop-blur-md text-white px-4 py-2 flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 animate-in slide-in-from-top-full duration-300">
      <WifiOff size={16} />
      <span className="text-xs font-bold uppercase tracking-widest">
        You are offline. Reconnecting...
      </span>
    </div>
  );
}
