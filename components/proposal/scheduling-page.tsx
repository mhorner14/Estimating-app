"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, CheckCircle, Phone, ArrowLeft, Loader2 } from "lucide-react";

interface Props {
  proposal: {
    id: string;
    publicToken: string;
    estimate: {
      id: string;
      estimateNumber: string;
      company: {
        name: string;
        phone: string | null;
        email: string | null;
        primaryColor: string | null;
      };
      project: {
        customer: { name: string };
      };
    };
  };
  currentScheduledDate: string | null;
}

// Generate available dates (next 30 days, Mon-Sat, skip Sundays)
function getAvailableDates(): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 2; i <= 35; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() !== 0) { // Skip Sundays
      dates.push(d);
    }
    if (dates.length >= 20) break;
  }
  return dates;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function SchedulingPage({ proposal, currentScheduledDate }: Props) {
  const estimate = proposal.estimate;
  const company = estimate.company;
  const primaryColor = company.primaryColor || "#1a1a2e";
  const availableDates = getAvailableDates();

  const [selectedDate, setSelectedDate] = useState<Date | null>(
    currentScheduledDate ? new Date(currentScheduledDate) : null
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!currentScheduledDate);

  async function handleSubmit() {
    if (!selectedDate) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledDate: selectedDate.toISOString() }),
      });
      if (!res.ok) throw new Error("Failed");
      setSubmitted(true);
    } catch {
      alert("Failed to submit. Please try again or contact us directly.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted && selectedDate) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Date Request Submitted!</h1>
          <p className="text-slate-600 mb-2">
            You've requested <strong>{DAY_NAMES[selectedDate.getDay()]}, {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getDate()}</strong>.
          </p>
          <p className="text-slate-500 text-sm mb-8">
            {company.name} will confirm your appointment date and contact you to finalize the time.
          </p>
          {company.phone && (
            <a href={`tel:${company.phone}`} className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm mb-6">
              <Phone className="w-4 h-4" /> {company.phone}
            </a>
          )}
          <div className="mt-4">
            <Link href={`/proposal/${proposal.publicToken}`} className="text-sm text-slate-500 hover:underline">
              ← Back to proposal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="text-white py-6 px-6" style={{ backgroundColor: primaryColor }}>
        <div className="max-w-2xl mx-auto">
          <Link href={`/proposal/${proposal.publicToken}`} className="inline-flex items-center gap-1 text-white/70 hover:text-white text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to proposal
          </Link>
          <h1 className="text-2xl font-bold">{company.name}</h1>
          <p className="text-white/70 text-sm mt-1">Estimate #{estimate.estimateNumber}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Request a Start Date</h2>
          <p className="text-slate-500 text-sm mt-1">
            Select your preferred date below. {company.name} will confirm and reach out to finalize the time.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {availableDates.map((date) => {
            const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={`p-3 rounded-xl border-2 transition-all text-center ${
                  isSelected
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <p className="text-xs text-slate-500">{DAY_NAMES[date.getDay()]}</p>
                <p className={`text-xl font-bold ${isSelected ? "text-blue-600" : "text-slate-900"}`}>{date.getDate()}</p>
                <p className="text-xs text-slate-400">{MONTH_NAMES[date.getMonth()]}</p>
              </button>
            );
          })}
        </div>

        {selectedDate && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="py-4 flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <p className="font-medium text-slate-900">
                  {DAY_NAMES[selectedDate.getDay()]}, {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getDate()}
                </p>
                <p className="text-xs text-slate-500">Preferred start date — team will confirm exact time</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={!selectedDate || submitting}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calendar className="w-4 h-4 mr-2" />}
          Request This Date
        </Button>

        <p className="text-xs text-slate-400 text-center mt-4">
          This is a date request — {company.name} will confirm availability and contact you.
        </p>
      </div>
    </div>
  );
}
