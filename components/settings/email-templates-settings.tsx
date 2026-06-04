"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save, Mail, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  company: {
    id: string;
    name: string;
    proposalEmailSubject?: string | null;
    proposalEmailBody?: string | null;
    followUpEmailSubject?: string | null;
    followUpEmailBody?: string | null;
  };
}

const DEFAULT_PROPOSAL_SUBJECT = `Your proposal from {{companyName}} — #{{estimateNumber}}`;
const DEFAULT_PROPOSAL_BODY = `Hi {{customerName}},

Thank you for considering {{companyName}} for your project. Please find your proposal attached.

Your proposal total is {{total}} with a deposit of {{deposit}} due upon acceptance.

Click the button below to view your proposal, sign, and pay your deposit online.

Looking forward to working with you!

— {{companyName}}`;

const DEFAULT_FOLLOWUP_SUBJECT = `Following up: Your proposal from {{companyName}}`;
const DEFAULT_FOLLOWUP_BODY = `Hi {{customerName}},

I wanted to follow up on the proposal I sent you for your project (#{{estimateNumber}}). Please let me know if you have any questions or if there's anything I can adjust.

Your proposal total is {{total}} with a deposit of {{deposit}}.

Click below to view your proposal and sign online.

Looking forward to hearing from you.

— {{companyName}}`;

const VARIABLES = [
  { tag: "{{companyName}}", desc: "Your company name" },
  { tag: "{{customerName}}", desc: "Customer full name" },
  { tag: "{{estimateNumber}}", desc: "Estimate # (e.g. EST-0042)" },
  { tag: "{{total}}", desc: "Total amount" },
  { tag: "{{deposit}}", desc: "Deposit amount" },
  { tag: "{{proposalLink}}", desc: "Link to view proposal" },
];

export function EmailTemplatesSettings({ company }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState<"proposal" | "followup" | null>(null);

  const [proposalSubject, setProposalSubject] = useState(
    company.proposalEmailSubject || DEFAULT_PROPOSAL_SUBJECT
  );
  const [proposalBody, setProposalBody] = useState(
    company.proposalEmailBody || DEFAULT_PROPOSAL_BODY
  );
  const [followUpSubject, setFollowUpSubject] = useState(
    company.followUpEmailSubject || DEFAULT_FOLLOWUP_SUBJECT
  );
  const [followUpBody, setFollowUpBody] = useState(
    company.followUpEmailBody || DEFAULT_FOLLOWUP_BODY
  );

  async function save(type: "proposal" | "followup") {
    setSaving(type);
    try {
      const payload =
        type === "proposal"
          ? { proposalEmailSubject: proposalSubject, proposalEmailBody: proposalBody }
          : { followUpEmailSubject: followUpSubject, followUpEmailBody: followUpBody };

      const res = await fetch(`/api/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Template saved" });
    } catch {
      toast({ title: "Error", description: "Failed to save template", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  }

  function resetProposal() {
    setProposalSubject(DEFAULT_PROPOSAL_SUBJECT);
    setProposalBody(DEFAULT_PROPOSAL_BODY);
  }

  function resetFollowUp() {
    setFollowUpSubject(DEFAULT_FOLLOWUP_SUBJECT);
    setFollowUpBody(DEFAULT_FOLLOWUP_BODY);
  }

  return (
    <div className="space-y-8">
      {/* Variable reference */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Available Variables</p>
          <div className="flex flex-wrap gap-2">
            {VARIABLES.map((v) => (
              <div key={v.tag} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded px-2 py-1">
                <code className="text-xs text-blue-700 font-mono">{v.tag}</code>
                <span className="text-xs text-slate-500">{v.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Proposal email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="w-4 h-4 text-blue-600" />
            Proposal Email
          </CardTitle>
          <CardDescription>Sent when you email a proposal to a customer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Subject Line</Label>
            <Input value={proposalSubject} onChange={(e) => setProposalSubject(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email Body</Label>
            <Textarea
              value={proposalBody}
              onChange={(e) => setProposalBody(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => save("proposal")} disabled={saving === "proposal"}>
              {saving === "proposal" ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Save className="mr-2 w-4 h-4" />}
              Save Template
            </Button>
            <Button variant="ghost" onClick={resetProposal}>
              <RefreshCw className="mr-2 w-3.5 h-3.5" />
              Reset to Default
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Follow-up email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="w-4 h-4 text-orange-500" />
            Follow-Up Email
          </CardTitle>
          <CardDescription>Sent when you click &quot;Send Follow-up&quot; on an estimate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Subject Line</Label>
            <Input value={followUpSubject} onChange={(e) => setFollowUpSubject(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email Body</Label>
            <Textarea
              value={followUpBody}
              onChange={(e) => setFollowUpBody(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => save("followup")} disabled={saving === "followup"}>
              {saving === "followup" ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Save className="mr-2 w-4 h-4" />}
              Save Template
            </Button>
            <Button variant="ghost" onClick={resetFollowUp}>
              <RefreshCw className="mr-2 w-3.5 h-3.5" />
              Reset to Default
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
