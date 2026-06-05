"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UserPlus, Trash2, HardHat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CrewMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
}

export function CrewSettings() {
  const { toast } = useToast();
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "" });
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchCrew = useCallback(async () => {
    try {
      const res = await fetch("/api/crew");
      setCrew(await res.json());
    } catch {
      toast({ title: "Failed to load crew", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchCrew(); }, [fetchCrew]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setAdding(true);
    try {
      const res = await fetch("/api/crew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setCrew((prev) => [...prev, data]);
      setForm({ name: "", email: "", phone: "", role: "" });
      toast({ title: "Crew member added" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    try {
      await fetch(`/api/crew/${id}`, { method: "DELETE" });
      setCrew((prev) => prev.filter((m) => m.id !== id));
      toast({ title: "Removed" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Add Crew Member</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="John Smith" required />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder="Lead Installer" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="john@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(801) 555-0100" />
              </div>
            </div>
            <Button type="submit" disabled={adding || !form.name}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Add Crew Member
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><HardHat className="w-4 h-4 text-slate-400" /> Crew ({crew.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {crew.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <HardHat className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No crew members yet</p>
              <p className="text-xs text-slate-400 mt-1">Add crew to quickly send job sheets</p>
            </div>
          ) : (
            <div className="divide-y">
              {crew.map((member) => (
                <div key={member.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-sm font-semibold text-orange-700">
                      {member.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{member.name}</p>
                      <p className="text-xs text-slate-500">
                        {[member.role, member.email, member.phone].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-red-500"
                    onClick={() => handleRemove(member.id)}
                    disabled={removingId === member.id}
                  >
                    {removingId === member.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
