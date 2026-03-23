'use client';

import { useState } from 'react';
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  Settings,
  Plus,
  Zap,
  BookOpen,
  MessageSquare,
  Rss,
  Search,
  FileText,
  Users,
  Info,
  X,
  ChevronRight,
  Wand2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type DestinationCategory = 'all' | 'api' | 'feed' | 'assisted';

interface SetupStep {
  title: string;
  description: string;
  action?: string;
}

interface Destination {
  id: string;
  name: string;
  description: string;
  category: 'api' | 'feed' | 'assisted';
  icon: React.ElementType;
  status: 'active' | 'needs_setup' | 'coming_soon';
  setupUrl?: string;
  credentialHelpUrl?: string;
  setupSteps?: SetupStep[];
  color: string;
}

const destinations: Destination[] = [
  // API Destinations
  {
    id: 'wordpress',
    name: 'WordPress',
    description: 'Publish posts to any WordPress site via REST API',
    category: 'api',
    icon: Globe,
    status: 'needs_setup',
    credentialHelpUrl: 'https://yourdomain.com/wp-admin/users.php',
    setupSteps: [
      { title: 'Navigate to your WordPress admin', description: 'Go to yourdomain.com/wp-admin' },
      { title: 'Create an Application Password', description: 'Visit Users → Your Profile → Application Passwords' },
      { title: 'Copy the generated password', description: 'Paste it below to authenticate' },
      { title: 'Test the connection', description: 'Click Save & Test Connection to verify' },
    ],
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'ghost',
    name: 'Ghost',
    description: 'Publish articles to Ghost-powered blogs',
    category: 'api',
    icon: BookOpen,
    status: 'needs_setup',
    credentialHelpUrl: 'https://yourdomain.com/ghost/#/settings/integrations',
    setupSteps: [
      { title: 'Open Ghost admin panel', description: 'Navigate to yourdomain.com/ghost' },
      { title: 'Go to Settings → Integrations', description: 'Click Custom Integrations' },
      { title: 'Create new integration', description: 'Give it a name and enable publishing' },
      { title: 'Copy your Admin API key', description: 'Use it in the form below' },
    ],
    color: 'from-gray-600 to-gray-800'
  },
  {
    id: 'forem-dev',
    name: 'DEV.to / Forem',
    description: 'Publish technical articles to DEV Community',
    category: 'api',
    icon: MessageSquare,
    status: 'needs_setup',
    credentialHelpUrl: 'https://dev.to/settings/extensions',
    setupSteps: [
      { title: 'Log in to DEV.to', description: 'Go to dev.to/settings/extensions' },
      { title: 'Create an API Key', description: 'Click "Generate API Key" button' },
      { title: 'Copy your API token', description: 'Paste it in the field below' },
      { title: 'Verify publishing permissions', description: 'Test a connection to ensure access' },
    ],
    color: 'from-slate-700 to-slate-900'
  },
  { id: 'hashnode', name: 'Hashnode', description: 'Publish developer blog posts to Hashnode', category: 'api', icon: BookOpen, status: 'needs_setup', color: 'from-blue-600 to-indigo-600' },
  { id: 'blogger', name: 'Blogger', description: 'Publish posts to Google Blogger', category: 'api', icon: FileText, status: 'needs_setup', color: 'from-orange-500 to-red-500' },
  {
    id: 'mastodon',
    name: 'Mastodon',
    description: 'Post to any Mastodon instance',
    category: 'api',
    icon: MessageSquare,
    status: 'needs_setup',
    credentialHelpUrl: 'https://mastodon.social/settings/applications',
    setupSteps: [
      { title: 'Open your Mastodon instance', description: 'Log in to your-instance' },
      { title: 'Navigate to Settings → Applications', description: 'Create a new application' },
      { title: 'Grant permissions', description: 'Enable write:statuses permission' },
      { title: 'Copy your access token', description: 'Use it below for authentication' },
    ],
    color: 'from-purple-600 to-indigo-600'
  },
  {
    id: 'bluesky',
    name: 'Bluesky',
    description: 'Post threads and links to Bluesky',
    category: 'api',
    icon: MessageSquare,
    status: 'needs_setup',
    credentialHelpUrl: 'https://bsky.app/settings/app-passwords',
    setupSteps: [
      { title: 'Go to Bluesky settings', description: 'Visit https://bsky.app/settings/app-passwords' },
      { title: 'Create an App Password', description: 'Click "Add App Password" button' },
      { title: 'Copy the generated password', description: 'Paste it in the form below' },
      { title: 'Test publishing', description: 'Save and verify the connection' },
    ],
    color: 'from-sky-500 to-blue-600'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Post articles and updates to LinkedIn',
    category: 'api',
    icon: Users,
    status: 'needs_setup',
    credentialHelpUrl: 'https://www.linkedin.com/developers/apps',
    setupSteps: [
      { title: 'Create a LinkedIn App', description: 'Visit https://www.linkedin.com/developers/apps and click "Create App"' },
      { title: 'Add required products', description: 'Go to the Products tab and request "Share on LinkedIn" and "Sign In with LinkedIn using OpenID Connect"' },
      { title: 'Copy Client ID & Secret', description: 'Go to Auth tab → copy your Client ID and Client Secret' },
      { title: 'Set redirect URI', description: 'Add your redirect URI in the Auth tab (e.g. https://yourapp.com/api/auth/linkedin/callback)' },
      { title: 'Enter credentials', description: 'Paste Client ID, Client Secret, and Redirect URI in the form below' },
    ],
    color: 'from-blue-700 to-blue-800'
  },
  { id: 'tumblr', name: 'Tumblr', description: 'Publish posts to Tumblr blogs', category: 'api', icon: FileText, status: 'needs_setup', color: 'from-indigo-600 to-blue-700' },
  // Feed / Index
  { id: 'indexnow', name: 'IndexNow', description: 'Instantly notify search engines of new content', category: 'feed', icon: Search, status: 'active', color: 'from-green-500 to-emerald-600' },
  { id: 'rss', name: 'RSS Generator', description: 'Auto-generate RSS feed for your campaigns', category: 'feed', icon: Rss, status: 'active', color: 'from-orange-400 to-amber-500' },
  {
    id: 'search-console',
    name: 'Google Search Console',
    description: 'Submit URLs directly to Google indexing API',
    category: 'feed',
    icon: Search,
    status: 'needs_setup',
    credentialHelpUrl: 'https://search.google.com/search-console',
    setupSteps: [
      { title: 'Visit Google Search Console', description: 'Go to https://search.google.com/search-console' },
      { title: 'Add or verify your site', description: 'Select your domain property' },
      { title: 'Generate API credentials', description: 'Create a service account in Google Cloud' },
      { title: 'Configure authentication', description: 'Add your credentials below' },
    ],
    color: 'from-blue-500 to-blue-700'
  },
  {
    id: 'bing',
    name: 'Bing URL Submission',
    description: 'Submit URLs to Bing Webmaster Tools',
    category: 'feed',
    icon: Search,
    status: 'needs_setup',
    credentialHelpUrl: 'https://www.bing.com/webmasters',
    setupSteps: [
      { title: 'Go to Bing Webmaster Tools', description: 'Visit https://www.bing.com/webmasters and sign in' },
      { title: 'Add your site', description: 'Click "Add a Site" and verify ownership' },
      { title: 'Get your API key', description: 'Navigate to Settings → API Access → API Key' },
      { title: 'Paste your key below', description: 'Save and test the connection' },
    ],
    color: 'from-sky-400 to-blue-500',
  },
  // Assisted
  {
    id: 'medium',
    name: 'Medium',
    description: 'Generate pre-filled Medium draft submission pack',
    category: 'assisted',
    icon: BookOpen,
    status: 'active',
    credentialHelpUrl: 'https://medium.com/me/settings/security',
    setupSteps: [
      { title: 'Get your Integration Token', description: 'Visit https://medium.com/me/settings/security' },
      { title: 'Generate token', description: 'Click "Generate new token"' },
      { title: 'Save your token', description: 'Store it securely for later use' },
    ],
    color: 'from-gray-800 to-gray-900'
  },
  { id: 'prlog', name: 'PRLog', description: 'Generate press release pack for PRLog submission', category: 'assisted', icon: FileText, status: 'active', color: 'from-blue-500 to-blue-700' },
  { id: 'openpr', name: 'openPR', description: 'Format press releases for openPR distribution', category: 'assisted', icon: FileText, status: 'active', color: 'from-indigo-500 to-purple-600' },
  { id: '1888pressrelease', name: '1888PressRelease', description: 'Submit to 1888PressRelease directory', category: 'assisted', icon: FileText, status: 'active', color: 'from-red-500 to-rose-600' },
  { id: 'reddit', name: 'Reddit', description: 'Generate formatted Reddit post packs', category: 'assisted', icon: Users, status: 'active', color: 'from-orange-600 to-red-600' },
  { id: 'hackernews', name: 'Hacker News', description: 'Draft HN Show HN / Ask HN submission pack', category: 'assisted', icon: Zap, status: 'active', color: 'from-orange-500 to-amber-500' },
  { id: 'producthunt', name: 'Product Hunt', description: 'Generate Product Hunt launch kit', category: 'assisted', icon: Zap, status: 'coming_soon', color: 'from-orange-400 to-rose-500' },
];

