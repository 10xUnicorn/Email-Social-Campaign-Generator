'use client';

import { useState } from 'react';
import {
  TrendingUp, AlertTriangle, CheckCircle2, Sparkles, ChevronDown,
  ChevronUp, Lightbulb, Target, Zap, MessageSquare, Loader2,
} from 'lucide-react';

interface Suggestion {
  id: string;
  type: 'improve' | 'warning' | 'boost';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  autoFix?: string; // If provided, can be applied automatically
}

interface ConfidenceScoreProps {
  score: number; // 0-100
  title: string;
  platform: string;
  content: string;
  onApplySuggestion?: (suggestion: Suggestion) => void;
  onAutoFix?: (suggestionId: string) => void;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-teal-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-red-400';
}

function getScoreGlow(score: number): string {
  if (score >= 80) return 'shadow-teal-500/20';
  if (score >= 60) return 'shadow-amber-500/20';
  return 'shadow-red-500/20';
}

function getScoreBarColor(score: number): string {
  if (score >= 80) return 'from-teal-500 to-emerald-400';
  if (score >= 60) return 'from-amber-500 to-yellow-400';
  return 'from-red-500 to-orange-400';
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Strong';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Needs Work';
  return 'Weak';
}

function generateSuggestions(content: string, platform: string, title: string): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const hasLinks = /\[.+?\]\(.+?\)/.test(content) || /https?:\/\//.test(content);
  const hasHeadings = /^#{1,3}\s/.test(content);
  const hasImages = /!\[/.test(content);
  const hasCTA = /(learn more|sign up|get started|try|click|visit|check out|subscribe)/i.test(content);
  const hasEmoji = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}]/u.test(content);

  // Title analysis
  if (title.length < 20) {
    suggestions.push({
      id: 'title-short',
      type: 'warning',
      title: 'Title too short',
      description: 'Headlines with 40-60 characters get the highest CTR. Consider making yours more descriptive.',
      impact: 'high',
    });
  }

  // Content length
  if (platform === 'wordpress' || platform === 'medium' || platform === 'forem-dev') {
    if (wordCount < 300) {
      suggestions.push({
        id: 'content-short',
        type: 'improve',
        title: 'Content is thin',
        description: `Articles under 300 words underperform on ${platform}. Aim for 800-1500 words for best engagement.`,
        impact: 'high',
      });
    }
  }

  if ((platform === 'mastodon' || platform === 'bluesky') && wordCount > 100) {
    suggestions.push({
      id: 'content-long-social',
      type: 'warning',
      title: 'Content may be too long',
      description: 'Social posts perform best when punchy and concise. Consider trimming to the core message.',
      impact: 'medium',
    });
  }

  // CTA
  if (!hasCTA) {
    suggestions.push({
      id: 'no-cta',
      type: 'improve',
      title: 'Add a call-to-action',
      description: 'Content without a clear CTA gets 30% less engagement. Add a specific ask — visit, subscribe, reply, etc.',
      impact: 'high',
    });
  }

  // Structure
  if (!hasHeadings && wordCount > 200) {
    suggestions.push({
      id: 'no-headings',
      type: 'improve',
      title: 'Add section headings',
      description: 'Breaking content into sections with H2/H3 headings improves readability and SEO by 40%.',
      impact: 'medium',
    });
  }

  // Links
  if (!hasLinks) {
    suggestions.push({
      id: 'no-links',
      type: 'improve',
      title: 'Include a link',
      description: 'At minimum, link back to the source canonical URL for attribution and traffic.',
      impact: 'medium',
    });
  }

  // Images
  if (!hasImages && (platform === 'wordpress' || platform === 'medium')) {
    suggestions.push({
      id: 'no-images',
      type: 'boost',
      title: 'Add a featured image',
      description: 'Articles with images get 94% more views. Add at least one relevant image.',
      impact: 'high',
    });
  }

  // Social emoji
  if (!hasEmoji && (platform === 'mastodon' || platform === 'bluesky' || platform === 'linkedin')) {
    suggestions.push({
      id: 'no-emoji',
      type: 'boost',
      title: 'Add emoji for engagement',
      description: 'Social posts with 1-3 relevant emoji see 25% higher engagement rates.',
      impact: 'low',
    });
  }

  // Opening hook
  const firstLine = content.split('\n').find((l) => l.trim().length > 0) || '';
  if (firstLine.length > 0 && !firstLine.endsWith('?') && !firstLine.includes('!') && wordCount > 50) {
    suggestions.push({
      id: 'weak-hook',
      type: 'improve',
      title: 'Strengthen the opening hook',
      description: 'Start with a question, surprising stat, or bold statement. The first sentence determines if people keep reading.',
      impact: 'high',
    });
  }

  // Always show at least one positive
  if (suggestions.length === 0 || suggestions.every((s) => s.type === 'boost')) {
    suggestions.unshift({
      id: 'looks-good',
      type: 'boost',
      title: 'Content looks strong',
      description: 'Good structure, clear messaging, and solid formatting. Ready to publish with confidence.',
      impact: 'low',
    });
  }

  return suggestions;
}

