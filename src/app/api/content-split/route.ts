import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Platform constraints and best posting times
const PLATFORM_SPECS: Record<string, {
  name: string;
  maxChars: number;
  hashtagStyle: string;
  formats: string[];
  bestTimes: { hour: number; days: string }[];
  notes: string;
}> = {
  instagram: {
    name: "Instagram",
    maxChars: 2200,
    hashtagStyle: "Up to 30 hashtags, place at end or in first comment. Mix popular + niche.",
    formats: ["carousel caption", "reel caption", "story slide text", "single post"],
    bestTimes: [
      { hour: 11, days: "Mon,Wed,Fri" },
      { hour: 14, days: "Tue,Thu" },
      { hour: 17, days: "Sat,Sun" },
    ],
    notes: "Visual-first platform. Captions should complement the visual. Use line breaks for readability. Include a CTA.",
  },
  facebook: {
    name: "Facebook",
    maxChars: 63206,
    hashtagStyle: "2-5 hashtags max. Keep it natural, not spammy.",
    formats: ["text post", "link share post", "video caption", "story"],
    bestTimes: [
      { hour: 9, days: "Mon,Wed,Fri" },
      { hour: 13, days: "Tue,Thu" },
      { hour: 11, days: "Sat,Sun" },
    ],
    notes: "Encourage engagement with questions. Shorter posts (under 80 chars) get 66% more engagement. Video > images > text.",
  },
  linkedin: {
    name: "LinkedIn",
    maxChars: 3000,
    hashtagStyle: "3-5 professional hashtags. Industry-specific.",
    formats: ["thought leadership", "story post", "carousel description", "video post"],
    bestTimes: [
      { hour: 8, days: "Tue,Wed,Thu" },
      { hour: 12, days: "Mon,Fri" },
      { hour: 10, days: "Sat" },
    ],
    notes: "Professional tone but personal stories perform best. Hook in first 2 lines (before 'see more'). Use line breaks liberally.",
  },
  x: {
    name: "X (Twitter)",
    maxChars: 280,
    hashtagStyle: "1-2 hashtags max. Integrate into the text naturally.",
    formats: ["tweet", "thread opener", "quote tweet style", "poll question"],
    bestTimes: [
      { hour: 9, days: "Mon,Wed,Fri" },
      { hour: 12, days: "Tue,Thu" },
      { hour: 10, days: "Sat,Sun" },
    ],
    notes: "Punchy, bold, and opinionated. Threads perform well for long-form. Questions drive engagement.",
  },
  tiktok: {
    name: "TikTok",
    maxChars: 2200,
    hashtagStyle: "3-5 trending + niche hashtags. Research current trends.",
    formats: ["video caption", "duet prompt", "stitch prompt", "trending sound caption"],
    bestTimes: [
      { hour: 19, days: "Mon,Wed,Fri" },
      { hour: 12, days: "Tue,Thu" },
      { hour: 15, days: "Sat,Sun" },
    ],
    notes: "Casual, authentic, trend-aware. First 3 seconds matter most. Hook immediately. Use trending sounds/formats.",
  },
};

interface ContentSplitRequest {
  content: string;
  content_type?: string; // "video" | "image" | "text"
  media_assets?: { url: string; type: "image" | "video"; description: string }[];
  platforms: string[];
  total_posts?: number; // default 22
  days_span?: number; // default 7
  brand_voice?: string;
  campaign_name?: string;
  company_id?: string;
  folder_id?: string;
  additional_instructions?: string;
  notify_email?: string;
}

function buildSchedule(
  platforms: string[],
  totalPosts: number,
  daysSpan: number,
  startDate: Date
): { platform: string; scheduledAt: Date; dayIndex: number }[] {
  const schedule: { platform: string; scheduledAt: Date; dayIndex: number }[] = [];
  const postsPerDay = Math.ceil(totalPosts / daysSpan);

  // Distribute posts across days and platforms
  let postCount = 0;
  for (let day = 0; day < daysSpan && postCount < totalPosts; day++) {
    const dayDate = new Date(startDate);
    dayDate.setDate(dayDate.getDate() + day);
    const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayDate.getDay()];

    const dayPosts = Math.min(postsPerDay, totalPosts - postCount);

    for (let p = 0; p < dayPosts && postCount < totalPosts; p++) {
      // Round-robin platforms
      const platform = platforms[postCount % platforms.length];
      const spec = PLATFORM_SPECS[platform];

      // Find best time for this platform on this day
      let bestHour = 12; // default
      if (spec) {
        const dayMatch = spec.bestTimes.find((t) => t.days.includes(dayName));
        if (dayMatch) bestHour = dayMatch.hour;
        else bestHour = spec.bestTimes[0]?.hour || 12;
      }

      // Stagger times slightly to avoid posting at exact same time
      const staggerMinutes = p * 90; // 90 min apart
      const postDate = new Date(dayDate);
      postDate.setHours(bestHour, staggerMinutes % 60, 0, 0);
      if (staggerMinutes >= 60) {
        postDate.setHours(postDate.getHours() + Math.floor(staggerMinutes / 60));
      }

      schedule.push({ platform, scheduledAt: postDate, dayIndex: day });
      postCount++;
    }
  }

  return schedule;
}

