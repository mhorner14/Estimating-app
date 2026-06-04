"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Trash2, Shield, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

interface Member {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

interface Props {
  currentUserId: string;
  currentUserRole: string;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  ESTIMATOR: "Estimator",
};

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-700",
  ADMIN: "bg-blue-100 text-blue-700",
  ESTIMATOR: "bg-slate-100 text-slate-700",
};

export function TeamSettings({ currentUserId, currentUserRole }: Props) {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "ESTIMATOR", password: "" });
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);

  const canManage = ["OWNER", "ADMIN"].includes(currentUserRole);

  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.json())
      .then((data) => { setMembers(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleInvite() {
    setInviting(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMembers((m) => [...m, data]);
      toast({ title: "Team member added" });

      if (data.tempPassword) {
        setCreatedCredentials({ email: data.email, password: data.tempPassword });
      }

      setInviteOpen(false);
      setInviteForm({ name: "", email: "", role: "ESTIMATOR", password: "" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(memberId: string, role: string) {
    const res = await fetch(`/api/team/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      const updated = await res.json();
      setMembers((m) => m.map((x) => (x.id === memberId ? updated : x)));
      toast({ title: "Role updated" });
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remove this team member? They will lose access to your company.")) return;
    const res = await fetch(`/api/team/${memberId}`, { method: "DELETE" });
    if (res.ok) {
      setMembers((m) => m.filter((x) => x.id !== memberId));
      toast({ title: "Member removed" });
    }
  }

  if (loading) {
    return <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{members.length} team member{members.length !== 1 ? "s" : ""}</p>
        {canManage && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" /> Add Team Member
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {members.map((member) => (
          <Card key={member.id}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-slate-600">
                  {member.name ? member.name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{member.name || "—"}</p>
                <p className="text-sm text-slate-500 truncate">{member.email}</p>
              </div>
              <Badge className={`${ROLE_COLORS[member.role]} border-0 shrink-0`}>
                {ROLE_LABELS[member.role] || member.role}
              </Badge>
              {canManage && member.id !== currentUserId && (
                <div className="flex gap-2 shrink-0">
                  <Select value={member.role} onValueChange={(v) => changeRole(member.id, v)}>
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="ESTIMATOR">Estimator</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => removeMember(member.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={inviteForm.name} onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" />
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteForm.role} onValueChange={(v) => setInviteForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin — can manage team and settings</SelectItem>
                  <SelectItem value="ESTIMATOR">Estimator — can create and view estimates</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Set Password (optional)</Label>
              <Input type="password" value={inviteForm.password} onChange={(e) => setInviteForm((f) => ({ ...f, password: e.target.value }))} placeholder="Leave blank to auto-generate" />
              <p className="text-xs text-slate-500">A temporary password will be generated if left blank</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteForm.name || !inviteForm.email}>
              {inviting && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show generated credentials */}
      <Dialog open={!!createdCredentials} onOpenChange={() => setCreatedCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Team Member Created</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-slate-600">Share these login credentials with your new team member:</p>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2 font-mono text-sm">
              <p><span className="text-slate-500">Email: </span><strong>{createdCredentials?.email}</strong></p>
              <p><span className="text-slate-500">Password: </span><strong>{createdCredentials?.password}</strong></p>
            </div>
            <p className="text-xs text-slate-500">They should change their password after first login.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedCredentials(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
