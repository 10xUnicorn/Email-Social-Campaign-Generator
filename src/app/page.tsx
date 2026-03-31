"use client";

import { useState } from "react";

export default function LandingPage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const features = [
    {
      title: "Multi-Channel Campaigns",
      desc: "Generate email sequences, SMS drips, and social media posts — all from a single brief.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
      ),
    },
    {
      title: "Brand Voice AI",
      desc: "Import your website or paste samples. The AI writes in your exact tone, every time.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
      ),
    },
    {
      title: "Content Calendar",
      desc: "Visual calendar with hover previews, quick edits, and channel filters. See everything at a glance.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
    },
    {
      title: "Smart Media Matching",
      desc: "Upload images and videos. AI auto-matches the right media to each post in your campaign.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
        </svg>
      ),
    },
    {
      title: "One-Click CSV Export",
      desc: "Drag-and-drop column ordering, 11 date formats, saved profiles. Export for any platform instantly.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      ),
    },
    {
      title: "Team Collaboration",
      desc: "Shared campaigns, brand voices, and calendars. Built for teams who move fast.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
    },
  ];

  const faqs = [
    { q: "How does the 14-day free trial work?", a: "You get full access to all features for 14 days. A credit card is required to start, but you won't be charged until the trial ends. Cancel anytime before that." },
    { q: "Can I switch plans later?", a: "Yes. Upgrade or downgrade anytime from your Settings page. Changes take effect immediately, with prorated billing." },
    { q: "What formats can I export?", a: "CSV with fully customizable column mappings, date formats, and drag-and-drop column ordering. Works with Mailchimp, Klaviyo, HubSpot, ActiveCampaign, and any platform that accepts CSV imports." },
    { q: "How does the AI generate content?", a: "Copy Launch uses Claude AI to generate campaign content based on your brand voice, company details, campaign goals, and audience. Every piece of content is unique and aligned to your tone." },
    { q: "Can my team collaborate on campaigns?", a: "Yes, on the Business plan. You can invite up to 10 team members who share campaigns, brand voices, company profiles, and a unified content calendar." },
  ];

  return (
    <div className="bg-white">
      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <a href="/" className="flex items-center gap-1">
          <span className="text-2xl font-bold text-purple-600">Copy</span>
          <span className="text-2xl font-bold text-slate-800">Launch</span>
        </a>
        <div className="flex items-center gap-6">
          <a href="/pricing" className="text-sm text-slate-600 hover:text-slate-800">Pricing</a>
          <a href="/login" className="text-sm text-slate-600 hover:text-slate-800">Sign In</a>
          <a href="/signup" className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors">
            Start Free Trial
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-block bg-purple-50 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full mb-6">
          AI-Powered Campaign Generator
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
          Launch Your Next Campaign<br />
          <span className="text-purple-600">in Minutes, Not Days</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10">
          AI-powered email, SMS, and social media campaigns — aligned to your brand voice, ready to export and publish. From brief to launch in under 5 minutes.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a
            href="/signup"
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-lg shadow-lg shadow-purple-200"
          >
            Start Your Free Trial
          </a>
          <a href="#features" className="text-slate-600 hover:text-slate-800 font-medium px-6 py-4 text-lg">
            See How It Works &darr;
          </a>
        </div>
        <p className="text-sm text-slate-400 mt-4">14-day free trial &middot; No commitment &middot; Cancel anytime</p>
      </section>

      {/* How It Works */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-12">
            Three Steps to a Complete Campaign
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Describe Your Campaign", desc: "Tell the AI your goal, audience, and channels. Select a brand voice and company profile." },
              { step: "2", title: "AI Generates Everything", desc: "In seconds, get a complete multi-channel campaign: emails, SMS, social posts — all aligned to your voice." },
              { step: "3", title: "Review, Edit & Launch", desc: "Fine-tune in the content calendar, match media assets, then export CSV for your platform of choice." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 bg-purple-600 text-white rounded-xl flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{s.title}</h3>
                <p className="text-slate-500 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-4">
            Everything You Need to Ship Campaigns Fast
          </h2>
          <p className="text-slate-500 text-center mb-12 max-w-2xl mx-auto">
            From AI content generation to team collaboration, Copy Launch is the complete campaign toolkit.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-slate-50 py-20" id="pricing">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-slate-500 text-center mb-12">
            Start free for 14 days. No surprise fees.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Creator */}
            <div className="bg-white border border-slate-200 rounded-2xl p-8">
              <h3 className="text-lg font-bold text-slate-800">Creator</h3>
              <p className="text-sm text-slate-500 mt-1 mb-6">For solo entrepreneurs</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-800">$29</span>
                <span className="text-slate-500">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["10 campaigns/month", "50 AI generations/month", "3 brand voices", "3 companies", "5 export profiles", "Email + SMS + Social"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                    <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a href="/signup" className="block text-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium py-3 rounded-xl transition-colors">
                Start Free Trial
              </a>
            </div>
            {/* Business */}
            <div className="bg-white border-2 border-purple-600 rounded-2xl p-8 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                Most Popular
              </span>
              <h3 className="text-lg font-bold text-slate-800">Business</h3>
              <p className="text-sm text-slate-500 mt-1 mb-6">For teams that move fast</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-800">$79</span>
                <span className="text-slate-500">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["Unlimited campaigns", "Unlimited AI generations", "Unlimited brand voices & companies", "Up to 10 team members", "Shared resources & calendar", "Organization defaults", "Priority support"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                    <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a href="/signup" className="block text-center bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-colors">
                Start Free Trial
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                >
                  <span className="font-medium text-slate-800">{faq.q}</span>
                  <svg
                    className={`w-5 h-5 text-slate-400 transition-transform ${faqOpen === i ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {faqOpen === i && (
                  <div className="px-6 pb-4 text-sm text-slate-500">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-purple-600 py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to 10x Your Content Output?
          </h2>
          <p className="text-purple-200 mb-8 text-lg">
            Join entrepreneurs who launch complete campaigns in minutes, not days.
          </p>
          <a
            href="/signup"
            className="inline-block bg-white text-purple-700 font-semibold px-10 py-4 rounded-xl text-lg hover:bg-purple-50 transition-colors shadow-lg"
          >
            Start Your Free Trial
          </a>
          <p className="text-sm text-purple-200 mt-4">14 days free &middot; Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-purple-400">Copy</span>
            <span className="text-lg font-bold text-white">Launch</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-400">
            <a href="/pricing" className="hover:text-white">Pricing</a>
            <a href="/login" className="hover:text-white">Sign In</a>
            <a href="/signup" className="hover:text-white">Start Free Trial</a>
          </div>
          <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} Copy Launch. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
