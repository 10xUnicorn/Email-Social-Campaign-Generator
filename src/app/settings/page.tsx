"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase-browser";

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const supabase = createClient();

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    await supabase.from("profiles").update({ full_name: fullName }).eq("id", profile.id);
    await refreshProfile();
    setSaving(false);
  }

  async function openBillingPortal() {
    setBillingLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setBillingLoading(false);
    }
  }

  const statusBadge: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    trialing: "bg-purple-100 text-purple-700",
    past_due: "bg-red-100 text-red-700",
    canceled: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Settings</h1>

      {/* Profile */}
      <div className="cl-card p-6 mb-6">
        <h2 className="font-semibold text-slate-800 mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
            <input
              type="email"
              value={profile?.email || ""}
              disabled
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Subscription */}
      <div className="cl-card p-6 mb-6">
        <h2 className="font-semibold text-slate-800 mb-4">Subscription</h2>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-slate-600">Plan:</span>
          <span className="text-sm font-semibold text-slate-800 capitalize">{profile?.plan || "—"}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[profile?.subscription_status || "none"] || "bg-slate-100 text-slate-600"}`}>
            {profile?.subscription_status || "none"}
          </span>
        </div>
        {profile?.trial_ends_at && profile.subscription_status === "trialing" && (
          <p className="text-sm text-slate-500 mb-4">
            Trial ends: {new Date(profile.trial_ends_at).toLocaleDateString()}
          </p>
        )}
        <button onClick={openBillingPortal} disabled={billingLoading} className="btn-primary">
          {billingLoading ? "Opening..." : "Manage Billing"}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="cl-card p-6 border-red-200">
        <h2 className="font-semibold text-red-600 mb-2">Danger Zone</h2>
        <p className="text-sm text-slate-500 mb-4">
          Deleting your account is permanent and cannot be undone.
        </p>
        <button className="px-4 py-2 rounded-xl border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors">
          Delete Account
        </button>
      </div>
    </div>
  );
}
