import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface MediaAsset {
  url: string;
  type: "image" | "video";
  description: string;
}

interface MessageSummary {
  id: string;
  subject: string | null;
  body: string;
  channel: string;
}

interface MatchResult {
  message_id: string;
  media_url: string | null;
  media_type: "image" | "video" | null;
}

export async function POST(request: Request) {
  try {
    const { campaign_id, media_assets, messages } = (await request.json()) as {
      campaign_id: string;
      media_assets: MediaAsset[];
      messages: MessageSummary[];
    };

    if (!campaign_id) {
      return Response.json({ error: "campaign_id required" }, { status: 400 });
    }
    if (!media_assets || media_assets.length === 0) {
      return Response.json({ error: "At least one media asset required" }, { status: 400 });
    }
    if (!messages || messages.length === 0) {
      return Response.json({ error: "No messages to match" }, { status: 400 });
    }

    // Build the AI prompt
    const prompt = `You are a social media content strategist. Match media assets to social media posts based on relevance.

MEDIA ASSETS:
${media_assets.map((a, i) => `${i + 1}. [${a.type.toUpperCase()}] ${a.url}\n   Description: ${a.description}`).join("\n")}

POSTS TO MATCH:
${messages.map((m, i) => `${i + 1}. ID: ${m.id}\n   Subject: ${m.subject || "N/A"}\n   Content: ${m.body}\n   Channel: ${m.channel}`).join("\n\n")}

RULES:
1. Match each post to the MOST RELEVANT media asset based on content alignment
2. Each post gets at most ONE media asset (image OR video, never both)
3. Not every post needs media — leave some as text-only for variety
4. Avoid assigning the same asset to consecutive posts (no sequential repeats)
5. Spread assets across posts — don't cluster the same asset
6. Video assets work best for dynamic/action content; images for static/inspirational
7. Aim for roughly 60-70% of posts having media, 30-40% text-only

OUTPUT FORMAT — return a JSON array of objects, one per post:
[
  {
    "message_id": "the-post-uuid",
    "media_url": "matched-asset-url-or-null",
    "media_type": "image" | "video" | null
  }
]

Return ONLY the JSON array, no other text.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const aiText = response.content[0].type === "text" ? response.content[0].text : "";

    let matches: MatchResult[];
    try {
      const jsonMatch = aiText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        matches = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON array found in AI response");
      }
    } catch {
      return Response.json({ error: "Failed to parse AI response", raw: aiText }, { status: 500 });
    }

    // Validate and enforce no-sequential-repeats + mutual exclusivity
    let lastUrl: string | null = null;
    const cleanedMatches: MatchResult[] = matches.map((m) => {
      // Ensure mutual exclusivity: only one of image_url or video_url
      const url = m.media_url || null;
      const type = m.media_type || null;

      // If same as last, skip (no sequential repeats)
      if (url && url === lastUrl) {
        return { message_id: m.message_id, media_url: null, media_type: null };
      }

      lastUrl = url;
      return { message_id: m.message_id, media_url: url, media_type: type };
    });

    // Batch update Supabase
    const updatePromises = cleanedMatches.map((m) => {
      const isVideo = m.media_type === "video";
      return supabase
        .from("campaign_messages")
        .update({
          image_url: m.media_url && !isVideo ? m.media_url : null,
          video_url: m.media_url && isVideo ? m.media_url : null,
        })
        .eq("id", m.message_id)
        .eq("campaign_id", campaign_id);
    });

    const results = await Promise.all(updatePromises);
    const errors = results.filter((r) => r.error);

    if (errors.length > 0) {
      return Response.json(
        {
          error: `${errors.length} of ${results.length} updates failed`,
          details: errors.map((e) => e.error?.message),
          matches: cleanedMatches,
        },
        { status: 207 }
      );
    }

    return Response.json({
      success: true,
      matched: cleanedMatches.filter((m) => m.media_url).length,
      text_only: cleanedMatches.filter((m) => !m.media_url).length,
      total: cleanedMatches.length,
      matches: cleanedMatches,
    });
  } catch (err) {
    console.error("Auto-match media error:", err);
    return Response.json({ error: "Auto-match failed" }, { status: 500 });
  }
}
