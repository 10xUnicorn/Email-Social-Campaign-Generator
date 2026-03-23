"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface ScheduledItem {
  id: string;
  campaign_id: string;
  campaign_name: string;
  company_name: string | null;
  sequence_order: number;
  channel: string;
  subject: string | null;
  body: string;
  cta_text: string | null;
  preview_text: string | null;
  send_at: string;
  status: string;
}

export default function CalendarPage() {
  const [items, setItems] = useState<ScheduledItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    loadScheduled();
  }, []);

  async function loadScheduled() {
    const { data } = await supabase
      .from("campaign_messages")
      .select("id, campaign_id, sequence_order, channel, subject, body, cta_text, preview_text, send_at, status, campaign:campaigns(name, company:companies(name))")
      .not("send_at", "is", null)
      .order("send_at");

    const mapped = (data || []).map((d) => {
      const camp = d.campaign as unknown as { name: string; company: { name: string } | null } | null;
      return {
        id: d.id,
        campaign_id: d.campaign_id,
        campaign_name: camp?.name || "Unknown",
        company_name: camp?.company?.name || null,
        sequence_order: d.sequence_order,
        channel: d.channel,
        subject: d.subject,
        body: d.body,
        cta_text: d.cta_text,
        preview_text: d.preview_text,
        send_at: d.send_at!,
        status: d.status,
      };
    });

    setItems(mapped);
    setLoading(false);
  }

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  function getItemsForDay(day: number) {
    return items.filter((item) => {
      const d = new Date(item.send_at);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    }).sort((a, b) => new Date(a.send_at).getTime() - new Date(b.send_at).getTime());
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function getContentPreview(item: ScheduledItem) {
    if (item.channel === "email" && item.subject) return item.subject;
    if (item.body) return item.body.length > 60 ? item.body.slice(0, 60) + "…" : item.body;
    return item.campaign_name;
  }

  const channelColors: Record<string, string> = {
    email: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    sms: "bg-green-500/20 text-green-400 border-green-500/30",
    social: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };

  const channelDot: Record<string, string> = {
    email: "bg-blue-400",
    sms: "bg-green-400",
    social: "bg-purple-400",
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Stats
  const emailCount = items.filter((i) => i.channel === "email").length;
  const smsCount = items.filter((i) => i.channel === "sms").length;
  const socialCount = items.filter((i) => i.channel === "social").length;

  if (loading) {
    return <div className="text-center py-20 text-[var(--muted)]">Loading calendar...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Content Calendar</h1>
          <p className="text-[var(--muted)] mt-1">
            {items.length} scheduled — {emailCount} email, {smsCount} SMS, {socialCount} social
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/" className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs transition-colors">
            Dashboard
          </a>
          <button
            onClick={() => setViewMode("calendar")}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              viewMode === "calendar" ? "bg-[var(--accent)] text-white" : "bg-white/5 hover:bg-white/10"
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              viewMode === "list" ? "bg-[var(--accent)] text-white" : "bg-white/5 hover:bg-white/10"
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Email
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" /> SMS
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> Social
        </div>
      </div>

      {viewMode === "calendar" ? (
        <div>
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors"
            >
              ←
            </button>
            <h2 className="text-xl font-semibold">
              {monthNames[month]} {year}
            </h2>
            <button
              onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors"
            >
              →
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs text-[var(--muted)] py-2 font-medium">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const dayItems = day ? getItemsForDay(day) : [];
              const isToday =
                day === new Date().getDate() &&
                month === new Date().getMonth() &&
                year === new Date().getFullYear();

              return (
                <div
                  key={idx}
                  className={`min-h-[120px] rounded-lg border p-2 ${
                    day
                      ? isToday
                        ? "border-[var(--accent)] bg-[var(--accent)]/5"
                        : "border-[var(--card-border)] bg-[var(--card)]"
                      : "border-transparent"
                  }`}
                >
                  {day && (
                    <>
                      <p className={`text-xs font-medium mb-1.5 ${isToday ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                        {day}
                      </p>
                      <div className="space-y-1">
                        {dayItems.slice(0, 4).map((item) => (
                          <a
                            key={item.id}
                            href={`/campaigns/${item.campaign_id}`}
                            className={`block text-xs px-1.5 py-1 rounded border transition-all hover:brightness-125 relative ${channelColors[item.channel] || "bg-white/5"}`}
                            onMouseEnter={(e) => {
                              setHoveredItem(item.id);
                              const rect = (e.target as HTMLElement).getBoundingClientRect();
                              setHoverPos({ x: rect.right + 8, y: rect.top });
                            }}
                            onMouseLeave={() => setHoveredItem(null)}
                          >
                            <span className="font-medium">{formatTime(item.send_at)}</span>
                            <span className="opacity-70 ml-1 truncate">
                              {item.channel === "email" ? (item.subject ? item.subject.slice(0, 20) : item.campaign_name) : item.campaign_name}
                            </span>
                          </a>
                        ))}
                        {dayItems.length > 4 && (
                          <p className="text-xs text-[var(--muted)] pl-1">+{dayItems.length - 4} more</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Hover tooltip */}
          {hoveredItem && (() => {
            const item = items.find((i) => i.id === hoveredItem);
            if (!item) return null;
            return (
              <div
                className="fixed z-50 bg-[#1a1a2e] border border-[var(--card-border)] rounded-xl p-4 shadow-2xl max-w-sm pointer-events-none"
                style={{
                  left: Math.min(hoverPos.x, window.innerWidth - 380),
                  top: Math.max(hoverPos.y - 20, 10),
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${channelDot[item.channel]}`} />
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-70">{item.channel}</span>
                  <span className="text-xs text-[var(--muted)] ml-auto">{formatTime(item.send_at)}</span>
                </div>
                {item.company_name && (
                  <p className="text-xs text-[var(--accent)] mb-1">{item.company_name}</p>
                )}
                <p className="text-sm font-semibold mb-1">{item.campaign_name}</p>
                {item.subject && (
                  <p className="text-xs text-[var(--fg)]/80 mb-1">Subject: {item.subject}</p>
                )}
                <p className="text-xs text-[var(--muted)] line-clamp-3">
                  {item.body.length > 150 ? item.body.slice(0, 150) + "…" : item.body}
                </p>
                {item.cta_text && (
                  <p className="text-xs text-[var(--accent)] mt-1.5">CTA: {item.cta_text}</p>
                )}
                <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs text-[var(--muted)]">
                    {new Date(item.send_at).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${item.status === "scheduled" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        /* List view */
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[var(--muted)] text-lg mb-2">No scheduled messages yet</p>
              <p className="text-sm text-[var(--muted)]">Set dates on your campaign messages to see them here.</p>
            </div>
          ) : (
            items.map((item) => (
              <a
                key={item.id}
                href={`/campaigns/${item.campaign_id}`}
                className="block bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4 hover:border-[var(--accent)]/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${channelDot[item.channel]}`} />
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase ${channelColors[item.channel]}`}>
                        {item.channel}
                      </span>
                      {item.company_name && (
                        <span className="text-xs text-[var(--accent)]">{item.company_name}</span>
                      )}
                      <span className="text-xs text-[var(--muted)]">•</span>
                      <span className="text-sm font-medium truncate">{item.campaign_name}</span>
                      <span className="text-xs text-[var(--muted)]">#{item.sequence_order}</span>
                    </div>

                    {/* Content preview */}
                    <div className="ml-4">
                      {item.subject && (
                        <p className="text-sm text-[var(--fg)]/90 font-medium truncate">{item.subject}</p>
                      )}
                      <p className="text-xs text-[var(--muted)] truncate mt-0.5">
                        {item.body.length > 120 ? item.body.slice(0, 120) + "…" : item.body}
                      </p>
                      {item.cta_text && (
                        <p className="text-xs text-[var(--accent)] mt-1">CTA: {item.cta_text}</p>
                      )}
                    </div>
                  </div>

                  {/* Time + status */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold">
                      {formatTime(item.send_at)}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {new Date(item.send_at).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                    <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded ${item.status === "scheduled" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