const categoryLabels: Record<DestinationCategory, string> = {
  all: 'All Destinations',
  api: 'API (Auto-Publish)',
  feed: 'Feed & Index',
  assisted: 'Assisted Submission',
};

// Setup Modal Component
function SetupWizardModal({ destination, onClose }: { destination: Destination; onClose: () => void }) {
  const [step, setStep] = useState(0);

  if (!destination.setupSteps) return null;

  const currentStep = destination.setupSteps[step];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.08] rounded-2xl p-8 max-w-lg w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-100">Setup {destination.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">
              Step {step + 1} of {destination.setupSteps.length}
            </p>
            <div className="text-xs text-gray-500">
              {Math.round(((step + 1) / destination.setupSteps.length) * 100)}%
            </div>
          </div>
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all"
              style={{ width: `${((step + 1) / destination.setupSteps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-100 mb-3">{currentStep.title}</h3>
          <p className="text-sm text-gray-400 leading-relaxed mb-4">{currentStep.description}</p>
          {currentStep.action && (
            <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              💡 {currentStep.action}
            </p>
          )}
        </div>

        {/* Help link */}
        {destination.credentialHelpUrl && step === 1 && (
          <div className="mb-8 p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl">
            <a
              href={destination.credentialHelpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-2 transition-colors"
            >
              Get your {destination.name} credentials
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/[0.1] text-gray-300 hover:bg-white/[0.04] transition-colors"
            >
              Back
            </button>
          )}
          {step < destination.setupSteps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 transition-all"
            >
              Next
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-gray-900 hover:from-amber-400 hover:to-orange-400 transition-all font-semibold"
            >
              Complete Setup
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Info Bubble Component
function InfoBubble({ destination }: { destination: Destination }) {
  const [showTooltip, setShowTooltip] = useState(false);

  let helpText = '';
  if (destination.id === 'wordpress') {
    helpText = 'Publish posts to your WordPress site using REST API authentication. Get your Application Password at yourdomain.com/wp-admin/users.php';
  } else if (destination.id === 'ghost') {
    helpText = 'Publish articles to Ghost CMS. Get your Admin API key at yourdomain.com/ghost/#/settings/integrations';
  } else if (destination.id === 'forem-dev') {
    helpText = 'Post articles to DEV Community (Forem). Get your API key at https://dev.to/settings/extensions';
  } else if (destination.id === 'mastodon') {
    helpText = 'Post to any Mastodon instance. Create an app at your-instance/settings/applications';
  } else if (destination.id === 'bluesky') {
    helpText = 'Use your App Password from https://bsky.app/settings/app-passwords';
  } else if (destination.id === 'linkedin') {
    helpText = 'Create an OAuth app at https://www.linkedin.com/developers/apps for publishing';
  } else if (destination.id === 'medium') {
    helpText = 'Generate your Integration Token at https://medium.com/me/settings/security';
  } else if (destination.id === 'search-console') {
    helpText = 'Verify your site at https://search.google.com/search-console';
  }

  if (!helpText) return null;

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="text-gray-600 hover:text-gray-400 transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {showTooltip && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-950 border border-white/[0.1] rounded-lg p-3 w-64 z-40 shadow-xl">
          <p className="text-xs text-gray-300 leading-relaxed">{helpText}</p>
          <div className="absolute right-full w-2 h-2 bg-gray-950 border-t border-l border-white/[0.1] top-1/2 -translate-y-1/2 -translate-x-1" />
        </div>
      )}
    </div>
  );
}

// Custom Destination Builder Modal
function CustomDestinationModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [authType, setAuthType] = useState('api_key');
  const [format, setFormat] = useState('json');
  const [docsUrl, setDocsUrl] = useState('');
  const [method, setMethod] = useState('POST');
  const [headers, setHeaders] = useState('');
  const [body, setBody] = useState('');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-white/[0.08] rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-100">Add Custom Destination</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('simple')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'simple'
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'bg-white/[0.03] text-gray-600 border border-white/[0.08]'
            }`}
          >
            Basic Setup
          </button>
          <button
            onClick={() => setMode('advanced')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'advanced'
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'bg-white/[0.03] text-gray-600 border border-white/[0.08]'
            }`}
          >
            Advanced
          </button>
        </div>

        {mode === 'simple' && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-2 block">Destination Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., My Blog Platform"
                className="w-full px-3 py-2.5 text-sm bg-white/[0.03] border border-white/[0.08] rounded-lg text-gray-100 placeholder-gray-700 focus:outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-2 block">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this destination do?"
                className="w-full px-3 py-2.5 text-sm bg-white/[0.03] border border-white/[0.08] rounded-lg text-gray-100 placeholder-gray-700 focus:outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-2 block">API Endpoint URL</label>
              <input
                type="url"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://api.example.com/publish"
                className="w-full px-3 py-2.5 text-sm bg-white/[0.03] border border-white/[0.08] rounded-lg text-gray-100 placeholder-gray-700 focus:outline-none focus:border-violet-500/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block">Authentication Type</label>
                <select
                  value={authType}
                  onChange={(e) => setAuthType(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-white/[0.03] border border-white/[0.08] rounded-lg text-gray-100 focus:outline-none focus:border-violet-500/50"
                >
                  <option value="api_key">API Key</option>
                  <option value="oauth">OAuth</option>
                  <option value="basic">Basic Auth</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block">Content Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-white/[0.03] border border-white/[0.08] rounded-lg text-gray-100 focus:outline-none focus:border-violet-500/50"
                >
                  <option value="json">JSON</option>
                  <option value="markdown">Markdown</option>
                  <option value="html">HTML</option>
                  <option value="plaintext">Plain Text</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-2 block">API Documentation URL (for AI assist)</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={docsUrl}
                  onChange={(e) => setDocsUrl(e.target.value)}
                  placeholder="https://api.example.com/docs"
                  className="flex-1 px-3 py-2.5 text-sm bg-white/[0.03] border border-white/[0.08] rounded-lg text-gray-100 placeholder-gray-700 focus:outline-none focus:border-violet-500/50"
                />
                <button className="px-4 py-2.5 rounded-lg bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 transition-all text-sm font-medium flex items-center gap-2">
                  <Wand2 className="w-4 h-4" />
                  AI Assist
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === 'advanced' && (
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block">HTTP Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-white/[0.03] border border-white/[0.08] rounded-lg text-gray-100 focus:outline-none focus:border-violet-500/50"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-2 block">Headers Template (JSON)</label>
              <textarea
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                placeholder={'{"Authorization": "Bearer {api_key}", "Content-Type": "application/json"}'}
                className="w-full px-3 py-2.5 text-xs bg-white/[0.03] border border-white/[0.08] rounded-lg text-gray-100 placeholder-gray-700 focus:outline-none focus:border-violet-500/50 font-mono h-24"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-2 block">Body Template</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={'{"title": "{title}", "content": "{content}"}'}
                className="w-full px-3 py-2.5 text-xs bg-white/[0.03] border border-white/[0.08] rounded-lg text-gray-100 placeholder-gray-700 focus:outline-none focus:border-violet-500/50 font-mono h-24"
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/[0.1] text-gray-300 hover:bg-white/[0.04] transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!name || !endpoint}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-gray-900 hover:from-amber-400 hover:to-orange-400 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Destination
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DestinationsPage() {
  const [activeCategory, setActiveCategory] = useState<DestinationCategory>('all');
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [setupWizard, setSetupWizard] = useState<string | null>(null);
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [hoveredInfo, setHoveredInfo] = useState<string | null>(null);

  const filtered = activeCategory === 'all'
    ? destinations
    : destinations.filter((d) => d.category === activeCategory);

  const activeCt = destinations.filter((d) => d.status === 'active').length;
  const needsSetupCt = destinations.filter((d) => d.status === 'needs_setup').length;

  const setupWizardDest = setupWizard ? destinations.find((d) => d.id === setupWizard) : null;

  return (
    <div className="space-y-8">
      {/* Setup Wizard Modal */}
      {setupWizardDest && (
        <SetupWizardModal destination={setupWizardDest} onClose={() => setSetupWizard(null)} />
      )}

      {/* Custom Destination Modal */}
      {showCustomBuilder && (
        <CustomDestinationModal onClose={() => setShowCustomBuilder(false)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-gray-100">Destinations</h1>
          <p className="text-gray-600">
            Connect platforms to enable one-click publishing across your distribution network
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-teal-400">
            <CheckCircle2 className="w-4 h-4" />
            {activeCt} active
          </div>
          <div className="flex items-center gap-2 text-sm text-amber-400">
            <AlertCircle className="w-4 h-4" />
            {needsSetupCt} needs setup
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(categoryLabels) as DestinationCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeCategory === cat
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'bg-white/[0.03] text-gray-600 border border-white/[0.06] hover:bg-white/[0.04] hover:text-gray-100'
            }`}
          >
            {categoryLabels[cat]}
            <span className="ml-2 text-xs opacity-70">
              ({cat === 'all' ? destinations.length : destinations.filter((d) => d.category === cat).length})
            </span>
          </button>
        ))}
      </div>

      {/* Destinations Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((dest) => {
          const Icon = dest.icon;
          return (
            <div key={dest.id} className="glass-card border border-white/[0.06] rounded-xl p-6 hover:border-white/[0.08] hover:bg-white/[0.04] transition-all">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${dest.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm text-gray-100">{dest.name}</h3>
                    {dest.status === 'active' && (
                      <span className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />
                    )}
                    {dest.status === 'coming_soon' && (
                      <Badge status="generating" className="text-xs px-1.5 py-0">Soon</Badge>
                    )}
                    {dest.status === 'needs_setup' && (
                      <InfoBubble destination={dest} />
                    )}
                  </div>
                  <p className="text-xs text-gray-700 mb-3 leading-relaxed">{dest.description}</p>
                  <div className="flex items-center gap-2">
                    {dest.status === 'active' ? (
                      <button
                        onClick={() => setConfiguring(configuring === dest.id ? null : dest.id)}
                        className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-100 transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Configure
                      </button>
                    ) : dest.status === 'needs_setup' ? (
                      <>
                        <button
                          onClick={() => setSetupWizard(dest.id)}
                          className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-300 hover:from-violet-500/30 hover:to-purple-500/30 border border-violet-500/30 px-2.5 py-1.5 rounded-lg transition-all font-medium"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                          Quick Setup
                        </button>
                        <button
                          onClick={() => setConfiguring(configuring === dest.id ? null : dest.id)}
                          className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-100 transition-colors"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                          Manual
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-700">Coming soon</span>
                    )}
                  </div>

                  {/* Inline config form */}
                  {configuring === dest.id && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
                      {dest.category === 'api' && (
                        <>
                          {(dest.id === 'wordpress' || dest.id === 'ghost') && (
                            <input
                              type="url"
                              placeholder="Site URL (https://...)"
                              className="w-full px-3 py-1.5 text-xs bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-100 placeholder-gray-700 focus:outline-none focus:border-violet-500/50"
                            />
                          )}
                          {dest.id === 'linkedin' ? (
                            <>
                              <input
                                type="text"
                                placeholder="Client ID"
                                className="w-full px-3 py-1.5 text-xs bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-100 placeholder-gray-700 focus:outline-none focus:border-violet-500/50"
                              />
                              <input
                                type="password"
                                placeholder="Client Secret"
                                className="w-full px-3 py-1.5 text-xs bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-100 placeholder-gray-700 focus:outline-none focus:border-violet-500/50"
                              />
                              <input
                                type="text"
                                placeholder="Redirect URI (e.g. https://yourapp.com/callback)"
                                className="w-full px-3 py-1.5 text-xs bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-100 placeholder-gray-700 focus:outline-none focus:border-violet-500/50"
                              />
                              <p className="text-[10px] text-gray-600 leading-relaxed">
                                Create an app at linkedin.com/developers/apps. Add &quot;Share on LinkedIn&quot; and &quot;Sign In with LinkedIn using OpenID Connect&quot; products. Copy your Client ID and Client Secret above.
                              </p>
                            </>
                          ) : (
                            <input
                              type="password"
                              placeholder="API Key / Token"
                              className="w-full px-3 py-1.5 text-xs bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-100 placeholder-gray-700 focus:outline-none focus:border-violet-500/50"
                            />
                          )}
                          {dest.credentialHelpUrl && (
                            <a
                              href={dest.credentialHelpUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Open {dest.name} setup in browser
                            </a>
                          )}
                          <Button size="sm" variant="gold" className="w-full text-xs py-1.5">
                            Save & Test Connection
                          </Button>
                        </>
                      )}
                      {dest.category === 'feed' && dest.status === 'needs_setup' && (
                        <>
                          <input
                            type="password"
                            placeholder="API Key"
                            className="w-full px-3 py-1.5 text-xs bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-100 placeholder-gray-700 focus:outline-none focus:border-violet-500/50"
                          />
                          {dest.credentialHelpUrl && (
                            <a
                              href={dest.credentialHelpUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Open {dest.name} setup in browser
                            </a>
                          )}
                          <Button size="sm" variant="gold" className="w-full text-xs py-1.5">
                            Save & Test Connection
                          </Button>
                        </>
                      )}
                      {dest.category === 'feed' && dest.status === 'active' && (
                        <p className="text-xs text-gray-600">
                          This connector is auto-configured. No API key needed.
                        </p>
                      )}
                      {dest.category === 'assisted' && (
                        <p className="text-xs text-gray-600">
                          Assisted submission — no API key required. Generates ready-to-paste content packs.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Banner */}
      <div className="glass-card border border-violet-500/20 rounded-xl p-4 bg-gradient-to-r from-violet-500/20 to-purple-500/20">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-violet-400 mb-1">Assisted destinations require no API keys</p>
            <p className="text-sm text-gray-600">
              Medium, Reddit, Hacker News, and other assisted destinations generate perfectly formatted submission packs you can paste in seconds — no integrations required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
