'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Clock, FileText, MessageSquare,
  Rss, Code2, ExternalLink, Plus, Calendar as CalendarIcon, X,
  Pencil, Check, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Scheduled content item
interface ScheduledItem {
  id: string;
  title: string;
  type: 'article' | 'social' | 'press-release' | 'newsletter' | 'email' | 'pdf';
  destination: string;
  campaignId: string;
  campaignTitle: string;
  scheduledAt: string; // ISO date
  status: 'scheduled' | 'published' | 'failed';
  body?: string;
  profile?: string;
}

// Mock data for the calendar
const MOCK_SCHEDULED: ScheduledItem[] = [
  {
    id: 's1', title: 'WordPress Blog Post - New Features', type: 'article', destination: 'WordPress',
    campaignId: '1', campaignTitle: 'Q1 Product Launch', scheduledAt: new Date().toISOString(),
    status: 'scheduled', profile: 'main',
    body: 'Discover the latest features in our Q1 product launch. Learn how our new AI-powered analytics can transform your workflow...',
  },
  {
    id: 's2', title: 'LinkedIn Announcement', type: 'social', destination: 'LinkedIn',
    campaignId: '1', campaignTitle: 'Q1 Product Launch',
    scheduledAt: new Date(Date.now() + 86400000).toISOString(), status: 'scheduled', profile: 'company',
    body: 'Excited to announce our Q1 product launch! Our team has been working hard on innovative features that will revolutionize how you work...',
  },
  {
    id: 's3', title: 'DEV.to Technical Deep Dive', type: 'article', destination: 'DEV.to',
    campaignId: '1', campaignTitle: 'Q1 Product Launch',
    scheduledAt: new Date(Date.now() + 86400000 * 2).toISOString(), status: 'scheduled', profile: 'tech',
    body: 'In this technical deep dive, we explore the architecture behind our new AI engine. Learn about the machine learning models and real-time processing...',
  },
  {
    id: 's4', title: 'Mastodon Thread', type: 'social', destination: 'Mastodon',
    campaignId: '1', campaignTitle: 'Q1 Product Launch',
    scheduledAt: new Date(Date.now() + 86400000 * 2).toISOString(), status: 'scheduled', profile: 'main',
    body: '1/5 Just launched our biggest update yet! Here are 5 reasons why this matters for your business. #ProductLaunch #Innovation...',
  },
  {
    id: 's5', title: 'Press Release Distribution', type: 'press-release', destination: 'PRLog',
    campaignId: '1', campaignTitle: 'Q1 Product Launch',
    scheduledAt: new Date(Date.now() + 86400000 * 3).toISOString(), status: 'scheduled', profile: 'main',
    body: 'FOR IMMEDIATE RELEASE: Leading SaaS Company Announces Groundbreaking Q1 Product Launch. New AI-powered features promise to double productivity...',
  },
  {
    id: 's6', title: 'Newsletter - Monthly Update', type: 'newsletter', destination: 'Email',
    campaignId: '1', campaignTitle: 'Q1 Product Launch',
    scheduledAt: new Date(Date.now() + 86400000 * 5).toISOString(), status: 'scheduled', profile: 'main',
    body: 'Hi there! This month we are thrilled to share our latest product updates and success stories from our community. Explore what\'s new...',
  },
  {
    id: 's7', title: 'LinkedIn Post - Customer Success', type: 'social', destination: 'LinkedIn',
    campaignId: '2', campaignTitle: 'Customer Stories',
    scheduledAt: new Date(Date.now() + 86400000 * 4).toISOString(), status: 'scheduled', profile: 'company',
    body: 'Meet our customer of the month! See how they achieved 3x productivity gains using our platform. Read their full case study...',
  },
  {
    id: 's8', title: 'WordPress Case Study', type: 'article', destination: 'WordPress',
    campaignId: '2', campaignTitle: 'Customer Stories',
    scheduledAt: new Date(Date.now() + 86400000 * 6).toISOString(), status: 'scheduled', profile: 'main',
    body: 'How a Fortune 500 company reduced operational costs by 40% using our intelligent automation features. Full case study included...',
  },
  {
    id: 's9', title: 'Email Campaign - Spring Promo', type: 'email', destination: 'Email',
    campaignId: '3', campaignTitle: 'Spring Promotion',
    scheduledAt: new Date(Date.now() + 86400000 * 7).toISOString(), status: 'scheduled', profile: 'main',
    body: 'Special Spring Offer: Get 30% off annual plans this week only! Upgrade your team and unlock advanced analytics features today...',
  },
  {
    id: 's10', title: 'Technical Guide PDF', type: 'pdf', destination: 'Email',
    campaignId: '3', campaignTitle: 'Spring Promotion',
    scheduledAt: new Date(Date.now() + 86400000 * 8).toISOString(), status: 'scheduled', profile: 'support',
    body: 'Complete integration guide for developers. Learn how to set up our API in less than 5 minutes with step-by-step instructions...',
  },
  {
    id: 's11', title: 'Mastodon - Weekly Tip', type: 'social', destination: 'Mastodon',
    campaignId: '2', campaignTitle: 'Customer Stories',
    scheduledAt: new Date(Date.now() + 86400000 * 9).toISOString(), status: 'scheduled', profile: 'main',
    body: 'Pro Tip: Did you know you can automate your entire workflow with our smart templates? Save hours every week by leveraging this powerful feature...',
  },
  {
    id: 's12', title: 'Newsletter - Product Updates', type: 'newsletter', destination: 'Email',
    campaignId: '1', campaignTitle: 'Q1 Product Launch',
    scheduledAt: new Date(Date.now() + 86400000 * 10).toISOString(), status: 'scheduled', profile: 'main',
    body: 'Quarterly Product Update: This quarter we shipped 47 new features, bug fixes, and performance improvements. Here\'s what\'s new...',
  },
  {
    id: 's13', title: 'LinkedIn Article - Industry Trends', type: 'article', destination: 'LinkedIn',
    campaignId: '4', campaignTitle: 'Thought Leadership',
    scheduledAt: new Date(Date.now() + 86400000 * 11).toISOString(), status: 'scheduled', profile: 'company',
    body: 'The Future of SaaS: 5 Trends Shaping the Industry in 2026. Our CEO shares insights on automation, AI, and the democratization of enterprise tools...',
  },
  {
    id: 's14', title: 'DEV.to - Tutorial Series', type: 'article', destination: 'DEV.to',
    campaignId: '4', campaignTitle: 'Thought Leadership',
    scheduledAt: new Date(Date.now() + 86400000 * 12).toISOString(), status: 'scheduled', profile: 'tech',
    body: 'Getting Started with Our API: Part 2. In this comprehensive tutorial, we build a real-time dashboard using our REST endpoints...',
  },
  {
    id: 's15', title: 'Press Release - Partnership', type: 'press-release', destination: 'PRLog',
    campaignId: '5', campaignTitle: 'Partner Announcement',
    scheduledAt: new Date(Date.now() + 86400000 * 13).toISOString(), status: 'scheduled', profile: 'main',
    body: 'FOR IMMEDIATE RELEASE: Company Announces Strategic Partnership with Industry Leader. Combined solution provides end-to-end automation...',
  },
  {
    id: 's16', title: 'Email - Webinar Invitation', type: 'email', destination: 'Email',
    campaignId: '5', campaignTitle: 'Partner Announcement',
    scheduledAt: new Date(Date.now() + 86400000 * 14).toISOString(), status: 'scheduled', profile: 'main',
    body: 'Join us for an exclusive webinar next week! Our partners will share how they achieved 5x ROI using the integrated solution...',
  },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const typeConfig: Record<string, { icon: any; color: string; iconColor: string; label: string }> = {
  article: { icon: FileText, color: 'from-violet-500/20 to-purple-500/20', iconColor: 'text-violet-400', label: 'Article' },
  social: { icon: MessageSquare, color: 'from-teal-500/20 to-emerald-500/20', iconColor: 'text-teal-400', label: 'Social' },
  'press-release': { icon: Rss, color: 'from-rose-500/20 to-pink-500/20', iconColor: 'text-rose-400', label: 'Press Release' },
  newsletter: { icon: FileText, color: 'from-blue-500/20 to-indigo-500/20', iconColor: 'text-blue-400', label: 'Newsletter' },
  email: { icon: MessageSquare, color: 'from-cyan-500/20 to-sky-500/20', iconColor: 'text-cyan-400', label: 'Email' },
  pdf: { icon: Code2, color: 'from-amber-500/20 to-yellow-500/20', iconColor: 'text-amber-400', label: 'PDF' },
};

const platformBadgeColors: Record<string, string> = {
  WordPress: 'bg-blue-500/20 text-blue-300 border-blue-500/20',
  LinkedIn: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/20',
  Mastodon: 'bg-purple-500/20 text-purple-300 border-purple-500/20',
  'DEV.to': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/20',
  PRLog: 'bg-rose-500/20 text-rose-300 border-rose-500/20',
  Email: 'bg-green-500/20 text-green-300 border-green-500/20',
};

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  const [hoveredItem, setHoveredItem] = useState<{ id: string; x: number; y: number } | null>(null);
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [profileFilter, setProfileFilter] = useState<string>('all');
  const [scheduledItems, setScheduledItems] = useState<ScheduledItem[]>(MOCK_SCHEDULED);
  const [editingItem, setEditingItem] = useState<ScheduledItem | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editTitle, setEditTitle] = useState('');

  const openEditModal = (item: ScheduledItem) => {
    const d = new Date(item.scheduledAt);
    setEditingItem(item);
    setEditTitle(item.title);
    setEditDate(d.toISOString().split('T')[0]);
    setEditTime(d.toTimeString().slice(0, 5));
    setEditBody(item.body || '');
  };

  const saveEdit = () => {
    if (!editingItem) return;
    setScheduledItems((prev) =>
      prev.map((item) =>
        item.id === editingItem.id
          ? {
              ...item,
              title: editTitle,
              body: editBody,
              scheduledAt: new Date(`${editDate}T${editTime}:00`).toISOString(),
            }
          : item
      )
    );
    setEditingItem(null);
  };

  const deleteItem = (id: string) => {
    setScheduledItems((prev) => prev.filter((item) => item.id !== id));
    setEditingItem(null);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const days: Date[] = [];

    // Pad start
    for (let i = startPad - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }
    // Month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    // Pad end to fill 6 rows
    while (days.length < 42) {
      days.push(new Date(year, month + 1, days.length - lastDay.getDate() - startPad + 1));
    }

    return days;
  }, [year, month]);

  // Filter logic
  const filteredScheduled = useMemo(() => {
    return scheduledItems.filter((item) => {
      const typeMatch = contentTypeFilter === 'all' || item.type === contentTypeFilter;
      const platformMatch = platformFilter === 'all' || item.destination === platformFilter;
      const profileMatch = profileFilter === 'all' || item.profile === profileFilter;
      return typeMatch && platformMatch && profileMatch;
    });
  }, [scheduledItems, contentTypeFilter, platformFilter, profileFilter]);

  const getItemsForDate = (date: Date) =>
    filteredScheduled.filter((item) => isSameDay(new Date(item.scheduledAt), date));

  const selectedItems = selectedDate ? getItemsForDate(selectedDate) : [];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => { setCurrentDate(new Date()); setSelectedDate(new Date()); };

  const today = new Date();

  // Get unique platforms and profiles from all data (not filtered)
  const uniquePlatforms = Array.from(new Set(scheduledItems.map((i) => i.destination))).sort();
  const uniqueProfiles = Array.from(new Set(scheduledItems.map((i) => i.profile || 'main'))).sort();

  return (
    <div className="space-y-6">
      {/* Edit Scheduled Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl max-w-lg w-full border-violet-500/10">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-violet-400" />
                <h3 className="font-bold">Edit Scheduled Item</h3>
              </div>
              <button onClick={() => setEditingItem(null)} className="text-gray-600 hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-100 placeholder-gray-700 focus:outline-none focus:border-violet-500/50"
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-100 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Time</label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-100 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              </div>

              {/* Destination + Type (read-only info) */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className={`px-2 py-1 rounded-lg border ${platformBadgeColors[editingItem.destination] || 'bg-gray-500/20 text-gray-300 border-gray-500/20'}`}>
                  {editingItem.destination}
                </span>
                <span className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-gray-400">
                  {(typeConfig[editingItem.type] || typeConfig.article).label}
                </span>
              </div>

              {/* Content Body */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Content</label>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2.5 text-sm bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-100 placeholder-gray-700 focus:outline-none focus:border-violet-500/50 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => deleteItem(editingItem.id)}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
                <div className="flex-1" />
                <Button variant="ghost" size="sm" onClick={() => setEditingItem(null)}>Cancel</Button>
                <Button variant="gold" size="sm" className="gap-1.5" onClick={saveEdit}>
                  <Check className="w-3.5 h-3.5" />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">Schedule</h1>
          <p className="text-gray-600 text-sm">
            View and manage all scheduled content across campaigns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={goToToday}>Today</Button>
          <div className="flex gap-1">
            {(['month', 'week'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  view === v
                    ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card rounded-xl px-5 py-4 space-y-4">
        <h3 className="text-sm font-bold text-gray-300">Filters</h3>

        {/* Content Type Filter */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Content Type</p>
          <div className="flex flex-wrap gap-2">
            {['all', 'article', 'social', 'press-release', 'newsletter', 'email', 'pdf'].map((type) => (
              <button
                key={type}
                onClick={() => setContentTypeFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  contentTypeFilter === type
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'bg-white/[0.04] text-gray-400 border border-white/[0.08] hover:border-white/[0.12] hover:text-gray-300'
                }`}
              >
                {type === 'all' ? 'All' : type === 'press-release' ? 'Press Release' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Platform Filter */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Platform</p>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-gray-300 focus:outline-none focus:border-violet-500/30 transition-all"
          >
            <option value="all">All Platforms</option>
            {uniquePlatforms.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Profile Filter */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Profile</p>
          <select
            value={profileFilter}
            onChange={(e) => setProfileFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-gray-300 focus:outline-none focus:border-violet-500/30 transition-all"
          >
            <option value="all">All Profiles</option>
            {uniqueProfiles.map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Clear Filters */}
        {(contentTypeFilter !== 'all' || platformFilter !== 'all' || profileFilter !== 'all') && (
          <button
            onClick={() => {
              setContentTypeFilter('all');
              setPlatformFilter('all');
              setProfileFilter('all');
            }}
            className="text-xs text-violet-400 hover:text-violet-300 transition-all"
          >
            Clear all filters
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 relative">
        {/* Calendar Grid */}
        <div className="glass-card rounded-xl overflow-hidden relative">
          {/* Month Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white/[0.04] text-gray-500 hover:text-white transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-bold">
              {MONTHS[month]} {year}
            </h2>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white/[0.04] text-gray-500 hover:text-white transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-white/[0.04]">
            {DAYS.map((day) => (
              <div key={day} className="px-2 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((date, i) => {
              const isCurrentMonth = date.getMonth() === month;
              const isToday = isSameDay(date, today);
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              const items = getItemsForDate(date);

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(date)}
                  className={`relative min-h-[80px] p-1.5 border-b border-r border-white/[0.03] text-left transition-all hover:bg-white/[0.03] ${
                    !isCurrentMonth ? 'opacity-30' : ''
                  } ${isSelected ? 'bg-violet-500/5 border-violet-500/10' : ''}`}
                >
                  <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-medium ${
                    isToday ? 'bg-violet-600 text-white' :
                    isSelected ? 'text-violet-300' :
                    'text-gray-400'
                  }`}>
                    {date.getDate()}
                  </span>

                  {/* Content dots */}
                  {items.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {items.slice(0, 3).map((item) => {
                        const tc = typeConfig[item.type] || typeConfig.article;
                        return (
                          <div
                            key={item.id}
                            onMouseEnter={(e) => {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              setHoveredItem({ id: item.id, x: rect.left, y: rect.top });
                            }}
                            onMouseLeave={() => setHoveredItem(null)}
                            className={`flex items-center gap-1 px-1 py-0.5 rounded text-[10px] truncate cursor-pointer transition-all hover:brightness-125 ${
                              item.type === 'article' ? 'bg-violet-500/10 text-violet-300' :
                              item.type === 'social' ? 'bg-teal-500/10 text-teal-300' :
                              item.type === 'press-release' ? 'bg-rose-500/10 text-rose-300' :
                              item.type === 'newsletter' ? 'bg-blue-500/10 text-blue-300' :
                              item.type === 'email' ? 'bg-cyan-500/10 text-cyan-300' :
                              'bg-amber-500/10 text-amber-300'
                            }`}
                          >
                            {item.title.substring(0, 15)}…
                          </div>
                        );
                      })}
                      {items.length > 3 && (
                        <span className="text-[10px] text-gray-600 px-1">
                          +{items.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Hover Preview Card */}
          {hoveredItem && (
            <>
              {filteredScheduled.find((item) => item.id === hoveredItem.id) && (
                <div
                  className="fixed z-50 pointer-events-none"
                  style={{
                    left: `${hoveredItem.x + 20}px`,
                    top: `${hoveredItem.y - 10}px`,
                  }}
                >
                  {(() => {
                    const item = filteredScheduled.find((i) => i.id === hoveredItem.id);
                    if (!item) return null;
                    const tc = typeConfig[item.type] || typeConfig.article;

                    return (
                      <div className="glass-card rounded-xl p-4 w-96 border border-white/[0.08] shadow-2xl">
                        <div className="space-y-3">
                          {/* Header with type badge */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-bold text-gray-100 line-clamp-2">{item.title}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap ${
                              item.type === 'article' ? 'bg-violet-500/20 text-violet-300' :
                              item.type === 'social' ? 'bg-teal-500/20 text-teal-300' :
                              item.type === 'press-release' ? 'bg-rose-500/20 text-rose-300' :
                              item.type === 'newsletter' ? 'bg-blue-500/20 text-blue-300' :
                              item.type === 'email' ? 'bg-cyan-500/20 text-cyan-300' :
                              'bg-amber-500/20 text-amber-300'
                            }`}>
                              {tc.label}
                            </span>
                          </div>

                          {/* Platform Badge */}
                          <div className={`text-xs font-semibold px-2 py-1 rounded-lg w-fit border ${
                            platformBadgeColors[item.destination] || 'bg-gray-500/20 text-gray-300 border-gray-500/20'
                          }`}>
                            {item.destination}
                          </div>

                          {/* Body Preview */}
                          <p className="text-xs text-gray-300 line-clamp-3">
                            {item.body ? item.body.substring(0, 200) + (item.body.length > 200 ? '...' : '') : 'No description'}
                          </p>

                          {/* Edit Button */}
                          <button
                            onClick={() => { setHoveredItem(null); openEditModal(item); }}
                            className="pointer-events-auto inline-flex items-center gap-1 mt-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 hover:border-violet-500/40 transition-all"
                          >
                            <Pencil className="w-3 h-3" />
                            Edit
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </div>

        {/* Selected Day Detail Panel */}
        <div className="space-y-4">
          <div className="glass-card rounded-xl px-5 py-4">
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon className="w-4 h-4 text-violet-400" />
              <h3 className="font-bold text-sm">
                {selectedDate
                  ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                  : 'Select a date'}
              </h3>
            </div>

            {selectedItems.length === 0 ? (
              <div className="py-8 text-center">
                <Clock className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-1">Nothing scheduled</p>
                <p className="text-xs text-gray-700">
                  Schedule content from a campaign to see it here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedItems.map((item) => {
                  const tc = typeConfig[item.type] || typeConfig.article;
                  const ItemIcon = tc.icon;
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/20 transition-all group"
                    >
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${tc.color} flex items-center justify-center flex-shrink-0`}>
                        <ItemIcon className={`w-3.5 h-3.5 ${tc.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-200 truncate group-hover:text-white">
                          {item.title}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">{item.destination}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-gray-700">
                            {new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-300">
                            {item.campaignTitle}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 mt-1">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1 rounded-md text-gray-700 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/dashboard/campaigns/${item.campaignId}`}
                          className="p-1 rounded-md text-gray-700 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                          title="View Campaign"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="glass-card rounded-xl px-5 py-4">
            <h3 className="text-sm font-bold mb-3 text-gray-300">This Month</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <p className="text-2xl font-bold text-violet-400">{scheduledItems.length}</p>
                <p className="text-xs text-gray-600">Scheduled</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <p className="text-2xl font-bold text-teal-400">
                  {scheduledItems.filter((s) => s.status === 'published').length}
                </p>
                <p className="text-xs text-gray-600">Published</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
