"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Campaign, CampaignMessage, CampaignFile } from "@/lib/types";

const REVISE_PRESETS = [
  { label: "More Urgent", prompt: "Make this more urgent with stronger calls to action" },
  { label: "More Casual", prompt: "Rewrite in a more casual, friendly, conversational tone" },
  { label: "More Professional", prompt: "Make this more professional and polished" },
  { label: "Shorter", prompt: "Make this significantly shorter and punchier while keeping the core message" },
  { label: "Longer", prompt: "Expand this with more detail, value, and storytelling" },
  { label: "More Persuasive", prompt: "Add more persuasion triggers: social proof, urgency, scarcity, authority" },
  { label: "Story-based", prompt: "Rewrite this using storytelling — open with a hook, build tension, resolve with CTA" },
  { label: "Add Emoji", prompt: "Add tasteful emojis to make this more engaging and scannable" },
];

export default function CampaignDetail() {
  const params = useParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [messages, setMessages] = useState<CampaignMessage[]>([]);
  const [files, setFiles] = useState<CampaignFile[]>([]);
  const [activeChannel, setActiveChannel] = useState<string>("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [revising, setRevising] = useState<string | null>(null);
  const [revisePrompt, setRevisePrompt] = useState("");
  const [reviseLoading, setReviseLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [dupChannels, setDupChannels] = useState<string[]>([]);
  const [showDupModal, setShowDupModal] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, { score: number; tips: string[] }>>({});
  const [scoringId, setScoringId] = useState<string | null>(null);

  // Add content state
  const [showAddContent, setShowAddContent] = useState(false);
  const [addChannel, setAddChannel] = useState("email");
  const [addCount, setAddCount] = useState(1);
  const [addPrompt, setAddPrompt] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Auto-schedule state
  const [autoScheduling, setAutoScheduling] = useState(false);
  const [scheduleStartDate, setScheduleStartDate] = useState("");
  const [showScheduleConfig, setShowScheduleConfig] = useState(false);

  // HTML email state
  const [generatingHtml, setGeneratingHtml] = useState<string | null>(null);
  const [htmlPreviews, setHtmlPreviews] = useState<Record<string, string>>({});
  const [showHtmlPreview, setShowHtmlPreview] = useState<string | null>(null);

  const loadCampaign = useCallback(async () => {
    const [campRes, msgsRes, filesRes] = await Promise.all([
      supabase
        .from("campaigns")
        .select("*, brand_voice:brand_voices(*), company:companies(*), folder:campaign_folders(*)")
        .eq("id", params.id)
        .single(),
      supabase
        .from("campaign_messages")
        .select("*")
        .eq("campaign_id", params.id)
        .order("channel")
        .order("sequence_order"),
      supabase
        .from("campaign_files")
        .select("*")
        .eq("campaign_id", params.id)
        .order("created_at"),
    ]);

    setCampaign(campRes.data);
    setMessages(msgsRes.data || []);
    setFiles(filesRes.data || []);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  async function updateMessage(id: string, updates: Partial<CampaignMessage>) {
    await supabase.from("campaign_messages").update(updates).eq("id", id);
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
    setEditing(null);
  }

  async function updateStatus(status: string) {
    await supabase.from("campaigns").update({ status }).eq("id", params.id);
    setCampaign((prev) => (prev ? { ...prev, status: status as Campaign["status"] } : null));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || !campaign) return;
    setUploading(true);

    for (const file of Array.from(fileList)) {
      const filePath = `${campaign.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("campaign-files").upload(filePath, file);
      if (uploadError) { console.error("Upload error:", uploadError); continue; }
      const { data: urlData } = supabase.storage.from("campaign-files").getPublicUrl(filePath);
      await supabase.from("campaign_files").insert({
        campaign_id: campaign.id,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type.startsWith("image/") ? "image" : file.type.includes("pdf") ? "document" : "other",
        file_size: file.size,
      });
    }

    setUploading(false);
    loadCampaign();
    e.target.value = "";
  }

  async function deleteFile(id: string) {
    await supabase.from("campaign_files").delete().eq("id", id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  // ── AI Revise ──
  async function handleRevise(msgId: string, customPrompt?: string) {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;
    setReviseLoading(true);

    try {
      const res = await fetch("/api/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message_id: msgId, channel: msg.channel, subject: msg.subject, body: msg.body,
          cta_text: msg.cta_text, revision_prompt: customPrompt || revisePrompt, campaign_goal: campaign?.goal,
        }),
      });
      if (!res.ok) throw new Error("Revision failed");
      const data = await res.json();

      const updates = {
        subject: data.subject || msg.subject,
        body: data.body || msg.body,
        cta_text: data.cta_text || msg.cta_text,
        preview_text: data.preview_text || msg.preview_text,
      };

      setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, ...updates } : m));
      await supabase.from("campaign_messages").update(updates).eq("id", msgId);
      setRevising(null);
      setRevisePrompt("");
    } catch (err) {
      console.error("Revise error:", err);
    }
    setReviseLoading(false);
  }

  // ── Confidence Score ──
  async function getConfidenceScore(msgId: string) {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;
    setScoringId(msgId);

    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: msg.channel, subject: msg.subject, body: msg.body, cta_text: msg.cta_text,
          campaign_goal: campaign?.goal, audience: campaign?.audience,
        }),
      });
      if (!res.ok) throw new Error("Scoring failed");
      const data = await res.json();
      setScores((prev) => ({ ...prev, [msgId]: { score: data.score, tips: data.tips } }));
    } catch (err) {
      console.error("Score error:", err);
    }
    setScoringId(null);
  }

  // ── Copy to Clipboard ──
  async function copyToClipboard(msg: CampaignMessage) {
    let text = "";
    if (msg.subject) text += `Subject: ${msg.subject}\n\n`;
    text += msg.body;
    if (msg.cta_text) text += `\n\n${msg.cta_text}`;
    await navigator.clipboard.writeText(text);
    setCopied(msg.id);
    setTimeout(() => setCopied(null), 2000);
  }

  // ── Copy HTML to Clipboard ──
  async function copyHtmlToClipboard(msgId: string) {
    const html = htmlPreviews[msgId];
    if (!html) return;
    await navigator.clipboard.writeText(html);
    setCopied(msgId + "-html");
    setTimeout(() => setCopied(null), 2000);
  }

  // ── Export HTML as file ──
  function exportHtml(msgId: string, subject: string | null) {
    const html = htmlPreviews[msgId];
    if (!html) return;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(subject || "email").replace(/[^a-z0-9]/gi, "_")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Schedule Message ──
  async function scheduleMessage(msgId: string, dateTime: string) {
    const updates = dateTime
      ? { send_at: dateTime, status: "scheduled" as const }
      : { send_at: null, status: "draft" as const };
    await supabase.from("campaign_messages").update(updates).eq("id", msgId);
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, ...updates } : m)));
  }

  // ── Add Content to Campaign ──
  async function handleAddContent() {
    if (!campaign) return;
    setAddLoading(true);

    try {
      const res = await fetch("/api/add-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaign.id,
          channel: addChannel,
          num_messages: addCount,
          custom_prompt: addPrompt || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to add content");
      const data = await res.json();
      setMessages((prev) => [...prev, ...(data.messages || [])]);
      setShowAddContent(false);
      setAddPrompt("");
      setAddCount(1);
    } catch (err) {
      console.error("Add content error:", err);
    }
    setAddLoading(false);
  }

  // ── Auto-Schedule ──
  async function handleAutoSchedule() {
    if (!campaign) return;
    setAutoScheduling(true);

    try {
      const res = await fetch("/api/auto-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaign.id,
          start_date: scheduleStartDate || new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error("Auto-schedule failed");
      const data = await res.json();

      if (data.updates) {
        setMessages((prev) =>
          prev.map((m) => {
            const update = data.updates.find((u: { id: string }) => u.id === m.id);
            return update ? { ...m, send_at: update.send_at, status: "scheduled" as const } : m;
          })
        );
      }
      setShowScheduleConfig(false);
    } catch (err) {
      console.error("Auto-schedule error:", err);
    }
    setAutoScheduling(false);
  }

  // ── Generate HTML Email Template ──
  async function generateHtmlEmail(msgId: string) {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg || msg.channel !== "email") return;
    setGeneratingHtml(msgId);

    try {
      // Detect platform from variable set
      let platform = "generic";
      if (campaign?.variable_set_id) {
        const { data: vs } = await supabase
          .from("variable_sets")
          .select("platform")
          .eq("id", campaign.variable_set_id)
          .single();
        if (vs?.platform) platform = vs.platform;
      }

      const res = await fetch("/api/generate-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: msg.subject,
          body: msg.body,
          cta_text: msg.cta_text,
          preview_text: msg.preview_text,
          brand_color: "#7c3aed",
          platform,
        }),
      });

      if (!res.ok) throw new Error("HTML generation failed");
      const data = await res.json();
      setHtmlPreviews((prev) => ({ ...prev, [msgId]: data.html }));
      setShowHtmlPreview(msgId);
    } catch (err) {
      console.error("HTML gen error:", err);
    }
    setGeneratingHtml(null);
  }

  // ── Duplicate Campaign ──
  async function duplicateCampaign() {
    if (!campaign || dupChannels.length === 0) return;
    setDuplicating(true);

    const { data: newCamp } = await supabase
      .from("campaigns")
      .insert({
        name: `${campaign.name} (Copy)`, description: campaign.description,
        brand_voice_id: campaign.brand_voice_id, company_id: campaign.company_id,
        folder_id: campaign.folder_id, goal: campaign.goal, audience: campaign.audience,
        num_messages: campaign.num_messages, channels: dupChannels, status: "draft",
        variable_set_id: campaign.variable_set_id, duplicated_from_id: campaign.id,
        imported_url: campaign.imported_url,
      })
      .select().single();

    if (newCamp) {
      const msgsToCopy = messages.filter((m) => dupChannels.includes(m.channel));
      if (msgsToCopy.length > 0) {
        const newMsgs = msgsToCopy.map((m) => ({
          campaign_id: newCamp.id, sequence_order: m.sequence_order, channel: m.channel,
          subject: m.subject, body: m.body, preview_text: m.preview_text, cta_text: m.cta_text, status: "draft",
        }));
        await supabase.from("campaign_messages").insert(newMsgs);
      }
      window.location.href = `/campaigns/${newCamp.id}`;
    }
    setDuplicating(false);
    setShowDupModal(false);
  }

  // ── Delete Message ──
  async function deleteMessage(id: string) {
    await supabase.from("campaign_messages").delete().eq("id", id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  const filteredMessages = activeChannel === "all" ? messages : messages.filter((m) => m.channel === activeChannel);
  const channelCounts = messages.reduce<Record<string, number>>((acc, m) => { acc[m.channel] = (acc[m.channel] || 0) + 1; return acc; }, {});
  const uniqueChannels = [...new Set(messages.map((m) => m.channel))];
  const unscheduledCount = messages.filter((m) => !m.send_at).length;

  if (loading) return <div className="text-center py-20 text-[var(--muted)]">Loading...</div>;
  if (!campaign) return <div className="text-center py-20 text-[var(--muted)]">Campaign not found</div>;

  const statusColors: Record<string, string> = {
    draft: "bg-yellow-500/20 text-yellow-400",
    active: "bg-green-500/20 text-green-400",
    paused: "bg-orange-500/20 text-orange-400",
    completed: "bg-blue-500/20 text-blue-400",
  };

  const channelColors: Record<string, string> = {
    email: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    sms: "bg-green-500/20 text-green-400 border-green-500/30",
    social: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };

  function scoreColor(s: number) {
    if (s >= 85) return "text-green-400";
    if (s >= 70) return "text-yellow-400";
    if (s >= 50) return "text-orange-400";
    return "text-red-400";
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusColors[campaign.status]}`}>{campaign.status}</span>
          </div>
          {campaign.description && <p className="text-[var(--muted)] mb-3">{campaign.description}</p>}
          <div className="flex flex-wrap gap-4 text-xs text-[var(--muted)]">
            {campaign.company && <span>Company: {campaign.company.name}</span>}
            {campaign.folder && <span>Folder: {campaign.folder.name}</span>}
            <span>Goal: {campaign.goal}</span>
            <span>Audience: {campaign.audience}</span>
            <span>{messages.length} total messages</span>
            {campaign.imported_url && (
              <a href={campaign.imported_url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">Source URL</a>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button onClick={() => setShowAddContent(true)} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            + Add Content
          </button>
          <button onClick={() => { setShowScheduleConfig(true); setScheduleStartDate(new Date().toISOString().split("T")[0]); }} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors" title={`${unscheduledCount} unscheduled`}>
            Auto-Schedule {unscheduledCount > 0 && `(${unscheduledCount})`}
          </button>
          <button onClick={() => { setDupChannels(uniqueChannels); setShowDupModal(true); }} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors">Duplicate</button>
          <a href="/calendar" className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors">Calendar</a>
          {campaign.status === "draft" && (
            <button onClick={() => updateStatus("active")} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Launch</button>
          )}
          {campaign.status === "active" && (
            <button onClick={() => updateStatus("paused")} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Pause</button>
          )}
          {campaign.status === "paused" && (
            <button onClick={() => updateStatus("active")} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Resume</button>
          )}
          <a href="/" className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors">Back</a>
        </div>
      </div>

      {/* Add Content Modal */}
      {showAddContent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-bold mb-1">Add Content to Campaign</h3>
            <p className="text-sm text-[var(--muted)] mb-4">AI will generate new messages that continue your existing campaign sequence.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1.5">Channel</label>
                <div className="flex gap-2">
                  {(["email", "sms", "social"] as const).map((ch) => (
                    <button key={ch} onClick={() => setAddChannel(ch)}
                      className={`flex-1 text-sm py-2.5 rounded-lg border transition-colors ${addChannel === ch ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--card-border)] hover:border-[var(--muted)]"}`}>
                      {ch.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-[var(--muted)] mb-1.5">Number of messages: {addCount}</label>
                <input type="range" min={1} max={10} value={addCount} onChange={(e) => setAddCount(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
              </div>

              <div>
                <label className="block text-xs text-[var(--muted)] mb-1.5">Custom instructions (optional)</label>
                <textarea value={addPrompt} onChange={(e) => setAddPrompt(e.target.value)} placeholder="e.g. Focus on a limited-time offer, include a discount code SAVE20..." rows={3}
                  className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] resize-none" />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowAddContent(false)} className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors">Cancel</button>
                <button onClick={handleAddContent} disabled={addLoading}
                  className="flex-1 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {addLoading ? "Generating..." : `Add ${addCount} ${addChannel} message${addCount > 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Schedule Modal */}
      {showScheduleConfig && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-1">Auto-Schedule Content</h3>
            <p className="text-sm text-[var(--muted)] mb-4">
              AI will intelligently space your {unscheduledCount} unscheduled message{unscheduledCount !== 1 ? "s" : ""} based on channel best practices.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1.5">Start Date</label>
                <input type="date" value={scheduleStartDate} onChange={(e) => setScheduleStartDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]" />
              </div>

              <div className="bg-[var(--bg)] rounded-lg p-3">
                <p className="text-xs font-medium mb-2">Spacing Rules:</p>
                <div className="space-y-1 text-xs text-[var(--muted)]">
                  <p>• Emails: 2+ days apart, best at 9am/10am/2pm/8pm</p>
                  <p>• SMS: 3+ days apart, best at 10am/12pm/5pm/7pm</p>
                  <p>• Social: 1+ day apart, best at 8am/12pm/5pm/8pm</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowScheduleConfig(false)} className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors">Cancel</button>
                <button onClick={handleAutoSchedule} disabled={autoScheduling || unscheduledCount === 0}
                  className="flex-1 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {autoScheduling ? "Scheduling..." : "Auto-Schedule All"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Modal */}
      {showDupModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-3">Duplicate Campaign</h3>
            <p className="text-sm text-[var(--muted)] mb-4">Choose which channels to include in the duplicate:</p>
            <div className="flex gap-3 mb-6">
              {(["email", "sms", "social"] as const).map((ch) => (
                <button key={ch} onClick={() => setDupChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch])}
                  className={`flex-1 text-sm py-2.5 rounded-lg border transition-colors ${dupChannels.includes(ch) ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--card-border)] hover:border-[var(--muted)]"}`}>
                  {ch.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDupModal(false)} className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors">Cancel</button>
              <button onClick={duplicateCampaign} disabled={duplicating || dupChannels.length === 0}
                className="flex-1 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {duplicating ? "Duplicating..." : "Duplicate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HTML Preview Modal */}
      {showHtmlPreview && htmlPreviews[showHtmlPreview] && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--card-border)]">
              <h3 className="text-lg font-bold">HTML Email Preview</h3>
              <div className="flex gap-2">
                <button onClick={() => copyHtmlToClipboard(showHtmlPreview)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${copied === showHtmlPreview + "-html" ? "bg-green-500/20 text-green-400" : "bg-white/5 hover:bg-white/10"}`}>
                  {copied === showHtmlPreview + "-html" ? "Copied!" : "Copy HTML"}
                </button>
                <button onClick={() => exportHtml(showHtmlPreview, messages.find((m) => m.id === showHtmlPreview)?.subject || null)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  Export .html
                </button>
                <button onClick={() => setShowHtmlPreview(null)} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">Close</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-white rounded-lg overflow-hidden">
                <iframe
                  srcDoc={htmlPreviews[showHtmlPreview]}
                  className="w-full min-h-[600px] border-0"
                  title="Email Preview"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Files Section */}
      <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Campaign Files & Images</h3>
          <label className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer">
            {uploading ? "Uploading..." : "+ Upload Files"}
            <input type="file" multiple onChange={handleFileUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
        {files.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">No files attached yet. Upload images, documents, or assets for this campaign.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {files.map((file) => (
              <div key={file.id} className="bg-[var(--bg)] border border-[var(--card-border)] rounded-lg p-3 group relative">
                {file.file_type === "image" ? (
                  <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                    <img src={file.file_url} alt={file.file_name} className="w-full h-20 object-cover rounded mb-2" />
                  </a>
                ) : (
                  <div className="w-full h-20 flex items-center justify-center bg-white/5 rounded mb-2 text-2xl">
                    {file.file_type === "document" ? "📄" : "📎"}
                  </div>
                )}
                <p className="text-xs truncate">{file.file_name}</p>
                {file.file_size && <p className="text-xs text-[var(--muted)]">{(file.file_size / 1024).toFixed(0)} KB</p>}
                <button onClick={() => deleteFile(file.id)} className="absolute top-1 right-1 text-red-400 opacity-0 group-hover:opacity-100 text-xs bg-black/50 rounded px-1.5 py-0.5 transition-opacity">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Channel Filter */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveChannel("all")} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${activeChannel === "all" ? "bg-[var(--accent)] text-white" : "bg-white/5 hover:bg-white/10"}`}>
          All ({messages.length})
        </button>
        {Object.entries(channelCounts).map(([ch, count]) => (
          <button key={ch} onClick={() => setActiveChannel(ch)} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${activeChannel === ch ? "bg-[var(--accent)] text-white" : "bg-white/5 hover:bg-white/10"}`}>
            {ch.toUpperCase()} ({count})
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="space-y-4">
        {filteredMessages.map((msg) => (
          <div key={msg.id} className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6 relative">
            {/* Header row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded">#{msg.sequence_order}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium uppercase ${channelColors[msg.channel]}`}>{msg.channel}</span>
                {msg.send_at && <span className="text-xs text-[var(--muted)]">Scheduled: {new Date(msg.send_at).toLocaleString()}</span>}
                {scores[msg.id] && <span className={`text-sm font-bold ${scoreColor(scores[msg.id].score)}`}>{scores[msg.id].score}/100</span>}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => copyToClipboard(msg)} className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${copied === msg.id ? "bg-green-500/20 text-green-400" : "bg-white/5 hover:bg-white/10"}`}>
                  {copied === msg.id ? "Copied!" : "Copy"}
                </button>
                {msg.channel === "email" && (
                  <button onClick={() => generateHtmlEmail(msg.id)} disabled={generatingHtml === msg.id}
                    className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50">
                    {generatingHtml === msg.id ? "Generating..." : htmlPreviews[msg.id] ? "View HTML" : "HTML Template"}
                  </button>
                )}
                {msg.channel === "email" && htmlPreviews[msg.id] && (
                  <button onClick={() => setShowHtmlPreview(msg.id)} className="text-xs px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors">
                    Preview
                  </button>
                )}
                <button onClick={() => getConfidenceScore(msg.id)} disabled={scoringId === msg.id}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50">
                  {scoringId === msg.id ? "Scoring..." : "Score"}
                </button>
                <button onClick={() => { setRevising(revising === msg.id ? null : msg.id); setRevisePrompt(""); }}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${revising === msg.id ? "bg-[var(--accent)]/20 text-[var(--accent)]" : "bg-white/5 hover:bg-white/10"}`}>
                  AI Revise
                </button>
                <button onClick={() => setEditing(editing === msg.id ? null : msg.id)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  {editing === msg.id ? "Cancel" : "Edit"}
                </button>
                <button onClick={() => deleteMessage(msg.id)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                  Delete
                </button>
              </div>
            </div>

            {/* Confidence Score Tips */}
            {scores[msg.id] && scores[msg.id].tips.length > 0 && (
              <div className="bg-white/5 rounded-lg p-3 mb-4">
                <p className="text-xs font-semibold mb-1.5">Suggestions to improve:</p>
                <ul className="text-xs text-[var(--muted)] space-y-1">
                  {scores[msg.id].tips.map((tip, i) => <li key={i}>• {tip}</li>)}
                </ul>
              </div>
            )}

            {/* AI Revise Panel */}
            {revising === msg.id && (
              <div className="bg-[var(--bg)] border border-[var(--card-border)] rounded-lg p-4 mb-4">
                <p className="text-xs font-semibold mb-3">Quick Revisions:</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {REVISE_PRESETS.map((preset) => (
                    <button key={preset.label} onClick={() => handleRevise(msg.id, preset.prompt)} disabled={reviseLoading}
                      className="text-xs px-3 py-1.5 rounded-lg border border-[var(--card-border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors disabled:opacity-50">
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={revisePrompt} onChange={(e) => setRevisePrompt(e.target.value)} placeholder="Custom revision instructions..."
                    className="flex-1 bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                    onKeyDown={(e) => e.key === "Enter" && handleRevise(msg.id)} />
                  <button onClick={() => handleRevise(msg.id)} disabled={reviseLoading || !revisePrompt}
                    className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                    {reviseLoading ? "Revising..." : "Revise"}
                  </button>
                </div>
              </div>
            )}

            {/* Message Content */}
            {editing === msg.id ? (
              <EditMessage msg={msg} onSave={(updates) => updateMessage(msg.id, updates)} onSchedule={(dt) => scheduleMessage(msg.id, dt)} />
            ) : (
              <div>
                {msg.subject && <p className="font-semibold mb-2">Subject: {msg.subject}</p>}
                <div
                  className="text-sm text-[var(--fg)]/80 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: msg.body
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\*(.*?)\*/g, "<em>$1</em>")
                      .replace(/^### (.*$)/gm, '<h3 class="text-base font-bold mt-3 mb-1">$1</h3>')
                      .replace(/^## (.*$)/gm, '<h2 class="text-lg font-bold mt-3 mb-1">$1</h2>')
                      .replace(/^- (.*$)/gm, '<li class="ml-4">• $1</li>')
                      .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal">$1</li>'),
                  }}
                />
                {msg.cta_text && <p className="mt-3 text-xs text-[var(--accent)]">CTA: {msg.cta_text}</p>}
                {msg.preview_text && <p className="mt-1 text-xs text-[var(--muted)]">Preview: {msg.preview_text}</p>}
              </div>
            )}

            {/* Schedule row */}
            {!editing && (
              <div className="mt-4 pt-3 border-t border-[var(--card-border)] flex items-center gap-3">
                <label className="text-xs text-[var(--muted)]">Schedule:</label>
                <input type="datetime-local" value={msg.send_at ? msg.send_at.slice(0, 16) : ""}
                  onChange={(e) => scheduleMessage(msg.id, e.target.value ? new Date(e.target.value).toISOString() : "")}
                  className="bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[var(--accent)]" />
                {msg.send_at && <button onClick={() => scheduleMessage(msg.id, "")} className="text-xs text-red-400 hover:underline">Clear</button>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EditMessage({
  msg, onSave, onSchedule,
}: {
  msg: CampaignMessage;
  onSave: (updates: Partial<CampaignMessage>) => void;
  onSchedule: (dt: string) => void;
}) {
  const [subject, setSubject] = useState(msg.subject || "");
  const [body, setBody] = useState(msg.body);
  const [ctaText, setCtaText] = useState(msg.cta_text || "");
  const [previewText, setPreviewText] = useState(msg.preview_text || "");
  const [sendAt, setSendAt] = useState(msg.send_at ? msg.send_at.slice(0, 16) : "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertFormatting(prefix: string, suffix: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = body.substring(start, end);
    const newText = body.substring(0, start) + prefix + selected + suffix + body.substring(end);
    setBody(newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  }

  function handleSave() {
    onSave({ subject, body, cta_text: ctaText, preview_text: previewText });
    if (sendAt) onSchedule(new Date(sendAt).toISOString());
  }

  return (
    <div className="space-y-3">
      {msg.channel === "email" && (
        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line"
          className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" />
      )}

      {/* Rich text toolbar */}
      {msg.channel === "email" && (
        <div className="flex gap-1 bg-[var(--bg)] border border-[var(--card-border)] rounded-t-lg px-2 py-1.5">
          <button onClick={() => insertFormatting("**", "**")} className="text-xs px-2 py-1 rounded hover:bg-white/10 font-bold" title="Bold">B</button>
          <button onClick={() => insertFormatting("*", "*")} className="text-xs px-2 py-1 rounded hover:bg-white/10 italic" title="Italic">I</button>
          <span className="w-px bg-white/10 mx-1" />
          <button onClick={() => insertFormatting("## ", "")} className="text-xs px-2 py-1 rounded hover:bg-white/10" title="Heading">H2</button>
          <button onClick={() => insertFormatting("### ", "")} className="text-xs px-2 py-1 rounded hover:bg-white/10" title="Subheading">H3</button>
          <span className="w-px bg-white/10 mx-1" />
          <button onClick={() => insertFormatting("- ", "")} className="text-xs px-2 py-1 rounded hover:bg-white/10" title="Bullet list">• List</button>
          <button onClick={() => insertFormatting("1. ", "")} className="text-xs px-2 py-1 rounded hover:bg-white/10" title="Numbered list">1. List</button>
          <span className="w-px bg-white/10 mx-1" />
          <button onClick={() => insertFormatting("[", "](url)")} className="text-xs px-2 py-1 rounded hover:bg-white/10" title="Link">Link</button>
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={msg.channel === "sms" ? 3 : 10}
        className={`w-full bg-[var(--bg)] border border-[var(--card-border)] ${msg.channel === "email" ? "rounded-b-lg" : "rounded-lg"} px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] resize-none font-mono`}
      />
      <p className="text-xs text-[var(--muted)]">
        Supports: **bold**, *italic*, ## headings, - bullets, 1. numbered lists
      </p>

      {msg.channel === "email" && (
        <div className="grid grid-cols-2 gap-3">
          <input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="CTA text"
            className="bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" />
          <input type="text" value={previewText} onChange={(e) => setPreviewText(e.target.value)} placeholder="Preview text"
            className="bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" />
        </div>
      )}

      <div className="flex items-center gap-3">
        <label className="text-xs text-[var(--muted)]">Schedule:</label>
        <input type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)}
          className="bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[var(--accent)]" />
      </div>

      <button onClick={handleSave} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
        Save Changes
      </button>
    </div>
  );
}
