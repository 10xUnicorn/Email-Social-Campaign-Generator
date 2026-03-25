import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Best send times by channel (hours in 24h format)
const BEST_TIMES: Record<string, number[]> = {
  email: [9, 10, 14, 20],
  sms: [10, 12, 17, 19],
  social: [8, 12, 17, 20],
};

const MIN_GAP_DAYS: Record<string, number> = {
  email: 2,
  sms: 3,
  social: 1,
};

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

export async function POST(request: Request) {
  try {
    const { message_ids, start_date, end_date, instructions } = await request.json();

    if (!message_ids || message_ids.length === 0) {
      return NextResponse.json({ error: "No messages selected" }, { status: 400 });
    }
    if (!start_date || !end_date) {
      return NextResponse.json({ error: "Start and end dates required" }, { status: 400 });
    }

    const rangeStart = new Date(start_date);
    const rangeEnd = new Date(end_date);

    // Parse instructions
    const lower = (instructions || "").toLowerCase();
    const weekdaysOnly = lower.includes("weekday") || lower.includes("no weekend") || lower.includes("business day");
    const preferMorning = lower.includes("morning") || lower.includes("early");
    const preferEvening = lower.includes("evening") || lower.includes("after work") || lower.includes("night");
    const spreadEvenly = lower.includes("spread") || lower.includes("even") || lower.includes("distribute");

    // Load the selected messages
    const { data: selectedMessages } = await supabase
      .from("campaign_messages")
      .select("*, campaign:campaigns(company_id)")
      .in("id", message_ids);

    if (!selectedMessages || selectedMessages.length === 0) {
      return NextResponse.json({ error: "Messages not found" }, { status: 404 });
    }

    // Get all company IDs involved
    const companyIds = [...new Set(
      selectedMessages
        .map((m) => (m.campaign as unknown as { company_id: string | null })?.company_id)
        .filter(Boolean)
    )];

    // Load ALL other scheduled messages that are NOT in our shuffle set
    // so we can avoid conflicts
    let otherScheduled: { date: Date; channel: string }[] = [];

    if (companyIds.length > 0) {
      const { data: companyCampaigns } = await supabase
        .from("campaigns")
        .select("id")
        .in("company_id", companyIds);

      const campIds = (companyCampaigns || []).map((c) => c.id);

      if (campIds.length > 0) {
        const { data: otherMsgs } = await supabase
          .from("campaign_messages")
          .select("id, send_at, channel")
          .in("campaign_id", campIds)
          .not("send_at", "is", null);

        otherScheduled = (otherMsgs || [])
          .filter((m) => !message_ids.includes(m.id))
          .map((m) => ({ date: new Date(m.send_at!), channel: m.channel }));
      }
    } else {
      // No company — just load all scheduled messages not in our set
      const { data: allMsgs } = await supabase
        .from("campaign_messages")
        .select("id, send_at, channel")
        .not("send_at", "is", null);

      otherScheduled = (allMsgs || [])
        .filter((m) => !message_ids.includes(m.id))
        .map((m) => ({ date: new Date(m.send_at!), channel: m.channel }));
    }

    // Group selected messages by channel
    const byChannel: Record<string, typeof selectedMessages> = {};
    for (const msg of selectedMessages) {
      if (!byChannel[msg.channel]) byChannel[msg.channel] = [];
      byChannel[msg.channel].push(msg);
    }

    // Calculate available days in range
    const totalDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const updates: { id: string; send_at: string }[] = [];

    for (const [channel, msgs] of Object.entries(byChannel)) {
      let bestTimes = BEST_TIMES[channel] || [10, 14];
      if (preferMorning) bestTimes = [7, 8, 9, 10];
      if (preferEvening) bestTimes = [17, 18, 19, 20];

      const gapDays = MIN_GAP_DAYS[channel] ?? 2;

      // If spread evenly, calculate ideal spacing
      const idealGap = spreadEvenly
        ? Math.max(gapDays, Math.floor(totalDays / msgs.length))
        : gapDays;

      let timeIndex = 0;
      let cursor = new Date(rangeStart);

      // Sort by sequence order
      msgs.sort((a, b) => a.sequence_order - b.sequence_order);

      for (const msg of msgs) {
        const hour = bestTimes[timeIndex % bestTimes.length];
        const scheduledDate = new Date(cursor);
        scheduledDate.setHours(hour, 0, 0, 0);

        // Skip weekends if instructed
        if (weekdaysOnly) {
          while (!isWeekday(scheduledDate)) {
            scheduledDate.setDate(scheduledDate.getDate() + 1);
          }
        }

        let conflicts = true;
        let safetyCounter = 0;
        while (conflicts && safetyCounter < 365) {
          safetyCounter++;

          if (scheduledDate > rangeEnd) break;

          if (weekdaysOnly && !isWeekday(scheduledDate)) {
            scheduledDate.setDate(scheduledDate.getDate() + 1);
            scheduledDate.setHours(bestTimes[0], 0, 0, 0);
            continue;
          }

          const dateStr = scheduledDate.toISOString().split("T")[0];
          const scheduledHour = scheduledDate.getHours();

          const hasConflict = [
            ...otherScheduled,
            ...updates.map((u) => ({ date: new Date(u.send_at), channel })),
          ].some((e) => {
            const eDate = e.date.toISOString().split("T")[0];
            const eHour = e.date.getHours();
            if (e.channel === channel && eDate === dateStr) return true;
            if (eDate === dateStr && eHour === scheduledHour) return true;
            return false;
          });

          if (hasConflict) {
            const triedTimes = new Set(
              [...otherScheduled, ...updates.map((u) => ({ date: new Date(u.send_at), channel }))]
                .filter((e) => e.date.toISOString().split("T")[0] === dateStr)
                .map((e) => e.date.getHours())
            );
            const availableTime = bestTimes.find((t) => !triedTimes.has(t) && t > scheduledHour);
            if (availableTime !== undefined) {
              scheduledDate.setHours(availableTime, 0, 0, 0);
              continue;
            }
            scheduledDate.setDate(scheduledDate.getDate() + 1);
            scheduledDate.setHours(bestTimes[0], 0, 0, 0);
          } else {
            conflicts = false;
          }
        }

        if (scheduledDate > rangeEnd) continue;

        updates.push({
          id: msg.id,
          send_at: scheduledDate.toISOString(),
        });

        cursor = new Date(scheduledDate);
        cursor.setDate(cursor.getDate() + idealGap);
        timeIndex++;
      }
    }

    // Batch update
    for (const update of updates) {
      await supabase
        .from("campaign_messages")
        .update({ send_at: update.send_at, status: "scheduled" })
        .eq("id", update.id);
    }

    return NextResponse.json({
      shuffled_count: updates.length,
      total_selected: message_ids.length,
      updates: updates.map((u) => ({ id: u.id, send_at: u.send_at })),
    });
  } catch (err: unknown) {
    console.error("Smart shuffle error:", err);
    const message = err instanceof Error ? err.message : "Failed to shuffle";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
