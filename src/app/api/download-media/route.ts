import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function detectPlatform(url: string): "instagram" | "tiktok" | "youtube" | "other" {
  if (url.includes("instagram.com") || url.includes("instagr.am")) return "instagram";
  if (url.includes("tiktok.com") || url.includes("vm.tiktok.com")) return "tiktok";
  if (url.includes("youtube.com") || url.includes("youtu.be") || url.includes("youtube.com/shorts")) return "youtube";
  return "other";
}

function detectMediaType(url: string, platform: string): "video" | "image" | "audio" {
  if (platform === "youtube" || platform === "tiktok") return "video";
  if (url.includes("/reel/") || url.includes("/reels/")) return "video";
  if (url.includes("/p/")) return "image";
  if (url.match(/\.(mp4|mov|avi|webm)/i)) return "video";
  if (url.match(/\.(jpg|jpeg|png|gif|webp)/i)) return "image";
  if (url.match(/\.(mp3|wav|aac)/i)) return "audio";
  return "video"; // default for social platforms
}

// Use oEmbed APIs to get metadata
async function getOembedData(url: string, platform: string): Promise<{
  title: string;
  thumbnail_url: string | null;
  author_name: string | null;
  description: string | null;
}> {
  try {
    let oembedUrl = "";

    switch (platform) {
      case "youtube":
        oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        break;
      case "instagram":
        oembedUrl = `https://graph.facebook.com/v19.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${process.env.META_ACCESS_TOKEN || ""}`;
        break;
      case "tiktok":
        oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
        break;
      default:
        return { title: "Downloaded Media", thumbnail_url: null, author_name: null, description: null };
    }

    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`oEmbed error: ${res.status}`);

    const data = await res.json();
    return {
      title: data.title || data.author_name || "Downloaded Media",
      thumbnail_url: data.thumbnail_url || null,
      author_name: data.author_name || null,
      description: data.title || null,
    };
  } catch {
    return { title: "Downloaded Media", thumbnail_url: null, author_name: null, description: null };
  }
}

// POST — download and save media info to library
export async function POST(request: Request) {
  try {
    const { url, title, tags, company_id } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }

    const platform = detectPlatform(url);
    const mediaType = detectMediaType(url, platform);

    // Get metadata via oEmbed
    const oembed = await getOembedData(url, platform);

    // Save to media library
    const { data, error } = await supabase
      .from("media_library")
      .insert({
        title: title || oembed.title,
        description: oembed.description,
        source_url: url,
        source_platform: platform,
        media_type: mediaType,
        thumbnail_url: oembed.thumbnail_url,
        metadata: {
          author: oembed.author_name,
          oembed_title: oembed.title,
          downloaded_at: new Date().toISOString(),
        },
        tags: tags || [],
        company_id: company_id || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      media: data,
      message: `Added to media library. Platform: ${platform}, Type: ${mediaType}`,
      download_note:
        platform === "youtube"
          ? "For direct video download, use a YouTube downloader service or yt-dlp locally."
          : platform === "tiktok"
          ? "For direct video download, use a TikTok downloader service."
          : platform === "instagram"
          ? "For direct media download, use an Instagram downloader service."
          : "Media reference saved.",
    });
  } catch (err) {
    console.error("Download media error:", err);
    return NextResponse.json({ error: "Failed to process media" }, { status: 500 });
  }
}

// GET — list media library
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");
    const mediaType = searchParams.get("type");
    const companyId = searchParams.get("company_id");
    const search = searchParams.get("search");

    let query = supabase
      .from("media_library")
      .select("*")
      .order("created_at", { ascending: false });

    if (platform) query = query.eq("source_platform", platform);
    if (mediaType) query = query.eq("media_type", mediaType);
    if (companyId) query = query.eq("company_id", companyId);
    if (search) query = query.ilike("title", `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("Media library GET error:", err);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

// DELETE — remove from library
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const { error } = await supabase.from("media_library").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Media library DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
