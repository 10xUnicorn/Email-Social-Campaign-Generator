"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase-browser";

interface Member {
  id: string;
  user_id: string | null;
  role: string;
  invited_email: string | null;
  accepted_at: string | null;
  profile?: { email: string; full_name: string | null };
}

export default function TeamPage() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    if (profile?.organization_id) loadMembers();
    else setLoading(false);
  }, [profile]);

  async function loadMembers() {
    const { data } = await supabase
      .from("org_members")
      .select("*, profile:profiles(email, full_name)")
      .eq("organization_id", profile!.organization_id!)
      .order("created_at");
    setMembers(data || []);
    setLoading(false);
  }

  async function inviteMember(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail || !profile?.organization_id) return;
    setInviting(true);
    setError("");

    // Check member limit
    if (members.length >= 10) {
      setError("Maximum 10 team members reached.");
      setInviting(false);
      return;
    }

    // Check if already invited
    const exists = members.find(
      (m) => m.invited_email === inviteEmail || m.profile?.email === inviteEmail
    );
    if (exists) {
      setError("This person is already on the team.");
      setInviting(false);
      return;
    }

    const { error: insertErr } = await supabase.from("org_members").insert({
      organization_id: profile.organization_id,
      invited_email: inviteEmail,
      role: "member",
    });

    if (insertErr) {
      setError(insertErr.message);
    } else {
      setInviteEmail("");
      loadMembers();
    }
    setInviting(false);
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remove this team member?")) return;
    await supabase.from("org_members").delete().eq("id", memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  }

  if (profile?.plan !== "business" && profile?.plan !== "admin") {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Team</h1>
        <div className="cl-card p-8 text-center">
          <p className="text-slate-500 mb-4">Team features are available on the Business plan.</p>
          <a href="/settings" className="btn-primary inline-block">Upgrade Plan</a>
        </div>
      </div>
    );
  }

  const roleBadge: Record<string, string> = {
    owner: "bg-purple-100 text-purple-700",
    admin: "bg-blue-100 text-blue-700",
    member: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Team</h1>

      {/* Invite */}
      <div className="cl-card p-6 mb-6">
        <h2 className="font-semibold text-slate-800 mb-4">Invite Team Member</h2>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}
        <form onSubmit={inviteMember} className="flex gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="teammate@company.com"
            required
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button type="submit" disabled={inviting} className="btn-primary">
            {inviting ? "Sending..." : "Invite"}
          </button>
        </form>
        <p className="text-xs text-slate-400 mt-2">
          {members.length}/10 members
        </p>
      </div>

      {/* Members List */}
      <div className="cl-card">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Team Members</h2>
        </div>
        {loading ? (
          <div className="p-6 text-center text-slate-400">Loading...</div>
        ) : members.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">No team members yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {m.profile?.full_name || m.invited_email || "Unknown"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {m.profile?.email || m.invited_email}
                    {!m.accepted_at && m.invited_email && " — pending invite"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadge[m.role]}`}>
                    {m.role}
                  </span>
                  {m.role !== "owner" && (
                    <button
                      onClick={() => removeMember(m.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
