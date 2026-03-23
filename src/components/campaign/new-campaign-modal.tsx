'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, AlertCircle, CheckCircle2, Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NewCampaignModalProps {
  onClose: () => void;
}

const STEPS = [
  'Fetching source content…',
  'Extracting structure & offers…',
  'Generating site brief…',
  'Creating content assets…',
  'Mapping to destinations…',
  'Campaign ready!',
];

export function NewCampaignModal({ onClose }: NewCampaignModalProps) {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState('');
  const [canonicalStrategy, setCanonicalStrategy] = useState('canonical_first');
  const [maxLinks, setMaxLinks] = useState(5);
  const [anchorStyle, setAnchorStyle] = useState('descriptive');
  const [distributionPacing, setDistributionPacing] = useState('moderate');
  const [customInstructions, setCustomInstructions] = useState('');
  const [expandCustomInstructions, setExpandCustomInstructions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [urlError, setUrlError] = useState('');
  const [apiError, setApiError] = useState('');

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleStartIngestion = async () => {
    if (!sourceUrl.trim()) {
      setUrlError('URL is required');
      return;
    }
    if (!validateUrl(sourceUrl)) {
      setUrlError('Please enter a valid URL (include https://)');
      return;
    }

    setUrlError('');
    setApiError('');
    setIsLoading(true);
    setProgress([]);

    let stepIdx = 0;
    const stepInterval = setInterval(() => {
      if (stepIdx < STEPS.length - 1) {
        setProgress((prev) => [...prev, STEPS[stepIdx]]);
        stepIdx++;
      }
    }, 600);

    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: sourceUrl,
          orgId: 'org_default',
          canonicalStrategy,
          linkPolicy: 'utm_only',
          distributionPacing:
            distributionPacing === 'conservative'
              ? 'scheduled'
              : distributionPacing === 'aggressive'
              ? 'immediate'
              : 'staggered',
          ...(customInstructions.trim() && { customInstructions: customInstructions.trim() }),
        }),
      });

      clearInterval(stepInterval);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ingestion failed');
      }

      const data = await res.json();
      setProgress(STEPS);
      await new Promise((r) => setTimeout(r, 800));
      onClose();
      router.push(`/dashboard/campaigns/${data.campaignId}`);
    } catch (err) {
      clearInterval(stepInterval);
      setIsLoading(false);
      setProgress([]);
      setApiError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-violet-500/10">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0a0a1a]/95 backdrop-blur-xl rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            <h2 className="text-xl font-bold">New Campaign</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-600 hover:text-gray-300 transition-colors disabled:opacity-50 p-1 rounded-lg hover:bg-white/[0.04]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {!isLoading ? (
            <>
              {apiError && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {apiError}
                </div>
              )}

              {/* Source URL */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-300">Source URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/your-article"
                  value={sourceUrl}
                  onChange={(e) => {
                    setSourceUrl(e.target.value);
                    setUrlError('');
                    setApiError('');
                  }}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-gray-700 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleStartIngestion()}
                />
                {urlError && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {urlError}
                  </div>
                )}
                <p className="text-xs text-gray-700">
                  The URL of your source content — article, landing page, or blog post
                </p>
              </div>

              {/* Canonical Strategy */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-300">Canonical URL Strategy</label>
                <select
                  value={canonicalStrategy}
                  onChange={(e) => setCanonicalStrategy(e.target.value)}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-violet-500/50"
                >
                  <option value="canonical_first">Canonical First (Recommended)</option>
                  <option value="excerpt_only">Excerpt Only</option>
                  <option value="full_copy_allowed">Full Copy Allowed</option>
                </select>
              </div>

              {/* Link Policy */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-300">Max Links per Asset</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={maxLinks}
                    onChange={(e) => setMaxLinks(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-violet-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-300">Anchor Link Style</label>
                  <select
                    value={anchorStyle}
                    onChange={(e) => setAnchorStyle(e.target.value)}
                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-violet-500/50"
                  >
                    <option value="descriptive">Descriptive</option>
                    <option value="branded">Branded</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </div>
              </div>

              {/* Distribution Pacing */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-300">Distribution Pacing</label>
                <div className="grid md:grid-cols-3 gap-3">
                  {[
                    { value: 'conservative', label: 'Conservative', desc: 'Slow rollout' },
                    { value: 'moderate', label: 'Moderate', desc: 'Balanced' },
                    { value: 'aggressive', label: 'Aggressive', desc: 'Max reach' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setDistributionPacing(option.value)}
                      className={`p-3 rounded-xl border transition-all text-left ${
                        distributionPacing === option.value
                          ? 'bg-violet-500/10 border-violet-500/30 shadow-sm'
                          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]'
                      }`}
                    >
                      <p className={`font-semibold text-sm ${distributionPacing === option.value ? 'text-violet-300' : 'text-gray-300'}`}>
                        {option.label}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">{option.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom AI Instructions */}
              <div className="space-y-2 border border-white/[0.06] rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandCustomInstructions(!expandCustomInstructions)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white/[0.01] hover:bg-white/[0.02] transition-all"
                >
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <span className="text-sm font-semibold text-gray-300 flex-1 text-left">Custom AI Instructions</span>
                  <span className="text-xs text-gray-600">{customInstructions.length > 0 ? 'Added' : 'Optional'}</span>
                  {expandCustomInstructions ? (
                    <ChevronUp className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  )}
                </button>
                {expandCustomInstructions && (
                  <div className="px-4 pb-3 space-y-2 border-t border-white/[0.06]">
                    <textarea
                      placeholder="e.g., Focus on our premium membership tier, use testimonials, emphasize community aspect..."
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder-gray-700 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all text-sm resize-none"
                      rows={4}
                    />
                    <p className="text-xs text-gray-700">
                      Provide specific instructions for how Claude should generate assets from your source content
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleStartIngestion}
                  disabled={!sourceUrl.trim()}
                  variant="gold"
                  className="w-full"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Ingestion & Generate Campaign
                </Button>
              </div>
            </>
          ) : (
            <div className="py-10 space-y-8">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <div className="w-6 h-6 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                </div>
                <h3 className="text-xl font-bold mb-1">Building Campaign</h3>
                <p className="text-gray-600 text-sm truncate max-w-sm mx-auto">{sourceUrl}</p>
              </div>

              <div className="space-y-2">
                {STEPS.map((step, idx) => {
                  const isDone = progress.includes(step);
                  const isActive = progress.length === idx;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                        isDone ? 'bg-white/[0.04]' : 'bg-white/[0.01]'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
                      ) : isActive ? (
                        <Loader2 className="w-4 h-4 text-violet-400 animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-white/[0.1] flex-shrink-0" />
                      )}
                      <span className={`text-sm ${isDone ? 'text-gray-300' : 'text-gray-700'}`}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="text-center text-xs text-gray-700">
                Hang tight — this usually takes 10–30 seconds
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