function calculateScore(content: string, platform: string, title: string): number {
  let score = 50;
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  // Content length scoring
  if (wordCount >= 300) score += 10;
  if (wordCount >= 600) score += 5;
  if (wordCount >= 1000) score += 5;

  // Structure
  if (/^#{1,3}\s/m.test(content)) score += 8;
  if (/\[.+?\]\(.+?\)/.test(content)) score += 7;
  if (/!\[/.test(content)) score += 5;
  if (/(learn more|sign up|get started|try|click|visit)/i.test(content)) score += 8;

  // Title quality
  if (title.length >= 30 && title.length <= 70) score += 7;
  if (title.length >= 20) score += 3;

  // Platform-specific
  if ((platform === 'mastodon' || platform === 'bluesky') && wordCount <= 80) score += 5;
  if ((platform === 'wordpress' || platform === 'medium') && wordCount >= 500) score += 5;

  return Math.min(100, Math.max(10, score));
}

export function ConfidenceScore({ score: overrideScore, title, platform, content, onApplySuggestion, onAutoFix }: ConfidenceScoreProps) {
  const [expanded, setExpanded] = useState(false);
  const [autoFixing, setAutoFixing] = useState<string | null>(null);

  const score = overrideScore || calculateScore(content, platform, title);
  const suggestions = generateSuggestions(content, platform, title);
  const highImpactCount = suggestions.filter((s) => s.impact === 'high').length;

  const handleAutoFix = async (suggestionId: string) => {
    setAutoFixing(suggestionId);
    try {
      if (onAutoFix) {
        onAutoFix(suggestionId);
      }
    } finally {
      setAutoFixing(null);
    }
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Score Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-all"
      >
        {/* Score Ring */}
        <div className={`relative w-14 h-14 flex-shrink-0`}>
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18" cy="18" r="15.9"
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="2.5"
            />
            <circle
              cx="18" cy="18" r="15.9"
              fill="none"
              className={`${score >= 80 ? 'stroke-teal-400' : score >= 60 ? 'stroke-amber-400' : 'stroke-red-400'}`}
              strokeWidth="2.5"
              strokeDasharray={`${score} ${100 - score}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-sm font-bold ${getScoreColor(score)}`}>{score}</span>
          </div>
        </div>

        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-200">Confidence Score</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              score >= 80 ? 'bg-teal-500/10 text-teal-400' :
              score >= 60 ? 'bg-amber-500/10 text-amber-400' :
              'bg-red-500/10 text-red-400'
            }`}>
              {getScoreLabel(score)}
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-0.5">
            {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
            {highImpactCount > 0 && ` · ${highImpactCount} high impact`}
          </p>
        </div>

        <div className="text-gray-600">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Score bar */}
      <div className="px-5 pb-3">
        <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getScoreBarColor(score)} rounded-full transition-all duration-700`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Suggestions (expanded) */}
      {expanded && (
        <div className="border-t border-white/[0.06] px-5 py-4 space-y-3">
          {suggestions.map((s) => {
            const IconMap = {
              improve: Lightbulb,
              warning: AlertTriangle,
              boost: Zap,
            };
            const Icon = IconMap[s.type];
            const colorMap = {
              improve: 'text-violet-400 bg-violet-500/10',
              warning: 'text-amber-400 bg-amber-500/10',
              boost: 'text-teal-400 bg-teal-500/10',
            };

            return (
              <div
                key={s.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all"
              >
                <div className={`w-7 h-7 rounded-lg ${colorMap[s.type]} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-gray-200">{s.title}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      s.impact === 'high' ? 'text-red-400' :
                      s.impact === 'medium' ? 'text-amber-400' :
                      'text-gray-600'
                    }`}>
                      {s.impact}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{s.description}</p>
                  {(s.type === 'improve' || s.type === 'warning') && (
                    <button
                      onClick={() => handleAutoFix(s.id)}
                      disabled={autoFixing === s.id}
                      className="mt-2 text-xs px-2 py-1 rounded-md bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {autoFixing === s.id ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Fixing...
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Auto-Fix
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
