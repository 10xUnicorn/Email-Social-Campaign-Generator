"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Company, CampaignFolder } from "@/lib/types";
import { useEffect } from "react";

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: "📸", color: "from-pink-500/20 to-purple-500/20 border-pink-500/30" },
  { id: "facebook", label: "Facebook", icon: "📘", color: "from-blue-500/20 to-blue-600/20 border-blue-500/30" },
  { id: "linkedin", label: "LinkedIn", icon: "💼", color: "from-sky-500/20 to-blue-500/20 border-sky-500/30" },
  { id: "x", label: "X (Twitter)", icon: "𝕏", color: "from-zinc-500/20 to-zinc-600/20 border-zinc-400/30" },
  { id: "tiktok", label: "TikTok", icon: "🎵", color: "from-cyan-500/20 to-teal-500/20 border-cyan-500/30" },
];

export default function ContentIngest() {
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState<"video" | "image" | "text">("text");
  const [platforms, setPlatforms] = useState<string[]>(["instagram", "linkedin", "x"]);
  const [totalPosts, setTotalPosts] = useState(22);
  const [daysSpan, setDaysSpan] = useState(7);
  const [brandVoice, setBrandVoice] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");

  // Media assets
  const [mediaAssets, setMediaAssets] = useState<{ url: string; type: "image" | "video"; description: string }[]>([]);
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [newMediaType, setNewMediaType] = useState<"image" | "video">("image");
  const [newMediaDesc, setNewMediaDesc] = useState("");

  // Company/folder
  const [companies, setCompanies] = useState<Company[]>([]);
  const [folders, setFolders] = useState<CampaignFolder[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [folderId, setFolderId] = useState("");

  // State
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    campaign_id: string;
    total_posts: number;
    schedule_summary: { start: string; days: number; platforms: string[]; posts_per_day: number };
    posts: Array<{ post_number: number; platform: string; content: string; format: string; scheduled_at: string; has_media: boolean }>;
  } | null>(null);

  // Review state
  const [selectedPosts, setSelectedPosts] = useState<Set<number>>(new Set());
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("companies").select("*").order("name"),
      supabase.from("campaign_folders").select("*").order("name"),
    ]).then(([compRes, folderRes]) => {
      setCompanies(compRes.data || []);
      setFolders(folderRes.data || []);
    });
  }, []);

  function togglePlatform(id: string) {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function addMediaAsset() {
    if (!newMediaUrl.trim()) return;
    setMediaAssets((prev) => [...prev, { url: newMediaUrl.trim(), type: newMediaType, description: newMediaDesc.trim() }]);
    setNewMediaUrl("");
    setNewMediaDesc("");
  }

  function removeMediaAsset(idx: number) {
    setMediaAssets((prev) => prev.filter((_, i) => i !== idx));
  }

  function togglePostSelection(idx: number) {
    setSelectedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function selectAll() {
    if (result) {
      setSelectedPosts(new Set(result.posts.map((_, i) => i)));
    }
  }

  function deselectAll() {
    setSelectedPosts(new Set());
  }

  async function handleGenerate() {
    if (!content.trim()) return setError("Paste your content first");
    if (platforms.length === 0) return setError("Select at least one platform");

    setError("");
    setGenerating(true);
    setResult(null);

    try {
      const res = await fetch("/api/content-split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          content_type: contentType,
          media_assets: mediaAssets.length > 0 ? mediaAssets : undefined,
          platforms,
          total_posts: totalPosts,
          days_span: daysSpan,
          brand_voice: brandVoice || undefined,
          campaign_name: campaignName || undefined,
          company_id: companyId || undefined,
          folder_id: folderId || undefined,
          additional_instructions: additionalInstructions || undefined,
          notify_email: notifyEmail || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setResult(data);
      // Select all posts by default
      setSelectedPosts(new Set(data.posts.map((_: unknown, i: number) => i)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    }
    setGenerating(false);
  }

  async function handleApproveSelected() {
    if (!result) return;
    setApproving(true);

    try {
      // Get the message IDs for selected posts
      // For now, approve all since we just created them
      const res = await fetch("/api/approve-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: result.campaign_id,
          action: "approve_all",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Redirect to campaign page
      window.location.href = `/campaigns/${result.campaign_id}`;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Approval failed");
    }
    setApproving(false);
  }

  async function handleSaveDraft() {
    if (!result) return;
    window.location.href = `/campaigns/${result.campaign_id}`;
  }

  const filteredFolders = companyId ? folders.filter((f) => f.company_id === companyId) : folders;

  const platformColors: Record<string, string> = {
    instagram: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    facebook: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    linkedin: "bg-sky-500/20 text-sky-300 border-sky-500/30",
    x: "bg-zinc-500/20 text-zinc-300 border-zinc-400/30",
    tiktok: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  };

  // ── RESULT / REVIEW VIEW ──
  if (result) {
    return (
      <div className="max-w-5xl mx-auto pb-20">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl mb-8 p-8" style={{
          background: "linear-gradient(135deg, #059669 0%, #0891b2 50%, #7c3aed 100%)",
        }}>
          <div className="relative">
            <h1 className="text-3xl font-extrabold text-white mb-2">Posts Ready for Review</h1>
            <p className="text-white/80">
              {result.total_posts} posts across {result.schedule_summary.platforms.length} platform{result.schedule_summary.platforms.length > 1 ? "s" : ""} · {result.schedule_summary.days} days · Starting {new Date(result.schedule_summary.start).toLocaleDateString()}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-400 rounded-xl px-5 py-4 mb-6 text-sm font-medium flex items-center gap-3">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-3 mb-6 sticky top-0 z-10 bg-[var(--bg)]/90 backdrop-blur-lg py-4 px-2 -mx-2 rounded-xl">
          <button onClick={selectAll} className="text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all">Select All</button>
          <button onClick={deselectAll} className="text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all">Deselect All</button>
          <span className="text-xs text-white/30 ml-2">{selectedPosts.size} of {result.posts.length} selected</span>
          <div className="ml-auto flex gap-3">
            <button
              onClick={handleSaveDraft}
              className="px-5 py-2.5 rounded-xl text-sm font-bold border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all"
            >
              Save as Draft
            </button>
            <button
              onClick={handleApproveSelected}
              disabled={approving || selectedPosts.size === 0}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-emerald-500/20 disabled:opacity-40 transition-all"
              style={{ background: "linear-gradient(135deg, #059669 0%, #0891b2 100%)" }}
            >
              {approving ? "Approving..." : `Approve & Schedule (${selectedPosts.size})`}
            </button>
          </div>
        </div>

        {/* Posts grid */}
        <div className="space-y-3">
          {result.posts.map((post, idx) => (
            <div
              key={idx}
              className={`rounded-xl border-2 p-5 transition-all duration-200 cursor-pointer ${
                selectedPosts.has(idx)
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20"
              }`}
              onClick={() => togglePostSelection(idx)}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-all ${
                  selectedPosts.has(idx) ? "border-emerald-500 bg-emerald-500" : "border-white/20"
                }`}>
                  {selectedPosts.has(idx) && <span className="text-white text-xs font-bold">✓</span>}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Meta row */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded font-bold text-white/50">#{post.post_number}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase border ${platformColors[post.platform] || "bg-white/10 text-white/50"}`}>
                      {post.platform}
                    </span>
                    <span className="text-xs text-white/30 bg-white/5 px-2 py-1 rounded">{post.format}</span>
                    {post.has_media && <span className="text-xs bg-orange-500/15 text-orange-300 px-2 py-1 rounded-full border border-orange-500/20">📎 Media</span>}
                    <span className="text-xs text-white/20 ml-auto">
                      {post.scheduled_at ? new Date(post.scheduled_at).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}
                    </span>
                  </div>

                  {/* Content */}
                  <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom action bar */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
          <button
            onClick={() => { setResult(null); setSelectedPosts(new Set()); }}
            className="px-5 py-3 rounded-xl text-sm font-bold border border-white/10 text-white/60 hover:text-white transition-all"
          >
            ← Start Over
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleSaveDraft}
              className="px-6 py-3 rounded-xl text-sm font-bold border border-white/10 text-white/60 hover:text-white transition-all"
            >
              Save as Draft
            </button>
            <button
              onClick={handleApproveSelected}
              disabled={approving || selectedPosts.size === 0}
              className="px-8 py-3 rounded-xl text-base font-extrabold text-white shadow-2xl shadow-emerald-500/20 disabled:opacity-40 transition-all"
              style={{ background: "linear-gradient(135deg, #059669 0%, #0891b2 50%, #7c3aed 100%)" }}
            >
              {approving ? "⏳ Approving..." : `⚡ Approve & Schedule All`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── INPUT VIEW ──
  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl mb-8 p-8" style={{
        background: "linear-gradient(135deg, #059669 0%, #0891b2 50%, #7c3aed 100%)",
      }}>
        <div className="relative">
          <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Content Ingest</h1>
          <p className="text-white/80 text-lg">
            Drop one piece of content → Get {totalPosts} platform-optimized posts scheduled across {daysSpan} days.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-400 rounded-xl px-5 py-4 mb-6 text-sm font-medium flex items-center gap-3">
          <span>⚠️</span><span>{error}</span>
          <button onClick={() => setError("")} className="ml-auto text-red-400/60 hover:text-red-300">✕</button>
        </div>
      )}

      <div className="space-y-6">
        {/* Content input */}
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
          <label className="flex items-center gap-2 text-sm font-bold text-white mb-1">
            Your Content <span className="text-pink-400">*</span>
          </label>
          <p className="text-xs text-white/40 mb-3">
            Paste your video transcript, blog post, email, article, speech notes — anything. AI will repurpose it into {totalPosts} unique social posts.
          </p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your content here... This could be a video transcript, blog post, email newsletter, podcast notes, speech, or any piece of content you want to repurpose across social media."
            rows={8}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
          />
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs text-white/30">Content type:</span>
            {(["text", "video", "image"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setContentType(t)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  contentType === t
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                    : "border-white/10 text-white/40 hover:border-white/20"
                }`}
              >
                {t === "text" ? "📝 Text" : t === "video" ? "🎥 Video" : "🖼️ Image"}
              </button>
            ))}
          </div>
        </div>

        {/* Media Assets */}
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🎬</span>
            <h3 className="text-sm font-bold text-white">Media Assets</h3>
          </div>
          <p className="text-xs text-white/40 mb-4">
            Add images or videos. AI matches one per post — no repeats in sequence.
          </p>

          <div className="bg-black/20 rounded-xl p-4 mb-4 border border-white/5">
            <div className="flex gap-3 mb-3">
              <input
                type="text"
                value={newMediaUrl}
                onChange={(e) => setNewMediaUrl(e.target.value)}
                placeholder="Paste image or video URL..."
                className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500 transition-all"
              />
              <select
                value={newMediaType}
                onChange={(e) => setNewMediaType(e.target.value as "image" | "video")}
                className="bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="image">🖼️ Image</option>
                <option value="video">🎥 Video</option>
              </select>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={newMediaDesc}
                onChange={(e) => setNewMediaDesc(e.target.value)}
                placeholder="Describe this asset (helps AI match it to relevant posts)..."
                className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500 transition-all"
                onKeyDown={(e) => e.key === "Enter" && addMediaAsset()}
              />
              <button
                onClick={addMediaAsset}
                disabled={!newMediaUrl.trim()}
                className="px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-30"
                style={{ background: "linear-gradient(135deg, #059669 0%, #0891b2 100%)" }}
              >
                + Add
              </button>
            </div>
          </div>

          {mediaAssets.length > 0 && (
            <div className="space-y-2">
              {mediaAssets.map((asset, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-black/20 rounded-xl px-4 py-3 border border-white/5 group">
                  <span className="text-lg">{asset.type === "image" ? "🖼️" : "🎥"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{asset.url}</div>
                    {asset.description && <div className="text-xs text-white/40 truncate">{asset.description}</div>}
                  </div>
                  <button onClick={() => removeMediaAsset(idx)} className="text-white/20 hover:text-red-400 transition-colors">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Platform selector */}
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
          <label className="text-sm font-bold text-white mb-4 block">Target Platforms <span className="text-pink-400">*</span></label>
          <div className="grid grid-cols-5 gap-3">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => togglePlatform(p.id)}
                className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                  platforms.includes(p.id)
                    ? `bg-gradient-to-br ${p.color} shadow-lg scale-[1.02]`
                    : "border-white/10 bg-white/[0.02] hover:border-white/25"
                }`}
              >
                <span className="text-2xl block mb-1">{p.icon}</span>
                <span className={`text-xs font-bold ${platforms.includes(p.id) ? "text-white" : "text-white/50"}`}>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Schedule config */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-bold text-white">Total Posts</label>
              <span className="text-2xl font-extrabold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">{totalPosts}</span>
            </div>
            <input type="range" min={5} max={50} value={totalPosts} onChange={(e) => setTotalPosts(Number(e.target.value))} className="w-full accent-emerald-500 h-2" />
            <div className="flex justify-between text-xs text-white/30 mt-2"><span>5</span><span>50</span></div>
          </div>
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-bold text-white">Spread Across</label>
              <span className="text-2xl font-extrabold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">{daysSpan} days</span>
            </div>
            <input type="range" min={1} max={30} value={daysSpan} onChange={(e) => setDaysSpan(Number(e.target.value))} className="w-full accent-emerald-500 h-2" />
            <div className="flex justify-between text-xs text-white/30 mt-2"><span>1 day</span><span>30 days</span></div>
          </div>
        </div>

        {/* Optional config */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5">
            <label className="text-sm font-bold text-white mb-2 block">Campaign Name</label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Auto-generated if empty"
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5">
            <label className="text-sm font-bold text-white mb-2 block">Notification Email</label>
            <input
              type="email"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              placeholder="Get notified when posts are ready"
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5">
            <label className="text-sm font-bold text-white mb-2 block">Company</label>
            <select
              value={companyId}
              onChange={(e) => { setCompanyId(e.target.value); setFolderId(""); }}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
            >
              <option value="">No company</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5">
            <label className="text-sm font-bold text-white mb-2 block">Folder</label>
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
            >
              <option value="">No folder</option>
              {filteredFolders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        </div>

        {/* Brand Voice & Instructions */}
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
          <label className="text-sm font-bold text-white mb-2 block">Brand Voice</label>
          <textarea
            value={brandVoice}
            onChange={(e) => setBrandVoice(e.target.value)}
            placeholder="Describe your brand voice... e.g. Bold, empowering, direct. Like Gary Vee meets Simon Sinek."
            rows={2}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500 transition-all resize-none"
          />
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
          <label className="text-sm font-bold text-white mb-2 block">Additional Instructions</label>
          <textarea
            value={additionalInstructions}
            onChange={(e) => setAdditionalInstructions(e.target.value)}
            placeholder="Specific CTAs, links to include, topics to emphasize, things to avoid..."
            rows={2}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500 transition-all resize-none"
          />
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-br from-emerald-600/10 to-cyan-600/10 border-2 border-emerald-500/30 rounded-xl p-6">
          <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wide mb-3">Generation Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-white/40">Posts</div>
              <div className="text-lg font-extrabold text-white">{totalPosts}</div>
            </div>
            <div>
              <div className="text-xs text-white/40">Platforms</div>
              <div className="text-lg font-extrabold text-white">{platforms.length}</div>
            </div>
            <div>
              <div className="text-xs text-white/40">Schedule</div>
              <div className="text-lg font-extrabold text-white">{daysSpan} days</div>
            </div>
            <div>
              <div className="text-xs text-white/40">Media</div>
              <div className="text-lg font-extrabold text-white">{mediaAssets.length} asset{mediaAssets.length !== 1 ? "s" : ""}</div>
            </div>
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={generating || !content.trim() || platforms.length === 0}
          className="w-full py-5 rounded-xl font-extrabold text-lg text-white transition-all duration-300 shadow-2xl shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: generating
              ? "#333"
              : "linear-gradient(135deg, #059669 0%, #0891b2 50%, #7c3aed 100%)",
          }}
        >
          {generating ? (
            <span className="flex items-center justify-center gap-3">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating {totalPosts} posts across {platforms.length} platforms...
            </span>
          ) : (
            `⚡ Generate ${totalPosts} Posts`
          )}
        </button>
      </div>
    </div>
  );
}
