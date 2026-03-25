"use client";

import { useEffect, useState } from "react";
import type { MediaItem, Company } from "@/lib/types";
import { supabase } from "@/lib/supabase";

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "📸",
  tiktok: "🎵",
  youtube: "▶️",
  other: "🌐",
};

const TYPE_ICONS: Record<string, string> = {
  video: "🎬",
  image: "🖼️",
  audio: "🎧",
};

export default function MediaLibraryPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPlatform, setFilterPlatform] = useState("");
  const [filterType, setFilterType] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Download form
  const [showDownload, setShowDownload] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadTitle, setDownloadTitle] = useState("");
  const [downloadTags, setDownloadTags] = useState("");
  const [downloadCompany, setDownloadCompany] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterPlatform) params.set("platform", filterPlatform);
    if (filterType) params.set("type", filterType);
    if (searchQuery) params.set("search", searchQuery);

    const [mediaRes, companiesRes] = await Promise.all([
      fetch(`/api/download-media?${params.toString()}`),
      supabase.from("companies").select("*").order("name"),
    ]);

    const data = await mediaRes.json();
    if (Array.isArray(data)) setItems(data);
    if (companiesRes.data) setCompanies(companiesRes.data);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterPlatform, filterType, searchQuery]);

  async function handleDownload() {
    if (!downloadUrl.trim()) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/download-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: downloadUrl,
          title: downloadTitle || undefined,
          tags: downloadTags ? downloadTags.split(",").map((t) => t.trim()) : [],
          company_id: downloadCompany || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowDownload(false);
        setDownloadUrl("");
        setDownloadTitle("");
        setDownloadTags("");
        setDownloadCompany("");
        await loadData();
      } else {
        alert(data.error || "Failed to download");
      }
    } catch {
      alert("Failed to process URL");
    } finally {
      setDownloading(false);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Remove this from the media library?")) return;
    await fetch(`/api/download-media?id=${id}`, { method: "DELETE" });
    setItems(items.filter((i) => i.id !== id));
  }

  const platformCounts = items.reduce(
    (acc, i) => {
      const p = i.platform || "other";
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Media Library</h1>
          <p className="text-[var(--muted)] mt-1">
            {items.length} item{items.length !== 1 ? "s" : ""} —{" "}
            {Object.entries(platformCounts)
              .map(([p, c]) => `${c} ${p}`)
              .join(", ") || "empty"}
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/" className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs transition-colors">
            Dashboard
          </a>
          <a href="/social-profiles" className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs transition-colors">
            Social Profiles
          </a>
          <button
            onClick={() => setShowDownload(true)}
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Download Media
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title..."
          className="bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] w-60"
        />
        <select
          value={filterPlatform}
          onChange={(e) => setFilterPlatform(e.target.value)}
          className="bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="">All Platforms</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="youtube">YouTube</option>
          <option value="other">Other</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="">All Types</option>
          <option value="video">Video</option>
          <option value="image">Image</option>
          <option value="audio">Audio</option>
        </select>
      </div>

      {/* Items grid */}
      {loading ? (
        <div className="text-center py-20 text-[var(--muted)]">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-[var(--muted)]">
          <div className="text-4xl mb-4">🎬</div>
          <p className="text-lg mb-2">No media in library</p>
          <p className="text-sm mb-6">
            Download videos and images from Instagram, TikTok, and YouTube to repurpose in campaigns.
          </p>
          <button
            onClick={() => setShowDownload(true)}
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            + Download Your First Media
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl overflow-hidden group"
            >
              {/* Thumbnail or placeholder */}
              <div className="aspect-video bg-white/5 relative flex items-center justify-center">
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt={item.title || ""}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl">{TYPE_ICONS[item.media_type] || "📁"}</span>
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-black/60 text-white">
                    {PLATFORM_ICONS[item.platform || "other"]} {item.platform}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-black/60 text-white">
                    {item.media_type}
                  </span>
                </div>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="absolute top-2 right-2 text-xs bg-red-500/80 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm truncate">{item.title}</h3>
                {item.description && (
                  <p className="text-xs text-[var(--muted)] mt-1 line-clamp-2">{item.description}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    View Original
                  </a>
                  <span className="text-xs text-[var(--muted)]">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                {item.tags && item.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-[var(--muted)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Download Modal */}
      {showDownload && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Download Media</h3>
            <p className="text-xs text-[var(--muted)] mb-4 leading-relaxed">
              Paste a URL from Instagram, TikTok, or YouTube. We&apos;ll fetch metadata and add it
              to your media library for repurposing in campaigns.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1.5">URL *</label>
                <input
                  value={downloadUrl}
                  onChange={(e) => setDownloadUrl(e.target.value)}
                  placeholder="https://www.instagram.com/reel/... or https://youtube.com/watch?v=..."
                  className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--muted)] mb-1.5">Custom Title</label>
                <input
                  value={downloadTitle}
                  onChange={(e) => setDownloadTitle(e.target.value)}
                  placeholder="Leave empty to auto-detect..."
                  className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--muted)] mb-1.5">Tags (comma-separated)</label>
                <input
                  value={downloadTags}
                  onChange={(e) => setDownloadTags(e.target.value)}
                  placeholder="motivation, marketing, viral..."
                  className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--muted)] mb-1.5">Company</label>
                <select
                  value={downloadCompany}
                  onChange={(e) => setDownloadCompany(e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="">— No company —</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Quick paste URLs */}
              <div className="border-t border-[var(--card-border)] pt-3">
                <div className="text-xs text-[var(--muted)] mb-2">Supported platforms:</div>
                <div className="flex gap-2 flex-wrap text-xs">
                  <span className="px-2 py-1 rounded bg-pink-500/10 text-pink-400">📸 Instagram Posts & Reels</span>
                  <span className="px-2 py-1 rounded bg-white/5 text-[var(--muted)]">🎵 TikTok Videos</span>
                  <span className="px-2 py-1 rounded bg-red-500/10 text-red-400">▶️ YouTube Videos & Shorts</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--card-border)]">
              <button
                onClick={() => setShowDownload(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDownload}
                disabled={downloading || !downloadUrl.trim()}
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {downloading ? "Processing..." : "Add to Library"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
