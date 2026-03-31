"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase-browser";

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  plan: string;
  subscription_status: string;
  created_at: string;
  trial_ends_at: string | null;
}

export default function AdminUsersPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    // Admin uses service role via API, but for now query via RLS (admin policy)
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, plan, subscription_status, created_at, trial_ends_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setUsers(data || []);
    setLoading(false);
  }

  async function changePlan(userId: string, newPlan: string) {
    await supabase.from("profiles").update({ plan: newPlan }).eq("id", userId);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, plan: newPlan } : u))
    );
  }

  async function changeStatus(userId: string, newStatus: string) {
    await supabase.from("profiles").update({ subscription_status: newStatus }).eq("id", userId);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, subscription_status: newStatus } : u))
    );
  }

  if (profile?.plan !== "admin") {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 text-lg">Access denied. Admin only.</p>
      </div>
    );
  }

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    trialing: "bg-purple-100 text-purple-700",
    past_due: "bg-red-100 text-red-700",
    canceled: "bg-slate-100 text-slate-600",
    none: "bg-slate-100 text-slate-400",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Users</h1>
        <div className="text-sm text-slate-500">{users.length} total users</div>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by email or name..."
        className="w-full max-w-md px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 mb-6"
      />

      <div className="cl-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">User</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Plan</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Signed Up</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No users found</td></tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{u.full_name || "—"}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.plan}
                      onChange={(e) => changePlan(u.id, e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1"
                    >
                      <option value="creator">Creator</option>
                      <option value="business">Business</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.subscription_status || "none"}
                      onChange={(e) => changeStatus(u.id, e.target.value)}
                      className={`text-xs rounded-full px-2 py-0.5 font-medium border-0 ${statusBadge[u.subscription_status || "none"]}`}
                    >
                      <option value="active">Active</option>
                      <option value="trialing">Trialing</option>
                      <option value="past_due">Past Due</option>
                      <option value="canceled">Canceled</option>
                      <option value="none">None</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/admin/users/${u.id}`}
                      className="text-xs text-purple-600 hover:underline"
                    >
                      Details
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
