"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { BrandVoice, CampaignMessage, Company, CampaignFolder, VariableSet, Variable } from "@/lib/types";

const CHANNEL_OPTIONS = [
  { id: "email", label: "Email", icon: "✉️", desc: "Newsletters, drip sequences" },
  { id: "sms", label: "SMS / Text", icon: "💬", desc: "Short, direct messages" },
  { id: "social", label: "Social Media", icon: "📱", desc: "Posts across platforms" },
];

const GOAL_OPTIONS = [
  { id: "lead_nurture", label: "Lead Nurture", desc: "Build trust & move leads toward conversion", icon: "🌱" },
  { id: "product_launch", label: "Product Launch", desc: "Generate excitement for a new product or service", icon: "🚀" },
  { id: "re_engagement", label: "Re-engagement", desc: "Win back cold or inactive contacts", icon: "🔄" },
  { id: "win_back", label: "Win-back", desc: "Recover churned customers with targeted offers", icon: "💪" },
  { id: "onboarding", label: "Onboarding", desc: "Welcome & activate new users or members", icon: "👋" },
  { id: "upsell", label: "Upsell / Cross-sell", desc: "Drive additional revenue from existing customers", icon: "📈" },
  { id: "event_promo", label: "Event Promotion", desc: "Fill seats and build hype for an event", icon: "🎪" },
  { id: "announcement", label: "Announcement", desc: "Share news, updates, or milestones", icon: "📢" },
  { id: "referral", label: "Referral Campaign", desc: "Activate word-of-mouth and referral loops", icon: "🤝" },
  { id: "custom", label: "Custom Goal", desc: "Define your own campaign objective", icon: "✨" },
];

const BEST_TIMES: Record<string, { label: string; value: string }[]> = {
  email: [
    { label: "9:00 AM (Business open)", value: "09:00" },
    { label: "10:00 AM (Peak engagement)", value: "10:00" },
    { label: "2:00 PM (Afternoon check)", value: "14:00" },
    { label: "8:00 PM (Evening wind-down)", value: "20:00" },
  ],
  sms: [
    { label: "10:00 AM (Mid-morning)", value: "10:00" },
    { label: "12:00 PM (Lunch break)", value: "12:00" },
    { label: "5:00 PM (End of day)", value: "17:00" },
    { label: "7:00 PM (Relaxing)", value: "19:00" },
  ],
  social: [
    { label: "8:00 AM (Morning scroll)", value: "08:00" },
    { label: "12:00 PM (Lunch engagement)", value: "12:00" },
    { label: "5:00 PM (Commute time)", value: "17:00" },
    { label: "8:00 PM (Prime time)", value: "20:00" },
  ],
};

const STEPS = [
  { id: "basics", label: "Basics", icon: "📝" },
  { id: "audience", label: "Audience & Goal", icon: "🎯" },
  { id: "channels", label: "Channels & Voice", icon: "📣" },
  { id: "schedule", label: "Schedule & Launch", icon: "🚀" },
];

