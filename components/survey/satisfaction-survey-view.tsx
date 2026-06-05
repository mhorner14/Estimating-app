"use client";

import { useState } from "react";
import { Building2, Star, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  estimateId: string;
  token: string;
  customerName: string;
  companyName: string;
  alreadyRated: boolean;
  googleReviewUrl: string | null;
  yelpReviewUrl: string | null;
}

export function SatisfactionSurveyView({ token, customerName, companyName, alreadyRated, googleReviewUrl, yelpReviewUrl }: Props) {
  const [score, setScore] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [submitted, setSubmitted] = useState(alreadyRated);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!score) return;
    setSubmitting(true);
    try {
      await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, score }),
      });
      setSubmitted(true);
    } catch {
      // Silent fail
    } finally {
      setSubmitting(false);
    }
  }

  const firstName = customerName.split(" ")[0];

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Thank you!</h2>
          <p className="text-slate-600 mb-6">Your feedback means a lot to us and helps us keep improving.</p>
          {(score >= 4 || alreadyRated) && (googleReviewUrl || yelpReviewUrl) && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Would you leave us a quick public review?</p>
              {googleReviewUrl && (
                <a href={googleReviewUrl} target="_blank" rel="noopener noreferrer"
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-3 px-4 rounded-xl transition-colors">
                  ⭐ Leave a Google Review
                </a>
              )}
              {yelpReviewUrl && (
                <a href={yelpReviewUrl} target="_blank" rel="noopener noreferrer"
                  className="block w-full bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-3 px-4 rounded-xl transition-colors">
                  ⭐ Leave a Yelp Review
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 text-white py-6 px-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <p className="font-bold">{companyName}</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">How was your experience?</h1>
        <p className="text-slate-500 mb-8">Hi {firstName}! We'd love to know how we did on your project.</p>

        <div className="flex justify-center gap-3 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setScore(star)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <Star
                className={`w-12 h-12 transition-colors ${
                  star <= (hovered || score)
                    ? "fill-amber-400 text-amber-400"
                    : "text-slate-200 fill-slate-100"
                }`}
              />
            </button>
          ))}
        </div>

        {score > 0 && (
          <p className="text-slate-600 mb-6 text-sm">
            {score === 5 ? "Amazing! 🎉" : score === 4 ? "Great, thanks!" : score === 3 ? "Thanks for the feedback" : score === 2 ? "We'll do better next time" : "We're sorry to hear that"}
          </p>
        )}

        <Button
          size="lg"
          className="w-full max-w-xs"
          onClick={submit}
          disabled={!score || submitting}
        >
          {submitting ? "Submitting…" : "Submit Feedback"}
        </Button>
      </div>
    </div>
  );
}
