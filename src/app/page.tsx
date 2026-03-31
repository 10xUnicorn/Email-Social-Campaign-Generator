"use client";

import { useState, useEffect, useRef } from "react";

// ─── ANIMATED GROWTH BACKGROUND (Canvas) ─────────────────────────────
function GrowthCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let particles: Particle[] = [];
    let connections: Connection[] = [];
    let time = 0;

    interface Particle {
      x: number; y: number; vx: number; vy: number;
      radius: number; opacity: number; color: string; pulse: number;
    }
    interface Connection {
      from: number; to: number; opacity: number;
    }

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // Create particles representing growth nodes
    const colors = ["rgba(124,58,237,", "rgba(139,92,246,", "rgba(167,139,250,", "rgba(196,181,253,", "rgba(221,214,254,"];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4 - 0.15, // slight upward drift = growth
        radius: Math.random() * 3 + 1.5,
        opacity: Math.random() * 0.5 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulse: Math.random() * Math.PI * 2,
      });
    }

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      time += 0.008;

      // Update & draw particles
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.02;

        // Wrap around
        if (p.x < -20) p.x = canvas!.width + 20;
        if (p.x > canvas!.width + 20) p.x = -20;
        if (p.y < -20) p.y = canvas!.height + 20;
        if (p.y > canvas!.height + 20) p.y = -20;

        const pulseRadius = p.radius + Math.sin(p.pulse) * 1;
        const pulseOpacity = p.opacity + Math.sin(p.pulse) * 0.1;

        // Glow
        const gradient = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, pulseRadius * 4);
        gradient.addColorStop(0, p.color + (pulseOpacity * 0.4) + ")");
        gradient.addColorStop(1, p.color + "0)");
        ctx!.fillStyle = gradient;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, pulseRadius * 4, 0, Math.PI * 2);
        ctx!.fill();

        // Core
        ctx!.fillStyle = p.color + pulseOpacity + ")";
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, pulseRadius, 0, Math.PI * 2);
        ctx!.fill();
      });

      // Draw connections between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            const opacity = (1 - dist / 180) * 0.12;
            ctx!.strokeStyle = `rgba(124,58,237,${opacity})`;
            ctx!.lineWidth = 0.8;
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.stroke();
          }
        }
      }

      // Rising growth bars (subtle)
      for (let i = 0; i < 5; i++) {
        const barX = canvas!.width * (0.15 + i * 0.175);
        const maxH = 60 + i * 30;
        const barH = maxH * (0.5 + 0.5 * Math.sin(time + i * 0.8));
        const barW = 3;
        const gradient = ctx!.createLinearGradient(barX, canvas!.height, barX, canvas!.height - barH);
        gradient.addColorStop(0, "rgba(124,58,237,0.06)");
        gradient.addColorStop(1, "rgba(124,58,237,0)");
        ctx!.fillStyle = gradient;
        ctx!.fillRect(barX - barW / 2, canvas!.height - barH, barW, barH);
      }

      animId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

