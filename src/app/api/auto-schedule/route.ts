import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Best send times by channel (hours in 24h format)
const BEST_TIMES: Record<string, number[]> = {
  email: [9, 10, 14, 20],      // 9am, 10am, 2pm, 8pm
  sms: [10, 12, 17, 19],       // 10am, 12pm, 5pm, 7pm
  social: [8, 12, 17, 20],     // 8am, 12pm, 5pm, 8pm
};

// Minimum days between messages per channel
const MIN_GAP_DAYS: Record<string, number> = {
  email: 2,    // 2 days between emails
  sms: 3,      // 3 days between texts
  social: 1,   // 1 day between social posts
};

export async function POST(request: Request) {
  try {
    const { campaign_id, start_date } = await request.json();

    // Load unscheduled messages for this campaign
    const { data: messages } = await supabase
      .from("campaign_messages")
      .select("*")
      .eq("campaign_id", campaign_id)
      .is("send_at", null)
      .order("channel")
      .order("sequence_order");

    if (!messages || messages.length === 0) {
      return NextResponse.json({ message: "No unscheduled messages found" });
    }

    // Load already-scheduled messages to avoid conflicts
    const { data: scheduled } = await supabase
      .from("campaign_messages")
      .select("send_at, channel")
      .eq("campaign_id", campaign_id)
      .not("send_at", "is", null);

    const existingDates = (scheduled || []).map((s) => ({
      date: new Date(s.send_at!),
      channel: s.channel,
    }));

    // Group unscheduled messages by channel
    const byChannel: Record<string, typeof messages> = {};
    for (const msg of messages) {
      if (!byChannel[msg.channel]) byChannel[msg.channel] = [];
      byChannel[msg.channel].push(msg);
    }

    const startDate = start_date ? new Date(start_date) : new Date();
    // If start is in the past, use tomorrow
    if (startDate < new Date()) {
      startDate.setDate(new Date().getDate() + 1);
    }

    const updates: { id: string; send_at: string }[] = [];

    for (const [channel, msgs] of Object.entries(byChannel)) {
      const bestTimes = BEST_TIMES[channel] || [10, 14];
      const gapDays = MIN_GAP_DAYS[channel] || 2;
      let timeIndex = 0;

      // Find the latest existing scheduled date for this channel
      const channelExisting = existingDates
        .filter((e) => e.channel === channel)
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      let cursor = new Date(startDate);
      if (channelExisting.length > 0) {
        const lastScheduled = channelExisting[0].date;
        const minNext = new Date(lastScheduled);
        minNext.setDate(minNext.getDate() + gapDays);
        if (minNext > cursor) cursor = minNext;
      }

      for (const msg of msgs) {
        // Pick the best time for this message
        const hour = bestTimes[timeIndex % bestTimes.length];
        const scheduledDate = new Date(cursor);
        scheduledDate.setHours(hour, 0, 0, 0);

        // Ensure we're not scheduling on the same day as another message of the same channel
        let conflicts = true;
        while (conflicts) {
          const dateStr = scheduledDate.toISOString().split("T")[0];
          const hasConflict = [...existingDates, ...updates.map((u) => ({ date: new Date(u.send_at), channel }))].some(
            (e) => e.channel === channel && e.date.toISOString().split("T")[0] === dateStr
          );
          if (hasConflict) {
            scheduledDate.setDate(scheduledDate.getDate() + 1);
          } else {
            conflicts = false;
          }
        }

        updates.push({
          id: msg.id,
          send_at: scheduledDate.toISOString(),
        });

        // Move cursor forward
        cursor = new Date(scheduledDate);
        cursor.setDate(cursor.getDate() + gapDays);
        timeIndex++;
      }
    }

    // Batch update all messages
    for (const update of updates) {
      await supabase
        .from("campaign_messages")
        .update({ send_at: update.send_at, status: "scheduled" })
        .eq("id", update.id);
    }

    return NextResponse.json({
      scheduled_count: updates.length,
      updates: updates.map((u) => ({
        id: u.id,
        send_at: u.send_at,
      })),
    });
  } catch (err: unknown) {
    console.error("Auto-schedule error:", err);
    const message = err instanceof Error ? err.message : "Failed to auto-schedule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