function assignMediaToSchedule(
  schedule: { platform: string; scheduledAt: Date; dayIndex: number }[],
  mediaAssets: { url: string; type: "image" | "video"; description: string }[]
): (string | null)[] {
  if (!mediaAssets || mediaAssets.length === 0) return schedule.map(() => null);

  const assignments: (string | null)[] = [];
  let lastAssignedIdx = -1;

  for (let i = 0; i < schedule.length; i++) {
    if (mediaAssets.length === 0) {
      assignments.push(null);
      continue;
    }

    // Pick next asset, avoiding sequential repeats
    let assetIdx = (lastAssignedIdx + 1) % mediaAssets.length;

    // If only 1 asset, alternate between using it and not
    if (mediaAssets.length === 1) {
      assignments.push(i % 2 === 0 ? mediaAssets[0].url : null);
      if (i % 2 === 0) lastAssignedIdx = 0;
      continue;
    }

    assignments.push(mediaAssets[assetIdx].url);
    lastAssignedIdx = assetIdx;
  }

  return assignments;
}

export async function POST(request: Request) {
  try {
    const req: ContentSplitRequest = await request.json();

    if (!req.content?.trim()) {
      return Response.json({ error: "Content is required" }, { status: 400 });
    }
    if (!req.platforms || req.platforms.length === 0) {
      return Response.json({ error: "At least one platform is required" }, { status: 400 });
    }

    const totalPosts = req.total_posts || 22;
    const daysSpan = req.days_span || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1); // Start tomorrow

    // Build schedule
    const schedule = buildSchedule(req.platforms, totalPosts, daysSpan, startDate);

    // Assign media assets (no sequential repeats)
    const mediaAssignments = assignMediaToSchedule(schedule, req.media_assets || []);

    // Build media context for the AI
    const mediaContext = req.media_assets?.length
      ? `\nMEDIA ASSETS AVAILABLE:\n${req.media_assets.map((a, i) => `${i + 1}. [${a.type.toUpperCase()}] ${a.url}\n   Description: ${a.description || "No description"}`).join("\n")}\n\nIMPORTANT: Each post has been pre-assigned a media asset. Reference the assigned media naturally in the post copy. If no media is assigned, make the post text-only.`
      : "";

    // Build platform specs for the prompt
    const platformSpecs = req.platforms
      .map((p) => {
        const spec = PLATFORM_SPECS[p];
        if (!spec) return `${p}: Standard social media post`;
        return `${spec.name}:
  - Max characters: ${spec.maxChars}
  - Hashtag style: ${spec.hashtagStyle}
  - Formats to use: ${spec.formats.join(", ")}
  - Notes: ${spec.notes}`;
      })
      .join("\n\n");

    // Build the schedule description for the AI
    const scheduleDesc = schedule
      .map((s, i) => {
        const mediaUrl = mediaAssignments[i];
        const mediaNote = mediaUrl
          ? ` [MEDIA: ${req.media_assets?.find((a) => a.url === mediaUrl)?.description || mediaUrl}]`
          : " [TEXT-ONLY]";
        return `Post ${i + 1}: ${s.platform} — ${s.scheduledAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${s.scheduledAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}${mediaNote}`;
      })
      .join("\n");

    const prompt = `You are an expert content strategist and social media copywriter. Your job is to take ONE piece of content and repurpose it into ${totalPosts} unique, platform-optimized posts spread across ${daysSpan} days.

ORIGINAL CONTENT:
${req.content}

${req.content_type ? `Content type: ${req.content_type}` : ""}
${req.brand_voice ? `\nBRAND VOICE:\n${req.brand_voice}` : ""}
${req.additional_instructions ? `\nADDITIONAL INSTRUCTIONS:\n${req.additional_instructions}` : ""}
${mediaContext}

PLATFORM SPECIFICATIONS:
${platformSpecs}

POSTING SCHEDULE:
${scheduleDesc}

RULES:
1. Every post MUST be unique — different angle, hook, format, or takeaway from the original content
2. Respect each platform's character limits and formatting conventions
3. Include platform-appropriate hashtags (follow the style guide for each platform)
4. DO NOT tag or @mention any profiles unless you are 100% certain it's the correct handle
5. DO NOT add collaborators
6. Vary the content formats: questions, tips, stories, bold claims, listicles, quotes, hot takes
7. Each post should stand alone — someone should understand it without seeing the others
8. For posts with assigned media, reference the visual content naturally
9. For text-only posts, make the text compelling enough to stand alone
10. Front-load the hook — first line must stop the scroll

OUTPUT FORMAT:
Return a JSON array of exactly ${totalPosts} objects:
[
  {
    "post_number": 1,
    "platform": "instagram",
    "content": "The full post text with hashtags included",
    "format": "carousel caption",
    "hook": "The first line / scroll-stopping hook",
    "hashtags": ["#tag1", "#tag2"],
    "has_media": true,
    "media_url": "url if assigned or null",
    "notes": "Brief note on the angle/approach"
  }
]

Return ONLY the JSON array, no other text.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    const aiText = response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON from response
    let posts: Array<{
      post_number: number;
      platform: string;
      content: string;
      format: string;
      hook: string;
      hashtags: string[];
      has_media: boolean;
      media_url: string | null;
      notes: string;
    }>;

    try {
      // Try to find JSON array in the response
      const jsonMatch = aiText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        posts = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON array found in response");
      }
    } catch {
      return Response.json({ error: "Failed to parse AI response", raw: aiText }, { status: 500 });
    }

    // Create campaign in Supabase
    const campaignName = req.campaign_name || `Content Split — ${new Date().toLocaleDateString()}`;
    const { data: campaign, error: campError } = await supabase
      .from("campaigns")
      .insert({
        name: campaignName,
        description: req.content.slice(0, 500),
        goal: "content_repurpose",
        audience: "Multi-platform audience",
        num_messages: totalPosts,
        channels: ["social"],
        status: "draft",
        company_id: req.company_id || null,
        folder_id: req.folder_id || null,
        schedule_start: startDate.toISOString(),
      })
      .select()
      .single();

    if (campError || !campaign) {
      return Response.json({ error: "Failed to create campaign", detail: campError?.message }, { status: 500 });
    }

    // Insert messages
    const messages = posts.map((post, idx) => ({
      campaign_id: campaign.id,
      sequence_order: post.post_number || idx + 1,
      channel: "social" as const,
      subject: `[${(post.platform || "social").toUpperCase()}] ${post.hook?.slice(0, 80) || "Post " + (idx + 1)}`,
      body: post.content,
      preview_text: post.format || null,
      cta_text: post.hashtags?.join(" ") || null,
      cta_url: post.media_url || null,
      send_at: schedule[idx]?.scheduledAt.toISOString() || null,
      status: "draft" as const,
    }));

    const { error: msgError } = await supabase.from("campaign_messages").insert(messages);

    if (msgError) {
      return Response.json({ error: "Failed to save messages", detail: msgError.message }, { status: 500 });
    }

    // Send notification email if requested
    if (req.notify_email) {
      // We'll use a simple approach — trigger the notify endpoint
      try {
        const baseUrl = request.headers.get("origin") || request.headers.get("host") || "";
        const protocol = baseUrl.startsWith("http") ? "" : "https://";
        await fetch(`${protocol}${baseUrl}/api/notify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: req.notify_email,
            campaign_id: campaign.id,
            campaign_name: campaignName,
            total_posts: totalPosts,
            type: "posts_ready",
          }),
        });
      } catch {
        // Non-blocking — notification failure shouldn't break the flow
      }
    }

    return Response.json({
      success: true,
      campaign_id: campaign.id,
      total_posts: posts.length,
      schedule_summary: {
        start: startDate.toISOString(),
        days: daysSpan,
        platforms: req.platforms,
        posts_per_day: Math.ceil(totalPosts / daysSpan),
      },
      posts: posts.map((p, i) => ({
        ...p,
        scheduled_at: schedule[i]?.scheduledAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("Content split error:", err);
    return Response.json({ error: "Content split failed" }, { status: 500 });
  }
}