export default function NewCampaign() {
  const [step, setStep] = useState<"configure" | "generating" | "review">("configure");
  const [configStep, setConfigStep] = useState(0);
  const [brandVoices, setBrandVoices] = useState<BrandVoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [folders, setFolders] = useState<CampaignFolder[]>([]);
  const [variableSets, setVariableSets] = useState<VariableSet[]>([]);
  const [selectedVariables, setSelectedVariables] = useState<Variable[]>([]);
  const [streamedMessages, setStreamedMessages] = useState<CampaignMessage[]>([]);
  const [streamProgress, setStreamProgress] = useState<{ channel: string; status: string; message: string }[]>([]);
  const [hoveredStreamMsg, setHoveredStreamMsg] = useState<string | null>(null);
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [customGoal, setCustomGoal] = useState("");
  const [audience, setAudience] = useState("");
  const [channels, setChannels] = useState<string[]>(["email"]);
  const [numMessages, setNumMessages] = useState(5);
  const [brandVoiceId, setBrandVoiceId] = useState<string>("");
  const [customVoice, setCustomVoice] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [companyId, setCompanyId] = useState<string>("");
  const [folderId, setFolderId] = useState<string>("");
  const [variableSetId, setVariableSetId] = useState<string>("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [scheduleStart, setScheduleStart] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [useAutoSchedule, setUseAutoSchedule] = useState(true);

  // Media assets
  const [mediaAssets, setMediaAssets] = useState<{ url: string; type: "image" | "video"; description: string }[]>([]);
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [newMediaType, setNewMediaType] = useState<"image" | "video">("image");
  const [newMediaDesc, setNewMediaDesc] = useState("");

  const streamRef = useRef<boolean>(false);

  useEffect(() => {
    Promise.all([
      supabase.from("brand_voices").select("*").order("name"),
      supabase.from("companies").select("*").order("name"),
      supabase.from("campaign_folders").select("*").order("name"),
      supabase.from("variable_sets").select("*, variables(*)").order("name"),
    ]).then(([bvRes, compRes, folderRes, vsRes]) => {
      setBrandVoices(bvRes.data || []);
      setCompanies(compRes.data || []);
      setFolders(folderRes.data || []);
      setVariableSets(vsRes.data || []);
    });
  }, []);

  useEffect(() => {
    if (variableSetId) {
      const set = variableSets.find((vs) => vs.id === variableSetId);
      setSelectedVariables(set?.variables || []);
    } else {
      setSelectedVariables([]);
    }
  }, [variableSetId, variableSets]);

  function toggleChannel(ch: string) {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  }

  function insertVariable(tag: string) {
    setAdditionalInstructions((prev) => prev + (prev ? " " : "") + tag);
  }

  const filteredFolders = companyId
    ? folders.filter((f) => f.company_id === companyId)
    : folders;

  function addMediaAsset() {
    if (!newMediaUrl.trim()) return;
    setMediaAssets((prev) => [...prev, { url: newMediaUrl.trim(), type: newMediaType, description: newMediaDesc.trim() }]);
    setNewMediaUrl("");
    setNewMediaDesc("");
  }

  function removeMediaAsset(idx: number) {
    setMediaAssets((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleImportUrl() {
    if (!importUrl) return;
    setImporting(true);
    setError("");
    try {
      const res = await fetch("/api/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl, mode: "campaign" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.campaign) {
        const c = data.campaign;
        if (c.name) setName(c.name);
        if (c.description) setDescription(c.description);
        if (c.goal) {
          const matched = GOAL_OPTIONS.find(
            (g) => g.label.toLowerCase() === c.goal.toLowerCase()
          );
          if (matched) setGoal(matched.id);
          else { setGoal("custom"); setCustomGoal(c.goal); }
        }
        if (c.audience) setAudience(c.audience);
        if (c.key_messages || c.cta_suggestions) {
          const extra = [
            c.key_messages?.length ? `Key Messages:\n${c.key_messages.join("\n")}` : "",
            c.cta_suggestions?.length ? `CTA Suggestions:\n${c.cta_suggestions.join("\n")}` : "",
          ].filter(Boolean).join("\n\n");
          setAdditionalInstructions(extra);
        }
      } else if (data.content) {
        setDescription(data.content);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to import URL");
    }
    setImporting(false);
  }

  async function createCompany() {
    if (!newCompanyName.trim()) return;
    const { data } = await supabase.from("companies").insert({ name: newCompanyName.trim() }).select().single();
    if (data) { setCompanies((prev) => [...prev, data]); setCompanyId(data.id); setNewCompanyName(""); }
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;
    const { data } = await supabase.from("campaign_folders").insert({ name: newFolderName.trim(), company_id: companyId || null }).select().single();
    if (data) { setFolders((prev) => [...prev, data]); setFolderId(data.id); setNewFolderName(""); }
  }

  async function handleGenerate() {
    if (!name.trim()) return setError("Campaign name is required");
    if (!goal) return setError("Select a campaign goal");
    if (!audience.trim()) return setError("Target audience is required");
    if (channels.length === 0) return setError("Select at least one channel");

    setError("");
    setStep("generating");
    setStreamedMessages([]);
    setStreamProgress([]);
    streamRef.current = true;

    const selectedGoal = goal === "custom" ? customGoal : GOAL_OPTIONS.find((g) => g.id === goal)?.label || goal;

    try {
      const res = await fetch("/api/generate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_name: name,
          description,
          goal: selectedGoal,
          audience,
          brand_voice_id: brandVoiceId || undefined,
          brand_voice_text: customVoice || undefined,
          channels,
          num_messages: numMessages,
          company_id: companyId || undefined,
          folder_id: folderId || undefined,
          imported_url: importUrl || undefined,
          additional_instructions: additionalInstructions || undefined,
          variable_set_id: variableSetId || undefined,
          media_assets: mediaAssets.length > 0 ? mediaAssets : undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Generation failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ") && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              if (eventType === "campaign") {
                setSavedCampaignId(data.campaign_id);
              } else if (eventType === "progress") {
                setStreamProgress((prev) => {
                  const existing = prev.findIndex((p) => p.channel === data.channel);
                  if (existing >= 0) {
                    const updated = [...prev];
                    updated[existing] = data;
                    return updated;
                  }
                  return [...prev, data];
                });
              } else if (eventType === "message") {
                setStreamedMessages((prev) => [...prev, data]);
              } else if (eventType === "done") {
                if (useAutoSchedule && scheduleStart && data.campaign_id) {
                  fetch("/api/auto-schedule", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      campaign_id: data.campaign_id,
                      start_date: scheduleStart,
                    }),
                  }).then((r) => r.json()).then((scheduleData) => {
                    if (scheduleData.updates) {
                      setStreamedMessages((prev) =>
                        prev.map((m) => {
                          const update = scheduleData.updates.find((u: { id: string }) => u.id === m.id);
                          return update ? { ...m, send_at: update.send_at, status: "scheduled" as const } : m;
                        })
                      );
                    }
                  });
                }
              }
            } catch {
              // Skip malformed JSON
            }
            eventType = "";
          }
        }
      }

      setStep("review");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setStep("configure");
    }
    streamRef.current = false;
  }

  const reviewMessages = step === "review" ? streamedMessages : [];

  async function updateMessage(index: number, field: string, value: string) {
    setStreamedMessages((prev) =>
      prev.map((msg, i) => (i === index ? { ...msg, [field]: value } : msg))
    );
  }

  async function saveChanges() {
    if (!savedCampaignId) return;
    for (const msg of streamedMessages) {
      await supabase
        .from("campaign_messages")
        .update({ subject: msg.subject, body: msg.body, preview_text: msg.preview_text, cta_text: msg.cta_text })
        .eq("id", msg.id);
    }
    window.location.href = `/campaigns/${savedCampaignId}`;
  }

  const channelColors: Record<string, string> = {
    email: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    sms: "bg-green-500/20 text-green-400 border-green-500/30",
    social: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };

  // ── Stepper validation ──
  function canAdvance(stepIdx: number) {
    if (stepIdx === 0) return name.trim().length > 0;
    if (stepIdx === 1) return goal.length > 0 && audience.trim().length > 0;
    if (stepIdx === 2) return channels.length > 0;
    return true;
  }

  // ── CONFIGURE STEP ──
  if (step === "configure") {
    return (
      <div className="max-w-4xl mx-auto pb-20">
        {/* Hero header with gradient */}
        <div className="relative overflow-hidden rounded-2xl mb-8 p-8" style={{
          background: "linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #f97316 100%)",
        }}>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
          <div className="relative">
            <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Create New Campaign</h1>
            <p className="text-white/80 text-lg">
              AI-powered content generation across every channel. Let&apos;s build something that converts.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-400 rounded-xl px-5 py-4 mb-6 text-sm font-medium flex items-center gap-3">
            <span className="text-lg">⚠️</span>
            <span>{error}</span>
            <button onClick={() => setError("")} className="ml-auto text-red-400/60 hover:text-red-300">✕</button>
          </div>
        )}

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8 px-2">
          {STEPS.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setConfigStep(idx)}
              className="flex-1 group"
            >
              <div className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-300 ${
                idx === configStep
                  ? "bg-gradient-to-r from-violet-600/20 to-pink-600/20 border-2 border-violet-500/50 shadow-lg shadow-violet-500/10"
                  : idx < configStep
                  ? "bg-emerald-500/10 border-2 border-emerald-500/30"
                  : "bg-white/5 border-2 border-white/10 hover:border-white/20"
              }`}>
                <span className={`text-lg ${idx < configStep ? "grayscale-0" : ""}`}>
                  {idx < configStep ? "✅" : s.icon}
                </span>
                <div className="text-left hidden sm:block">
                  <div className={`text-xs font-bold uppercase tracking-wider ${
                    idx === configStep ? "text-violet-300" : idx < configStep ? "text-emerald-400" : "text-white/40"
                  }`}>
                    Step {idx + 1}
                  </div>
                  <div className={`text-sm font-semibold ${
                    idx === configStep ? "text-white" : idx < configStep ? "text-emerald-300/80" : "text-white/30"
                  }`}>
                    {s.label}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* URL Import — always visible on step 0 */}
        {configStep === 0 && (
          <div className="mb-6 rounded-xl border-2 border-dashed border-violet-500/30 bg-violet-500/5 p-5 hover:border-violet-500/50 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🔗</span>
              <h3 className="text-sm font-bold text-violet-300 uppercase tracking-wide">Quick Import from URL</h3>
            </div>
            <p className="text-xs text-white/50 mb-3">
              Paste a URL and AI will extract campaign details — name, audience, goals, key messages.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://yourproduct.com/landing-page"
                className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all"
              />
              <button
                onClick={handleImportUrl}
                disabled={importing || !importUrl}
                className="bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white px-6 py-3 rounded-lg text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shadow-lg shadow-violet-500/20"
              >
                {importing ? "⏳ Importing..." : "Import →"}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* ── STEP 0: BASICS ── */}
          {configStep === 0 && (
            <>
              {/* Campaign Name */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors">
                <label className="flex items-center gap-2 text-sm font-bold text-white mb-1">
                  Campaign Name <span className="text-pink-400">*</span>
                </label>
                <p className="text-xs text-white/40 mb-3">Give your campaign a memorable name.</p>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Spring Product Launch Sequence"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3.5 text-base text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                />
              </div>

              {/* Description */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors">
                <label className="flex items-center gap-2 text-sm font-bold text-white mb-1">
                  Description
                </label>
                <p className="text-xs text-white/40 mb-3">The more context you give, the smarter the output. Think of this as your creative brief.</p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this campaign about? Who is it for? What's the offer? What makes it special?"
                  rows={4}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
                />
              </div>

              {/* Company & Folder — side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors">
                  <label className="text-sm font-bold text-white mb-3 block">Company</label>
                  <select
                    value={companyId}
                    onChange={(e) => { setCompanyId(e.target.value); setFolderId(""); }}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 transition-all mb-2"
                  >
                    <option value="">No company</option>
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input type="text" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder="New company..." className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500" onKeyDown={(e) => e.key === "Enter" && createCompany()} />
                    <button onClick={createCompany} className="text-xs px-3 py-2 rounded-lg bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 transition-colors font-medium border border-violet-500/20">+ Add</button>
                  </div>
                </div>
                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors">
                  <label className="text-sm font-bold text-white mb-3 block">Folder</label>
                  <select value={folderId} onChange={(e) => setFolderId(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 transition-all mb-2">
                    <option value="">No folder</option>
                    {filteredFolders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="New folder..." className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500" onKeyDown={(e) => e.key === "Enter" && createFolder()} />
                    <button onClick={createFolder} className="text-xs px-3 py-2 rounded-lg bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 transition-colors font-medium border border-violet-500/20">+ Add</button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── STEP 1: AUDIENCE & GOAL ── */}
          {configStep === 1 && (
            <>
              {/* Goal selector — card grid */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
                <label className="flex items-center gap-2 text-sm font-bold text-white mb-1">
                  Campaign Goal <span className="text-pink-400">*</span>
                </label>
                <p className="text-xs text-white/40 mb-4">Every message will be laser-focused on this objective.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {GOAL_OPTIONS.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setGoal(g.id)}
                      className={`text-left p-4 rounded-xl border-2 transition-all duration-200 group ${
                        goal === g.id
                          ? "border-violet-500 bg-gradient-to-br from-violet-600/15 to-pink-600/15 shadow-lg shadow-violet-500/10 scale-[1.02]"
                          : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="text-2xl block mb-2">{g.icon}</span>
                      <span className={`text-sm font-bold block ${goal === g.id ? "text-violet-300" : "text-white/80"}`}>{g.label}</span>
                      <p className={`text-xs mt-1 leading-relaxed ${goal === g.id ? "text-white/60" : "text-white/30"}`}>{g.desc}</p>
                    </button>
                  ))}
                </div>
                {goal === "custom" && (
                  <input
                    type="text"
                    value={customGoal}
                    onChange={(e) => setCustomGoal(e.target.value)}
                    placeholder="Describe your specific campaign goal..."
                    className="w-full mt-4 bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  />
                )}
              </div>

              {/* Target Audience */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors">
                <label className="flex items-center gap-2 text-sm font-bold text-white mb-1">
                  Target Audience <span className="text-pink-400">*</span>
                </label>
                <p className="text-xs text-white/40 mb-3">Be specific. The more detail, the more relevant the content.</p>
                <textarea
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g. Purpose-driven entrepreneurs building their first SaaS product, ages 25-45, frustrated with manual marketing, ready to invest in AI tools..."
                  rows={3}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
                />
              </div>
            </>
          )}

          {/* ── STEP 2: CHANNELS & VOICE ── */}
          {configStep === 2 && (
            <>
              {/* Channel selector */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
                <label className="text-sm font-bold text-white mb-4 block">Choose Your Channels</label>
                <div className="grid grid-cols-3 gap-4">
                  {CHANNEL_OPTIONS.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => toggleChannel(ch.id)}
                      className={`p-5 rounded-xl border-2 text-center transition-all duration-200 ${
                        channels.includes(ch.id)
                          ? "border-violet-500 bg-gradient-to-br from-violet-600/15 to-pink-600/10 shadow-lg shadow-violet-500/10"
                          : "border-white/10 bg-white/[0.02] hover:border-white/25"
                      }`}
                    >
                      <span className="text-3xl block mb-2">{ch.icon}</span>
                      <span className={`text-sm font-bold block ${channels.includes(ch.id) ? "text-violet-300" : "text-white/70"}`}>{ch.label}</span>
                      <p className={`text-xs mt-1 ${channels.includes(ch.id) ? "text-white/50" : "text-white/25"}`}>{ch.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Messages per Channel */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-bold text-white">Messages per Channel</label>
                  <span className="text-2xl font-extrabold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">{numMessages}</span>
                </div>
                <input type="range" min={1} max={20} value={numMessages} onChange={(e) => setNumMessages(Number(e.target.value))} className="w-full accent-violet-500 h-2" />
                <div className="flex justify-between text-xs text-white/30 mt-2"><span>1 message</span><span>20 messages</span></div>
                <div className="mt-3 bg-violet-500/10 rounded-lg px-4 py-2 text-xs text-violet-300">
                  Total output: <strong>{numMessages * channels.length}</strong> messages across <strong>{channels.length}</strong> channel{channels.length > 1 ? "s" : ""}
                </div>
              </div>

              {/* Brand Voice */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-white">Brand Voice</label>
                  <a href="/brand-voices" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Manage voices →</a>
                </div>
                <select value={brandVoiceId} onChange={(e) => setBrandVoiceId(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 transition-all mb-3">
                  <option value="">No saved voice — use custom text below</option>
                  {brandVoices.map((bv) => (
                    <option key={bv.id} value={bv.id}>{bv.name} {bv.tone ? `(${bv.tone})` : ""}</option>
                  ))}
                </select>
                <textarea value={customVoice} onChange={(e) => setCustomVoice(e.target.value)} placeholder="Or describe your brand voice here... e.g. Bold, empowering, direct. Like Gary Vee meets Simon Sinek." rows={2} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none" />
              </div>

              {/* Variable Set */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="text-sm font-bold text-white block">Merge Tags / Variables</label>
                    <p className="text-xs text-white/40 mt-0.5">Dynamic personalization for your content.</p>
                  </div>
                  <a href="/variables" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Manage →</a>
                </div>
                <select value={variableSetId} onChange={(e) => setVariableSetId(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 transition-all">
                  <option value="">No variables — plain text output</option>
                  {variableSets.map((vs) => (
                    <option key={vs.id} value={vs.id}>{vs.name} {vs.platform ? `(${vs.platform})` : ""}</option>
                  ))}
                </select>
                {selectedVariables.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedVariables.sort((a, b) => a.sort_order - b.sort_order).map((v) => (
                      <button key={v.id} onClick={() => insertVariable(v.tag)} className="text-xs px-2.5 py-1.5 rounded-lg bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 transition-colors font-mono border border-violet-500/20" title={v.label}>{v.tag}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Instructions */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors">
                <label className="text-sm font-bold text-white mb-3 block">Additional Instructions</label>
                <textarea value={additionalInstructions} onChange={(e) => setAdditionalInstructions(e.target.value)} placeholder="Specific requirements, CTAs, links, offers, tone adjustments, things to include or avoid..." rows={3} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none" />
              </div>
            </>
          )}

          {/* ── STEP 3: SCHEDULE, MEDIA & LAUNCH ── */}
          {configStep === 3 && (
            <>
              {/* Schedule Config */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
                <h3 className="text-sm font-bold text-white mb-1">Schedule Configuration</h3>
                <p className="text-xs text-white/40 mb-5">Set a start date and the AI will intelligently schedule your content with optimal spacing.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={scheduleStart}
                      onChange={(e) => setScheduleStart(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-2">Preferred Send Time</label>
                    <select
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 transition-all"
                    >
                      <option value="">AI picks best times</option>
                      {(BEST_TIMES[channels[0]] || BEST_TIMES.email).map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {channels.length > 0 && (
                  <div className="bg-black/20 rounded-xl p-4 mb-4">
                    <p className="text-xs font-bold text-white/50 mb-3 uppercase tracking-wide">Best send times by channel</p>
                    <div className="space-y-2">
                      {channels.map((ch) => (
                        <div key={ch} className="flex items-center gap-3">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${channelColors[ch]} border`}>{ch}</span>
                          <span className="text-xs text-white/40">
                            {(BEST_TIMES[ch] || []).map((t) => t.label.split(" (")[0]).join(" · ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-3 cursor-pointer bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-3">
                  <input
                    type="checkbox"
                    checked={useAutoSchedule}
                    onChange={(e) => setUseAutoSchedule(e.target.checked)}
                    className="accent-violet-500 w-5 h-5"
                  />
                  <div>
                    <span className="text-sm font-bold text-white">Auto-schedule after generation</span>
                    <p className="text-xs text-white/40">AI picks optimal dates & times for maximum engagement</p>
                  </div>
                </label>
              </div>

              {/* ── Media Assets ── */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">🎬</span>
                  <h3 className="text-sm font-bold text-white">Media Assets</h3>
                </div>
                <p className="text-xs text-white/40 mb-5">
                  Add images or videos with descriptions. AI will match the most relevant asset to each post — one per post, no repeats.
                </p>

                {/* Add new media */}
                <div className="bg-black/20 rounded-xl p-4 mb-4 border border-white/5">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 mb-3">
                    <input
                      type="text"
                      value={newMediaUrl}
                      onChange={(e) => setNewMediaUrl(e.target.value)}
                      placeholder="Paste image or video URL..."
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500 transition-all"
                    />
                    <div className="flex gap-2">
                      <select
                        value={newMediaType}
                        onChange={(e) => setNewMediaType(e.target.value as "image" | "video")}
                        className="bg-black/30 border border-white/10 rounded-lg px-3 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                      >
                        <option value="image">🖼️ Image</option>
                        <option value="video">🎥 Video</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newMediaDesc}
                      onChange={(e) => setNewMediaDesc(e.target.value)}
                      placeholder="Describe this asset (used for AI matching)..."
                      className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500 transition-all"
                      onKeyDown={(e) => e.key === "Enter" && addMediaAsset()}
                    />
                    <button
                      onClick={addMediaAsset}
                      disabled={!newMediaUrl.trim()}
                      className="bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white px-5 py-3 rounded-lg text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      + Add Asset
                    </button>
                  </div>
                </div>

                {/* Asset list */}
                {mediaAssets.length > 0 && (
                  <div className="space-y-2">
                    {mediaAssets.map((asset, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-black/20 rounded-xl px-4 py-3 border border-white/5 group">
                        <span className="text-lg">{asset.type === "image" ? "🖼️" : "🎥"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white truncate">{asset.url}</div>
                          {asset.description && <div className="text-xs text-white/40 truncate">{asset.description}</div>}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${asset.type === "image" ? "bg-blue-500/20 text-blue-300" : "bg-orange-500/20 text-orange-300"}`}>
                          {asset.type}
                        </span>
                        <button onClick={() => removeMediaAsset(idx)} className="text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">✕</button>
                      </div>
                    ))}
                    <div className="text-xs text-white/30 px-1 pt-1">
                      {mediaAssets.length} asset{mediaAssets.length > 1 ? "s" : ""} · AI will match 1 per post, no sequential repeats
                    </div>
                  </div>
                )}

                {mediaAssets.length === 0 && (
                  <div className="text-center py-6 text-white/20 text-sm">
                    No media assets added yet. Posts will be text-only.
                  </div>
                )}
              </div>

              {/* Campaign Summary */}
              <div className="bg-gradient-to-br from-violet-600/10 to-pink-600/10 border-2 border-violet-500/30 rounded-xl p-6">
                <h3 className="text-sm font-bold text-violet-300 uppercase tracking-wide mb-4">Campaign Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-white/40 mb-1">Campaign</div>
                    <div className="text-sm font-bold text-white truncate">{name || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-white/40 mb-1">Goal</div>
                    <div className="text-sm font-bold text-white">{goal ? GOAL_OPTIONS.find((g) => g.id === goal)?.label || customGoal : "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-white/40 mb-1">Channels</div>
                    <div className="text-sm font-bold text-white">{channels.length > 0 ? channels.join(", ") : "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-white/40 mb-1">Total Messages</div>
                    <div className="text-sm font-bold text-white">{numMessages * channels.length}</div>
                  </div>
                </div>
                {mediaAssets.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="text-xs text-white/40 mb-1">Media Assets</div>
                    <div className="text-sm font-bold text-white">{mediaAssets.filter(a => a.type === "image").length} images, {mediaAssets.filter(a => a.type === "video").length} videos</div>
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                className="w-full py-5 rounded-xl font-extrabold text-lg text-white transition-all duration-300 shadow-2xl shadow-violet-500/20 hover:shadow-violet-500/40 hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  background: "linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #f97316 100%)",
                }}
              >
                ⚡ Generate Campaign with AI
              </button>
            </>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8 px-2">
          <button
            onClick={() => setConfigStep(Math.max(0, configStep - 1))}
            disabled={configStep === 0}
            className="px-6 py-3 rounded-xl text-sm font-bold border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          >
            ← Back
          </button>
          {configStep < 3 && (
            <button
              onClick={() => setConfigStep(Math.min(3, configStep + 1))}
              disabled={!canAdvance(configStep)}
              className="px-8 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20"
              style={{
                background: canAdvance(configStep) ? "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)" : "#333",
              }}
            >
              Continue →
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── GENERATING STEP (Streaming with live cards) ──
  if (step === "generating") {
    const totalExpected = numMessages * channels.length;
    const progress = (streamedMessages.length / totalExpected) * 100;

    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold mb-2 bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
            Generating Your Campaign
          </h2>
          <p className="text-white/50 mb-6">
            Creating {numMessages} messages × {channels.length} channel(s) using Claude Sonnet
          </p>

          <div className="max-w-md mx-auto mb-4">
            <div className="flex justify-between text-xs text-white/40 mb-2">
              <span>{streamedMessages.length} of {totalExpected} messages</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: "linear-gradient(90deg, #7c3aed, #db2777, #f97316)" }}
              />
            </div>
          </div>

          <div className="flex justify-center gap-4 mb-8">
            {streamProgress.map((p) => (
              <div key={p.channel} className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${channelColors[p.channel]} border`}>
                  {p.channel}
                </span>
                {p.status === "generating" && (
                  <span className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                )}
                {p.status === "complete" && (
                  <span className="text-emerald-400 text-sm font-bold">✓</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {streamedMessages.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {streamedMessages.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className="bg-white/[0.03] border border-white/10 rounded-xl p-4 animate-[fadeIn_0.3s_ease-in] relative group cursor-pointer hover:border-white/20 transition-all"
                onMouseEnter={() => setHoveredStreamMsg(msg.id)}
                onMouseLeave={() => setHoveredStreamMsg(null)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono bg-white/5 px-1.5 py-0.5 rounded">#{msg.sequence_order}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${channelColors[msg.channel]} border`}>
                    {msg.channel}
                  </span>
                </div>
                {msg.subject && (
                  <p className="text-sm font-bold truncate mb-1 text-white">{msg.subject}</p>
                )}
                <p className="text-xs text-white/40 line-clamp-2">{msg.body.slice(0, 80)}...</p>

                {hoveredStreamMsg === msg.id && (
                  <div className="absolute z-50 left-0 top-full mt-2 w-80 bg-[#1a1a2e] border border-violet-500/30 rounded-xl p-4 shadow-2xl shadow-black/50">
                    {msg.subject && <p className="font-bold text-sm mb-2 text-white">{msg.subject}</p>}
                    <p className="text-xs text-white/70 whitespace-pre-wrap max-h-48 overflow-y-auto">{msg.body}</p>
                    {msg.cta_text && <p className="text-xs text-violet-400 mt-2 font-bold">CTA: {msg.cta_text}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── REVIEW STEP ──
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
            Review Your Campaign
          </h2>
          <p className="text-white/50 text-sm mt-1">
            {reviewMessages.length} messages generated. Edit anything before saving.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setStep("configure"); setConfigStep(0); }}
            className="px-5 py-2.5 rounded-xl text-sm font-bold border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all"
          >
            ← Start Over
          </button>
          <button
            onClick={saveChanges}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-violet-500/20"
            style={{ background: "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)" }}
          >
            Save & Continue →
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {reviewMessages.map((msg, idx) => (
          <div
            key={msg.id || idx}
            className="bg-white/[0.03] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded font-bold">#{msg.sequence_order}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${channelColors[msg.channel]} border`}>
                {msg.channel}
              </span>
              {msg.send_at && (
                <span className="text-xs text-white/30 ml-auto">
                  📅 {new Date(msg.send_at).toLocaleString()}
                </span>
              )}
            </div>

            {msg.channel === "email" && (
              <div className="mb-3">
                <label className="text-xs font-bold text-white/40 mb-1 block">Subject Line</label>
                <input
                  type="text"
                  value={msg.subject || ""}
                  onChange={(e) => updateMessage(idx, "subject", e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-all"
                />
              </div>
            )}

            <div className="mb-3">
              <label className="text-xs font-bold text-white/40 mb-1 block">Body</label>
              <textarea
                value={msg.body}
                onChange={(e) => updateMessage(idx, "body", e.target.value)}
                rows={4}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {msg.preview_text !== undefined && (
                <div>
                  <label className="text-xs font-bold text-white/40 mb-1 block">Preview Text</label>
                  <input
                    type="text"
                    value={msg.preview_text || ""}
                    onChange={(e) => updateMessage(idx, "preview_text", e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-all"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-white/40 mb-1 block">CTA</label>
                <input
                  type="text"
                  value={msg.cta_text || ""}
                  onChange={(e) => updateMessage(idx, "cta_text", e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-all"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-8">
        <button
          onClick={saveChanges}
          className="px-8 py-4 rounded-xl text-base font-extrabold text-white shadow-2xl shadow-violet-500/20"
          style={{ background: "linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #f97316 100%)" }}
        >
          ⚡ Save & View Campaign
        </button>
      </div>
    </div>
  );
}
