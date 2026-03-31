"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase-browser";

export default function AdminUsagePage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    total_campaigns: 0,
    total_generations: 0,
    total_exports: 0,
    campaigns_this_month: 0,
    generations_this_month: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadUsage();
  }, []);

  async function loadUsage() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [allEvents, monthEvents, campCount] = await Promise.all([
      supabase.from("usage_events").select("event_type"),
      supabase.from("usage_events").select("event_type").gte("created_at", startOfMonth.toISOString()),
      supabase.from("campaigns").select("id", { count: "exact", head: true }),
    ]);

    const allCounts: Record<string, number> = {};
    (allEvents.data || []).forEach((e) => {
      allCounts[e.event_type] = (allCounts[e.event_type] || 0) + 1;
    });

    const monthCounts: Record<string, number> = {};
    (monthEvents.data || []).forEach((e) => {
      monthCounts[e.event_type] = (monthCounts[e.event_type] || 0) + 1;
    });

    setStats({
      total_campaigns: campCount.count || 0,
      total_generations: allCounts.ai_generation || 0,
      total_exports: allCounts.export || 0,
      campaigns_this_month: monthCounts.campaign_created || 0,
      generations_this_month: monthCounts.ai_generation || 0,
    });
    setLoading(false);
  }

  if (profile?.plan !== "admin") {
    return <div className="text-center py-20 text-slate-500">Access denied.</div>;
  }

  const cards = [
    { label: "Total Campaigns", value: stats.total_campaigns },
    { label: "AI Generations (All Time)", value: stats.total_generations },
    { label: "Exports (All Time)", value: stats.total_exports },
    { label: "Campaigns This Month", value: stats.campaigns_this_month },
    { label: "Generations This Month", value: stats.generations_this_month },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Platform Usage</h1>
      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="cl-card p-6">
              <p className="text-sm text-slate-500 mb-1">{c.label}</p>
              <p className="text-3xl font-bold text-slate-800">{c.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
