"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { Campaign, Company, CampaignFolder } from "@/lib/types";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [folders, setFolders] = useState<CampaignFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCompany, setFilterCompany] = useState<string>("");
  const [filterFolder, setFilterFolder] = useState<string>("");
  const supabase = createClient();

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
    draft: "bg-yellow-100 text-yellow-700",
    active: "bg-green-100 text-green-700",
    paused: "bg-orange-100 text-orange-700",
    completed: "bg-blue-100 text-blue-700",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Campaigns</h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            AI-generated multi-channel campaigns
          </p>
        </div>
        <div className="flex gap-3">
          <a href="/content-ingest" className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium transition-colors">Repurpose</a>
          <a href="/campaigns/new" className="btn-primary">+ New Campaign</a>
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
          className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={filterFolder}
          onChange={(e) => setFilterFolder(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Folders</option>
          {filteredFolders.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        {(filterCompany || filterFolder) && (
          <button
            onClick={() => { setFilterCompany(""); setFilterFolder(""); }}
            className="text-xs text-purple-600 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Loading campaigns...</div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-500 text-lg mb-4">
            {campaigns.length === 0 ? "No campaigns yet" : "No campaigns match your filters"}
          </p>
          <a href="/campaigns/new" className="btn-primary inline-block">
            Create Your First Campaign
          </a>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="cl-card p-6 hover:border-purple-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-semibold text-slate-800">{campaign.name}</h2>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusColors[campaign.status]}`}>
                      {campaign.status}
                    </span>
                  </div>
                  {campaign.description && (
                    <p className="text-slate-500 text-sm mb-3 line-clamp-2">
                      {campaign.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    {campaign.company && (
                      <span className="bg-slate-100 px-2 py-0.5 rounded">{campaign.company.name}</span>
                    )}
                    {campaign.folder && (
                      <span className="bg-slate-100 px-2 py-0.5 rounded">📁 {campaign.folder.name}</span>
                    )}
                    <span>{campaign.num_messages} messages</span>
                    <span>{campaign.channels.join(", ")}</span>
                    {campaign.brand_voice && (
                      <span>Voice: {campaign.brand_voice.name}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <a
                    href={`/campaigns/${campaign.id}`}
                    className="text-sm px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    View
                  </a>
                  <button
                    onClick={() => deleteCampaign(campaign.id)}
                    className="text-sm px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
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
