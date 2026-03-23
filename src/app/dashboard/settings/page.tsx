'use client';

import { useState } from 'react';
import {
  Settings,
  Bell,
  Shield,
  Key,
  Globe,
  Save,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type SettingsTab = 'organization' | 'notifications' | 'api' | 'compliance';

const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'organization', label: 'Organization', icon: Globe },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'compliance', label: 'Compliance', icon: Shield },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('organization');
  const [saved, setSaved] = useState(false);

  // Organization settings
  const [orgName, setOrgName] = useState('My Organization');
  const [orgUrl, setOrgUrl] = useState('https://example.com');
  const [utmSource, setUtmSource] = useState('distribute');
  const [defaultPacing, setDefaultPacing] = useState('moderate');

  // Notification settings
  const [notifyOnPublish, setNotifyOnPublish] = useState(true);
  const [notifyOnFail, setNotifyOnFail] = useState(true);
  const [notifyOnApproval, setNotifyOnApproval] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);

  // Compliance settings
  const [requireApproval, setRequireApproval] = useState(true);
  const [complianceCheck, setComplianceCheck] = useState(true);
  const [uniquenessThreshold, setUniquenessThreshold] = useState(70);
  const [maxLinksPerAsset, setMaxLinksPerAsset] = useState(3);

  const handleSave = async () => {
    // In production: PATCH /api/settings
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2 text-gray-100">Settings</h1>
        <p className="text-gray-500">
          Configure your organization, notifications, API keys, and compliance rules
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors border ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-violet-600/15 to-purple-600/10 text-white border-violet-500/20'
                      : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.04] border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'organization' && (
            <div className="glass-card border border-white/[0.06] rounded-xl p-6">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-100">
                <Globe className="w-5 h-5 text-violet-400" />
                Organization Settings
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-100">Organization Name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-gray-700 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-100">Canonical Site URL</label>
                  <input
                    type="url"
                    value={orgUrl}
                    onChange={(e) => setOrgUrl(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-gray-700 focus:outline-none focus:border-violet-500/50"
                  />
                  <p className="text-xs text-gray-600 mt-1.5">Used for canonical URL generation and backlinks</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-100">UTM Source Tag</label>
                  <input
                    type="text"
                    value={utmSource}
                    onChange={(e) => setUtmSource(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-gray-700 focus:outline-none focus:border-violet-500/50"
                  />
                  <p className="text-xs text-gray-600 mt-1.5">Appended to all UTM tracking links</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-100">Default Distribution Pacing</label>
                  <select
                    value={defaultPacing}
                    onChange={(e) => setDefaultPacing(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-gray-700 focus:outline-none focus:border-violet-500/50"
                  >
                    <option value="conservative">Conservative – slow rollout</option>
                    <option value="moderate">Moderate – balanced</option>
                    <option value="aggressive">Aggressive – max reach</option>
                  </select>
                </div>
                <Button onClick={handleSave} variant="primary" className="gap-2">
                  {saved ? (
                    <><CheckCircle2 className="w-4 h-4" />Saved!</>
                  ) : (
                    <><Save className="w-4 h-4" />Save Changes</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="glass-card border border-white/[0.06] rounded-xl p-6">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-100">
                <Bell className="w-5 h-5 text-violet-400" />
                Notification Preferences
              </h2>
              <div className="space-y-5">
                <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
                  <div>
                    <p className="font-medium text-sm text-gray-100">Email Notifications</p>
                    <p className="text-xs text-gray-600">Receive notifications via email</p>
                  </div>
                  <Toggle checked={emailNotifications} onChange={setEmailNotifications} />
                </div>
                <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
                  <div>
                    <p className="font-medium text-sm text-gray-100">Publish Success</p>
                    <p className="text-xs text-gray-600">Notify when a campaign publishes successfully</p>
                  </div>
                  <Toggle checked={notifyOnPublish} onChange={setNotifyOnPublish} />
                </div>
                <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
                  <div>
                    <p className="font-medium text-sm text-gray-100">Publish Failures</p>
                    <p className="text-xs text-gray-600">Notify when a destination fails to publish</p>
                  </div>
                  <Toggle checked={notifyOnFail} onChange={setNotifyOnFail} />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-sm text-gray-100">Approval Required</p>
                    <p className="text-xs text-gray-600">Notify when a campaign needs approval</p>
                  </div>
                  <Toggle checked={notifyOnApproval} onChange={setNotifyOnApproval} />
                </div>
                <Button onClick={handleSave} variant="primary" className="gap-2">
                  {saved ? <><CheckCircle2 className="w-4 h-4" />Saved!</> : <><Save className="w-4 h-4" />Save Changes</>}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="glass-card border border-white/[0.06] rounded-xl p-6">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-100">
                <Key className="w-5 h-5 text-violet-400" />
                API Keys
              </h2>
              <div className="space-y-5">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-300">Keep API keys secure</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Never expose API keys in client-side code. Keys entered here are stored encrypted server-side.
                      </p>
                    </div>
                  </div>
                </div>

                {[
                  { label: 'Anthropic API Key', placeholder: 'sk-ant-...', desc: 'Required for AI content generation' },
                  { label: 'WordPress App Password', placeholder: 'xxxx xxxx xxxx xxxx', desc: 'For WordPress auto-publishing' },
                  { label: 'Ghost Admin API Key', placeholder: 'xxx:xxx...', desc: 'For Ghost blog publishing' },
                  { label: 'LinkedIn Access Token', placeholder: 'AQV...', desc: 'For LinkedIn post publishing' },
                  { label: 'Google Search Console Key', placeholder: 'Paste service account JSON', desc: 'For URL submission to Google' },
                ].map((field) => (
                  <div key={field.label}>
                    <label className="block text-sm font-semibold mb-1.5 text-gray-100">{field.label}</label>
                    <input
                      type="password"
                      placeholder={field.placeholder}
                      className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-gray-700 focus:outline-none focus:border-violet-500/50 font-mono text-sm"
                    />
                    <p className="text-xs text-gray-600 mt-1">{field.desc}</p>
                  </div>
                ))}

                <Button onClick={handleSave} variant="primary" className="gap-2">
                  {saved ? <><CheckCircle2 className="w-4 h-4" />Saved!</> : <><Save className="w-4 h-4" />Save API Keys</>}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="glass-card border border-white/[0.06] rounded-xl p-6">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-100">
                <Shield className="w-5 h-5 text-violet-400" />
                Compliance & Quality
              </h2>
              <div className="space-y-5">
                <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
                  <div>
                    <p className="font-medium text-sm text-gray-100">Require Manual Approval</p>
                    <p className="text-xs text-gray-600">Campaigns must be approved before publishing</p>
                  </div>
                  <Toggle checked={requireApproval} onChange={setRequireApproval} />
                </div>
                <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
                  <div>
                    <p className="font-medium text-sm text-gray-100">Compliance Auto-Check</p>
                    <p className="text-xs text-gray-600">Run automated compliance validation before publishing</p>
                  </div>
                  <Toggle checked={complianceCheck} onChange={setComplianceCheck} />
                </div>
                <div className="py-3 border-b border-white/[0.06]">
                  <label className="block text-sm font-semibold mb-2 text-gray-100">
                    Uniqueness Threshold: <span className="text-violet-400">{uniquenessThreshold}%</span>
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    value={uniquenessThreshold}
                    onChange={(e) => setUniquenessThreshold(parseInt(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>30% (lenient)</span>
                    <span>100% (strict)</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Minimum content uniqueness score required before publishing
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-100">Max Links Per Asset</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={maxLinksPerAsset}
                    onChange={(e) => setMaxLinksPerAsset(parseInt(e.target.value))}
                    className="w-32 px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-violet-500/50"
                  />
                  <p className="text-xs text-gray-600 mt-1.5">Prevents spam flags on destination platforms</p>
                </div>
                <Button onClick={handleSave} variant="primary" className="gap-2">
                  {saved ? <><CheckCircle2 className="w-4 h-4" />Saved!</> : <><Save className="w-4 h-4" />Save Changes</>}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        checked ? 'bg-violet-600' : 'bg-white/[0.08]'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
