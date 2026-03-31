"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase-browser";

interface Stats {
  campaigns: number;
  messages: number;
  brandVoices: number;
  companies: number;
}

interface RecentCampaign {
  id: string;
  name: string;
  status: string;
  channels: string[];
  created_at: string;
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({ campaigns: 0, messages: 0, brandVoices: 0, companies: 0 });
  const [recent, setRecent] = useState<RecentCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const [campRes, msgRes, bvRes, compRes] = await Promise.all([
      supabase.from("campaigns").select("id, name, status, channels, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(5),
      supabase.from("campaign_messages").select("id", { count: "exact", head: true }),
      supabase.from("brand_voices").select("id", { count: "exact", head: true }),
      supabase.from("companies").select("id", { count: "exact", head: true }),
    ]);

    setStats({
      campaigns: campRes.count || 0,
      messages: msgRes.count || 0,
      brandVoices: bvRes.count || 0,
      companies: compRes.count || 0,
    });
    setRecent(campRes.data || []);
    setLoading(false);
  }

  const greeting = profile?.full_name ? `Welcome back, ${profile.full_name.split(" ")[0]}` : "Welcome back";

  const statCards = [
    { label: "Campaigns", value: stats.campaigns, color: "bg-purple-50 text-purple-700" },
    { label: "Messages", value: stats.messages, color: "bg-blue-50 text-blue-700" },
    { label: "Brand Voices", value: stats.brandVoices, color: "bg-emerald-50 text-emerald-700" },
    { label: "Companies", value: stats.companies, color: "bg-amber-50 text-amber-700" },
  ];

  const statusColors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-700",
    active: "bg-green-100 text-green-700",
    paused: "bg-orange-100 text-orange-700",
    completed: "bg-blue-100 text-blue-700",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{greeting}</h1>
          <p className="text-slate-500 mt-0.5 text-sm">Here&apos;s what&apos;s happening with your campaigns.</p>
        </div>
        <a href="/campaigns/new" className="btn-primary">
          + New Campaign
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="cl-card p-5">
            <p className="text-sm text-slate-500 mb-1">{s.label}</p>
            <p className="text-3xl font-bold text-slate-800">
              {loading ? "—" : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Campaigns */}
      <div className="cl-card">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Recent Campaigns</h2>
          <a href="/campaigns" className="text-sm text-purple-600 hover:underline">
            View all
          </a>
        </div>
        {loading ? (
          <div className="p-6 text-center text-slate-400">Loading...</div>
        ) : recent.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-500 mb-3">No campaigns yet</p>
            <a href="/campaigns/new" className="btn-primary inline-block">
              Create Your First Campaign
            </a>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recent.map((c) => (
              <a
                key={c.id}
                href={`/campaigns/${c.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-slate-800">{c.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {c.channels.join(", ")} &middot;{" "}
                    {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[c.status] || "bg-slate-100 text-slate-600"}`}>
                  {c.status}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {[
          { label: "New Campaign", href: "/campaigns/new", icon: "+" },
          { label: "Brand Voices", href: "/brand-voices", icon: "🎙" },
          { label: "Companies", href: "/companies", icon: "🏢" },
          { label: "Content Repurpose", href: "/content-ingest", icon: "♻" },
        ].map((action) => (
          <a
            key={action.href}
            href={action.href}
            className="cl-card p-4 text-center hover:border-purple-300 transition-colors"
          >
            <span className="text-2xl block mb-1">{action.icon}</span>
            <span className="text-sm font-medium text-slate-700">{action.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
