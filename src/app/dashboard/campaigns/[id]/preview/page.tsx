'use client';

import { useState, use } from 'react';
import { ArrowLeft, AlertCircle, AlertTriangle, CheckCircle2, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Mock data
const mockDestinations = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    type: 'API',
    status: 'ready',
    mappedFields: {
      title: 'Campaign Title',
      description: 'First 200 chars of content',
      imageUrl: 'Generated thumbnail',
    },
    preview: {
      title: 'Q1 Product Launch',
      description:
        'Discover how our new platform revolutionizes content distribution with AI-powered generation across 25+ channels.',
      image: '/placeholder-linkedin.png',
    },
    warnings: [],
    errors: [],
    compliance: {
      canonical: true,
      links: true,
      pacing: true,
    },
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    type: 'API',
    status: 'needs_edit',
    mappedFields: {
      content: 'Tweet content (280 chars)',
      hashtags: 'Auto-generated tags',
      media: 'Optional image',
    },
    preview: {
      content:
        'Excited to announce the launch of our new content distribution platform! 🚀 One source, infinite destinations. Learn more →',
      hashtags: '#ContentMarketing #SaaS #AI',
      media: 'thumbnail.png',
    },
    warnings: ['Thread may need splitting (exceeds 2 tweets)'],
    errors: [],
    compliance: {
      canonical: true,
      links: false,
      pacing: true,
    },
  },
  {
    id: 'devto',
    name: 'Dev.to',
    type: 'API',
    status: 'approved',
    mappedFields: {
      title: 'Article title',
      body: 'Full markdown content',
      tags: 'Up to 4 tags',
      coverImage: 'Optional cover image',
    },
    preview: {
      title: 'Building Scalable Content Distribution Systems',
      body: 'In this post, we explore the architecture behind our content distribution platform...',
      tags: ['architecture', 'saas', 'contentmarketing'],
      coverImage: 'cover.png',
    },
    warnings: [],
    errors: [],
    compliance: {
      canonical: true,
      links: true,
      pacing: true,
    },
  },
  {
    id: 'medium',
    name: 'Medium',
    type: 'Assisted',
    status: 'manual_needed',
    mappedFields: {
      title: 'Story title',
      body: 'Story content',
      tags: 'Manual tagging required',
      publish: 'Manual publication',
    },
    preview: {
      title: 'A Comprehensive Guide to Multi-Destination Publishing',
      body: 'Publishing the same content to multiple platforms requires careful consideration...',
      tags: [],
      note: 'Medium publication requires manual approval',
    },
    warnings: ['Manual Medium submission required'],
    errors: [
      'Medium API not available - copy content and submit manually',
    ],
    compliance: {
      canonical: true,
      links: true,
      pacing: false,
    },
  },
  {
    id: 'mastodon',
    name: 'Mastodon',
    type: 'Feed',
    status: 'ready',
    mappedFields: {
      content: 'Toot content (500 chars)',
      mediaAlt: 'Image alt text',
      visibility: 'Public/Unlisted',
    },
    preview: {
      content:
        'Join us on the Fediverse! We\'ve launched native support for Mastodon distribution. Check out our latest update 🎉',
      mediaAlt: 'Mastodon announcement graphic',
      visibility: 'Public',
    },
    warnings: [],
    errors: [],
    compliance: {
      canonical: true,
      links: true,
      pacing: true,
    },
  },
  {
    id: 'rss',
    name: 'RSS Feed',
    type: 'Feed',
    status: 'ready',
    mappedFields: {
      title: 'Feed item title',
      description: 'Feed item description',
      link: 'Canonical link',
      pubDate: 'Publication date',
    },
    preview: {
      title: 'Latest Updates: Q1 Product Launch',
      description:
        'Comprehensive product updates and new features released in Q1 2024',
      link: 'https://example.com/q1-launch',
      pubDate: 'Mar 21, 2024',
    },
    warnings: [],
    errors: [],
    compliance: {
      canonical: true,
      links: true,
      pacing: true,
    },
  },
];

