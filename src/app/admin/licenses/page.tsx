"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase-browser";

export default function AdminLicensesPage() {
  const { profile } = useAuth();
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("creator");
  const [status, setStatus] = useState("active");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function grantAccess(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult("");

    // Find user by email
    const { data: user } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .single();

    if (!user) {
      setResult("User not found. They must sign up first.");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ plan, subscription_status: status })
      .eq("id", user.id);

    if (error) {
      setResult(`Error: ${error.message}`);
    } else {
      setResult(`Access granted: ${user.email} → ${plan} (${status})`);
      setEmail("");
    }
    setLoading(false);
  }

  if (profile?.plan !== "admin") {
    return <div className="text-center py-20 text-slate-500">Access denied.</div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Manual Licenses</h1>

      <div className="cl-card p-6 mb-6">
        <h2 className="font-semibold text-slate-800 mb-4">Grant Access</h2>
        <p className="text-sm text-slate-500 mb-4">
          Manually grant or change a user&apos;s plan and subscription status.
        </p>

        {result && (
          <div
            className={`text-sm rounded-lg p-3 mb-4 ${
              result.startsWith("Error")
                ? "bg-red-50 border border-red-200 text-red-700"
                : "bg-green-50 border border-green-200 text-green-700"
            }`}
          >
            {result}
          </div>
        )}

        <form onSubmit={grantAccess} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">User Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="user@example.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Plan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm"
              >
                <option value="creator">Creator</option>
                <option value="business">Business</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm"
              >
                <option value="active">Active</option>
                <option value="trialing">Trialing</option>
                <option value="canceled">Canceled</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Granting..." : "Grant Access"}
          </button>
        </form>
      </div>
    </div>
  );
}
