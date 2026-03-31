"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function OnboardingPage() {
  const { user, profile } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<"creator" | "business">("creator");
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    if (!user) return;
    setLoading(true);

    try {
      const res = await fetch("/api/stripe/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan, interval }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned");
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  const plans = [
    {
      id: "creator" as const,
      name: "Creator",
      monthly: 29,
      annual: 290,
      features: [
        "10 campaigns/month",
        "50 AI generations/month",
        "3 brand voices",
        "3 companies",
        "5 export profiles",
        "Email + SMS + Social",
      ],
    },
    {
      id: "business" as const,
      name: "Business",
      monthly: 79,
      annual: 790,
      badge: "Most Popular",
      features: [
        "Unlimited campaigns",
        "Unlimited AI generations",
        "Unlimited brand voices",
        "Unlimited companies",
        "Up to 10 team members",
        "Shared resources & calendar",
        "Organization defaults",
        "Priority support",
      ],
    },
  ];

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-800">Choose your plan</h1>
          <p className="text-slate-500 mt-2">
            Start your 14-day free trial. Cancel anytime.
          </p>

          {/* Interval Toggle */}
          <div className="inline-flex items-center bg-slate-100 rounded-xl p-1 mt-6">
            <button
              onClick={() => setInterval("monthly")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                interval === "monthly"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval("annual")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                interval === "annual"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Annual <span className="text-green-600 text-xs ml-1">Save 17%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan) => {
            const price = interval === "annual" ? plan.annual : plan.monthly;
            const isSelected = selectedPlan === plan.id;

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative bg-white rounded-2xl border-2 p-6 cursor-pointer transition-all ${
                  isSelected
                    ? "border-purple-600 shadow-lg shadow-purple-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                    {plan.badge}
                  </span>
                )}

                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800">{plan.name}</h3>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? "border-purple-600" : "border-slate-300"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-3 h-3 rounded-full bg-purple-600" />
                    )}
                  </div>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-slate-800">${price}</span>
                  <span className="text-slate-500 text-sm">
                    /{interval === "annual" ? "year" : "month"}
                  </span>
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                      <svg className="w-4 h-4 text-purple-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-10 py-3.5 rounded-xl transition-colors disabled:opacity-50 text-base"
          >
            {loading
              ? "Redirecting to checkout..."
              : `Start Free Trial — ${selectedPlan === "creator" ? "Creator" : "Business"}`}
          </button>
          <p className="text-xs text-slate-400 mt-3">
            14-day free trial. Card required. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
