'use client';

import React, { useState, useRef } from 'react';
import {
  Edit2, CheckCircle2, FileText, MessageSquare, Code2, Rss,
  Copy, Clock, Eye, MoreHorizontal, Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfidenceScore } from './confidence-score';

export interface Asset {
  id: string;
  title: string;
  type: 'article' | 'social' | 'technical' | 'feed';
  excerpt: string;
  bodyMarkdown?: string;
  uniquenessScore: number;
  confidenceScore?: number;
  status: 'draft' | 'generating' | 'ready' | 'approved' | 'published' | 'failed';
  platform?: string;
  scheduledAt?: string;
}

interface AssetCardProps {
  asset: Asset;
  onEdit: (assetId: string) => void;
  onApprove: (assetId: string) => void;
  onDuplicate?: (assetId: string) => void;
  onSchedule?: (assetId: string) => void;
}

export function AssetCard({ asset, onEdit, onApprove, onDuplicate, onSchedule }: AssetCardProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const typeConfig = {
    article: { icon: FileText, label: 'Article', color: 'from-violet-500/20 to-purple-500/20', iconColor: 'text-violet-400' },
    social: { icon: MessageSquare, label: 'Social', color: 'from-teal-500/20 to-emerald-500/20', iconColor: 'text-teal-400' },
    technical: { icon: Code2, label: 'Technical', color: 'from-amber-500/20 to-yellow-500/20', iconColor: 'text-amber-400' },
    feed: { icon: Rss, label: 'Feed', color: 'from-orange-500/20 to-red-500/20', iconColor: 'text-orange-400' },
  };

  const config = typeConfig[asset.type];
  const Icon = config.icon;
  const content = asset.bodyMarkdown || asset.excerpt;
  const confScore = asset.confidenceScore || (50 + Math.floor(asset.uniquenessScore * 0.45));

  const scoreColor =
    asset.uniquenessScore >= 80 ? 'score-bar-high' :
    asset.uniquenessScore >= 60 ? 'score-bar-mid' : 'score-bar-low';

  const scoreTextColor =
    asset.uniquenessScore >= 80 ? 'text-teal-400' :
    asset.uniquenessScore >= 60 ? 'text-amber-400' : 'text-orange-400';

  return (
    <div
      className="glass-card rounded-xl p-5 hover:border-white/[0.12] transition-all duration-300 flex flex-col h-full group relative"
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => { setShowPreview(false); setShowMenu(false); }}
    >
      {/* Hover Preview Tooltip */}
      {showPreview && content.length > 80 && (
        <div
          ref={previewRef}
          className="absolute -top-2 left-full ml-3 z-50 w-80 max-h-64 overflow-y-auto glass-card rounded-xl p-4 border-violet-500/15 shadow-2xl pointer-events-none"
        >
          <div className="flex items-center gap-2 mb-2 border-b border-white/[0.06] pb-2">
            <Eye className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs font-semibold text-violet-300">Preview</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">
            {content.substring(0, 400)}{content.length > 400 ? '…' : ''}
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4 h-4 ${config.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-2 text-gray-100">{asset.title}</h3>
            <p className="text-xs text-gray-600 mt-0.5">
              {config.label}
              {asset.platform && <span className="text-gray-700"> · {asset.platform}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge status={asset.status} size="sm" />
          {/* Menu */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="p-1 rounded-lg text-gray-700 hover:text-gray-400 hover:bg-white/[0.04] transition-all opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 glass-card rounded-xl border-white/[0.1] shadow-2xl z-50 py-1">
                <button
                  onClick={() => { onDuplicate?.(asset.id); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/[0.04] hover:text-white transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Duplicate
                </button>
                <button
                  onClick={() => { onSchedule?.(asset.id); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/[0.04] hover:text-white transition-all"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Schedule
                </button>
                <button
                  onClick={() => { onEdit(asset.id); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/[0.04] hover:text-white transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Improve
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Excerpt */}
      <p className="text-sm text-gray-500 line-clamp-2 mb-3 flex-1 leading-relaxed">
        {asset.excerpt}
      </p>

      {/* Scheduled indicator */}
      {asset.scheduledAt && (
        <div className="flex items-center gap-2 mb-3 px-2.5 py-1.5 rounded-lg bg-violet-500/5 border border-violet-500/10">
          <Clock className="w-3 h-3 text-violet-400" />
          <span className="text-xs text-violet-300">
            Scheduled: {new Date(asset.scheduledAt).toLocaleString()}
          </span>
        </div>
      )}

      {/* Scores */}
      <div className="space-y-2 mb-4">
        {/* Uniqueness */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600 font-medium">Uniqueness</span>
            <span className={`text-xs font-bold ${scoreTextColor}`}>{asset.uniquenessScore}%</span>
          </div>
          <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className={`h-full ${scoreColor} rounded-full transition-all duration-500`}
              style={{ width: `${asset.uniquenessScore}%` }}
            />
          </div>
        </div>
        {/* Confidence */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600 font-medium">Confidence</span>
            <span className={`text-xs font-bold ${
              confScore >= 80 ? 'text-teal-400' : confScore >= 60 ? 'text-amber-400' : 'text-orange-400'
            }`}>
              {confScore}%
            </span>
          </div>
          <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                confScore >= 80 ? 'score-bar-high' : confScore >= 60 ? 'score-bar-mid' : 'score-bar-low'
              }`}
              style={{ width: `${confScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-3 border-t border-white/[0.06]">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(asset.id)}
          className="flex-1 gap-1.5"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Edit
        </Button>
        <Button
          size="sm"
          onClick={() => onApprove(asset.id)}
          disabled={asset.status === 'approved' || asset.status === 'published'}
          className="flex-1 gap-1.5"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Approve
        </Button>
      </div>
    </div>
  );
}
