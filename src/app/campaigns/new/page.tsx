"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { BrandVoice, CampaignMessage, Company, CampaignFolder, VariableSet, Variable } from "@/lib/types";

const CHANNEL_OPTIONS = [
  { id: "email", label: "Email", icon: "✉️" },
  { id: "sms", label: "SMS / Text", icon: "💬" },
  { id: "social", label: "Social Media", icon: "📱" },
];

const GOAL_OPTIONS = [
  { id: "lead_nurture", label: "Lead Nurture", desc: "Build trust & move leads toward conversion" },
  { id: "product_launch", label: "Product Launch", desc: "Generate excitement for a new product or service" },
  { id: "re_engagement", label: "Re-engagement", desc: "Win back cold or inactive contacts" },
  { id: "win_back", label: "Win-back", desc: "Recover churned customers with targeted offers" },
  { id: "onboarding", label: "Onboarding", desc: "Welcome & activate new users or members" },
  { id: "upsell", label: "Upsell / Cross-sell", desc: "Drive additional revenue from existing customers" },
  { id: "event_promo", label: "Event Promotion", desc: "Fill seats and build hype for an event" },
  { id: "announcement", label: "Announcement", desc: "Share news, updates, or milestones" },
  { id: "referral", label: "Referral Campaign", desc: "Activate word-of-mouth and referral loops" },
  { id: "custom", label: "Custom Goal", desc: "Define your own campaign objective" },
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

export default function NewCampaign() {
  const [step, setStep] = useState<"configure" | "generating" | "review">("configure");
  const [brandVoices, setBrandVoices] = useState<BrandVoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [folders, setFolders] = useState<CampaignFolder[]>([]);
  const [variableSets, setVariableSets] = useState<VariableSet[]>([]);
  const [selectedVariables, setSelectedVariables] = useState<Variable[]>([]);
  const [generatedMessages, setGeneratedMessages] = useState<CampaignMessage[]>([]);
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(null);

  // Streaming state
  const [streamedMessages, setStreamedMessages] = useState<CampaignMessage[]>([]);
  const [streamProgress, setStreamProgress] = useState<{ channel: string; status: string; message: string }[]>([]);
  const [hoveredStreamMsg, setHoveredStreamMsg] = useState<string | null>(null);

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

  // Schedule config
  const [scheduleStart, setScheduleStart] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [useAutoSchedule, setUseAutoSchedule] = useState(true);

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

        // Parse SSE events from buffer
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
                // Auto-schedule if user opted in
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
                      // Refresh messages with schedule info
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

      // Transition to review
      setStep("review");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setStep("configure");
    }
    streamRef.current = false;
  }

  // Use streamed messages in review
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

  // ── CONFIGURE STEP ──
  if (step === "configure") {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Create New Campaign</h1>
        <p className="text-[var(--muted)] mb-8">
          Import from a URL or configure manually — AI generates your content across all channels.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* URL Import */}
          <div className="bg-[var(--card)] border border-[var(--accent)]/30 rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-3 text-[var(--accent)]">Import from URL</h3>
            <p className="text-xs text-[var(--muted)] mb-3">
              Paste a URL and AI will extract campaign details — name, audience, goals, key messages.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://yourproduct.com/landing-page"
                className="flex-1 bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
              <button
                onClick={handleImportUrl}
                disabled={importing || !importUrl}
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-5 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {importing ? "Importing..." : "Import URL"}
              </button>
            </div>
          </div>

          {/* Company & Folder */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Company</label>
              <select
                value={companyId}
                onChange={(e) => { setCompanyId(e.target.value); setFolderId(""); }}
                className="w-full bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
              >
                <option value="">No company</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="flex gap-2 mt-2">
                <input type="text" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder="New company name" className="flex-1 bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[var(--accent)]" onKeyDown={(e) => e.key === "Enter" && createCompany()} />
                <button onClick={createCompany} className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors">+ Add</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Campaign Folder</label>
              <select value={folderId} onChange={(e) => setFolderId(e.target.value)} className="w-full bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors">
                <option value="">No folder</option>
                {filteredFolders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <div className="flex gap-2 mt-2">
                <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="New folder name" className="flex-1 bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[var(--accent)]" onKeyDown={(e) => e.key === "Enter" && createFolder()} />
                <button onClick={createFolder} className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors">+ Add</button>
              </div>
            </div>
          </div>

          {/* Campaign Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Campaign Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Spring Product Launch Sequence" className="w-full bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this campaign about? The more detail, the better the AI output." rows={3} className="w-full bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors resize-none" />
          </div>

          {/* Goal */}
          <div>
            <label className="block text-sm font-medium mb-1">Campaign Goal *</label>
            <p className="text-xs text-[var(--muted)] mb-3">Every message will be optimized toward this objective.</p>
            <div className="grid grid-cols-2 gap-2">
              {GOAL_OPTIONS.map((g) => (
                <button key={g.id} onClick={() => setGoal(g.id)} className={`text-left px-4 py-3 rounded-lg border transition-colors ${goal === g.id ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--card-border)] bg-[var(--card)] hover:border-[var(--muted)]"}`}>
                  <span className={`text-sm font-medium ${goal === g.id ? "text-[var(--accent)]" : ""}`}>{g.label}</span>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{g.desc}</p>
                </button>
              ))}
            </div>
            {goal === "custom" && (
              <input type="text" value={customGoal} onChange={(e) => setCustomGoal(e.target.value)} placeholder="Describe your specific campaign goal" className="w-full mt-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors" />
            )}
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-medium mb-2">Target Audience *</label>
            <textarea value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Describe your ideal audience. e.g. Entrepreneurs building their first SaaS product, ages 25-45..." rows={2} className="w-full bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors resize-none" />
          </div>

          {/* Channels */}
          <div>
            <label className="block text-sm font-medium mb-2">Channels</label>
            <div className="flex gap-3">
              {CHANNEL_OPTIONS.map((ch) => (
                <button key={ch.id} onClick={() => toggleChannel(ch.id)} className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg border transition-colors ${channels.includes(ch.id) ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--card-border)] bg-[var(--card)] hover:border-[var(--muted)]"}`}>
                  <span>{ch.icon}</span>
                  <span>{ch.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Number of Messages */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Messages per Channel: <span className="text-[var(--accent)]">{numMessages}</span>
            </label>
            <input type="range" min={1} max={20} value={numMessages} onChange={(e) => setNumMessages(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
            <div className="flex justify-between text-xs text-[var(--muted)] mt-1"><span>1</span><span>20</span></div>
          </div>

          {/* Schedule Configuration */}
          <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-3">Schedule Configuration</h3>
            <p className="text-xs text-[var(--muted)] mb-4">Set a start date and the AI will intelligently schedule your content with optimal spacing.</p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={scheduleStart}
                  onChange={(e) => setScheduleStart(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1.5">Preferred Send Time</label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
                >
                  <option value="">AI picks best times</option>
                  {(BEST_TIMES[channels[0]] || BEST_TIMES.email).map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {channels.length > 0 && (
              <div className="bg-[var(--bg)] rounded-lg p-3 mb-3">
                <p className="text-xs font-medium mb-2">Best send times by channel:</p>
                <div className="space-y-1.5">
                  {channels.map((ch) => (
                    <div key={ch} className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase ${channelColors[ch]}`}>{ch}</span>
                      <span className="text-xs text-[var(--muted)]">
                        {(BEST_TIMES[ch] || []).map((t) => t.label.split(" (")[0]).join(", ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useAutoSchedule}
                onChange={(e) => setUseAutoSchedule(e.target.checked)}
                className="accent-[var(--accent)] w-4 h-4"
              />
              <span className="text-sm">Auto-schedule after generation (AI picks optimal dates & times)</span>
            </label>
          </div>

          {/* Variable Set */}
          <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold">Custom Variables / Merge Tags</h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">Select a platform to use its merge tags in generated content.</p>
              </div>
              <a href="/variables" className="text-xs text-[var(--accent)] hover:underline">Manage Variables →</a>
            </div>
            <select value={variableSetId} onChange={(e) => setVariableSetId(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors">
              <option value="">No variables — plain text output</option>
              {variableSets.map((vs) => (
                <option key={vs.id} value={vs.id}>{vs.name} {vs.platform ? `(${vs.platform})` : ""}</option>
              ))}
            </select>

            {selectedVariables.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-[var(--muted)] mb-2">Available tags (click to insert into instructions):</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedVariables.sort((a, b) => a.sort_order - b.sort_order).map((v) => (
                    <button key={v.id} onClick={() => insertVariable(v.tag)} className="text-xs px-2 py-1 rounded bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors font-mono" title={v.label}>{v.tag}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Brand Voice */}
          <div>
            <label className="block text-sm font-medium mb-2">Brand Voice</label>
            <select value={brandVoiceId} onChange={(e) => setBrandVoiceId(e.target.value)} className="w-full bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors mb-3">
              <option value="">No saved voice — use custom text below</option>
              {brandVoices.map((bv) => (
                <option key={bv.id} value={bv.id}>{bv.name} {bv.tone ? `(${bv.tone})` : ""}</option>
              ))}
            </select>
            <textarea value={customVoice} onChange={(e) => setCustomVoice(e.target.value)} placeholder="Or paste your brand voice / style guidelines here..." rows={3} className="w-full bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors resize-none" />
            <a href="/brand-voices" className="text-xs text-[var(--accent)] mt-2 inline-block hover:underline">Manage saved brand voices →</a>
          </div>

          {/* Additional Instructions */}
          <div>
            <label className="block text-sm font-medium mb-2">Additional Instructions</label>
            <textarea value={additionalInstructions} onChange={(e) => setAdditionalInstructions(e.target.value)} placeholder="Any specific requirements, CTAs, links, offers, tone adjustments..." rows={3} className="w-full bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors resize-none" />
          </div>

          {/* Generate Button */}
          <button onClick={handleGenerate} className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white py-4 rounded-xl font-semibold text-lg transition-colors">
            Generate Campaign with AI
          </button>
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
          <h2 className="text-2xl font-bold mb-2">Generating Your Campaign</h2>
          <p className="text-[var(--muted)] mb-4">
            Creating {numMessages} messages × {channels.length} channel(s) using Claude Sonnet
          </p>

          {/* Progress bar */}
          <div className="max-w-md mx-auto mb-4">
            <div className="flex justify-between text-xs text-[var(--muted)] mb-1">
              <span>{streamedMessages.length} of {totalExpected} messages</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Channel progress */}
          <div className="flex justify-center gap-4 mb-8">
            {streamProgress.map((p) => (
              <div key={p.channel} className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase ${channelColors[p.channel]}`}>
                  {p.channel}
                </span>
                {p.status === "generating" && (
                  <span className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                )}
                {p.status === "complete" && (
                  <span className="text-green-400 text-sm">✓</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Live message cards */}
        {streamedMessages.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {streamedMessages.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4 animate-[fadeIn_0.3s_ease-in] relative group cursor-pointer"
                onMouseEnter={() => setHoveredStreamMsg(msg.id)}
                onMouseLeave={() => setHoveredStreamMsg(null)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono bg-white/5 px-1.5 py-0.5 rounded">#{msg.sequence_order}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase ${channelColors[msg.channel]}`}>
                    {msg.channel}
                  </span>
                </div>
                {msg.subject && (
                  <p className="text-sm font-medium truncate mb-1">{msg.subject}</p>
                )}
                <p className="text-xs text-[var(--muted)] line-clamp-2">{msg.body.slice(0, 80)}...</p>

                {/* Hover preview */}
                {hoveredStreamMsg === msg.id && (
                  <div className="absolute z-50 left-0 top-full mt-2 w-80 bg-[var(--card)] border border-[var(--accent)]/30 rounded-xl p-4 shadow-2xl">
                    {msg.subject && <p className="font-semibold text-sm mb-2">{msg.subject}</p>}
                    <p className="text-xs text-[var(--fg)]/80 whitespace-pre-wrap max-h-48 overflow-y-auto">{msg.body}</p>
                    {msg.cta_text && <p className="text-xs text-[var(--accent)] mt-2">CTA: {msg.cta_text}</p>}
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
          <h1 className="text-3xl font-bold">Review: {name}</h1>
          <p className="text-[var(--muted)] mt-1">
            {streamedMessages.length} messages generated. Edit any message below then save.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setStep("configure")} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors">Back to Edit</button>
          <button onClick={saveChanges} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-5 py-2 rounded-lg font-medium transition-colors text-sm">Save Campaign</button>
        </div>
      </div>

      {channels.length > 1 && (
        <div className="flex gap-2 mb-6">
          {channels.map((ch) => {
            const count = streamedMessages.filter((m) => m.channel === ch).length;
            return (
              <span key={ch} className="text-xs px-3 py-1.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-medium">
                {ch.toUpperCase()} ({count})
              </span>
            );
          })}
        </div>
      )}

      {selectedVariables.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-3 mb-6">
          <p className="text-xs text-[var(--muted)] mb-2">Available merge tags — copy into messages:</p>
          <div className="flex flex-wrap gap-1.5">
            {selectedVariables.sort((a, b) => a.sort_order - b.sort_order).map((v) => (
              <span key={v.id} className="text-xs px-2 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] font-mono cursor-pointer hover:bg-[var(--accent)]/20" onClick={() => navigator.clipboard.writeText(v.tag)} title={`${v.label} — click to copy`}>{v.tag}</span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {streamedMessages.map((msg, idx) => (
          <div key={msg.id || idx} className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded">#{msg.sequence_order}</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium uppercase ${channelColors[msg.channel]}`}>{msg.channel}</span>
              {msg.send_at && (
                <span className="text-xs text-[var(--muted)]">
                  Scheduled: {new Date(msg.send_at).toLocaleString()}
                </span>
              )}
            </div>

            {msg.channel === "email" && (
              <div className="mb-3">
                <label className="block text-xs text-[var(--muted)] mb-1">Subject Line</label>
                <input type="text" value={msg.subject || ""} onChange={(e) => updateMessage(idx, "subject", e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" />
              </div>
            )}

            <div className="mb-3">
              <label className="block text-xs text-[var(--muted)] mb-1">
                {msg.channel === "email" ? "Email Body" : msg.channel === "sms" ? "Text Message" : "Social Post"}
              </label>
              <textarea value={msg.body} onChange={(e) => updateMessage(idx, "body", e.target.value)} rows={msg.channel === "sms" ? 3 : msg.channel === "social" ? 4 : 8} className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] resize-none" />
              {msg.channel === "sms" && (
                <p className="text-xs text-[var(--muted)] mt-1">{msg.body.length} / 160 characters</p>
              )}
            </div>

            {msg.channel === "email" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">CTA Text</label>
                  <input type="text" value={msg.cta_text || ""} onChange={(e) => updateMessage(idx, "cta_text", e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" />
                </div>
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">Preview Text</label>
                  <input type="text" value={msg.preview_text || ""} onChange={(e) => updateMessage(idx, "preview_text", e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <button onClick={() => setStep("configure")} className="px-5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors">Regenerate</button>
        <button onClick={saveChanges} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-6 py-2.5 rounded-lg font-medium transition-colors">Save & Launch Campaign</button>
      </div>
    </div>
  );
}
