"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Campaign, CampaignMessage, CampaignFile, BrandVoice, Company } from "@/lib/types";
import ExportModal from "@/components/ExportModal";
import PublishModal from "@/components/PublishModal";

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

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central Europe (CET)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "UTC", label: "UTC" },
];

const EMAIL_STYLE_PRESETS = [
  { label: "Modern Minimal", value: "Clean minimal design with lots of whitespace, single accent color, sans-serif typography, subtle borders, no heavy backgrounds" },
  { label: "Bold & Vibrant", value: "Bold colors, gradient accents, large hero section, strong visual hierarchy, eye-catching CTA buttons with shadows" },
  { label: "Corporate Professional", value: "Conservative professional layout, navy/gray palette, structured sections, formal typography, logo-prominent header" },
  { label: "Warm & Friendly", value: "Rounded corners, warm color palette, soft shadows, conversational layout, friendly illustrations style, approachable feel" },
  { label: "Dark & Premium", value: "Dark background (#1a1a2e), light text, gold/purple accents, premium luxury feel, sleek typography, high contrast CTA" },
  { label: "Newsletter Style", value: "Multi-section editorial layout, clear section dividers, sidebar elements, featured content blocks, magazine-like structure" },
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

  // Edit campaign details state
  const [showEditCampaign, setShowEditCampaign] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [editAudience, setEditAudience] = useState("");
  const [editBrandVoiceId, setEditBrandVoiceId] = useState<string | null>(null);
  const [editCompanyId, setEditCompanyId] = useState<string | null>(null);
  const [editTimezone, setEditTimezone] = useState("America/New_York");
  const [editEmailStyle, setEditEmailStyle] = useState("");
  const [editEmailStyleCustom, setEditEmailStyleCustom] = useState("");
  const [brandVoices, setBrandVoices] = useState<BrandVoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [savingCampaign, setSavingCampaign] = useState(false);

  // Calendar preview state
  const [calendarCollapsed, setCalendarCollapsed] = useState(false);
  const [calendarFilter, setCalendarFilter] = useState<string>("all");
  const [calHoverId, setCalHoverId] = useState<string | null>(null);
  const [calEditId, setCalEditId] = useState<string | null>(null);
  const [calEditBody, setCalEditBody] = useState("");
  const [calEditDate, setCalEditDate] = useState("");
  const calHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Media assets state
  const [showMediaPanel, setShowMediaPanel] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<{ url: string; type: "image" | "video"; description: string }[]>([]);
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [newMediaType, setNewMediaType] = useState<"image" | "video">("image");
  const [newMediaDesc, setNewMediaDesc] = useState("");
  const [bulkMediaText, setBulkMediaText] = useState("");
  const [autoPopulating, setAutoPopulating] = useState(false);

  // Regenerate state
  const [regenerating, setRegenerating] = useState(false);
  const [regenProgress, setRegenProgress] = useState("");

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

  // Format time in campaign timezone
  function formatInTz(dateStr: string) {
    const tz = campaign?.timezone || "America/New_York";
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      timeZone: tz,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  }

  function formatTimeOnlyTz(dateStr: string) {
    const tz = campaign?.timezone || "America/New_York";
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  }

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
    if (msg.cta_url) text += `\n${msg.cta_url}`;
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

  // ── Auto-Populate Media to Posts ──
  async function handleAutoPopulateMedia() {
    if (!campaign || mediaAssets.length === 0 || messages.length === 0) return;
    setAutoPopulating(true);

    try {
      const res = await fetch("/api/auto-match-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaign.id,
          media_assets: mediaAssets,
          messages: messages.map((m) => ({ id: m.id, subject: m.subject, body: m.body.slice(0, 300), channel: m.channel })),
        }),
      });

      if (!res.ok) throw new Error("Auto-match failed");
      const data = await res.json();

      if (data.assignments) {
        // Update local state
        setMessages((prev) =>
          prev.map((m) => {
            const assignment = data.assignments.find((a: { message_id: string }) => a.message_id === m.id);
            if (assignment) {
              return { ...m, image_url: assignment.image_url || null, video_url: assignment.video_url || null };
            }
            return m;
          })
        );
      }
    } catch (err) {
      console.error("Auto-populate error:", err);
      alert("Failed to auto-populate media. Try again.");
    }
    setAutoPopulating(false);
  }

  function addMediaAsset() {
    if (!newMediaUrl.trim()) return;
    setMediaAssets((prev) => [...prev, { url: newMediaUrl.trim(), type: newMediaType, description: newMediaDesc.trim() }]);
    setNewMediaUrl("");
    setNewMediaDesc("");
  }

  function parseBulkMedia() {
    if (!bulkMediaText.trim()) return;
    const lines = bulkMediaText.trim().split("\n").filter(Boolean);
    const newAssets: { url: string; type: "image" | "video"; description: string }[] = [];
    for (const line of lines) {
      // Format: URL | type | description  OR  just URL
      const parts = line.split("|").map((p) => p.trim());
      const url = parts[0];
      if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) continue;
      const type: "image" | "video" = parts[1]?.toLowerCase() === "video" ? "video" : "image";
      const description = parts[2] || parts[1]?.toLowerCase() !== "video" && parts[1]?.toLowerCase() !== "image" ? parts[1] || "" : "";
      newAssets.push({ url, type, description: typeof description === "string" ? description : "" });
    }
    if (newAssets.length > 0) {
      setMediaAssets((prev) => [...prev, ...newAssets]);
      setBulkMediaText("");
    }
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

      // Get email style — campaign-level or default
      const emailStyle = campaign?.email_style || "";

      const res = await fetch("/api/generate-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: msg.subject,
          body: msg.body,
          cta_text: msg.cta_text,
          cta_url: msg.cta_url,
          preview_text: msg.preview_text,
          brand_color: "#7c3aed",
          platform,
          email_style: emailStyle,
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

  // ── Edit Campaign Details ──
  async function openEditCampaign() {
    if (!campaign) return;
    // Load brand voices and companies for dropdowns
    const [bvRes, coRes] = await Promise.all([
      supabase.from("brand_voices").select("id, name, company_id").order("name"),
      supabase.from("companies").select("id, name").order("name"),
    ]);
    setBrandVoices(bvRes.data as BrandVoice[] || []);
    setCompanies(coRes.data as Company[] || []);

    setEditName(campaign.name);
    setEditDescription(campaign.description || "");
    setEditGoal(campaign.goal || "");
    setEditAudience(campaign.audience || "");
    setEditBrandVoiceId(campaign.brand_voice_id);
    setEditCompanyId(campaign.company_id);
    setEditTimezone(campaign.timezone || "America/New_York");

    // Parse email style
    const style = campaign.email_style || "";
    const isPreset = EMAIL_STYLE_PRESETS.some((p) => p.value === style);
    if (isPreset) {
      setEditEmailStyle(style);
      setEditEmailStyleCustom("");
    } else {
      setEditEmailStyle("custom");
      setEditEmailStyleCustom(style);
    }

    setShowEditCampaign(true);
  }

  async function saveCampaignDetails() {
    if (!campaign) return;
    setSavingCampaign(true);

    const emailStyleValue = editEmailStyle === "custom" ? editEmailStyleCustom : editEmailStyle;

    const updates = {
      name: editName,
      description: editDescription || null,
      goal: editGoal || null,
      audience: editAudience || null,
      brand_voice_id: editBrandVoiceId,
      company_id: editCompanyId,
      timezone: editTimezone,
      email_style: emailStyleValue || null,
      updated_at: new Date().toISOString(),
    };

    await supabase.from("campaigns").update(updates).eq("id", campaign.id);
    setCampaign((prev) => prev ? { ...prev, ...updates } : null);
    setShowEditCampaign(false);
    setSavingCampaign(false);
    // Reload to get fresh relations
    loadCampaign();
  }

  // ── Regenerate All Content ──
  async function handleRegenerate() {
    if (!campaign) return;
    if (!confirm("This will delete all current messages and regenerate them. Continue?")) return;
    setRegenerating(true);
    setRegenProgress("Deleting existing messages...");

    try {
      // Delete existing messages
      await supabase.from("campaign_messages").delete().eq("campaign_id", campaign.id);
      setMessages([]);
      setHtmlPreviews({});

      setRegenProgress("Generating new content...");

      // Use the streaming endpoint
      const res = await fetch("/api/generate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_name: campaign.name,
          description: campaign.description || "",
          goal: campaign.goal || "",
          audience: campaign.audience || "",
          brand_voice_id: campaign.brand_voice_id || undefined,
          channels: campaign.channels,
          num_messages: campaign.num_messages,
          company_id: campaign.company_id || undefined,
          variable_set_id: campaign.variable_set_id || undefined,
          imported_url: campaign.imported_url || undefined,
          existing_campaign_id: campaign.id,
        }),
      });

      if (!res.ok) throw new Error("Regeneration failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6);
            if (raw === "[DONE]") continue;
            try {
              const evt = JSON.parse(raw);
              if (evt.type === "progress") {
                setRegenProgress(`Generating ${evt.channel}...`);
              } else if (evt.type === "message") {
                setMessages((prev) => [...prev, evt.message]);
              }
            } catch { /* skip */ }
          }
        }
      }

      setRegenProgress("");
    } catch (err) {
      console.error("Regenerate error:", err);
      setRegenProgress("Error regenerating. Try again.");
    }
    setRegenerating(false);
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
        imported_url: campaign.imported_url, timezone: campaign.timezone, email_style: campaign.email_style,
      })
      .select().single();

    if (newCamp) {
      const msgsToCopy = messages.filter((m) => dupChannels.includes(m.channel));
      if (msgsToCopy.length > 0) {
        const newMsgs = msgsToCopy.map((m) => ({
          campaign_id: newCamp.id, sequence_order: m.sequence_order, channel: m.channel,
          subject: m.subject, body: m.body, preview_text: m.preview_text, cta_text: m.cta_text, cta_url: m.cta_url, status: "draft",
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

  const tzLabel = TIMEZONES.find((t) => t.value === campaign.timezone)?.label || campaign.timezone || "ET";

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusColors[campaign.status]}`}>{campaign.status}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-[var(--muted)]">{tzLabel}</span>
          </div>
          {campaign.description && <p className="text-[var(--muted)] mb-3">{campaign.description}</p>}
          <div className="flex flex-wrap gap-4 text-xs text-[var(--muted)]">
            {campaign.company && <span>Company: {campaign.company.name}</span>}
            {campaign.folder && <span>Folder: {campaign.folder.name}</span>}
            <span>Goal: {campaign.goal}</span>
            <span>Audience: {campaign.audience}</span>
            <span>{messages.length} total messages</span>
            {campaign.email_style && <span>Email Style: {EMAIL_STYLE_PRESETS.find((p) => p.value === campaign.email_style)?.label || "Custom"}</span>}
            {campaign.imported_url && (
              <a href={campaign.imported_url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">Source URL</a>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button onClick={openEditCampaign} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors">
            Edit Details
          </button>
          <button onClick={handleRegenerate} disabled={regenerating}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            {regenerating ? regenProgress || "Regenerating..." : "Regenerate"}
          </button>
          <button onClick={() => setShowAddContent(true)} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            + Add Content
          </button>
          <button onClick={() => { setShowScheduleConfig(true); setScheduleStartDate(new Date().toISOString().split("T")[0]); }} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors" title={`${unscheduledCount} unscheduled`}>
            Auto-Schedule {unscheduledCount > 0 && `(${unscheduledCount})`}
          </button>
          <button onClick={() => {
            // When opening, seed media assets from campaign image files
            if (!showMediaPanel && files.length > 0) {
              const imageFiles = files.filter((f) => f.file_type === "image");
              const existingUrls = new Set(mediaAssets.map((a) => a.url));
              const newFromFiles = imageFiles.filter((f) => !existingUrls.has(f.file_url)).map((f) => ({
                url: f.file_url,
                type: "image" as const,
                description: f.file_name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
              }));
              if (newFromFiles.length > 0) setMediaAssets((prev) => [...prev, ...newFromFiles]);
            }
            setShowMediaPanel(!showMediaPanel);
          }} className="px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{background: "linear-gradient(135deg, #059669, #0891b2)", color: "#fff"}}>
            Media Assets {mediaAssets.length > 0 && `(${mediaAssets.length})`}
          </button>
          <button onClick={() => setShowExport(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Export</button>
          <button onClick={() => setShowPublish(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Publish</button>
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

      {/* ═══════ EDIT CAMPAIGN MODAL ═══════ */}
      {showEditCampaign && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6 max-w-2xl w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Edit Campaign Details</h3>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1.5">Campaign Name</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]" />
              </div>

              <div>
                <label className="block text-xs text-[var(--muted)] mb-1.5">Description</label>
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={2}
                  className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1.5">Goal</label>
                  <input type="text" value={editGoal} onChange={(e) => setEditGoal(e.target.value)}
                    className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]" />
                </div>
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1.5">Target Audience</label>
                  <input type="text" value={editAudience} onChange={(e) => setEditAudience(e.target.value)}
                    className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1.5">Brand Voice</label>
                  <select value={editBrandVoiceId || ""} onChange={(e) => setEditBrandVoiceId(e.target.value || null)}
                    className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]">
                    <option value="">None</option>
                    {brandVoices.map((bv) => (
                      <option key={bv.id} value={bv.id}>{bv.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1.5">Company</label>
                  <select value={editCompanyId || ""} onChange={(e) => setEditCompanyId(e.target.value || null)}
                    className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]">
                    <option value="">None</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1.5">Timezone</label>
                <select value={editTimezone} onChange={(e) => setEditTimezone(e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]">
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label} ({tz.value})</option>
                  ))}
                </select>
                <p className="text-xs text-[var(--muted)] mt-1">All scheduled times will display in this timezone</p>
              </div>

              {/* Email Style */}
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1.5">HTML Email Template Style</label>
                <p className="text-xs text-[var(--muted)] mb-2">This style will be applied consistently to every HTML email template generated in this campaign.</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {EMAIL_STYLE_PRESETS.map((preset) => (
                    <button key={preset.label} onClick={() => { setEditEmailStyle(preset.value); setEditEmailStyleCustom(""); }}
                      className={`text-left text-xs px-3 py-2.5 rounded-lg border transition-colors ${
                        editEmailStyle === preset.value
                          ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                          : "border-[var(--card-border)] hover:border-[var(--muted)]"
                      }`}>
                      <span className="font-medium">{preset.label}</span>
                    </button>
                  ))}
                  <button onClick={() => setEditEmailStyle("custom")}
                    className={`text-left text-xs px-3 py-2.5 rounded-lg border transition-colors ${
                      editEmailStyle === "custom"
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "border-[var(--card-border)] hover:border-[var(--muted)]"
                    }`}>
                    <span className="font-medium">Custom Style</span>
                  </button>
                </div>
                {editEmailStyle === "custom" && (
                  <textarea value={editEmailStyleCustom} onChange={(e) => setEditEmailStyleCustom(e.target.value)} rows={3}
                    placeholder="Describe your email design style... e.g. Minimalist black and white with green accents, large hero images, rounded buttons..."
                    className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] resize-none" />
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-[var(--card-border)]">
              <button onClick={() => setShowEditCampaign(false)} className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors">Cancel</button>
              <button onClick={saveCampaignDetails} disabled={savingCampaign || !editName}
                className="flex-1 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {savingCampaign ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                <div className="mt-2 pt-2 border-t border-[var(--card-border)]">
                  <p className="text-xs font-medium mb-1">Conflict Detection:</p>
                  <div className="space-y-1 text-xs text-[var(--muted)]">
                    <p>• No same-channel content on the same day</p>
                    <p>• No overlapping send times across channels</p>
                    {campaign?.company_id && <p>• Checks all campaigns for this company</p>}
                  </div>
                </div>
                <p className="text-xs text-[var(--muted)] mt-2">Times shown in {tzLabel}</p>
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

      {/* Media Assets Panel */}
      {showMediaPanel && (
        <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Media Assets</h3>
            <button onClick={() => setShowMediaPanel(false)} className="text-[var(--muted)] hover:text-white text-lg">&times;</button>
          </div>

          <p className="text-xs text-[var(--muted)] mb-4">
            Add your image and video URLs with descriptions. Then hit <strong>Auto-Populate</strong> to have AI match each asset to the most relevant post.
          </p>

          {/* Single add row */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <input value={newMediaUrl} onChange={(e) => setNewMediaUrl(e.target.value)} placeholder="https://... media URL"
              className="flex-1 min-w-[200px] bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" />
            <select value={newMediaType} onChange={(e) => setNewMediaType(e.target.value as "image" | "video")}
              className="bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]">
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
            <input value={newMediaDesc} onChange={(e) => setNewMediaDesc(e.target.value)} placeholder="Description of this media..."
              className="flex-1 min-w-[180px] bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              onKeyDown={(e) => { if (e.key === "Enter") addMediaAsset(); }} />
            <button onClick={addMediaAsset} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Add
            </button>
          </div>

          {/* Bulk paste */}
          <details className="mb-4">
            <summary className="text-xs text-[var(--accent)] cursor-pointer hover:underline">Bulk paste (one per line)</summary>
            <div className="mt-2">
              <textarea value={bulkMediaText} onChange={(e) => setBulkMediaText(e.target.value)} rows={4} placeholder={"https://example.com/image1.jpg | image | Hero shot of product\nhttps://example.com/video1.mp4 | video | Customer testimonial\nhttps://example.com/img2.png"}
                className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[var(--accent)] resize-none" />
              <p className="text-[10px] text-[var(--muted)] mt-1 mb-2">Format: URL | type | description (type and description optional)</p>
              <button onClick={parseBulkMedia} className="bg-white/10 hover:bg-white/15 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                Parse & Add
              </button>
            </div>
          </details>

          {/* Asset list */}
          {mediaAssets.length > 0 && (
            <div className="space-y-2 mb-4 max-h-[240px] overflow-y-auto">
              {mediaAssets.map((asset, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${asset.type === "video" ? "bg-blue-500/15 text-blue-400" : "bg-green-500/15 text-green-400"}`}>
                    {asset.type === "video" ? "VID" : "IMG"}
                  </span>
                  <a href={asset.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent)] hover:underline truncate max-w-[200px]">{asset.url}</a>
                  <span className="text-xs text-[var(--muted)] flex-1 truncate">{asset.description || "No description"}</span>
                  <button onClick={() => setMediaAssets((prev) => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 items-center">
            <button onClick={handleAutoPopulateMedia} disabled={autoPopulating || mediaAssets.length === 0 || messages.length === 0}
              className="text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-40"
              style={{background: autoPopulating ? "#555" : "linear-gradient(135deg, #7c3aed, #db2777)"}}>
              {autoPopulating ? "Matching..." : `Auto-Populate ${messages.length} Posts`}
            </button>
            {mediaAssets.length > 0 && (
              <button onClick={() => setMediaAssets([])} className="text-xs text-red-400 hover:text-red-300">Clear All</button>
            )}
            <span className="text-[10px] text-[var(--muted)] ml-auto">
              {mediaAssets.filter((a) => a.type === "image").length} images, {mediaAssets.filter((a) => a.type === "video").length} videos
            </span>
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

      {/* Schedule Preview */}
      {(() => {
        const allScheduled = messages.filter((m) => m.send_at).sort((a, b) => new Date(a.send_at!).getTime() - new Date(b.send_at!).getTime());
        if (allScheduled.length === 0) return null;

        const scheduled = calendarFilter === "all" ? allScheduled : allScheduled.filter((m) => m.channel === calendarFilter);
        const calChannelCounts: Record<string, number> = {};
        for (const m of allScheduled) calChannelCounts[m.channel] = (calChannelCounts[m.channel] || 0) + 1;

        // Group by date in campaign timezone
        const tz = campaign?.timezone || "America/New_York";
        const byDate: Record<string, CampaignMessage[]> = {};
        for (const msg of scheduled) {
          const dateKey = new Date(msg.send_at!).toLocaleDateString("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", year: "numeric" });
          if (!byDate[dateKey]) byDate[dateKey] = [];
          byDate[dateKey].push(msg);
        }

        function scrollToMessage(id: string) {
          const el = document.getElementById(`msg-${id}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("ring-2", "ring-[var(--accent)]");
            setTimeout(() => el.classList.remove("ring-2", "ring-[var(--accent)]"), 2000);
          }
        }

        function startCalEdit(msg: CampaignMessage) {
          setCalEditId(msg.id);
          setCalEditBody(msg.body);
          setCalEditDate(msg.send_at ? msg.send_at.slice(0, 16) : "");
        }

        async function saveCalEdit(msgId: string) {
          const updates: Partial<CampaignMessage> = {};
          const orig = messages.find((m) => m.id === msgId);
          if (!orig) return;
          if (calEditBody !== orig.body) updates.body = calEditBody;
          if (calEditDate) {
            const newIso = new Date(calEditDate).toISOString();
            if (newIso !== orig.send_at) updates.send_at = newIso;
          }
          if (Object.keys(updates).length > 0) {
            await updateMessage(msgId, updates);
          }
          setCalEditId(null);
        }

        return (
          <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-5 mb-6">
            {/* Header row — click to collapse */}
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setCalendarCollapsed(!calendarCollapsed)}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--muted)] transition-transform" style={{ display: "inline-block", transform: calendarCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>▼</span>
                <h3 className="text-sm font-semibold">Content Calendar Preview</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--muted)]">{allScheduled.length} scheduled • {tzLabel}</span>
                <a href="/calendar" className="text-xs text-[var(--accent)] hover:underline" onClick={(e) => e.stopPropagation()}>Full Calendar →</a>
              </div>
            </div>

            {!calendarCollapsed && <>
              {/* Channel quick filters */}
              <div className="flex gap-1.5 mt-3 mb-4" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setCalendarFilter("all")} className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-colors ${calendarFilter === "all" ? "bg-[var(--accent)] text-white" : "bg-white/5 hover:bg-white/10 text-[var(--muted)]"}`}>
                  All ({allScheduled.length})
                </button>
                {Object.entries(calChannelCounts).map(([ch, count]) => (
                  <button key={ch} onClick={() => setCalendarFilter(ch)} className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-colors ${calendarFilter === ch ? "bg-[var(--accent)] text-white" : "bg-white/5 hover:bg-white/10 text-[var(--muted)]"}`}>
                    {ch === "email" ? "Email" : ch === "sms" ? "SMS" : "Social"} ({count})
                  </button>
                ))}
              </div>

              {/* Calendar items */}
              <div className="space-y-3">
                {Object.entries(byDate).map(([dateLabel, dayMsgs]) => (
                  <div key={dateLabel}>
                    <p className="text-xs font-semibold text-[var(--muted)] mb-1.5 uppercase tracking-wide">{dateLabel}</p>
                    <div className="space-y-1.5 ml-2 border-l-2 border-[var(--card-border)] pl-3">
                      {dayMsgs.map((msg) => (
                        <div key={msg.id} className="relative">
                          {/* Inline quick edit */}
                          {calEditId === msg.id ? (
                            <div className="bg-white/5 border border-[var(--accent)]/30 rounded-lg p-3 space-y-2">
                              <textarea
                                value={calEditBody}
                                onChange={(e) => setCalEditBody(e.target.value)}
                                rows={3}
                                className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--accent)] resize-y"
                              />
                              <div className="flex items-center gap-2">
                                <label className="text-[10px] text-[var(--muted)]">Date/Time:</label>
                                <input
                                  type="datetime-local"
                                  value={calEditDate}
                                  onChange={(e) => setCalEditDate(e.target.value)}
                                  className="bg-[var(--bg)] border border-[var(--card-border)] rounded px-2 py-1 text-xs focus:outline-none focus:border-[var(--accent)]"
                                />
                                <div className="flex-1" />
                                <button onClick={() => setCalEditId(null)} className="text-[10px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[var(--muted)] transition-colors">Cancel</button>
                                <button onClick={() => saveCalEdit(msg.id)} className="text-[10px] px-2.5 py-1 rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium transition-colors">Save</button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="flex items-start gap-3 group cursor-pointer rounded-lg px-2 py-1.5 -mx-2 hover:bg-white/5 transition-colors"
                              onMouseEnter={() => {
                                if (calHoverTimer.current) clearTimeout(calHoverTimer.current);
                                calHoverTimer.current = setTimeout(() => setCalHoverId(msg.id), 300);
                              }}
                              onMouseLeave={() => {
                                if (calHoverTimer.current) clearTimeout(calHoverTimer.current);
                                calHoverTimer.current = setTimeout(() => setCalHoverId(null), 200);
                              }}
                              onClick={() => scrollToMessage(msg.id)}
                            >
                              <span className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${
                                msg.channel === "email" ? "bg-blue-400" : msg.channel === "sms" ? "bg-green-400" : "bg-purple-400"
                              }`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold">{formatTimeOnlyTz(msg.send_at!)}</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium uppercase ${channelColors[msg.channel]}`}>{msg.channel}</span>
                                  {(msg.image_url || msg.video_url) && (
                                    <span className={`text-[9px] px-1 py-0.5 rounded ${msg.image_url ? "bg-green-500/15 text-green-400" : "bg-blue-500/15 text-blue-400"}`}>
                                      {msg.image_url ? "IMG" : "VID"}
                                    </span>
                                  )}
                                  {campaign?.company && <span className="text-xs text-[var(--accent)]">{campaign.company.name}</span>}
                                </div>
                                <p className="text-xs text-[var(--fg)]/70 truncate mt-0.5">
                                  {msg.channel === "email" && msg.subject ? msg.subject : msg.body.slice(0, 80) + (msg.body.length > 80 ? "…" : "")}
                                </p>
                              </div>
                              {/* Quick action buttons (visible on hover) */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <button
                                  onClick={(e) => { e.stopPropagation(); startCalEdit(msg); }}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[var(--muted)] hover:text-white transition-colors"
                                  title="Quick edit"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); scheduleMessage(msg.id, ""); }}
                                  className="text-[10px] text-red-400 px-1 py-0.5 hover:bg-red-500/10 rounded transition-colors"
                                  title="Remove schedule"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Hover preview popup */}
                          {calHoverId === msg.id && calEditId !== msg.id && (
                            <div
                              className="absolute left-full ml-3 top-0 z-50 w-80 bg-[#1e1e2e] border border-[var(--card-border)] rounded-xl shadow-2xl p-4 pointer-events-none"
                              style={{ maxHeight: 340, overflow: "hidden" }}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium uppercase ${channelColors[msg.channel]}`}>{msg.channel}</span>
                                <span className="text-xs text-[var(--muted)]">#{msg.sequence_order}</span>
                                {msg.status && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[var(--muted)]">{msg.status}</span>}
                              </div>
                              {msg.subject && <p className="text-xs font-semibold mb-1.5 text-[var(--fg)]">{msg.subject}</p>}
                              <div className="text-xs text-[var(--fg)]/70 whitespace-pre-wrap leading-relaxed" style={{ maxHeight: 160, overflow: "hidden", maskImage: "linear-gradient(to bottom, black 80%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 80%, transparent 100%)" }}>
                                {msg.body.slice(0, 500)}
                              </div>
                              {/* Media preview */}
                              {msg.image_url && (
                                <div className="mt-2 rounded-lg overflow-hidden border border-[var(--card-border)]">
                                  <img src={msg.image_url} alt="Post media" className="w-full h-24 object-cover" />
                                </div>
                              )}
                              {msg.video_url && (
                                <div className="mt-2 flex items-center gap-2 bg-blue-500/10 rounded-lg px-2.5 py-1.5 border border-blue-500/20">
                                  <span className="text-blue-400 text-sm">▶</span>
                                  <span className="text-[10px] text-blue-400 truncate">{msg.video_url}</span>
                                </div>
                              )}
                              {msg.cta_text && <p className="text-[10px] text-[var(--accent)] mt-2">CTA: {msg.cta_text}</p>}
                              <p className="text-[10px] text-[var(--muted)] mt-1.5">Click to jump to post →</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {scheduled.length === 0 && (
                  <p className="text-xs text-[var(--muted)] italic">No {calendarFilter} posts scheduled.</p>
                )}
              </div>
            </>}
          </div>
        );
      })()}

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
          <div key={msg.id} id={`msg-${msg.id}`} className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6 relative transition-all duration-300">
            {/* Header row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded">#{msg.sequence_order}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium uppercase ${channelColors[msg.channel]}`}>{msg.channel}</span>
                {msg.send_at && <span className="text-xs text-[var(--muted)]">Scheduled: {formatInTz(msg.send_at)}</span>}
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
              <EditMessage msg={msg} onSave={(updates) => updateMessage(msg.id, updates)} onSchedule={(dt) => scheduleMessage(msg.id, dt)} timezone={campaign.timezone || "America/New_York"} />
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
                {msg.cta_text && (
                  <p className="mt-3 text-xs text-[var(--accent)]">
                    CTA: {msg.cta_text}
                    {msg.cta_url && (
                      <a href={msg.cta_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-[var(--muted)] hover:text-[var(--accent)] underline">
                        {msg.cta_url.length > 40 ? msg.cta_url.slice(0, 40) + "…" : msg.cta_url}
                      </a>
                    )}
                  </p>
                )}
                {msg.preview_text && <p className="mt-1 text-xs text-[var(--muted)]">Preview: {msg.preview_text}</p>}
                {/* Media URL indicators */}
                {(msg.image_url || msg.video_url) && (
                  <div className="flex items-center gap-2 mt-2">
                    {msg.image_url && (
                      <a href={msg.image_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20 hover:bg-green-500/25 transition-colors">
                        Image
                      </a>
                    )}
                    {msg.video_url && (
                      <a href={msg.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 hover:bg-blue-500/25 transition-colors">
                        Video
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Schedule row */}
            {!editing && (
              <div className="mt-4 pt-3 border-t border-[var(--card-border)] flex items-center gap-3">
                <label className="text-xs text-[var(--muted)]">Schedule:</label>
                <input type="datetime-local" value={msg.send_at ? msg.send_at.slice(0, 16) : ""}
                  onChange={(e) => scheduleMessage(msg.id, e.target.value ? new Date(e.target.value).toISOString() : "")}
                  className="bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[var(--accent)]" />
                {msg.send_at && (
                  <>
                    <span className="text-xs text-[var(--muted)]">{formatInTz(msg.send_at)}</span>
                    <button onClick={() => scheduleMessage(msg.id, "")} className="text-xs text-red-400 hover:underline">Clear</button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <ExportModal
        open={showExport}
        campaignIds={[campaign.id]}
        messageIds={messages.map((m) => m.id)}
        companyId={campaign.company_id}
        onClose={() => setShowExport(false)}
      />

      <PublishModal
        open={showPublish}
        campaignId={campaign.id}
        messages={messages.filter((m) => m.channel === "social")}
        companyId={campaign.company_id}
        onClose={() => setShowPublish(false)}
      />
    </div>
  );
}

function EditMessage({
  msg, onSave, onSchedule, timezone,
}: {
  msg: CampaignMessage;
  onSave: (updates: Partial<CampaignMessage>) => void;
  onSchedule: (dt: string) => void;
  timezone: string;
}) {
  const [subject, setSubject] = useState(msg.subject || "");
  const [body, setBody] = useState(msg.body);
  const [ctaText, setCtaText] = useState(msg.cta_text || "");
  const [ctaUrl, setCtaUrl] = useState(msg.cta_url || "");
  const [previewText, setPreviewText] = useState(msg.preview_text || "");
  const [imageUrl, setImageUrl] = useState((msg as CampaignMessage & { image_url?: string }).image_url || "");
  const [videoUrl, setVideoUrl] = useState((msg as CampaignMessage & { video_url?: string }).video_url || "");
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
    // Enforce: can't have both image and video
    const finalImageUrl = imageUrl && !videoUrl ? imageUrl : imageUrl && videoUrl ? imageUrl : imageUrl || null;
    const finalVideoUrl = videoUrl && !imageUrl ? videoUrl : null;
    onSave({
      subject, body, cta_text: ctaText, cta_url: ctaUrl || null, preview_text: previewText,
      image_url: finalImageUrl, video_url: finalVideoUrl,
    } as Partial<CampaignMessage>);
    if (sendAt) onSchedule(new Date(sendAt).toISOString());
  }

  const tzLabel = TIMEZONES.find((t) => t.value === timezone)?.label || timezone;

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
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="CTA button text (e.g. Get Started)"
              className="bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" />
            <input type="text" value={previewText} onChange={(e) => setPreviewText(e.target.value)} placeholder="Preview text"
              className="bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" />
          </div>
          <input type="url" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="CTA link URL (e.g. https://yoursite.com/offer)"
            className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" />
        </div>
      )}

      {/* Media URLs — image OR video, not both */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Media (one per post)</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input type="url" value={imageUrl} onChange={(e) => { setImageUrl(e.target.value); if (e.target.value) setVideoUrl(""); }} placeholder="Image URL"
              className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" />
            {imageUrl && <p className="text-[10px] text-green-400 mt-1">Image attached</p>}
          </div>
          <div>
            <input type="url" value={videoUrl} onChange={(e) => { setVideoUrl(e.target.value); if (e.target.value) setImageUrl(""); }} placeholder="Video URL"
              className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" />
            {videoUrl && <p className="text-[10px] text-blue-400 mt-1">Video attached</p>}
          </div>
        </div>
        {imageUrl && videoUrl && <p className="text-[10px] text-red-400">Only one media type allowed — clear one.</p>}
      </div>

      <div className="flex items-center gap-3">
        <label className="text-xs text-[var(--muted)]">Schedule ({tzLabel}):</label>
        <input type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)}
          className="bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[var(--accent)]" />
      </div>

      <button onClick={handleSave} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
        Save Changes
      </button>
    </div>
  );
}