export default function CampaignPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [selectedDestination, setSelectedDestination] = useState(
    mockDestinations[0]
  );
  const [showDiff, setShowDiff] = useState(false);

  const destinationsByType = mockDestinations.reduce(
    (acc, dest) => {
      if (!acc[dest.type]) acc[dest.type] = [];
      acc[dest.type].push(dest);
      return acc;
    },
    {} as Record<string, typeof mockDestinations>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href={`/dashboard/campaigns/${id}`}>
          <button className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Campaign
          </button>
        </Link>
        <h1 className="text-3xl font-bold">Preview & Approve Destinations</h1>
        <p className="text-gray-400 mt-2">
          Review mapped fields and content rendering for each destination
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Panel: Destination List */}
        <div className="lg:col-span-1 space-y-4">
          {Object.entries(destinationsByType).map(([type, destinations]) => (
            <div key={type} className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
                {type}
              </h3>
              <div className="space-y-2">
                {destinations.map((dest) => (
                  <button
                    key={dest.id}
                    onClick={() => setSelectedDestination(dest)}
                    className={`w-full p-3 rounded-lg text-left transition-all border ${
                      selectedDestination.id === dest.id
                        ? 'bg-blue-600/20 border-blue-600/30 text-white'
                        : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700/50 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{dest.name}</p>
                        <p className="text-xs text-gray-400 mt-1">{dest.type}</p>
                      </div>
                      <Badge status={dest.status as 'draft' | 'generating' | 'ready' | 'approved' | 'published' | 'failed' | 'manual_needed' | 'needs_edit'} size="sm">
                        {dest.status}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right Panel: Preview & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preview Card */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{selectedDestination.name}</h2>
              <Badge status={selectedDestination.status as 'draft' | 'generating' | 'ready' | 'approved' | 'published' | 'failed' | 'manual_needed' | 'needs_edit'}>
                {selectedDestination.status}
              </Badge>
            </div>

            {/* Mapped Fields Table */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3 text-sm">Mapped Fields</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">
                        Field
                      </th>
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">
                        Source
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(
                      selectedDestination.mappedFields
                    ).map(([field, source]) => (
                      <tr
                        key={field}
                        className="border-b border-gray-800 hover:bg-gray-800/30"
                      >
                        <td className="py-2 px-3 font-medium">{field}</td>
                        <td className="py-2 px-3 text-gray-300">{source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Content Preview */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3 text-sm">Content Preview</h3>
              <div className="bg-gray-800/30 rounded-lg p-4 space-y-3">
                {Object.entries(selectedDestination.preview).map(
                  ([key, value]) => {
                    if (key === 'image' || key === 'media' || key === 'coverImage') {
                      return (
                        <div key={key}>
                          <p className="text-xs font-medium text-gray-400 uppercase mb-2">
                            {key}
                          </p>
                          <div className="w-full h-32 bg-gray-700/30 rounded flex items-center justify-center text-gray-500 text-sm">
                            {value}
                          </div>
                        </div>
                      );
                    }
                    if (Array.isArray(value)) {
                      return (
                        <div key={key}>
                          <p className="text-xs font-medium text-gray-400 uppercase mb-2">
                            {key}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {value.map((tag) => (
                              <Badge key={tag} status="draft" size="sm">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={key}>
                        <p className="text-xs font-medium text-gray-400 uppercase mb-1">
                          {key}
                        </p>
                        <p className="text-gray-200 text-sm">{value}</p>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {/* Warnings & Errors */}
            {(selectedDestination.warnings.length > 0 ||
              selectedDestination.errors.length > 0) && (
              <div className="space-y-2 mb-6">
                {selectedDestination.warnings.map((warning, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30"
                  >
                    <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-yellow-300">{warning}</p>
                  </div>
                ))}
                {selectedDestination.errors.map((error, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30"
                  >
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Compliance Checklist */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3 text-sm">Compliance Checklist</h3>
              <div className="space-y-2">
                {[
                  {
                    label: 'Canonical URL included',
                    key: 'canonical',
                  },
                  { label: 'Links preserved', key: 'links' },
                  { label: 'Pacing rules respected', key: 'pacing' },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center gap-2 text-sm"
                  >
                    {selectedDestination.compliance[
                      item.key as keyof typeof selectedDestination.compliance
                    ] ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                    )}
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-700">
              <Button
                variant="secondary"
                size="sm"
                className="gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit Content
              </Button>
              <Button
                size="sm"
                disabled={selectedDestination.errors.length > 0}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
