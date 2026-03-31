"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase-browser";

interface SubMetrics {
  total: number;
  active: number;
  trialing: number;
  past_due: number;
  canceled: number;
  mrr: number;
}

export default function AdminSubscriptionsPage() {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState<SubMetrics>({
    total: 0, active: 0, trialing: 0, past_due: 0, canceled: 0, mrr: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadMetrics();
  }, []);

  async function loadMetrics() {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("plan, subscription_status");

    if (profiles) {
      const m: SubMetrics = {
        total: profiles.length,
        active: profiles.filter((p) => p.subscription_status === "active").length,
        trialing: profiles.filter((p) => p.subscription_status === "trialing").length,
        past_due: profiles.filter((p) => p.subscription_status === "past_due").length,
        canceled: profiles.filter((p) => p.subscription_status === "canceled").length,
        mrr: 0,
      };

      // Calculate MRR
      profiles.forEach((p) => {
        if (p.subscription_status === "active" || p.subscription_status === "trialing") {
          if (p.plan === "creator") m.mrr += 29;
          if (p.plan === "business") m.mrr += 79;
        }
      });

      setMetrics(m);
    }
    setLoading(false);
  }

  if (profile?.plan !== "admin") {
    return <div className="text-center py-20 text-slate-500">Access denied.</div>;
  }

  const cards = [
    { label: "Total Users", value: metrics.total, color: "text-slate-800" },
    { label: "Active", value: metrics.active, color: "text-green-600" },
    { label: "Trialing", value: metrics.trialing, color: "text-purple-600" },
    { label: "Past Due", value: metrics.past_due, color: "text-red-600" },
    { label: "Canceled", value: metrics.canceled, color: "text-slate-400" },
    { label: "Est. MRR", value: `$${metrics.mrr.toLocaleString()}`, color: "text-green-600" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Subscriptions</h1>

      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="cl-card p-6">
              <p className="text-sm text-slate-500 mb-1">{c.label}</p>
              <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