// ─── SCROLL FADE-IN OBSERVER ──────────────────────────────────────────
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── ANIMATED COUNTER ─────────────────────────────────────────────────
function Counter({ end, suffix = "", duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useScrollReveal();

  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = end / (duration / 16);
    const interval = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(interval); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(interval);
  }, [visible, end, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────
export default function LandingPage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      title: "Multi-Channel Campaigns",
      desc: "Generate email sequences, SMS drips, and social media posts from a single brief. One click, every channel.",
      icon: "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z",
      gradient: "from-purple-500 to-indigo-600",
    },
    {
      title: "Brand Voice AI",
      desc: "Import your website or paste samples. The AI writes in your exact tone, style, and personality every time.",
      icon: "M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z",
      gradient: "from-violet-500 to-purple-600",
    },
    {
      title: "Content Calendar",
      desc: "Visual calendar with hover previews, inline editing, and channel filters. Your entire campaign at a glance.",
      icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
      gradient: "from-fuchsia-500 to-pink-600",
    },
    {
      title: "Smart Media Matching",
      desc: "Upload images and videos. AI auto-matches the right media to each post based on content and context.",
      icon: "M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z",
      gradient: "from-purple-500 to-violet-600",
    },
    {
      title: "Platform-Ready Export",
      desc: "Drag-and-drop column ordering, 11 date formats, saved profiles. Export CSV for Mailchimp, Klaviyo, HubSpot, and more.",
      icon: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3",
      gradient: "from-indigo-500 to-blue-600",
    },
    {
      title: "Team Collaboration",
      desc: "Shared campaigns, brand voices, calendars, and org defaults. Built for teams that need to move at 10x speed.",
      icon: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z",
      gradient: "from-pink-500 to-rose-600",
    },
  ];

  const faqs = [
    { q: "How does the 14-day free trial work?", a: "You get full access to all features for 14 days. A credit card is required to start, but you won't be charged until the trial ends. Cancel anytime before that — no questions asked." },
    { q: "Can I switch plans later?", a: "Absolutely. Upgrade or downgrade anytime from your Settings page. Changes take effect immediately with prorated billing. No lock-in, no penalties." },
    { q: "What platforms can I export to?", a: "CSV with fully customizable column mappings, 11 date/time formats, and drag-and-drop column ordering. Works natively with Mailchimp, Klaviyo, HubSpot, ActiveCampaign, ConvertKit, and any platform that accepts CSV imports." },
    { q: "How does the AI generate content?", a: "Copy Launch uses Claude AI to generate campaign content based on your brand voice, company details, campaign goals, and target audience. Every piece of content is unique, on-brand, and ready to publish." },
    { q: "Can my team collaborate on campaigns?", a: "Yes — on the Business plan. Invite up to 10 team members who share campaigns, brand voices, company profiles, variables, and a unified content calendar." },
    { q: "Is my data secure?", a: "Yes. All data is isolated per user with Row Level Security. We use Supabase (PostgreSQL) with encrypted connections, and Stripe handles all payment processing. We never store credit card numbers." },
  ];

  const stats = [
    { value: 5, suffix: "min", label: "Average time to launch a campaign" },
    { value: 6, suffix: "+", label: "Channels supported" },
    { value: 11, suffix: "", label: "Export date formats" },
    { value: 10, suffix: "x", label: "Faster than manual copywriting" },
  ];

  return (
    <div className="bg-white overflow-x-hidden">

      {/* ═══ STICKY NAV ═══ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-1.5 group">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-purple-200 group-hover:shadow-purple-300 transition-shadow">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold">
              <span className="text-purple-600">Copy</span>
              <span className={scrolled ? "text-slate-800" : "text-slate-800"}>Launch</span>
            </span>
          </a>
          <div className="flex items-center gap-5">
            <a href="#features" className="hidden md:block text-sm text-slate-600 hover:text-purple-600 transition-colors font-medium">Features</a>
            <a href="#pricing" className="hidden md:block text-sm text-slate-600 hover:text-purple-600 transition-colors font-medium">Pricing</a>
            <a href="/login" className="text-sm text-slate-600 hover:text-purple-600 transition-colors font-medium">Sign In</a>
            <a href="/signup" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-purple-200 hover:shadow-lg hover:shadow-purple-300 hover:-translate-y-0.5">
              Start Free Trial
            </a>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Canvas Background */}
        <GrowthCanvas />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-purple-50/30 to-white" style={{ zIndex: 1 }} />

        {/* Decorative gradient orbs */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-200 rounded-full filter blur-[120px] opacity-30 animate-pulse" style={{ zIndex: 1 }} />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-indigo-200 rounded-full filter blur-[100px] opacity-25 animate-pulse" style={{ zIndex: 1, animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-100 rounded-full filter blur-[150px] opacity-20" style={{ zIndex: 1 }} />

        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-24 text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-purple-200 text-purple-700 text-sm font-semibold px-4 py-2 rounded-full mb-8 shadow-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              AI-Powered Campaign Generator
            </div>
          </Reveal>

          <Reveal delay={100}>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-[1.08] mb-8 tracking-tight">
              <span className="text-slate-900">Launch Your Next</span><br />
              <span className="text-slate-900">Campaign </span>
              <span className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                in Minutes
              </span>
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
              Generate complete email sequences, SMS drips, and social media campaigns — all aligned to your brand voice, ready to export and launch. What used to take days now takes minutes.
            </p>
          </Reveal>

          <Reveal delay={300}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/signup"
                className="group bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-8 py-4 rounded-2xl transition-all text-lg shadow-xl shadow-purple-300/40 hover:shadow-2xl hover:shadow-purple-400/40 hover:-translate-y-1"
              >
                Start Your Free Trial
                <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">&rarr;</span>
              </a>
              <a href="#how-it-works" className="text-slate-500 hover:text-slate-800 font-medium px-6 py-4 text-lg transition-colors flex items-center gap-2">
                See How It Works
                <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
              </a>
            </div>
          </Reveal>

          <Reveal delay={400}>
            <p className="text-sm text-slate-400 mt-6">14-day free trial &middot; No commitment &middot; Cancel anytime</p>
          </Reveal>

          {/* Floating Stats Bar */}
          <Reveal delay={500}>
            <div className="mt-16 bg-white/70 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/50 p-6 max-w-3xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {stats.map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-3xl font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                      <Counter end={s.value} suffix={s.suffix} />
                    </p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how-it-works" className="py-28 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <p className="text-sm font-semibold text-purple-600 text-center uppercase tracking-widest mb-3">Simple Process</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 text-center mb-16">
              Three Steps. Complete Campaign.
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-purple-200 via-violet-300 to-indigo-200" />

            {[
              { step: "01", title: "Describe Your Campaign", desc: "Enter your goal, audience, channels, and select a brand voice. The AI does the rest.", color: "from-purple-500 to-purple-600" },
              { step: "02", title: "AI Generates Everything", desc: "In seconds, get a complete multi-channel campaign — emails, SMS, social posts — all on-brand.", color: "from-violet-500 to-violet-600" },
              { step: "03", title: "Review, Edit & Launch", desc: "Fine-tune in the content calendar, match media assets, export CSV to your platform.", color: "from-indigo-500 to-indigo-600" },
            ].map((s, i) => (
              <Reveal key={s.step} delay={i * 150}>
                <div className="relative text-center group">
                  <div className={`w-16 h-16 bg-gradient-to-br ${s.color} text-white rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {s.step}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">{s.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="py-28">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <p className="text-sm font-semibold text-purple-600 text-center uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 text-center mb-6">
              Everything You Need to Ship Fast
            </h2>
            <p className="text-slate-500 text-center mb-16 max-w-2xl mx-auto text-lg">
              From AI content generation to team collaboration — the complete campaign toolkit.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <div className="group relative bg-white border border-slate-200/80 rounded-2xl p-7 hover:shadow-xl hover:shadow-purple-100/50 hover:border-purple-200 transition-all duration-300 hover:-translate-y-1 h-full">
                  <div className={`w-12 h-12 bg-gradient-to-br ${f.gradient} rounded-xl flex items-center justify-center mb-5 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF BAR ═══ */}
      <section className="py-16 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "40px 40px" }} />
        </div>
        <Reveal>
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <p className="text-white/90 text-xl md:text-2xl font-semibold leading-relaxed">
              &ldquo;What used to take my team an entire week now takes me 5 minutes. Copy Launch completely changed how we do marketing.&rdquo;
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-sm">JK</div>
              <div className="text-left">
                <p className="text-white font-semibold text-sm">Jenna Kowalski</p>
                <p className="text-white/60 text-xs">Marketing Director, ScaleUp Agency</p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ═══ PRICING ═══ */}
      <section className="py-28 bg-gradient-to-b from-slate-50 to-white" id="pricing">
        <div className="max-w-4xl mx-auto px-6">
          <Reveal>
            <p className="text-sm font-semibold text-purple-600 text-center uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 text-center mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-slate-500 text-center mb-14 text-lg">
              Start free for 14 days. No surprise fees. Cancel anytime.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Creator */}
            <Reveal delay={0}>
              <div className="bg-white border border-slate-200 rounded-3xl p-8 hover:shadow-lg transition-shadow h-full flex flex-col">
                <h3 className="text-xl font-bold text-slate-800">Creator</h3>
                <p className="text-sm text-slate-500 mt-1 mb-6">For solo entrepreneurs building their marketing engine</p>
                <div className="mb-8">
                  <span className="text-5xl font-extrabold text-slate-800">$29</span>
                  <span className="text-slate-400 text-lg">/mo</span>
                </div>
                <ul className="space-y-3.5 mb-8 flex-1">
                  {["10 campaigns/month", "50 AI generations/month", "3 brand voices", "3 companies", "5 export profiles", "Email + SMS + Social"].map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-slate-600">
                      <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="/signup" className="block text-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-3.5 rounded-xl transition-colors">
                  Start Free Trial
                </a>
              </div>
            </Reveal>

            {/* Business */}
            <Reveal delay={100}>
              <div className="relative bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl p-8 text-white shadow-2xl shadow-purple-300/30 h-full flex flex-col">
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-white text-purple-600 text-xs font-bold px-4 py-1.5 rounded-full shadow-md">
                  MOST POPULAR
                </span>
                <h3 className="text-xl font-bold">Business</h3>
                <p className="text-sm text-purple-200 mt-1 mb-6">For teams that need speed, collaboration, and scale</p>
                <div className="mb-8">
                  <span className="text-5xl font-extrabold">$79</span>
                  <span className="text-purple-200 text-lg">/mo</span>
                </div>
                <ul className="space-y-3.5 mb-8 flex-1">
                  {["Unlimited campaigns", "Unlimited AI generations", "Unlimited brand voices & companies", "Up to 10 team members", "Shared resources & calendar", "Organization defaults", "Priority support"].map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-purple-100">
                      <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="/signup" className="block text-center bg-white text-purple-700 font-bold py-3.5 rounded-xl hover:bg-purple-50 transition-colors shadow-lg">
                  Start Free Trial
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="py-28">
        <div className="max-w-3xl mx-auto px-6">
          <Reveal>
            <p className="text-sm font-semibold text-purple-600 text-center uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-4xl font-extrabold text-slate-900 text-center mb-14">
              Frequently Asked Questions
            </h2>
          </Reveal>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <Reveal key={i} delay={i * 60}>
                <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${faqOpen === i ? "border-purple-300 bg-purple-50/30 shadow-md" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                  <button
                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left"
                  >
                    <span className="font-semibold text-slate-800 pr-4">{faq.q}</span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${faqOpen === i ? "bg-purple-600 rotate-180" : "bg-slate-100"}`}>
                      <svg className={`w-4 h-4 ${faqOpen === i ? "text-white" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  <div
                    className="overflow-hidden transition-all duration-300"
                    style={{ maxHeight: faqOpen === i ? "200px" : "0px", opacity: faqOpen === i ? 1 : 0 }}
                  >
                    <div className="px-6 pb-5 text-sm text-slate-500 leading-relaxed">
                      {faq.a}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="relative py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        </div>
        {/* Glow orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-400 rounded-full filter blur-[150px] opacity-20" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-400 rounded-full filter blur-[120px] opacity-20" />

        <Reveal>
          <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
              Ready to 10x Your<br />Content Output?
            </h2>
            <p className="text-purple-200 mb-10 text-lg max-w-xl mx-auto leading-relaxed">
              Join the entrepreneurs and marketing teams who launch complete multi-channel campaigns in minutes, not days.
            </p>
            <a
              href="/signup"
              className="group inline-flex items-center gap-2 bg-white text-purple-700 font-bold px-10 py-4.5 rounded-2xl text-lg hover:bg-purple-50 transition-all shadow-2xl hover:-translate-y-1"
            >
              Start Your Free Trial
              <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
            </a>
            <p className="text-sm text-purple-300 mt-6">14 days free &middot; Cancel anytime &middot; No credit card surprises</p>
          </div>
        </Reveal>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="bg-slate-900 py-14 border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                </svg>
              </div>
              <span className="text-lg font-bold">
                <span className="text-purple-400">Copy</span>
                <span className="text-white">Launch</span>
              </span>
            </div>
            <div className="flex gap-8 text-sm text-slate-400">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <a href="/login" className="hover:text-white transition-colors">Sign In</a>
              <a href="/signup" className="hover:text-white transition-colors">Start Free Trial</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} Copy Launch. All rights reserved.</p>
            <p className="text-xs text-slate-600">Powered by AI. Built for entrepreneurs who move fast.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
