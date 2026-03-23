'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, TrendingUp, FileCheck, Clock, Zap, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NewCampaignModal } from '@/components/campaign/new-campaign-modal';

interface Campaign {
  id: string;
  sourceUrl: string;
  status: string;
  orgId: string;
  createdAt: string;
  updatedAt: string;
}

interface CampaignWithMeta extends Campaign {
  assetCount: number;
  submissionCount: number;
  assetsCount: number;
  publishedCount: number;
  title: string;
}

export default function DashboardHome() {
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/campaigns?orgId=org_default');
      if (!res.ok) throw new Error('Failed to load campaigns');
      const data: Campaign[] = await res.json();
      const enriched: CampaignWithMeta[] = data.map((c: any) => ({
        ...c,
        title: (() => { try { return new URL(c.sourceUrl).pathname.replace(/\//g, ' ').trim() || c.sourceUrl; } catch { return c.sourceUrl; } })(),
        assetsCount: c.assetCount ?? 0,
        publishedCount: c.submissionCount ?? 0,
      }));
      setCampaigns(enriched);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const stats = [
    {
      label: 'Total Campaigns',
      value: campaigns.length.toString(),
      icon: Zap,
      gradient: 'from-violet-500/20 to-purple-500/20',
      iconColor: 'text-violet-400',
      border: 'border-violet-500/10',
    },
    {
      label: 'Assets Generated',
      value: campaigns.reduce((acc, c) => acc + c.assetsCount, 0).toString(),
      icon: FileCheck,
      gradient: 'from-teal-500/20 to-emerald-500/20',
      iconColor: 'text-teal-400',
      border: 'border-teal-500/10',
    },
    {
      label: 'Published',
      value: campaigns.reduce((acc, c) => acc + c.publishedCount, 0).toString(),
      icon: TrendingUp,
      gradient: 'from-amber-500/20 to-yellow-500/20',
      iconColor: 'text-amber-400',
      border: 'border-amber-500/10',
    },
    {
      label: 'In Progress',
      value: campaigns.filter((c) => c.status === 'generating' || c.status === 'ready').length.toString(),
      icon: Clock,
      gradient: 'from-orange-500/20 to-rose-500/20',
      iconColor: 'text-orange-400',
      border: 'border-orange-500/10',
    },
  ];

  const hasNoCampaigns = !loading && campaigns.length === 0;

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
            <p className="text-gray-600 text-sm">
              Manage campaigns and track distribution performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchCampaigns}
              disabled={loading}
              className="p-2 rounded-lg text-gray-600 hover:text-white hover:bg-white/[0.04] transition-all disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Button onClick={() => setShowNewCampaignModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              New Campaign
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className={`glass-card rounded-xl px-5 py-5 ${stat.border}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-medium uppercase tracking-wider">{stat.label}</p>
                    <p className="text-3xl font-bold mt-2 text-gray-100">
                      {loading ? (
                        <span className="animate-pulse bg-white/[0.04] rounded w-8 h-8 inline-block" />
                      ) : (
                        stat.value
                      )}
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl glass-card border-red-500/20 text-red-300 text-sm flex items-center gap-3">
            <span>{error}</span>
            <button onClick={fetchCampaigns} className="underline hover:no-underline text-red-400">
              Retry
            </button>
          </div>
        )}

        {/* Campaigns Section */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-24 glass-card rounded-xl" />
            ))}
          </div>
        ) : hasNoCampaigns ? (
          <div className="glass-card rounded-xl border-dashed border-white/[0.08]">
            <div className="py-20 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center mx-auto mb-5">
                <Sparkles className="w-7 h-7 text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto text-sm">
                Paste a URL, let AI generate content variants, then publish to 25+ destinations in one click.
              </p>
              <Button onClick={() => setShowNewCampaignModal(true)} variant="gold" className="gap-2">
                <Plus className="w-4 h-4" />
                Create Your First Campaign
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Recent Campaigns</h2>
              <span className="text-xs text-gray-600">{campaigns.length} total</span>
            </div>

            <div className="space-y-3">
              {campaigns.map((campaign) => (
                <Link key={campaign.id} href={`/dashboard/campaigns/${campaign.id}`}>
                  <div className="glass-card rounded-xl px-6 py-5 hover:border-violet-500/20 transition-all duration-300 cursor-pointer group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-base truncate text-gray-100 group-hover:text-white transition-colors">
                            {campaign.title || campaign.sourceUrl}
                          </h3>
                          <Badge
                            status={campaign.status as 'draft' | 'generating' | 'ready' | 'approved' | 'published' | 'failed' | 'manual_needed' | 'needs_edit'}
                          >
                            {campaign.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3 truncate">
                          {campaign.sourceUrl}
                        </p>
                        <div className="flex items-center gap-6 text-xs text-gray-600">
                          <span>{campaign.assetsCount} assets</span>
                          <span>{campaign.publishedCount} published</span>
                          <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <Button variant="secondary" size="sm">
                          Review
                        </Button>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {showNewCampaignModal && (
        <NewCampaignModal
          onClose={() => {
            setShowNewCampaignModal(false);
            fetchCampaigns();
          }}
        />
      )}
    </>
  );
}
