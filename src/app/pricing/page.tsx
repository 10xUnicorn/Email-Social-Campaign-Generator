"use client";

import { useState } from "react";

export default function PricingPage() {
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");

  const plans = [
    {
      name: "Creator",
      desc: "For solo entrepreneurs building their marketing engine",
      monthly: 29,
      annual: 290,
      features: [
        "10 campaigns/month",
        "50 AI generations/month",
        "3 brand voices",
        "3 companies",
        "5 export profiles",
        "Email + SMS + Social channels",
        "Content calendar & preview",
        "Media asset matching",
        "CSV export with custom formats",
      ],
      cta: "Start Free Trial",
      highlight: false,
    },
    {
      name: "Business",
      desc: "For teams who need speed, collaboration, and scale",
      monthly: 79,
      annual: 790,
      features: [
        "Unlimited campaigns",
        "Unlimited AI generations",
        "Unlimited brand voices",
        "Unlimited companies",
        "Unlimited export profiles",
        "Up to 10 team members",
        "Shared campaigns & calendar",
        "Shared brand voices & variables",
        "Organization defaults (tone, CTA, disclaimers)",
        "Priority support",
      ],
      cta: "Start Free Trial",
      highlight: true,
    },
  ];

  return (
    <div className="bg-white min-h-screen">
      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <a href="/">
          <span className="text-2xl font-bold text-purple-600">Copy</span>
          <span className="text-2xl font-bold text-slate-800">Launch</span>
        </a>
        <div className="flex items-center gap-6">
          <a href="/login" className="text-sm text-slate-600 hover:text-slate-800">Sign In</a>
          <a href="/signup" className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors">
            Start Free Trial
          </a>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">Simple, Transparent Pricing</h1>
          <p className="text-slate-500 text-lg">Start free for 14 days. Upgrade, downgrade, or cancel anytime.</p>

          <div className="inline-flex items-center bg-slate-100 rounded-xl p-1 mt-8">
            <button
              onClick={() => setInterval("monthly")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                interval === "monthly" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval("annual")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                interval === "annual" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
              }`}
            >
              Annual <span className="text-green-600 text-xs ml-1">Save 17%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan) => {
            const price = interval === "annual" ? plan.annual : plan.monthly;
            return (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 ${
                  plan.highlight
                    ? "bg-white border-2 border-purple-600 relative"
                    : "bg-white border border-slate-200"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-bold text-slate-800">{plan.name}</h3>
                <p className="text-sm text-slate-500 mt-1 mb-6">{plan.desc}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-slate-800">${price}</span>
                  <span className="text-slate-500">/{interval === "annual" ? "year" : "month"}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                      <svg className="w-4 h-4 text-purple-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="/signup"
                  className={`block text-center font-medium py-3 rounded-xl transition-colors ${
                    plan.highlight
                      ? "bg-purple-600 hover:bg-purple-700 text-white"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-slate-400 mt-8">
          All plans include a 14-day free trial with full access. Card required.
        </p>
      </section>
    </div>
  );
}
