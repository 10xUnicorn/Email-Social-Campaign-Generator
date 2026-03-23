"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface ScheduledItem {
  id: string;
  campaign_id: string;
  campaign_name: string;
  sequence_order: number;
  channel: string;
  subject: string | null;
  body: string;
  send_at: string;
  status: string;
}

export default function CalendarPage() {
  const [items, setItems] = useState<ScheduledItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    loadScheduled();
  }, []);

  async function loadScheduled() {
    const { data } = await supabase
      .from("campaign_messages")
      .select("id, campaign_id, sequence_order, channel, subject, body, send_at, status, campaign:campaigns(name)")
      .not("send_at", "is", null)
      .order("send_at");

    const mapped = (data || []).map((d) => ({
      id: d.id,
      campaign_id: d.campaign_id,
      campaign_name: (d.campaign as unknown as { name: string } | null)?.name || "Unknown",
      sequence_order: d.sequence_order,
      channel: d.channel,
      subject: d.subject,
      body: d.body,
      send_at: d.send_at!,
      status: d.status,
    }));

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
    });
  }

  const channelColors: Record<string, string> = {
    email: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    sms: "bg-green-500/20 text-green-400 border-green-500/30",
    social: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  if (loading) {
    return <div className="text-center py-20 text-[var(--muted)]">Loading calendar...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Content Calendar</h1>
          <p className="text-[var(--muted)] mt-1">
            {items.length} scheduled messages across all campaigns
          </p>
        </div>
        <div className="flex gap-2">
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
                  className={`min-h-[100px] rounded-lg border p-2 ${
                    day
                      ? isToday
                        ? "border-[var(--accent)] bg-[var(--accent)]/5"
                        : "border-[var(--card-border)] bg-[var(--card)]"
                      : "border-transparent"
                  }`}
                >
                  {day && (
                    <>
                      <p className={`text-xs font-medium mb-1 ${isToday ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                        {day}
                      </p>
                      <div className="space-y-1">
                        {dayItems.slice(0, 3).map((item) => (
                          <a
                            key={item.id}
                            href={`/campaigns/${item.campaign_id}`}
                            className={`block text-xs px-1.5 py-0.5 rounded border truncate ${channelColors[item.channel] || "bg-white/5"}`}
                          >
                            {item.channel === "email" ? item.subject || item.campaign_name : item.campaign_name}
                          </a>
                        ))}
                        {dayItems.length > 3 && (
                          <p className="text-xs text-[var(--muted)]">+{dayItems.length - 3} more</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List view */
        <div className="space-y-3">
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase ${channelColors[item.channel]}`}>
                      {item.channel}
                    </span>
                    <span className="text-sm font-medium">{item.campaign_name}</span>
                    <span className="text-xs text-[var(--muted)]">#{item.sequence_order}</span>
                  </div>
                  <span className="text-xs text-[var(--muted)]">
                    {new Date(item.send_at).toLocaleDateString()} at{" "}
                    {new Date(item.send_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {item.subject && (
                  <p className="text-sm mt-2 text-[var(--fg)]/70 truncate">{item.subject}</p>
                )}
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
