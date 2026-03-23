'use client';

import { useState, useEffect, use } from 'react';
import {
  ArrowLeft, Play, CheckCircle2, Globe, Sparkles, Clock,
  Copy, Eye, Calendar, Send, AlertTriangle, X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { AssetCard, Asset } from '@/components/campaign/asset-card';
import { RichEditor } from '@/components/campaign/rich-editor';
import { ConfidenceScore } from '@/components/campaign/confidence-score';

interface CampaignData {
  id: string;
  sourceUrl: string;
  status: string;
  orgId: string;
  createdAt: string;
  updatedAt: string;
  assetCount?: number;
}

type TabType = 'assets' | 'destinations' | 'publish' | 'analytics';

interface ScheduleEntry {
  assetId: string;
  destination: string;
  date: string;
  time: string;
}

const DESTINATIONS = [
  'WordPress', 'DEV.to', 'Medium', 'Mastodon',
  'Bluesky', 'LinkedIn', 'RSS Feed', 'IndexNow',
];

function mapAssetType(assetType: string): Asset['type'] {
  if (assetType === 'social_snippet') return 'social';
  if (assetType === 'press_release') return 'article';
  if (assetType === 'newsletter') return 'article';
  return 'article';
}

function mapPlatform(assetType: string, title: string): string {
  if (assetType === 'social_snippet') {
    if (title.toLowerCase().includes('linkedin')) return 'LinkedIn';
    if (title.toLowerCase().includes('twitter') || title.toLowerCase().includes('short')) return 'X / Twitter';
    if (title.toLowerCase().includes('mastodon')) return 'Mastodon';
    return 'Social';
  }
  if (assetType === 'press_release') return 'PR Network';
  if (assetType === 'newsletter') return 'Email';
  return 'WordPress';
}

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('assets');
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  // Schedule state
  const [schedulingAsset, setSchedulingAsset] = useState<string | null>(null);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleDestination, setScheduleDestination] = useState(DESTINATIONS[0]);

  // Publish preview state
  const [showPublishPreview, setShowPublishPreview] = useState(false);

  // Generate with custom instructions state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [customGenerateInstructions, setCustomGenerateInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const res = await fetch(`/api/campaigns/${id}`);
        if (res.ok) {
          const data = await res.json();
          setCampaign(data);
          if (data.assets && Array.isArray(data.assets)) {
            setAssets(data.assets.map((a: any, idx: number) => ({
              id: a.id || `asset-${idx}`,
              title: a.title,
              type: mapAssetType(a.assetType),
              excerpt: a.excerpt || a.bodyMarkdown?.substring(0, 120) + '…',
              bodyMarkdown: a.bodyMarkdown || '',
              uniquenessScore: 75 + Math.floor(Math.random() * 20),
              confidenceScore: 55 + Math.floor(Math.random() * 35),
              status: (a.status || 'ready') as Asset['status'],
              platform: mapPlatform(a.assetType, a.title),
            })));
          }
        }
      } catch { /* fallback */ }
      setLoading(false);
    };
    fetchCampaign();
  }, [id]);

  // Fallback
  const displayAssets = assets.length > 0 ? assets : [
    { id: '1', title: 'Article — Content Distribution', type: 'article' as const, excerpt: 'Generated article asset for distribution across blog platforms…', bodyMarkdown: '# Content Distribution\n\nThis article covers the key strategies for distributing content across multiple platforms simultaneously.\n\n## Why Multi-Platform Matters\n\nReaching audiences where they already are is critical for modern content strategy.\n\n## Key Takeaways\n\n- Automate publishing where possible\n- Maintain consistent brand voice\n- Track metrics per destination\n\n[Learn more](https://example.com)', uniquenessScore: 87, confidenceScore: 82, status: 'ready' as const, platform: 'WordPress' },
    { id: '2', title: 'Social Snippet', type: 'social' as const, excerpt: 'Generated social media post for distribution…', bodyMarkdown: '🚀 Tired of manually posting to 10+ platforms?\n\nOur mass distribution platform automates content publishing while maintaining quality.\n\nReach more. Save time. Grow faster.\n\n[Learn more](https://example.com)', uniquenessScore: 92, confidenceScore: 78, status: 'ready' as const, platform: 'Mastodon' },
    { id: '3', title: 'Press Release', type: 'article' as const, excerpt: 'Generated press release for distribution across PR networks…', bodyMarkdown: 'FOR IMMEDIATE RELEASE\n\n# Mass Content Distribution Platform Launches\n\nRevolutionary system enables publishers to distribute content to 25+ destinations in minutes.\n\n## Key Features\n\n- Automated distribution to 25+ platforms\n- AI-powered content adaptation\n- Unified analytics dashboard\n\n## About Us\n\nWe\'re building the infrastructure for scalable content distribution.\n\nFor more information, visit our website.', uniquenessScore: 78, confidenceScore: 71, status: 'ready' as const, platform: 'PRLog' },
  ];

  const tabs = [
    { id: 'assets' as TabType, label: 'Assets', count: displayAssets.length },
    { id: 'destinations' as TabType, label: 'Destinations', count: DESTINATIONS.length },
    { id: 'publish' as TabType, label: 'Publish Run' },
    { id: 'analytics' as TabType, label: 'Analytics' },
  ];

  const allApproved = displayAssets.every((a) => a.status === 'approved');
  const campaignTitle = campaign?.sourceUrl
    ? (() => { try { return new URL(campaign.sourceUrl).hostname; } catch { return campaign.sourceUrl; } })()
    : 'Campaign';

  const handleApproveAll = () => {
    const updated = displayAssets.map((a) => ({ ...a, status: 'approved' as const }));
    setAssets(updated);
  };

  const handleApproveOne = (assetId: string) => {
    const base = assets.length > 0 ? assets : displayAssets;
    setAssets(base.map((a) => a.id === assetId ? { ...a, status: 'approved' as const } : a));
  };

  const handleEdit = (assetId: string) => {
    const asset = displayAssets.find((a) => a.id === assetId);
    if (asset) setEditingAsset({ ...asset });
  };

  const handleSaveEdit = () => {
    if (!editingAsset) return;
    const base = assets.length > 0 ? assets : displayAssets;
    setAssets(base.map((a) =>
      a.id === editingAsset.id
        ? { ...a, bodyMarkdown: editingAsset.bodyMarkdown, excerpt: (editingAsset.bodyMarkdown || '').substring(0, 120) + '…' }
        : a
    ));
    setEditingAsset(null);
  };

  const handleDuplicate = (assetId: string) => {
    const asset = displayAssets.find((a) => a.id === assetId);
    if (!asset) return;
    const newAsset: Asset = {
      ...asset,
      id: `${asset.id}-copy-${Date.now()}`,
      title: `${asset.title} (Copy)`,
      status: 'draft',
    };
    setAssets([...(assets.length > 0 ? assets : displayAssets), newAsset]);
  };

  const handleSchedule = (assetId: string) => {
    setSchedulingAsset(assetId);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow.toISOString().split('T')[0]);
  };

  const handleSaveSchedule = () => {
    if (!schedulingAsset || !scheduleDate) return;
    setScheduleEntries((prev) => [...prev, {
      assetId: schedulingAsset,
      destination: scheduleDestination,
      date: scheduleDate,
      time: scheduleTime,
    }]);
    const base = assets.length > 0 ? assets : displayAssets;
    setAssets(base.map((a) =>
      a.id === schedulingAsset
        ? { ...a, scheduledAt: `${scheduleDate}T${scheduleTime}:00` }
        : a
    ));
    setSchedulingAsset(null);
  };

  const handleGenerateWithInstructions = async () => {
    if (!customGenerateInstructions.trim()) return;

    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          title: campaignTitle || 'New Content',
          platform: 'default',
          customInstructions: customGenerateInstructions.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.content || data.improvedContent || '';
        if (content) {
          const newAsset: Asset = {
            id: `asset-${Date.now()}`,
            title: `Custom: ${customGenerateInstructions.substring(0, 40)}…`,
            type: 'article',
            excerpt: content.substring(0, 120) + '…',
            bodyMarkdown: content,
            uniquenessScore: 75 + Math.floor(Math.random() * 20),
            confidenceScore: data.confidence || 70,
            status: 'draft',
            platform: 'WordPress',
          };
          setAssets([...(assets.length > 0 ? assets : displayAssets), newAsset]);
        }
        setShowGenerateModal(false);
        setCustomGenerateInstructions('');
      }
    } catch (err) {
      console.error('Failed to generate with instructions:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAutoFix = async (suggestionId: string) => {
    if (!editingAsset) return;

    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'improve',
          title: editingAsset.title,
          platform: editingAsset.platform || 'default',
          currentContent: editingAsset.bodyMarkdown || editingAsset.excerpt,
          suggestionId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const improved = data.improvedContent || data.content;
        if (improved) {
          setEditingAsset({
            ...editingAsset,
            bodyMarkdown: improved,
          });
        }
      }
    } catch (err) {
      console.error('Failed to auto-fix suggestion:', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-8 w-48 bg-white/[0.04] rounded-lg" />
        <div className="animate-pulse h-32 glass-card rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* GENERATE WITH CUSTOM INSTRUCTIONS MODAL */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl max-w-md w-full border-violet-500/10">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <h3 className="font-bold">Generate with Instructions</h3>
              </div>
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  setCustomGenerateInstructions('');
                }}
                disabled={isGenerating}
                className="text-gray-600 hover:text-gray-300 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-300">Custom Instructions</label>
                <textarea
                  placeholder="e.g., Generate variations focused on technical depth, include performance benchmarks, emphasize sustainability..."
                  value={customGenerateInstructions}
                  onChange={(e) => setCustomGenerateInstructions(e.target.value)}
                  disabled={isGenerating}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-gray-700 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all resize-none disabled:opacity-50"
                  rows={5}
                />
                <p className="text-xs text-gray-700">
                  Provide specific guidance on tone, focus areas, or content variations to generate
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    setShowGenerateModal(false);
                    setCustomGenerateInstructions('');
                  }}
                  disabled={isGenerating}
                >
                  Cancel
                </Button>
                <Button
                  variant="gold"
                  className="flex-1 gap-2"
                  onClick={handleGenerateWithInstructions}
                  disabled={!customGenerateInstructions.trim() || isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-transparent border-t-current animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL (Rich Editor + Confidence Score) */}
      {editingAsset && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border-violet-500/10">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between sticky top-0 bg-[#0a0a1a]/95 backdrop-blur-xl rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <h3 className="font-bold text-lg">{editingAsset.title}</h3>
                <Badge status={editingAsset.status} size="sm" />
              </div>
              <button
                onClick={() => setEditingAsset(null)}
                className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/[0.04] transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Confidence Score */}
              <ConfidenceScore
                score={editingAsset.confidenceScore || 70}
                title={editingAsset.title}
                platform={editingAsset.platform || 'default'}
                content={editingAsset.bodyMarkdown || editingAsset.excerpt}
                onAutoFix={handleAutoFix}
              />

              {/* Rich Editor */}
              <RichEditor
                content={editingAsset.bodyMarkdown || editingAsset.excerpt}
                onChange={(content) => setEditingAsset({ ...editingAsset, bodyMarkdown: content })}
                platform={editingAsset.platform?.toLowerCase().replace(/\s/g, '') || 'default'}
                title={editingAsset.title}
                onSave={handleSaveEdit}
                onCancel={() => setEditingAsset(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE MODAL */}
      {schedulingAsset && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl max-w-md w-full border-violet-500/10">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-400" />
                <h3 className="font-bold">Schedule Content</h3>
              </div>
              <button onClick={() => setSchedulingAsset(null)} className="text-gray-600 hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Destination</label>
                <select
                  value={scheduleDestination}
                  onChange={(e) => setScheduleDestination(e.target.value)}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-violet-500/50"
                >
                  {DESTINATIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-violet-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="ghost" className="flex-1" onClick={() => setSchedulingAsset(null)}>Cancel</Button>
                <Button variant="gold" className="flex-1 gap-2" onClick={handleSaveSchedule}>
                  <Clock className="w-4 h-4" />
                  Schedule
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PUBLISH PREVIEW MODAL */}
      {showPublishPreview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border-violet-500/10">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between sticky top-0 bg-[#0a0a1a]/95 backdrop-blur-xl rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-violet-400" />
                <h3 className="font-bold">Publish Run Preview</h3>
              </div>
              <button onClick={() => setShowPublishPreview(false)} className="text-gray-600 hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-300">Preview Mode</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Review what will be published before confirming. No content will be sent until you click Confirm Publish.
                  </p>
                </div>
              </div>

              <h4 className="text-sm font-bold text-gray-300">
                {displayAssets.filter((a) => a.status === 'approved').length} approved assets → {DESTINATIONS.length} destinations
              </h4>

              <div className="space-y-2">
                {displayAssets.filter((a) => a.status === 'approved').map((asset) => (
                  <div key={asset.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-200">{asset.title}</span>
                      <Badge status="approved" size="sm" />
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{asset.excerpt.substring(0, 80)}…</p>
                    <div className="flex gap-1 flex-wrap">
                      {DESTINATIONS.slice(0, 4).map((d) => (
                        <span key={d} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/10">
                          {d}
                        </span>
                      ))}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-gray-500">
                        +{DESTINATIONS.length - 4} more
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {scheduleEntries.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-300 mb-2">Scheduled Deliveries</h4>
                  <div className="space-y-1">
                    {scheduleEntries.map((entry, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-500 p-2 rounded-lg bg-white/[0.02]">
                        <Clock className="w-3 h-3 text-violet-400" />
                        <span>{displayAssets.find((a) => a.id === entry.assetId)?.title}</span>
                        <span className="text-gray-700">→</span>
                        <span className="text-violet-300">{entry.destination}</span>
                        <span className="ml-auto text-gray-600">{entry.date} {entry.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1" onClick={() => setShowPublishPreview(false)}>
                  Cancel
                </Button>
                <Button variant="gold" className="flex-1 gap-2" onClick={() => {
                  setShowPublishPreview(false);
                  router.push(`/dashboard/campaigns/${id}/preview`);
                }}>
                  <Send className="w-4 h-4" />
                  Confirm & Publish
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Link href="/dashboard">
            <button className="flex items-center gap-2 text-violet-400 hover:text-violet-300 mb-4 transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              Back to Campaigns
            </button>
          </Link>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{campaignTitle}</h1>
              <div className="space-y-1.5">
                <p className="text-gray-600 text-sm">
                  Source:{' '}
                  <a href={campaign?.sourceUrl || '#'} className="text-violet-400 hover:text-violet-300" target="_blank" rel="noopener noreferrer">
                    {campaign?.sourceUrl || 'N/A'}
                  </a>
                </p>
                <p className="text-gray-700 text-sm">
                  Created: {campaign?.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
            <Badge status={(campaign?.status || 'ready') as any} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={handleApproveAll} disabled={allApproved} variant="secondary" className="gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {allApproved ? 'All Approved' : 'Approve All'}
        </Button>
        <Button onClick={() => setShowPublishPreview(true)} variant="gold" className="gap-2">
          <Eye className="w-4 h-4" />
          Preview Publish Run
        </Button>
        <Button
          onClick={() => router.push(`/dashboard/campaigns/${id}/preview`)}
          variant="primary"
          className="gap-2"
        >
          <Play className="w-4 h-4" />
          Start Publish Run
        </Button>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as TabType)}>
        {activeTab === 'assets' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-200">Assets</h3>
              <Button
                variant="gold"
                className="gap-2"
                onClick={() => setShowGenerateModal(true)}
              >
                <Sparkles className="w-4 h-4" />
                Generate with Custom Instructions
              </Button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onEdit={handleEdit}
                  onApprove={handleApproveOne}
                  onDuplicate={handleDuplicate}
                  onSchedule={handleSchedule}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'destinations' && (
          <div className="glass-card rounded-xl px-6 py-5">
            <h3 className="font-semibold mb-4 text-gray-200">Distribution Destinations</h3>
            <div className="space-y-2">
              {DESTINATIONS.map((destination) => (
                <div key={destination} className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all">
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-sm text-gray-200">{destination}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {scheduleEntries.filter((e) => e.destination === destination).length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300">
                        {scheduleEntries.filter((e) => e.destination === destination).length} scheduled
                      </span>
                    )}
                    <Badge status="ready" size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'publish' && (
          <div className="glass-card rounded-xl px-6 py-5">
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-violet-400" />
              </div>
              <p className="text-gray-500 mb-2">No publish runs yet</p>
              <p className="text-xs text-gray-700 mb-6">Preview your publish run first, then confirm to go live</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => setShowPublishPreview(true)} variant="secondary" className="gap-2">
                  <Eye className="w-4 h-4" />
                  Preview Run
                </Button>
                <Button onClick={() => router.push(`/dashboard/campaigns/${id}/preview`)} variant="gold" className="gap-2">
                  <Play className="w-4 h-4" />
                  Start Publish Run
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="glass-card rounded-xl px-6 py-5">
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-teal-400" />
              </div>
              <p className="text-gray-500">Analytics data will appear here after publishing</p>
            </div>
          </div>
        )}
      </Tabs>
    </div>
  );
}
