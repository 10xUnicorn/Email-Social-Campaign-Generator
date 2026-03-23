'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Globe,
  MousePointerClick,
  BarChart3,
  ArrowUpRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface AnalyticsSummary {
  totalClicks: number;
  totalPublished: number;
  totalCampaigns: number;
  avgClicksPerAsset: number;
}

interface TopLink {
  url: string;
  destination: string;
  clicks: number;
  campaignTitle: string;
}

interface RecentSubmission {
  id: string;
  destination: string;
  assetTitle: string;
  status: string;
  submittedAt: string;
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [topLinks, setTopLinks] = useState<TopLink[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('/api/analytics?orgId=org_default');
        if (res.ok) {
          const json = await res.json();
          const s = json.data?.summary;
          if (s) {
            setSummary({
              totalClicks: s.totalClicks ?? 0,
              totalPublished: s.totalPublished ?? 0,
              totalCampaigns: s.totalCampaigns ?? 0,
              avgClicksPerAsset: s.totalPublished > 0 ? (s.totalClicks / s.totalPublished) : 0,
            });
          }
          setTopLinks(json.data?.topDestinations ?? []);
          setRecentSubmissions([]);
        }
      } catch {
        // fallback to empty state
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [timeRange]);

  const stats = [
    {
      label: 'Total Clicks',
      value: summary?.totalClicks ?? 0,
      icon: MousePointerClick,
      color: 'from-violet-500 to-violet-600',
      sub: 'across all tracked links',
    },
    {
      label: 'Published Assets',
      value: summary?.totalPublished ?? 0,
      icon: CheckCircle2,
      color: 'from-teal-500 to-teal-600',
      sub: 'live across destinations',
    },
    {
      label: 'Campaigns',
      value: summary?.totalCampaigns ?? 0,
      icon: BarChart3,
      color: 'from-amber-500 to-amber-600',
      sub: 'total created',
    },
    {
      label: 'Avg Clicks / Asset',
      value: summary?.avgClicksPerAsset?.toFixed(1) ?? '0.0',
      icon: TrendingUp,
      color: 'from-orange-500 to-orange-600',
      sub: 'per published asset',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-gray-100">Analytics</h1>
          <p className="text-gray-600">
            Track clicks, reach, and performance across all your distribution channels
          </p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors border ${
                timeRange === range
                  ? 'bg-violet-500/10 border-violet-500/30 text-white'
                  : 'bg-white/[0.03] border-white/[0.06] text-gray-500'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="glass-card border border-white/[0.06] bg-white/[0.03] rounded-xl p-6 backdrop-blur-md"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center opacity-80`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold mb-1 text-gray-100">
                {loading ? (
                  <span className="animate-pulse bg-white/[0.08] rounded w-12 h-8 inline-block" />
                ) : (
                  stat.value
                )}
              </p>
              <p className="text-sm font-medium text-gray-100">{stat.label}</p>
              <p className="text-xs text-gray-700 mt-1">{stat.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Links */}
        <div className="glass-card border border-white/[0.06] bg-white/[0.03] rounded-xl p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-100">
              <MousePointerClick className="w-5 h-5 text-violet-400" />
              Top Tracked Links
            </h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse h-12 bg-white/[0.08] rounded-lg" />
              ))}
            </div>
          ) : topLinks.length === 0 ? (
            <div className="py-10 text-center">
              <Globe className="w-10 h-10 text-violet-400 mx-auto mb-3" />
              <p className="text-gray-600 text-sm">No click data yet</p>
              <p className="text-gray-700 text-xs mt-1">
                Publish a campaign to start tracking clicks
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {topLinks.map((link, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.05] transition-colors"
                >
                  <span className="text-xs text-gray-700 w-5 text-center font-bold">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-gray-100">{link.campaignTitle}</p>
                    <p className="text-xs text-gray-600">{link.destination}</p>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-semibold text-teal-400">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    {link.clicks}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Submissions */}
        <div className="glass-card border border-white/[0.06] bg-white/[0.03] rounded-xl p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-100">
              <Clock className="w-5 h-5 text-violet-400" />
              Recent Submissions
            </h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse h-12 bg-white/[0.08] rounded-lg" />
              ))}
            </div>
          ) : recentSubmissions.length === 0 ? (
            <div className="py-10 text-center">
              <BarChart3 className="w-10 h-10 text-violet-400 mx-auto mb-3" />
              <p className="text-gray-600 text-sm">No submissions yet</p>
              <p className="text-gray-700 text-xs mt-1">
                Publish a campaign to see submissions here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.05] transition-colors"
                >
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      sub.status === 'success'
                        ? 'bg-teal-400'
                        : sub.status === 'failed'
                        ? 'bg-orange-400'
                        : 'bg-amber-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-gray-100">{sub.assetTitle}</p>
                    <p className="text-xs text-gray-600">{sub.destination}</p>
                  </div>
                  <span className="text-xs text-gray-700 whitespace-nowrap">
                    {new Date(sub.submittedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Destination Breakdown Placeholder */}
      <div className="glass-card border border-white/[0.06] bg-white/[0.03] rounded-xl p-6 backdrop-blur-md">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-100">
          <Globe className="w-5 h-5 text-violet-400" />
          Destination Breakdown
        </h2>
        <div className="py-12 text-center">
          <TrendingUp className="w-12 h-12 text-gray-700 mx-auto mb-4 opacity-50" />
          <p className="text-gray-600 font-medium mb-2">Charts coming soon</p>
          <p className="text-gray-700 text-sm max-w-sm mx-auto">
            Per-destination performance charts will appear here once you start publishing campaigns.
          </p>
        </div>
      </div>
    </div>
  );
}
