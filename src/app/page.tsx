<<<<<<< HEAD
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
=======
import Link from 'next/link';
import { ArrowRight, Sparkles, Send, BarChart3, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen page-bg noise-overlay">
      {/* Navigation */}
      <nav className="border-b border-white/[0.04] bg-[#050510]/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-600/20">
              <Crown className="w-4 h-4 text-amber-300" />
            </div>
            <span className="text-xl font-bold text-gold">Distribute</span>
          </div>
          <Link href="/dashboard">
            <Button variant="secondary" size="sm">
              Dashboard
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-32 relative">
        {/* Ambient glow orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-teal-500/8 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center space-y-8 relative z-10">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-gray-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              AI-Powered Content Distribution
            </div>
            <h1 className="text-7xl font-bold leading-tight tracking-tight">
              Distribute Your Content
              <br />
              <span className="text-purple-glow">
                Everywhere
              </span>{' '}
              <span className="text-gold">at Scale</span>
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
              One source. Infinite destinations. Ingest. Generate. Publish.
            </p>
          </div>

          <div className="flex justify-center gap-4 pt-4">
            <Link href="/dashboard">
              <Button size="lg" className="group">
                Get Started
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="gold" size="lg">
                View Demo
              </Button>
            </Link>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-3 gap-5 pt-24">
            {[
              {
                icon: Sparkles,
                title: 'AI-Powered Generation',
                desc: 'Claude generates content tailored to each destination\'s unique format and audience.',
                color: 'from-violet-500/15 to-purple-500/15',
                border: 'border-violet-500/10 hover:border-violet-500/25',
                iconColor: 'text-violet-400',
                glow: 'group-hover:shadow-violet-500/10',
              },
              {
                icon: Send,
                title: '25+ Destinations',
                desc: 'Publish to APIs, RSS feeds, social networks, and community platforms in one click.',
                color: 'from-teal-500/15 to-emerald-500/15',
                border: 'border-teal-500/10 hover:border-teal-500/25',
                iconColor: 'text-teal-400',
                glow: 'group-hover:shadow-teal-500/10',
              },
              {
                icon: BarChart3,
                title: 'One-Button Publish',
                desc: 'Preview, approve, and publish across all channels simultaneously with complete control.',
                color: 'from-amber-500/15 to-yellow-500/15',
                border: 'border-amber-500/10 hover:border-amber-500/25',
                iconColor: 'text-amber-400',
                glow: 'group-hover:shadow-amber-500/10',
              },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`group glass-card p-7 rounded-xl ${feature.border} transition-all duration-300 hover:shadow-xl ${feature.glow}`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5`}
                  >
                    <Icon className={`w-5 h-5 ${feature.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <p className="text-center text-gray-700 text-sm">
            &copy; 2026 Distribute. Mass content distribution for the modern web.
          </p>
        </div>
      </footer>
>>>>>>> 267c82c7d15ebb733f719d8beda022484903d5ae
    </div>
  );
}
