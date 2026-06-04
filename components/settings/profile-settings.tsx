"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, User, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
}

export function ProfileSettings({ user }: Props) {
  const { toast } = useToast();
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [name, setName] = useState(user.name || "");
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

  async function saveName() {
    setSavingName(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Name updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingName(false);
    }
  }

  async function changePassword() {
    if (passwords.new !== passwords.confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.new }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Password changed" });
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" /> Your Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <div className="flex gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="max-w-xs" />
              <Button onClick={saveName} disabled={savingName || !name}>
                {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user.email || ""} disabled className="max-w-xs bg-slate-50" />
            <p className="text-xs text-slate-500">Email cannot be changed</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4" /> Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-xs">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <Input
              type="password"
              value={passwords.current}
              onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input
              type="password"
              value={passwords.new}
              onChange={(e) => setPasswords((p) => ({ ...p, new: e.target.value }))}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-2">
            <Label>Confirm New Password</Label>
            <Input
              type="password"
              value={passwords.confirm}
              onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
              placeholder="••••••••"
            />
          </div>
          <Button
            onClick={changePassword}
            disabled={savingPassword || !passwords.current || !passwords.new || !passwords.confirm}
          >
            {savingPassword && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
            Change Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
