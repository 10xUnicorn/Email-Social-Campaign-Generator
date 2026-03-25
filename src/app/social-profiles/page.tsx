"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { SocialProfile, Company } from "@/lib/types";
import { PLATFORM_CONFIG } from "@/lib/types";

export default function SocialProfilesPage() {
  const [profiles, setProfiles] = useState<SocialProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [platform, setPlatform] = useState<string>("instagram");
  const [profileName, setProfileName] = useState("");
  const [profileId, setProfileId] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [profilesRes, companiesRes] = await Promise.all([
      fetch("/api/social-profiles"),
      supabase.from("companies").select("*").order("name"),
    ]);
    const profilesData = await profilesRes.json();
    if (Array.isArray(profilesData)) setProfiles(profilesData);
    if (companiesRes.data) setCompanies(companiesRes.data);
    setLoading(false);
  }

  function resetForm() {
    setPlatform("instagram");
    setProfileName("");
    setProfileId("");
    setProfileUrl("");
    setAccessToken("");
    setRefreshToken("");
    setApiKey("");
    setApiSecret("");
    setCompanyId("");
    setEditingId(null);
  }

  function openAdd() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(p: SocialProfile) {
    setEditingId(p.id);
    setPlatform(p.platform);
    setProfileName(p.profile_name);
    setProfileId(p.profile_id || "");
    setProfileUrl(p.profile_url || "");
    setAccessToken(p.access_token || "");
    setRefreshToken(p.refresh_token || "");
    setApiKey(p.api_key || "");
    setApiSecret(p.api_secret || "");
    setCompanyId(p.company_id || "");
    setShowForm(true);
  }

  async function saveProfile() {
    if (!profileName.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        platform,
        profile_name: profileName,
        profile_id: profileId || null,
        profile_url: profileUrl || null,
        access_token: accessToken || null,
        refresh_token: refreshToken || null,
        api_key: apiKey || null,
        api_secret: apiSecret || null,
        company_id: companyId || null,
      };
      if (editingId) body.id = editingId;

      await fetch("/api/social-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      setShowForm(false);
      resetForm();
      await loadData();
    } catch {
      alert("Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProfile(id: string) {
    if (!confirm("Delete this social profile? Published post history will also be removed.")) return;
    await fetch(`/api/social-profiles?id=${id}`, { method: "DELETE" });
    await loadData();
  }

  async function toggleActive(p: SocialProfile) {
    await fetch("/api/social-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, platform: p.platform, profile_name: p.profile_name, is_active: !p.is_active }),
    });
    await loadData();
  }

  const platformEntries = Object.entries(PLATFORM_CONFIG);
  const config = PLATFORM_CONFIG[platform];

  // Group profiles by platform
  const grouped: Record<string, SocialProfile[]> = {};
  for (const p of profiles) {
    if (!grouped[p.platform]) grouped[p.platform] = [];
    grouped[p.platform].push(p);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--muted)]">Loading social profiles...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Social Profiles</h1>
          <p className="text-[var(--muted)] mt-1">
            {profiles.length} connected profile{profiles.length !== 1 ? "s" : ""} across{" "}
            {Object.keys(grouped).length} platform{Object.keys(grouped).length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/" className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs transition-colors">
            Dashboard
          </a>
          <a href="/media-library" className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs transition-colors">
            Media Library
          </a>
          <button
            onClick={openAdd}
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Connect Profile
          </button>
        </div>
      </div>

      {/* Platform overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-8">
        {platformEntries.map(([key, cfg]) => {
          const count = grouped[key]?.length || 0;
          return (
            <div
              key={key}
              className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4 text-center"
            >
              <div className="text-2xl mb-1">{cfg.icon}</div>
              <div className="text-xs font-medium">{cfg.label}</div>
              <div className="text-lg font-bold mt-1" style={{ color: count > 0 ? cfg.color : "var(--muted)" }}>
                {count}
              </div>
            </div>
          );
        })}
      </div>

      {/* Profiles list */}
      {profiles.length === 0 ? (
        <div className="text-center py-20 text-[var(--muted)]">
          <div className="text-4xl mb-4">📡</div>
          <p className="text-lg mb-2">No social profiles connected</p>
          <p className="text-sm mb-6">Connect your social media accounts to publish content directly from campaigns.</p>
          <button onClick={openAdd} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
            + Connect Your First Profile
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((p) => {
            const cfg = PLATFORM_CONFIG[p.platform];
            return (
              <div
                key={p.id}
                className={`bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4 flex items-center gap-4 transition-opacity ${!p.is_active ? "opacity-50" : ""}`}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: cfg?.color + "22" }}
                >
                  {cfg?.icon || "🌐"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{p.profile_name}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: cfg?.color + "22", color: cfg?.color }}
                    >
                      {cfg?.label || p.platform}
                    </span>
                    {!p.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Disabled</span>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-[var(--muted)] mt-1">
                    {p.profile_url && (
                      <a href={p.profile_url} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent)]">
                        {p.profile_url}
                      </a>
                    )}
                    {p.company && <span>Company: {p.company.name}</span>}
                    <span>Token: {p.access_token ? "Connected" : "Not set"}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(p)}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                      p.is_active
                        ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                        : "bg-white/5 text-[var(--muted)] hover:bg-white/10"
                    }`}
                  >
                    {p.is_active ? "Active" : "Enable"}
                  </button>
                  <button
                    onClick={() => openEdit(p)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteProfile(p.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-bold mb-4">
              {editingId ? "Edit Social Profile" : "Connect Social Profile"}
            </h3>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {/* Platform select */}
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1.5">Platform</label>
                <div className="grid grid-cols-3 gap-2">
                  {platformEntries.map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setPlatform(key)}
                      className={`p-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        platform === key
                          ? "border-[var(--accent)] bg-[var(--accent)]/10 text-white"
                          : "border-[var(--card-border)] bg-[var(--bg)] text-[var(--muted)] hover:bg-white/5"
                      }`}
                    >
                      {cfg.icon} {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-[var(--muted)] mb-1.5">Profile Name *</label>
                <input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="@yourhandle or Page Name"
                  className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--muted)] mb-1.5">
                  Profile ID {platform === "linkedin" ? "(LinkedIn URN)" : platform === "facebook" ? "(Page ID)" : platform === "instagram" ? "(IG Business Account ID)" : ""}
                </label>
                <input
                  value={profileId}
                  onChange={(e) => setProfileId(e.target.value)}
                  placeholder="Platform-specific ID"
                  className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--muted)] mb-1.5">Profile URL</label>
                <input
                  value={profileUrl}
                  onChange={(e) => setProfileUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--muted)] mb-1.5">Company (optional)</label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="">— No company —</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* API Credentials */}
              <div className="border-t border-[var(--card-border)] pt-4">
                <h4 className="text-xs font-semibold text-[var(--muted)] mb-3 uppercase tracking-wider">
                  API Credentials — {config?.label}
                </h4>

                {(platform === "x") && (
                  <>
                    <div className="mb-3">
                      <label className="block text-xs text-[var(--muted)] mb-1.5">API Key</label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter API key..."
                        className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="block text-xs text-[var(--muted)] mb-1.5">API Secret</label>
                      <input
                        type="password"
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        placeholder="Enter API secret..."
                        className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                  </>
                )}

                <div className="mb-3">
                  <label className="block text-xs text-[var(--muted)] mb-1.5">Access Token</label>
                  <input
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="Enter access token..."
                    className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="mb-3">
                  <label className="block text-xs text-[var(--muted)] mb-1.5">Refresh Token (optional)</label>
                  <input
                    type="password"
                    value={refreshToken}
                    onChange={(e) => setRefreshToken(e.target.value)}
                    placeholder="Enter refresh token..."
                    className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <p className="text-xs text-[var(--muted)] mt-2 leading-relaxed">
                  {platform === "x" && "Get credentials from developer.x.com > Your App > Keys & Tokens. Need OAuth 2.0 User Auth with tweet.write scope."}
                  {platform === "linkedin" && "Get from linkedin.com/developers > Your App. Need w_member_social scope. Profile ID is your LinkedIn URN (urn:li:person:XXXXX)."}
                  {platform === "facebook" && "Get from developers.facebook.com > Your App. Need pages_manage_posts permission. Use the Page Access Token and Page ID."}
                  {platform === "instagram" && "Use Meta Business Suite. Need instagram_basic + instagram_content_publish permissions via Facebook Graph API."}
                  {platform === "tiktok" && "Get from developers.tiktok.com > Your App. Need video.publish scope."}
                  {platform === "youtube" && "Use Google Cloud Console. Enable YouTube Data API v3. Need OAuth token with youtube.upload scope."}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--card-border)]">
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveProfile}
                disabled={saving || !profileName.trim()}
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Update Profile" : "Connect Profile"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
