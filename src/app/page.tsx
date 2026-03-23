"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Campaign, Company, CampaignFolder } from "@/lib/types";

export default function Home() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [folders, setFolders] = useState<CampaignFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCompany, setFilterCompany] = useState<string>("");
  const [filterFolder, setFilterFolder] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [campRes, compRes, folderRes] = await Promise.all([
      supabase
        .from("campaigns")
        .select("*, brand_voice:brand_voices(*), company:companies(*), folder:campaign_folders(*)")
        .order("created_at", { ascending: false }),
      supabase.from("companies").select("*").order("name"),
      supabase.from("campaign_folders").select("*").order("name"),
    ]);
    setCampaigns(campRes.data || []);
    setCompanies(compRes.data || []);
    setFolders(folderRes.data || []);
    setLoading(false);
  }

  async function deleteCampaign(id: string) {
    if (!confirm("Delete this campaign and all its messages?")) return;
    await supabase.from("campaigns").delete().eq("id", id);
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  }

  const filteredCampaigns = campaigns.filter((c) => {
    if (filterCompany && c.company_id !== filterCompany) return false;
    if (filterFolder && c.folder_id !== filterFolder) return false;
    return true;
  });

  const filteredFolders = filterCompany
    ? folders.filter((f) => f.company_id === filterCompany)
    : folders;

  const statusColors: Record<string, string> = {
    draft: "bg-yellow-500/20 text-yellow-400",
    active: "bg-green-500/20 text-green-400",
    paused: "bg-orange-500/20 text-orange-400",
    completed: "bg-blue-500/20 text-blue-400",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Your Campaigns</h1>
          <p className="text-[var(--muted)] mt-1">
            AI-generated multi-channel campaigns
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href="/companies"
            className="px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors"
          >
            Companies
          </a>
          <a
            href="/campaigns/new"
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
          >
            + New Campaign
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select
          value={filterCompany}
          onChange={(e) => {
            setFilterCompany(e.target.value);
            setFilterFolder("");
          }}
          className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="">All Companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={filterFolder}
          onChange={(e) => setFilterFolder(e.target.value)}
          className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="">All Folders</option>
          {filteredFolders.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        {(filterCompany || filterFolder) && (
          <button
            onClick={() => { setFilterCompany(""); setFilterFolder(""); }}
            className="text-xs text-[var(--accent)] hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-[var(--muted)]">Loading campaigns...</div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[var(--muted)] text-lg mb-4">
            {campaigns.length === 0 ? "No campaigns yet" : "No campaigns match your filters"}
          </p>
          <a
            href="/campaigns/new"
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-6 py-3 rounded-lg font-medium transition-colors inline-block"
          >
            Create Your First Campaign
          </a>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6 hover:border-[var(--accent)]/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-semibold">{campaign.name}</h2>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusColors[campaign.status]}`}
                    >
                      {campaign.status}
                    </span>
                  </div>
                  {campaign.description && (
                    <p className="text-[var(--muted)] text-sm mb-3 line-clamp-2">
                      {campaign.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-[var(--muted)]">
                    {campaign.company && (
                      <span className="bg-white/5 px-2 py-0.5 rounded">{campaign.company.name}</span>
                    )}
                    {campaign.folder && (
                      <span className="bg-white/5 px-2 py-0.5 rounded">📁 {campaign.folder.name}</span>
                    )}
                    <span>{campaign.num_messages} messages</span>
                    <span>{campaign.channels.join(", ")}</span>
                    {campaign.goal && <span>Goal: {campaign.goal}</span>}
                    {campaign.brand_voice && (
                      <span>Voice: {campaign.brand_voice.name}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <a
                    href={`/campaigns/${campaign.id}`}
                    className="text-sm px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    View
                  </a>
                  <button
                    onClick={() => deleteCampaign(campaign.id)}
                    className="text-sm px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
