"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, X, Send, Loader2 } from "lucide-react";

interface NotificationItem {
  type: string;
  message: string;
  href: string;
}

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [batchSending, setBatchSending] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => { setCount(d.count); setItems(d.items); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function sendBatchFollowUps() {
    setBatchSending(true);
    try {
      const res = await fetch("/api/estimates/batch-follow-up", { method: "POST" });
      const data = await res.json();
      alert(data.message);
      if (data.sent > 0) {
        setCount((c) => Math.max(c - data.sent, 0));
        setItems((prev) => prev.filter((item) => item.type !== "stale"));
      }
    } catch {
      alert("Failed to send follow-ups");
    } finally {
      setBatchSending(false);
    }
  }

  const TYPE_ICONS: Record<string, string> = {
    stale: "⏰",
    lead: "🎯",
    clarification: "❓",
    scheduled: "📅",
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
      >
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          {items.some((i) => i.type === "stale") && (
            <div className="px-4 py-2 border-b bg-amber-50">
              <button
                onClick={sendBatchFollowUps}
                disabled={batchSending}
                className="flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-800 font-medium w-full"
              >
                {batchSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Send all follow-ups now
              </button>
            </div>
          )}
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">All caught up! 🎉</div>
          ) : (
            <div className="divide-y">
              {items.map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-lg leading-none mt-0.5">{TYPE_ICONS[item.type] || "🔔"}</span>
                  <p className="text-sm text-slate-700">{item.message}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
