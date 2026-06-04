"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Send, Lock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Note {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  user?: { name?: string | null } | null;
}

interface EstimateNotesProps {
  estimateId: string;
  notes: Note[];
  onNoteAdded: (note: Note) => void;
}

export function EstimateNotes({ estimateId, notes, onNoteAdded }: EstimateNotesProps) {
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function addNote() {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/estimates/${estimateId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, isInternal: true }),
      });
      if (!res.ok) throw new Error("Failed");
      const note = await res.json();
      onNoteAdded(note);
      setContent("");
      toast({ title: "Note added" });
    } catch {
      toast({ title: "Error", description: "Failed to add note", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      addNote();
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add an internal note... (Ctrl+Enter to save)"
          rows={3}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Lock className="w-3 h-3" />
            Internal notes — not visible to customer
          </div>
          <Button size="sm" onClick={addNote} disabled={loading || !content.trim()}>
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <><Send className="w-3.5 h-3.5 mr-1" /> Add Note</>
            )}
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">
          No notes yet. Add internal notes to track details about this estimate.
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const name = note.user?.name || "Team";
            const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div key={note.id} className="flex gap-3">
                <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                  <AvatarFallback className="text-xs bg-slate-200 text-slate-600">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-slate-900">{name}</span>
                    <span className="text-xs text-slate-400">{formatDate(note.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5 whitespace-pre-wrap leading-relaxed">
                    {note.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
