"use client";

import { useState } from "react";
import { Building2, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Company {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  serviceArea: string | null;
}

const SURFACE_TYPES = ["Garage floor", "Patio / pool deck", "Driveway", "Basement", "Commercial floor", "Other"];
const TIMELINES = ["ASAP", "Within 2 weeks", "Within a month", "Just exploring"];

export function CustomerIntakeForm({ company }: { company: Company }) {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "", city: "", state: "", zip: "",
    projectDescription: "", surfaceType: "", squareFootage: "", timeline: "", budget: "",
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit() {
    if (!form.name.trim()) { setError("Please enter your name."); return; }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id, ...form }),
      });
      if (!res.ok) throw new Error("Submission failed");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Request Submitted!</h2>
          <p className="text-slate-600 mb-6">
            Thanks, {form.name.split(" ")[0]}! We received your project details and will be in touch shortly with a custom quote.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-500">
            <p className="font-medium text-slate-700 mb-1">{company.name}</p>
            {company.phone && <p>{company.phone}</p>}
            {company.email && <p>{company.email}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white py-6 px-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold">{company.name}</p>
            {(company.city || company.state) && (
              <p className="text-sm text-slate-400">{[company.city, company.state].filter(Boolean).join(", ")}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Request a Free Quote</h1>
            <p className="text-sm text-slate-500 mt-1">Fill out the form below and we'll get back to you with a custom estimate.</p>
          </div>

          {/* Step indicator */}
          <div className="flex gap-2">
            {[1, 2].map((s) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? "bg-blue-600" : "bg-slate-200"}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-700">Your Contact Info</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Full Name *</label>
                  <Input placeholder="Jane Smith" value={form.name} onChange={(e) => update("name", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Email</label>
                  <Input type="email" placeholder="jane@email.com" value={form.email} onChange={(e) => update("email", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Phone</label>
                  <Input type="tel" placeholder="(555) 000-0000" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Project Address</label>
                  <Input placeholder="123 Main St" value={form.address} onChange={(e) => update("address", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">City</label>
                  <Input placeholder="Phoenix" value={form.city} onChange={(e) => update("city", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">State</label>
                  <Input placeholder="AZ" value={form.state} onChange={(e) => update("state", e.target.value)} />
                </div>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                className="w-full"
                onClick={() => { if (!form.name.trim()) { setError("Please enter your name."); return; } setError(""); setStep(2); }}
              >
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-700">Project Details</h2>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-2 block">Surface Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {SURFACE_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => update("surfaceType", t)}
                      className={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${form.surfaceType === t ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Approximate Square Footage</label>
                <Input type="number" placeholder="e.g. 500" value={form.squareFootage} onChange={(e) => update("squareFootage", e.target.value)} />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Tell us about your project</label>
                <Textarea
                  placeholder="Describe the area, current condition, color preferences, any specific concerns..."
                  value={form.projectDescription}
                  onChange={(e) => update("projectDescription", e.target.value)}
                  rows={4}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-2 block">Timeline</label>
                <div className="grid grid-cols-2 gap-2">
                  {TIMELINES.map((t) => (
                    <button
                      key={t}
                      onClick={() => update("timeline", t)}
                      className={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${form.timeline === t ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Budget (optional)</label>
                <Input placeholder="e.g. $2,000–$4,000 or not sure" value={form.budget} onChange={(e) => update("budget", e.target.value)} />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1" onClick={submit} disabled={submitting}>
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting…</> : "Submit Request"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
