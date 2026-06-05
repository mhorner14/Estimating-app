"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Zap, Crown, Building2, AlertCircle, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  icon: typeof Zap;
  color: string;
  badge?: string;
}

const PLANS: Plan[] = [
  {
    id: "STARTER",
    name: "Starter",
    price: "$49",
    period: "/mo",
    icon: Zap,
    color: "text-blue-600",
    features: [
      "Up to 50 estimates/month",
      "AI proposal generation",
      "Customer portal",
      "Email sending",
      "PDF export",
      "2 team members",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    price: "$99",
    period: "/mo",
    icon: Crown,
    color: "text-purple-600",
    badge: "Most Popular",
    features: [
      "Unlimited estimates",
      "AI pricing insights",
      "Win/loss analytics",
      "Intake form",
      "Templates",
      "Stripe payments",
      "10 team members",
      "Priority support",
    ],
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: "$249",
    period: "/mo",
    icon: Building2,
    color: "text-slate-700",
    features: [
      "Everything in Pro",
      "Unlimited team members",
      "White-label proposals",
      "API access",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantee",
    ],
  },
];

const PLAN_LIMITS: Record<string, number> = {
  FREE: 10,
  STARTER: 50,
  PRO: Infinity,
  ENTERPRISE: Infinity,
};

export function BillingView({
  company,
  usage,
}: {
  company: { plan: string; trialEndsAt: string | null; hasSubscription: boolean };
  usage: { estimateCount: number; customerCount: number; monthlyEstimates: number };
}) {
  const { plan, trialEndsAt, hasSubscription } = company;
  const limit = PLAN_LIMITS[plan] || 10;
  const usagePct = limit === Infinity ? 0 : Math.min((usage.monthlyEstimates / limit) * 100, 100);
  const isNearLimit = limit !== Infinity && usage.monthlyEstimates >= limit * 0.8;

  const currentPlan = PLANS.find((p) => p.id === plan);
  const [openingPortal, setOpeningPortal] = useState(false);

  async function openBillingPortal() {
    setOpeningPortal(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("Unable to open billing portal. Please contact support.");
    } catch {
      alert("Unable to open billing portal. Please contact support.");
    } finally {
      setOpeningPortal(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Current Plan
            <Badge className={`ml-1 ${plan === "FREE" ? "bg-slate-100 text-slate-600" : plan === "PRO" ? "bg-purple-100 text-purple-700" : plan === "STARTER" ? "bg-blue-100 text-blue-700" : "bg-slate-900 text-white"}`}>
              {plan}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {trialEndsAt && new Date(trialEndsAt) > new Date() && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4" />
              Trial ends {formatDate(trialEndsAt)}
            </div>
          )}

          {/* Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Estimates this month</span>
              <span className="font-medium text-slate-900">
                {usage.monthlyEstimates}
                {limit !== Infinity && ` / ${limit}`}
              </span>
            </div>
            {limit !== Infinity && (
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isNearLimit ? "bg-amber-500" : "bg-blue-500"}`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            )}
            {isNearLimit && (
              <p className="text-xs text-amber-600">You're near your monthly limit. Upgrade to avoid interruptions.</p>
            )}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500">Total Estimates</p>
                <p className="text-lg font-bold text-slate-900">{usage.estimateCount}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500">Total Customers</p>
                <p className="text-lg font-bold text-slate-900">{usage.customerCount}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan options */}
      {plan === "FREE" && (
        <div>
          <h2 className="text-base font-semibold text-slate-900 mb-4">Upgrade Your Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((p) => {
              const Icon = p.icon;
              const isCurrent = p.id === plan;
              return (
                <Card key={p.id} className={`relative overflow-hidden ${p.badge ? "border-purple-300 shadow-md" : ""}`}>
                  {p.badge && (
                    <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                      {p.badge}
                    </div>
                  )}
                  <CardContent className="pt-6 pb-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Icon className={`w-5 h-5 ${p.color}`} />
                      <span className="font-bold text-slate-900">{p.name}</span>
                    </div>
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-slate-900">{p.price}</span>
                      <span className="text-slate-500 text-sm">{p.period}</span>
                    </div>
                    <ul className="space-y-2 mb-5">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-slate-600">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full ${p.badge ? "bg-purple-600 hover:bg-purple-700" : ""}`}
                      variant={p.badge ? "default" : "outline"}
                      disabled={isCurrent}
                      onClick={() => {
                        // In production, this would redirect to Stripe Checkout for subscriptions
                        alert(`Contact us to upgrade to ${p.name}: hello@proestimate.app`);
                      }}
                    >
                      {isCurrent ? "Current Plan" : `Upgrade to ${p.name}`}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Already subscribed */}
      {plan !== "FREE" && (
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900">Active Subscription</p>
                <p className="text-sm text-slate-500">Manage billing, update payment, or cancel via Stripe.</p>
              </div>
              <Button
                variant="outline"
                onClick={openBillingPortal}
                disabled={openingPortal}
              >
                {openingPortal ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Manage Billing
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
