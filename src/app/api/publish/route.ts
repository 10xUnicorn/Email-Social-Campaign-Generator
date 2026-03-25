import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PublishRequest {
  message_id: string;
  social_profile_id: string;
  custom_content?: string;
  custom_media_urls?: string[];
}

// Platform-specific publishing functions
async function publishToX(
  profile: Record<string, unknown>,
  content: string,
): Promise<{ success: boolean; external_id?: string; external_url?: string; error?: string }> {
  const apiKey = profile.api_key as string;
  const apiSecret = profile.api_secret as string;
  const accessToken = profile.access_token as string;

  if (!apiKey || !apiSecret || !accessToken) {
    return { success: false, error: "Missing X/Twitter API credentials. Configure API Key, API Secret, and Access Token." };
  }

  try {
    // X API v2 - Create Tweet
    const res = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: content.slice(0, 280) }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return { success: false, error: `X API error: ${res.status} - ${errBody}` };
    }

    const data = await res.json();
    const tweetId = data.data?.id;
    const profileName = profile.profile_name as string;
    return {
      success: true,
      external_id: tweetId,
      external_url: tweetId ? `https://x.com/${profileName}/status/${tweetId}` : undefined,
    };
  } catch (err) {
    return { success: false, error: `X publish failed: ${(err as Error).message}` };
  }
}

async function publishToLinkedIn(
  profile: Record<string, unknown>,
  content: string,
): Promise<{ success: boolean; external_id?: string; external_url?: string; error?: string }> {
  const accessToken = profile.access_token as string;
  const profileId = profile.profile_id as string;

  if (!accessToken || !profileId) {
    return { success: false, error: "Missing LinkedIn credentials. Configure Access Token and Profile ID (URN)." };
  }

  try {
    // LinkedIn API v2 - Create Post
    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: profileId.startsWith("urn:") ? profileId : `urn:li:person:${profileId}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: content },
            shareMediaCategory: "NONE",
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return { success: false, error: `LinkedIn API error: ${res.status} - ${errBody}` };
    }

    const data = await res.json();
    return {
      success: true,
      external_id: data.id,
      external_url: data.id ? `https://www.linkedin.com/feed/update/${data.id}` : undefined,
    };
  } catch (err) {
    return { success: false, error: `LinkedIn publish failed: ${(err as Error).message}` };
  }
}

async function publishToFacebook(
  profile: Record<string, unknown>,
  content: string,
): Promise<{ success: boolean; external_id?: string; external_url?: string; error?: string }> {
  const accessToken = profile.access_token as string;
  const pageId = profile.profile_id as string;

  if (!accessToken || !pageId) {
    return { success: false, error: "Missing Facebook credentials. Configure Page Access Token and Page ID." };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/feed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          access_token: accessToken,
        }),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      return { success: false, error: `Facebook API error: ${res.status} - ${errBody}` };
    }

    const data = await res.json();
    return {
      success: true,
      external_id: data.id,
      external_url: data.id ? `https://facebook.com/${data.id}` : undefined,
    };
  } catch (err) {
    return { success: false, error: `Facebook publish failed: ${(err as Error).message}` };
  }
}

async function publishToInstagram(
  profile: Record<string, unknown>,
  content: string,
): Promise<{ success: boolean; external_id?: string; external_url?: string; error?: string }> {
  const accessToken = profile.access_token as string;
  const igUserId = profile.profile_id as string;

  if (!accessToken || !igUserId) {
    return { success: false, error: "Missing Instagram credentials. Configure Access Token and Instagram Business Account ID." };
  }

  // Instagram Graph API requires media (image/video) for feed posts
  // For now, we'll create a text-only container (requires image URL in practice)
  return {
    success: false,
    error: "Instagram requires an image or video to publish. Attach media to the post first, or use the media library.",
  };
}

async function publishToTikTok(
  profile: Record<string, unknown>,
  content: string,
): Promise<{ success: boolean; external_id?: string; external_url?: string; error?: string }> {
  const accessToken = profile.access_token as string;

  if (!accessToken) {
    return { success: false, error: "Missing TikTok credentials. Configure Access Token." };
  }

  // TikTok Content Posting API requires video content
  return {
    success: false,
    error: "TikTok requires a video to publish. Attach a video from the media library first.",
  };
}

const PLATFORM_PUBLISHERS: Record<
  string,
  (profile: Record<string, unknown>, content: string) => Promise<{ success: boolean; external_id?: string; external_url?: string; error?: string }>
> = {
  x: publishToX,
  linkedin: publishToLinkedIn,
  facebook: publishToFacebook,
  instagram: publishToInstagram,
  tiktok: publishToTikTok,
};

// POST — publish content to a social profile
export async function POST(request: Request) {
  try {
    const { items }: { items: PublishRequest[] } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "items array required" }, { status: 400 });
    }

    const results: {
      message_id: string;
      profile_id: string;
      platform: string;
      success: boolean;
      external_url?: string;
      error?: string;
    }[] = [];

    for (const item of items) {
      // Load message
      const { data: message } = await supabase
        .from("campaign_messages")
        .select("*")
        .eq("id", item.message_id)
        .single();

      if (!message) {
        results.push({
          message_id: item.message_id,
          profile_id: item.social_profile_id,
          platform: "unknown",
          success: false,
          error: "Message not found",
        });
        continue;
      }

      // Load social profile (with real tokens)
      const { data: profile } = await supabase
        .from("social_profiles")
        .select("*")
        .eq("id", item.social_profile_id)
        .single();

      if (!profile) {
        results.push({
          message_id: item.message_id,
          profile_id: item.social_profile_id,
          platform: "unknown",
          success: false,
          error: "Social profile not found",
        });
        continue;
      }

      const content = item.custom_content || message.body;
      const publisher = PLATFORM_PUBLISHERS[profile.platform];

      let result: { success: boolean; external_id?: string; external_url?: string; error?: string };

      if (publisher) {
        result = await publisher(profile as Record<string, unknown>, content);
      } else {
        result = { success: false, error: `Unsupported platform: ${profile.platform}` };
      }

      // Record the publish attempt
      await supabase.from("published_posts").insert({
        message_id: item.message_id,
        social_profile_id: item.social_profile_id,
        external_post_id: result.external_id || null,
        external_url: result.external_url || null,
        platform: profile.platform,
        status: result.success ? "published" : "failed",
        error_message: result.error || null,
        custom_content: item.custom_content || null,
        custom_media_urls: item.custom_media_urls || null,
      });

      results.push({
        message_id: item.message_id,
        profile_id: item.social_profile_id,
        platform: profile.platform,
        success: result.success,
        external_url: result.external_url,
        error: result.error,
      });
    }

    const published = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      published,
      failed,
      total: results.length,
      results,
    });
  } catch (err) {
    console.error("Publish error:", err);
    return NextResponse.json({ error: "Publish failed" }, { status: 500 });
  }
}

// GET — list published posts for a message
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("message_id");
    const campaignId = searchParams.get("campaign_id");

    let query = supabase
      .from("published_posts")
      .select("*, social_profile:social_profiles(platform, profile_name, profile_url)")
      .order("published_at", { ascending: false });

    if (messageId) query = query.eq("message_id", messageId);
    if (campaignId) {
      // Get all message IDs for this campaign first
      const { data: msgs } = await supabase
        .from("campaign_messages")
        .select("id")
        .eq("campaign_id", campaignId);
      if (msgs && msgs.length > 0) {
        query = query.in("message_id", msgs.map((m: { id: string }) => m.id));
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("Published posts GET error:", err);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
