'use client';

import { useState } from 'react';
import {
  MessageSquare, Heart, MessageCircle, TrendingUp, TrendingDown,
  Plus, X, ExternalLink, Link2, Settings, AlertCircle, CheckCircle2,
  Loader2, Sparkles, Send,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ============ TYPES ============

interface SocialAccount {
  id: string;
  platform: 'linkedin' | 'facebook' | 'twitter' | 'instagram' | 'google' | 'mastodon' | 'bluesky';
  handle: string;
  status: 'connected' | 'disconnected' | 'expired';
  avatarUrl?: string;
}

interface Mention {
  id: string;
  platform: 'twitter' | 'reddit' | 'hacker-news' | 'linkedin' | 'medium' | 'facebook' | 'google';
  author: string;
  content: string;
  timestamp: string;
  sentiment: 'positive' | 'negative';
  engagementCount: number;
  url: string;
}

// ============ CONSTANTS ============

const platformConfig: Record<string, { label: string; color: string; connectUrl: string; instructions: string }> = {
  linkedin: {
    label: 'LinkedIn',
    color: 'from-blue-700 to-blue-800',
    connectUrl: 'https://www.linkedin.com/developers/apps',
    instructions: 'Create a LinkedIn Developer App, enable "Share on LinkedIn" product, then paste your Client ID and Secret.',
  },
  facebook: {
    label: 'Facebook',
    color: 'from-blue-600 to-blue-700',
    connectUrl: 'https://developers.facebook.com/apps',
    instructions: 'Create a Facebook App, add the Pages API product, then generate a Page Access Token.',
  },
  twitter: {
    label: 'X / Twitter',
    color: 'from-gray-700 to-gray-800',
    connectUrl: 'https://developer.twitter.com/en/portal/dashboard',
    instructions: 'Create a Twitter Developer App with OAuth 2.0 and read/write permissions.',
  },
  instagram: {
    label: 'Instagram',
    color: 'from-pink-600 to-purple-600',
    connectUrl: 'https://developers.facebook.com/apps',
    instructions: 'Instagram API access is managed through Facebook Developer Apps. Enable Instagram Basic Display API.',
  },
  google: {
    label: 'Google Reviews',
    color: 'from-red-500 to-yellow-500',
    connectUrl: 'https://business.google.com',
    instructions: 'Connect your Google Business Profile to monitor reviews. Requires Google Business API access.',
  },
  mastodon: {
    label: 'Mastodon',
    color: 'from-purple-600 to-indigo-600',
    connectUrl: 'https://mastodon.social/settings/applications',
    instructions: 'Create an application at your Mastodon instance settings with read:statuses permission.',
  },
  bluesky: {
    label: 'Bluesky',
    color: 'from-sky-500 to-blue-600',
    connectUrl: 'https://bsky.app/settings/app-passwords',
    instructions: 'Create an App Password at bsky.app/settings/app-passwords.',
  },
};

const platformColors: Record<string, string> = {
  twitter: 'from-gray-700 to-gray-800',
  reddit: 'from-orange-600 to-orange-700',
  'hacker-news': 'from-amber-600 to-amber-700',
  linkedin: 'from-blue-700 to-blue-800',
  medium: 'from-slate-700 to-slate-800',
  facebook: 'from-blue-600 to-blue-700',
  google: 'from-red-500 to-yellow-500',
};

const platformLabels: Record<string, string> = {
  twitter: 'X / Twitter',
  reddit: 'Reddit',
  'hacker-news': 'Hacker News',
  linkedin: 'LinkedIn',
  medium: 'Medium',
  facebook: 'Facebook',
  google: 'Google Reviews',
};

// ============ MOCK DATA ============

const mockMentions: Mention[] = [
  {
    id: '1', platform: 'twitter', author: 'Community Member',
    content: 'Just discovered this platform and it\'s amazing! The content distribution features are exactly what I\'ve been looking for.',
    timestamp: '2 hours ago', sentiment: 'positive', engagementCount: 45, url: 'https://twitter.com',
  },
  {
    id: '2', platform: 'linkedin', author: 'Community Member',
    content: 'Impressed with how intuitive the dashboard is. Great UX design and the AI content generation is next level.',
    timestamp: '4 hours ago', sentiment: 'positive', engagementCount: 67, url: 'https://linkedin.com',
  },
  {
    id: '3', platform: 'google', author: 'Community Member',
    content: 'Solid platform for managing multi-channel distribution. Support team is responsive too.',
    timestamp: '6 hours ago', sentiment: 'positive', engagementCount: 12, url: 'https://google.com',
  },
  {
    id: '4', platform: 'facebook', author: 'Community Member',
    content: 'The scheduling feature needs work — it dropped two of my posts this week without notification.',
    timestamp: '8 hours ago', sentiment: 'negative', engagementCount: 23, url: 'https://facebook.com',
  },
  {
    id: '5', platform: 'reddit', author: 'Community Member',
    content: 'Has anyone tried this? Seems like it could be really useful for managing multiple channels.',
    timestamp: '1 day ago', sentiment: 'positive', engagementCount: 23, url: 'https://reddit.com',
  },
  {
    id: '6', platform: 'medium', author: 'Community Member',
    content: 'The onboarding process needs improvement. Took me 30 minutes to understand the basics.',
    timestamp: '1 day ago', sentiment: 'negative', engagementCount: 8, url: 'https://medium.com',
  },
];

// ============ COMPONENTS ============

function ConnectAccountModal({
  onClose,
  onConnect,
}: {
  onClose: () => void;
  onConnect: (platform: string, handle: string) => void;
}) {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [handle, setHandle] = useState('');
  const [token, setToken] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  const config = selectedPlatform ? platformConfig[selectedPlatform] : null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card rounded-2xl max-w-lg w-full border-violet-500/10">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-violet-400" />
            <h3 className="font-bold">Connect Social Account</h3>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Platform Selection */}
          {!selectedPlatform ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">Select a platform to connect:</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(platformConfig).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPlatform(key)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-violet-500/30 hover:bg-white/[0.05] transition-all text-left"
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.color} flex items-center justify-center flex-shrink-0`}>
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-200">{cfg.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedPlatform(null)}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                ← Back to platforms
              </button>

              <div className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${config!.color} bg-opacity-20`}>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config!.color} flex items-center justify-center`}>
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-100">{config!.label}</p>
                  <p className="text-xs text-gray-400">{config!.instructions}</p>
                </div>
              </div>

              {/* Credential fields based on platform */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                    {selectedPlatform === 'linkedin' || selectedPlatform === 'facebook' || selectedPlatform === 'instagram'
                      ? 'Page / Profile URL or Handle'
                      : 'Handle / Username'}
                  </label>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder={selectedPlatform === 'linkedin' ? 'linkedin.com/company/yourcompany' : '@yourhandle'}
                    className="w-full px-3 py-2.5 text-sm bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-100 placeholder-gray-700 focus:outline-none focus:border-violet-500/50"
                  />
                </div>

                {(selectedPlatform === 'linkedin' || selectedPlatform === 'facebook' || selectedPlatform === 'instagram') && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5">Client ID</label>
                      <input
                        type="text"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder="Your app Client ID"
                        className="w-full px-3 py-2.5 text-sm bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-100 placeholder-gray-700 focus:outline-none focus:border-violet-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5">Client Secret</label>
                      <input
                        type="password"
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        placeholder="Your app Client Secret"
                        className="w-full px-3 py-2.5 text-sm bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-100 placeholder-gray-700 focus:outline-none focus:border-violet-500/50"
                      />
                    </div>
                  </>
                )}

                {(selectedPlatform === 'twitter' || selectedPlatform === 'mastodon' || selectedPlatform === 'bluesky' || selectedPlatform === 'google') && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                      {selectedPlatform === 'bluesky' ? 'App Password' : 'Access Token'}
                    </label>
                    <input
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder={selectedPlatform === 'bluesky' ? 'Your Bluesky app password' : 'Your access token'}
                      className="w-full px-3 py-2.5 text-sm bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-100 placeholder-gray-700 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                )}
              </div>

              {/* Help link */}
              <a
                href={config!.connectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-violet-400 hover:text-violet-300 transition-colors p-3 rounded-lg bg-violet-500/5 border border-violet-500/10"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open {config!.label} developer setup in browser
              </a>

              <div className="flex gap-2 pt-2">
                <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
                <Button
                  variant="gold"
                  className="flex-1 gap-2"
                  disabled={!handle.trim()}
                  onClick={() => {
                    onConnect(selectedPlatform, handle);
                    onClose();
                  }}
                >
                  <Link2 className="w-4 h-4" />
                  Connect
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReplyModal({
  mention,
  onClose,
  accounts,
}: {
  mention: Mention;
  onClose: () => void;
  accounts: SocialAccount[];
}) {
  const [replyText, setReplyText] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(
    accounts.find((a) => a.platform === mention.platform)?.id || ''
  );
  const [generating, setGenerating] = useState(false);

  const handleGenerateReply = async () => {
    setGenerating(true);
    // Simulate AI generating a response
    setTimeout(() => {
      if (mention.sentiment === 'negative') {
        setReplyText(
          `Thank you for your feedback! We appreciate you taking the time to share your experience. We're actively working on improvements in this area and would love to hear more details. Could you send us a DM so we can resolve this for you?`
        );
      } else {
        setReplyText(
          `Thank you so much for the kind words! We're thrilled to hear you're enjoying the platform. If there's anything else we can help with, don't hesitate to reach out!`
        );
      }
      setGenerating(false);
    }, 1200);
  };

  const matchingAccounts = accounts.filter((a) => a.status === 'connected');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card rounded-2xl max-w-lg w-full border-violet-500/10">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-violet-400" />
            <h3 className="font-bold">Reply to Mention</h3>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Original mention */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-xs text-gray-500 mb-1">{platformLabels[mention.platform]} — {mention.author}</p>
            <p className="text-sm text-gray-300">{mention.content}</p>
          </div>

          {/* Reply as */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Reply as</label>
            {matchingAccounts.length > 0 ? (
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-100 focus:outline-none focus:border-violet-500/50"
              >
                {matchingAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {platformConfig[a.platform]?.label || a.platform} — {a.handle}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <p className="text-xs text-amber-300">Connect a social account first to reply directly.</p>
              </div>
            )}
          </div>

          {/* Reply text */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-400">Your Reply</label>
              <button
                onClick={handleGenerateReply}
                disabled={generating}
                className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-50"
              >
                {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                AI Draft Response
              </button>
            </div>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              rows={4}
              className="w-full px-3 py-2.5 text-sm bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-100 placeholder-gray-700 focus:outline-none focus:border-violet-500/50 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              variant="gold"
              className="flex-1 gap-2"
              disabled={!replyText.trim() || !selectedAccount}
            >
              <Send className="w-4 h-4" />
              Send Reply
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MentionCard({
  mention,
  onReply,
}: {
  mention: Mention;
  onReply: (mention: Mention) => void;
}) {
  const isSentimentPositive = mention.sentiment === 'positive';

  return (
    <div className="glass-card border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.08] hover:bg-white/[0.04] transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${platformColors[mention.platform] || 'from-gray-600 to-gray-700'} flex items-center justify-center flex-shrink-0`}>
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-300">{mention.author}</p>
            <p className="text-xs text-gray-600">{platformLabels[mention.platform] || mention.platform}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
          isSentimentPositive
            ? 'bg-teal-500/15 text-teal-400'
            : 'bg-red-500/15 text-red-400'
        }`}>
          {isSentimentPositive ? (
            <><TrendingUp className="w-3 h-3" /> Positive</>
          ) : (
            <><TrendingDown className="w-3 h-3" /> Needs Response</>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-300 mb-3 leading-relaxed">{mention.content}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5" />
            {mention.engagementCount}
          </div>
          <span>{mention.timestamp}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onReply(mention)}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-white/[0.03] text-gray-400 hover:text-gray-200 hover:bg-white/[0.05] border border-white/[0.08] transition-all flex items-center gap-1"
          >
            <MessageCircle className="w-3 h-3" />
            Reply
          </button>
          <a
            href={mention.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 text-xs rounded-lg bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border border-violet-500/30 transition-all font-medium flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            View
          </a>
        </div>
      </div>
    </div>
  );
}

// ============ MAIN PAGE ============

export default function SocialListeningPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'positive' | 'negative'>('all');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Mention | null>(null);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);

  const positiveCount = mockMentions.filter((m) => m.sentiment === 'positive').length;
  const negativeCount = mockMentions.filter((m) => m.sentiment === 'negative').length;

  const filtered = activeTab === 'all'
    ? mockMentions
    : mockMentions.filter((m) => m.sentiment === activeTab);

  const handleConnectAccount = (platform: string, handle: string) => {
    const newAccount: SocialAccount = {
      id: `acct-${Date.now()}`,
      platform: platform as SocialAccount['platform'],
      handle,
      status: 'connected',
    };
    setAccounts([...accounts, newAccount]);
  };

  const handleDisconnect = (accountId: string) => {
    setAccounts(accounts.filter((a) => a.id !== accountId));
  };

  return (
    <div className="space-y-8">
      {/* Modals */}
      {showConnectModal && (
        <ConnectAccountModal
          onClose={() => setShowConnectModal(false)}
          onConnect={handleConnectAccount}
        />
      )}
      {replyingTo && (
        <ReplyModal
          mention={replyingTo}
          onClose={() => setReplyingTo(null)}
          accounts={accounts}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-gray-100">Social Listening</h1>
          <p className="text-gray-600">
            Monitor mentions and respond to conversations across your linked social accounts
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-500/10 border border-teal-500/20">
              <TrendingUp className="w-4 h-4 text-teal-400" />
              <span className="text-teal-400 font-semibold">{positiveCount}</span>
              <span className="text-gray-600">Positive</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <span className="text-red-400 font-semibold">{negativeCount}</span>
              <span className="text-gray-600">Needs Response</span>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Accounts Section */}
      <div className="glass-card rounded-xl px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-bold text-gray-200">Connected Accounts</h2>
            <span className="text-xs text-gray-600">({accounts.length} linked)</span>
          </div>
          <Button
            variant="gold"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setShowConnectModal(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Connect Account
          </Button>
        </div>

        {accounts.length === 0 ? (
          <div className="py-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center mx-auto mb-3">
              <Link2 className="w-5 h-5 text-violet-400" />
            </div>
            <p className="text-sm text-gray-500 mb-1">No accounts connected yet</p>
            <p className="text-xs text-gray-700 mb-4">
              Link your social media accounts to enable real-time mention monitoring and in-app replies
            </p>
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setShowConnectModal(true)}>
              <Plus className="w-3.5 h-3.5" />
              Connect Your First Account
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {accounts.map((account) => {
              const cfg = platformConfig[account.platform];
              return (
                <div
                  key={account.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg?.color || 'from-gray-600 to-gray-700'} flex items-center justify-center flex-shrink-0`}>
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-200 truncate">{account.handle}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-600">{cfg?.label || account.platform}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      <span className="text-[10px] text-teal-400">Connected</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDisconnect(account.id)}
                    className="text-gray-700 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tab Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'all'
              ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
              : 'bg-white/[0.03] text-gray-600 border border-white/[0.06] hover:bg-white/[0.04] hover:text-gray-100'
          }`}
        >
          All Mentions
          <span className="ml-2 text-xs opacity-70">({mockMentions.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('positive')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'positive'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
              : 'bg-white/[0.03] text-gray-600 border border-white/[0.06] hover:bg-white/[0.04] hover:text-gray-100'
          }`}
        >
          Positive
          <span className="ml-2 text-xs opacity-70">({positiveCount})</span>
        </button>
        <button
          onClick={() => setActiveTab('negative')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'negative'
              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
              : 'bg-white/[0.03] text-gray-600 border border-white/[0.06] hover:bg-white/[0.04] hover:text-gray-100'
          }`}
        >
          Needs Response
          <span className="ml-2 text-xs opacity-70">({negativeCount})</span>
        </button>
      </div>

      {/* Mentions Grid */}
      <div className="space-y-4">
        {filtered.map((mention) => (
          <MentionCard
            key={mention.id}
            mention={mention}
            onReply={(m) => setReplyingTo(m)}
          />
        ))}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="glass-card border border-white/[0.06] rounded-xl p-12 text-center">
          <MessageSquare className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No mentions found</p>
          <p className="text-xs text-gray-700">
            Mentions will appear here as people discuss your content on social platforms
          </p>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="glass-card border border-blue-500/20 rounded-xl p-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
        <div className="flex items-start gap-3">
          <MessageCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-400 mb-1">Privacy-First Monitoring</p>
            <p className="text-sm text-gray-600">
              We display generic labels instead of real names to protect privacy. Use "View" to see the original post. Replies are sent through your connected accounts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
