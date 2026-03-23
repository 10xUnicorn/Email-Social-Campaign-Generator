'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Zap,
  Globe,
  BarChart3,
  Settings,
  ChevronDown,
  Crown,
  CalendarDays,
  MessageSquare,
} from 'lucide-react';

const navigationItems = [
  { label: 'Campaigns', href: '/dashboard', icon: Zap },
  { label: 'Destinations', href: '/dashboard/destinations', icon: Globe },
  { label: 'Schedule', href: '/dashboard/schedule', icon: CalendarDays },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Social Listening', href: '/dashboard/social', icon: MessageSquare },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  return (
    <div className="min-h-screen page-bg text-white">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen sidebar-bg border-r border-white/[0.06] transition-all duration-300 z-40 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/[0.06]">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-600/20">
                <Crown className="w-4 h-4 text-amber-300" />
              </div>
              <h1 className="text-lg font-bold text-gold">
                Distribute
              </h1>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1.5 rounded-lg hover:bg-white/[0.04]"
          >
            {sidebarOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600/15 to-purple-600/10 text-white border border-violet-500/20 shadow-sm'
                      : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-violet-400' : ''}`} />
                  {sidebarOpen && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </button>
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="border-t border-white/[0.06] p-3">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:bg-white/[0.04] hover:text-gray-200 transition-all">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-sm font-bold text-gray-900 flex-shrink-0 shadow-sm shadow-amber-500/20">
              D
            </div>
            {sidebarOpen && (
              <>
                <div className="flex-1 text-left">
                  <div className="text-xs font-semibold text-gray-300">Daniel</div>
                  <div className="text-xs text-gray-600">Admin</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-gray-600" />
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Top Bar */}
        <header className="sticky top-0 h-14 bg-[#050510]/80 backdrop-blur-xl border-b border-white/[0.04] flex items-center px-6 z-30">
          <div className="flex-1 flex items-center justify-between">
            <div className="text-sm text-gray-600 font-medium">
              Distribute
            </div>
            <div className="flex items-center gap-3">
              <button className="text-gray-600 hover:text-gray-300 transition-colors p-2 rounded-lg hover:bg-white/[0.04]">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-xs font-bold text-gray-900 shadow-sm shadow-amber-500/20">
                D
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
