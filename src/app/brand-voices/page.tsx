"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { BrandVoice, BrandAsset, BrandVoiceUrl, Company } from "@/lib/types";

const TONE_OPTIONS = [
  "Professional",
  "Casual",
  "Bold / Aggressive",
  "Warm / Friendly",
  "Authoritative",
  "Playful",
  "Inspirational",
  "Direct / No-Nonsense",
];

const ASSET_TYPES = [
  { id: "logo", label: "Logo", icon: "🎨" },
  { id: "file", label: "File/Doc", icon: "📄" },
  { id: "link", label: "Link", icon: "🔗" },
  { id: "folder", label: "Folder", icon: "📁" },
];

export default function BrandVoicesPage() {
  const [voices, setVoices] = useState<BrandVoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [voiceRes, compRes] = await Promise.all([
      supabase
        .from("brand_voices")
        .select("*, brand_assets(*), brand_voice_urls(*), company:companies(*)")
        .order("created_at", { ascending: false }),
      supabase.from("companies").select("*").order("name"),
    ]);
    setVoices(voiceRes.data || []);
    setCompanies(compRes.data || []);
    setLoading(false);
  }

  async function deleteVoice(id: string) {
    if (!confirm("Delete this brand voice profile?")) return;
    await supabase.from("brand_voices").delete().eq("id", id);
    setVoices((prev) => prev.filter((v) => v.id !== id));
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Brand Voices</h1>
          <p className="text-[var(--muted)] mt-1">
            Save reusable voice profiles with multiple URLs, assets, and examples.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
        >
          {showCreate ? "Cancel" : "+ New Voice"}
        </button>
      </div>

      {showCreate && (
        <CreateVoice
          companies={companies}
          onCreated={(voice) => {
            setVoices((prev) => [voice, ...prev]);
            setShowCreate(false);
          }}
        />
      )}

      {loading ? (
        <div className="text-center py-20 text-[var(--muted)]">Loading...</div>
      ) : voices.length === 0 && !showCreate ? (
        <div className="text-center py-20">
          <p className="text-[var(--muted)] text-lg mb-4">No brand voices saved yet</p>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Create Your First Brand Voice
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {voices.map((voice) => (
            <div
              key={voice.id}
              className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6"
            >
              {editingId === voice.id ? (
                <EditVoice
                  voice={voice}
                  companies={companies}
                  onSaved={(updated) => {
                    setVoices((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-lg font-semibold">{voice.name}</h2>
                        {voice.tone && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-medium">
                            {voice.tone}
                          </span>
                        )}
                        {voice.company && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5">
                            {voice.company.name}
                          </span>
                        )}
                      </div>
                      {voice.description && (
                        <p className="text-sm text-[var(--muted)] mt-1">{voice.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setExpandedId(expandedId === voice.id ? null : voice.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        {expandedId === voice.id ? "Collapse" : "Details"}
                      </button>
                      <button
                        onClick={() => setEditingId(voice.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteVoice(voice.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Summary stats */}
                  <div className="flex gap-3 mt-3 text-xs text-[var(--muted)]">
                    {voice.brand_voice_urls && voice.brand_voice_urls.length > 0 && (
                      <span>{voice.brand_voice_urls.length} imported URL(s)</span>
                    )}
                    {voice.brand_assets && voice.brand_assets.length > 0 && (
                      <span>{voice.brand_assets.length} asset(s)</span>
                    )}
                    {voice.example_content && voice.example_content.length > 0 && (
                      <span>{voice.example_content.length} example(s)</span>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {expandedId === voice.id && (
                    <div className="mt-4 space-y-4">
                      {voice.style_notes && (
                        <div>
                          <h4 className="text-xs font-semibold text-[var(--muted)] mb-1">Style Notes</h4>
                          <div className="text-xs text-[var(--fg)]/60 bg-white/5 rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-wrap">
                            {voice.style_notes}
                          </div>
                        </div>
                      )}

                      {voice.brand_voice_urls && voice.brand_voice_urls.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-[var(--muted)] mb-2">Imported URLs</h4>
                          <div className="space-y-1">
                            {voice.brand_voice_urls.map((u) => (
                              <a
                                key={u.id}
                                href={u.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs text-[var(--accent)] hover:underline truncate"
                              >
                                {u.url}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {voice.brand_assets && voice.brand_assets.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-[var(--muted)] mb-2">Brand Assets</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {voice.brand_assets.map((asset) => (
                              <a
                                key={asset.id}
                                href={asset.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 text-xs hover:bg-white/10 transition-colors"
                              >
                                <span>
                                  {asset.asset_type === "logo" ? "🎨" : asset.asset_type === "file" ? "📄" : asset.asset_type === "folder" ? "📁" : "🔗"}
                                </span>
                                <span className="truncate">{asset.name}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateVoice({
  companies,
  onCreated,
}: {
  companies: Company[];
  onCreated: (voice: BrandVoice) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tone, setTone] = useState("");
  const [styleNotes, setStyleNotes] = useState("");
  const [examples, setExamples] = useState<string[]>([""]);
  const [companyId, setCompanyId] = useState("");

  // Multiple URLs
  const [urls, setUrls] = useState<string[]>([""]);
  const [importingIdx, setImportingIdx] = useState<number | null>(null);

  // Brand assets
  const [assets, setAssets] = useState<{ type: string; name: string; url: string }[]>([]);
  const [newAssetType, setNewAssetType] = useState("link");
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetUrl, setNewAssetUrl] = useState("");

  // File import
  const [importFile, setImportFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleImportUrl(idx: number) {
    const url = urls[idx];
    if (!url) return;
    setImportingIdx(idx);
    setError("");
    try {
      const res = await fetch("/api/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, mode: "brand_voice" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStyleNotes((prev) =>
        prev ? `${prev}\n\n--- Imported from ${url} ---\n${data.content}` : data.content
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to import URL");
    }
    setImportingIdx(null);
  }

  function addUrl() {
    setUrls((prev) => [...prev, ""]);
  }

  function updateUrl(idx: number, value: string) {
    setUrls((prev) => prev.map((u, i) => (i === idx ? value : u)));
  }

  function removeUrl(idx: number) {
    setUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleImportFile() {
    if (!importFile) return;
    try {
      const text = await importFile.text();
      setStyleNotes((prev) =>
        prev ? `${prev}\n\n--- Imported from ${importFile.name} ---\n${text}` : text
      );
    } catch {
      setError("Failed to read file");
    }
  }

  function addAsset() {
    if (!newAssetName.trim() || !newAssetUrl.trim()) return;
    setAssets((prev) => [...prev, { type: newAssetType, name: newAssetName.trim(), url: newAssetUrl.trim() }]);
    setNewAssetName("");
    setNewAssetUrl("");
  }

  function removeAsset(idx: number) {
    setAssets((prev) => prev.filter((_, i) => i !== idx));
  }

  function addExample() {
    setExamples((prev) => [...prev, ""]);
  }

  function updateExample(idx: number, value: string) {
    setExamples((prev) => prev.map((e, i) => (i === idx ? value : e)));
  }

  function removeExample(idx: number) {
    setExamples((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!name.trim()) return setError("Name is required");
    setSaving(true);
    setError("");

    const filteredExamples = examples.filter((e) => e.trim());
    const filteredUrls = urls.filter((u) => u.trim());

    // Create brand voice
    const { data, error: dbError } = await supabase
      .from("brand_voices")
      .insert({
        name,
        description: description || null,
        tone: tone || null,
        style_notes: styleNotes || null,
        example_content: filteredExamples.length ? filteredExamples : null,
        imported_url: filteredUrls[0] || null,
        imported_content: styleNotes || null,
        company_id: companyId || null,
      })
      .select()
      .single();

    if (dbError) {
      setError(dbError.message);
      setSaving(false);
      return;
    }

    // Save URLs
    if (filteredUrls.length > 0) {
      await supabase.from("brand_voice_urls").insert(
        filteredUrls.map((url) => ({ brand_voice_id: data.id, url }))
      );
    }

    // Save assets
    if (assets.length > 0) {
      await supabase.from("brand_assets").insert(
        assets.map((a) => ({
          brand_voice_id: data.id,
          asset_type: a.type,
          name: a.name,
          url: a.url,
        }))
      );
    }

    onCreated(data);
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--accent)]/30 rounded-xl p-6 mb-8">
      <h2 className="text-xl font-bold mb-6">Create Brand Voice</h2>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Voice Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Unicorn Universe Voice"
              className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Company</label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="">No company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this voice profile"
            className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tone</label>
          <p className="text-xs text-[var(--muted)] mb-2">Select one or more tones to blend.</p>
          <div className="flex flex-wrap gap-2">
            {TONE_OPTIONS.map((t) => {
              const tones = tone ? tone.split(", ").filter(Boolean) : [];
              const isSelected = tones.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => {
                    if (isSelected) {
                      setTone(tones.filter((x) => x !== t).join(", "));
                    } else {
                      setTone([...tones, t].join(", "));
                    }
                  }}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                    isSelected
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[var(--card-border)] hover:border-[var(--muted)]"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Multiple URLs */}
        <div className="border border-[var(--card-border)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Import from URLs</h3>
            <button onClick={addUrl} className="text-xs text-[var(--accent)] hover:underline">
              + Add URL
            </button>
          </div>
          <div className="space-y-2">
            {urls.map((url, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => updateUrl(idx, e.target.value)}
                  placeholder="https://yoursite.com/about"
                  className="flex-1 bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  onClick={() => handleImportUrl(idx)}
                  disabled={importingIdx !== null || !url}
                  className="bg-white/10 hover:bg-white/15 px-3 py-2 rounded-lg text-xs transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {importingIdx === idx ? "..." : "Import"}
                </button>
                {urls.length > 1 && (
                  <button
                    onClick={() => removeUrl(idx)}
                    className="text-red-400 hover:text-red-300 px-2"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* File Import */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--card-border)]">
            <input
              type="file"
              accept=".txt,.md,.html,.doc,.docx"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="flex-1 text-sm text-[var(--muted)] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-white/10 file:text-[var(--fg)] hover:file:bg-white/15"
            />
            {importFile && (
              <button
                onClick={handleImportFile}
                className="bg-white/10 hover:bg-white/15 px-4 py-2 rounded-lg text-xs transition-colors"
              >
                Import File
              </button>
            )}
          </div>
        </div>

        {/* Brand Assets (logos, links, files, folders) */}
        <div className="border border-[var(--card-border)] rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3">Brand Assets (Logos, Files, Links, Folders)</h3>

          {assets.length > 0 && (
            <div className="space-y-2 mb-3">
              {assets.map((asset, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 text-xs group">
                  <span>
                    {asset.type === "logo" ? "🎨" : asset.type === "file" ? "📄" : asset.type === "folder" ? "📁" : "🔗"}
                  </span>
                  <span className="font-medium">{asset.name}</span>
                  <a href={asset.url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] truncate hover:underline">
                    {asset.url}
                  </a>
                  <button
                    onClick={() => removeAsset(idx)}
                    className="text-red-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <select
              value={newAssetType}
              onChange={(e) => setNewAssetType(e.target.value)}
              className="bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-[var(--accent)]"
            >
              {ASSET_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={newAssetName}
              onChange={(e) => setNewAssetName(e.target.value)}
              placeholder="Asset name"
              className="flex-1 bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--accent)]"
            />
            <input
              type="text"
              value={newAssetUrl}
              onChange={(e) => setNewAssetUrl(e.target.value)}
              placeholder="URL / link"
              className="flex-1 bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--accent)]"
            />
            <button
              onClick={addAsset}
              className="bg-white/10 hover:bg-white/15 px-3 py-2 rounded-lg text-xs transition-colors whitespace-nowrap"
            >
              + Add
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Style Notes / Guidelines</label>
          <textarea
            value={styleNotes}
            onChange={(e) => setStyleNotes(e.target.value)}
            placeholder="Paste or type your brand guidelines, voice rules, do's and don'ts..."
            rows={6}
            className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] resize-none"
          />
        </div>

        {/* Examples */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Example Content</label>
            <button onClick={addExample} className="text-xs text-[var(--accent)] hover:underline">
              + Add Example
            </button>
          </div>
          <div className="space-y-3">
            {examples.map((ex, idx) => (
              <div key={idx} className="flex gap-2">
                <textarea
                  value={ex}
                  onChange={(e) => updateExample(idx, e.target.value)}
                  placeholder={`Example ${idx + 1}: Paste an email, post, or message that represents your voice...`}
                  rows={3}
                  className="flex-1 bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] resize-none"
                />
                {examples.length > 1 && (
                  <button
                    onClick={() => removeExample(idx)}
                    className="text-red-400 hover:text-red-300 px-2"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Brand Voice"}
        </button>
      </div>
    </div>
  );
}

function EditVoice({
  voice,
  companies,
  onSaved,
  onCancel,
}: {
  voice: BrandVoice;
  companies: Company[];
  onSaved: (voice: BrandVoice) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(voice.name);
  const [description, setDescription] = useState(voice.description || "");
  const [tone, setTone] = useState(voice.tone || "");
  const [styleNotes, setStyleNotes] = useState(voice.style_notes || "");
  const [companyId, setCompanyId] = useState(voice.company_id || "");
  const [examples, setExamples] = useState<string[]>(voice.example_content || [""]);
  const [urls, setUrls] = useState<BrandVoiceUrl[]>(voice.brand_voice_urls || []);
  const [newUrl, setNewUrl] = useState("");
  const [assets, setAssets] = useState<BrandAsset[]>(voice.brand_assets || []);
  const [newAssetType, setNewAssetType] = useState("link");
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetUrl, setNewAssetUrl] = useState("");
  const [importingUrl, setImportingUrl] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleImportNewUrl() {
    if (!newUrl.trim()) return;
    setImportingUrl(true);
    setError("");
    try {
      const res = await fetch("/api/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl, mode: "brand_voice" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStyleNotes((prev) =>
        prev ? `${prev}\n\n--- Imported from ${newUrl} ---\n${data.content}` : data.content
      );
      // Save URL to DB
      const { data: urlData } = await supabase
        .from("brand_voice_urls")
        .insert({ brand_voice_id: voice.id, url: newUrl, extracted_content: data.content })
        .select()
        .single();
      if (urlData) setUrls((prev) => [...prev, urlData]);
      setNewUrl("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to import URL");
    }
    setImportingUrl(false);
  }

  async function deleteUrl(urlId: string) {
    await supabase.from("brand_voice_urls").delete().eq("id", urlId);
    setUrls((prev) => prev.filter((u) => u.id !== urlId));
  }

  async function addAsset() {
    if (!newAssetName.trim() || !newAssetUrl.trim()) return;
    const { data } = await supabase
      .from("brand_assets")
      .insert({
        brand_voice_id: voice.id,
        asset_type: newAssetType,
        name: newAssetName.trim(),
        url: newAssetUrl.trim(),
      })
      .select()
      .single();
    if (data) {
      setAssets((prev) => [...prev, data]);
      setNewAssetName("");
      setNewAssetUrl("");
    }
  }

  async function deleteAsset(assetId: string) {
    await supabase.from("brand_assets").delete().eq("id", assetId);
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
  }

  async function handleSave() {
    setSaving(true);
    const filteredExamples = examples.filter((e) => e.trim());
    const { data, error: dbError } = await supabase
      .from("brand_voices")
      .update({
        name,
        description: description || null,
        tone: tone || null,
        style_notes: styleNotes || null,
        example_content: filteredExamples.length ? filteredExamples : null,
        company_id: companyId || null,
      })
      .eq("id", voice.id)
      .select("*, brand_assets(*), brand_voice_urls(*), company:companies(*)")
      .single();

    if (!dbError && data) onSaved(data);
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-3 py-2 text-xs">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Company</label>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="">No company</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
        />
      </div>

      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Tone (select multiple)</label>
        <div className="flex flex-wrap gap-2">
          {TONE_OPTIONS.map((t) => {
            const tones = tone ? tone.split(", ").filter(Boolean) : [];
            const isSelected = tones.includes(t);
            return (
              <button
                key={t}
                onClick={() => {
                  if (isSelected) {
                    setTone(tones.filter((x) => x !== t).join(", "));
                  } else {
                    setTone([...tones, t].join(", "));
                  }
                }}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  isSelected
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "border-[var(--card-border)]"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* URLs */}
      <div className="border border-[var(--card-border)] rounded-lg p-3">
        <label className="block text-xs text-[var(--muted)] mb-2">Imported URLs</label>
        {urls.length > 0 && (
          <div className="space-y-1 mb-2">
            {urls.map((u) => (
              <div key={u.id} className="flex items-center gap-2 text-xs">
                <a href={u.url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline truncate flex-1">
                  {u.url}
                </a>
                <button onClick={() => deleteUrl(u.id)} className="text-red-400 hover:underline">×</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="Add URL and import..."
            className="flex-1 bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={handleImportNewUrl}
            disabled={importingUrl || !newUrl}
            className="bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50"
          >
            {importingUrl ? "..." : "Import"}
          </button>
        </div>
      </div>

      {/* Assets */}
      <div className="border border-[var(--card-border)] rounded-lg p-3">
        <label className="block text-xs text-[var(--muted)] mb-2">Brand Assets</label>
        {assets.length > 0 && (
          <div className="space-y-1 mb-2">
            {assets.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-xs bg-white/5 rounded px-2 py-1">
                <span>{a.asset_type === "logo" ? "🎨" : a.asset_type === "file" ? "📄" : a.asset_type === "folder" ? "📁" : "🔗"}</span>
                <span className="font-medium">{a.name}</span>
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] truncate hover:underline flex-1">{a.url}</a>
                <button onClick={() => deleteAsset(a.id)} className="text-red-400">×</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <select
            value={newAssetType}
            onChange={(e) => setNewAssetType(e.target.value)}
            className="bg-[var(--bg)] border border-[var(--card-border)] rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[var(--accent)]"
          >
            {ASSET_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
            ))}
          </select>
          <input value={newAssetName} onChange={(e) => setNewAssetName(e.target.value)} placeholder="Name" className="flex-1 bg-[var(--bg)] border border-[var(--card-border)] rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[var(--accent)]" />
          <input value={newAssetUrl} onChange={(e) => setNewAssetUrl(e.target.value)} placeholder="URL" className="flex-1 bg-[var(--bg)] border border-[var(--card-border)] rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[var(--accent)]" />
          <button onClick={addAsset} className="bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded text-xs">+ Add</button>
        </div>
      </div>

      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Style Notes / Guidelines</label>
        <textarea
          value={styleNotes}
          onChange={(e) => setStyleNotes(e.target.value)}
          rows={5}
          className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] resize-none"
        />
      </div>

      {/* Examples */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-[var(--muted)]">Example Content</label>
          <button onClick={() => setExamples((prev) => [...prev, ""])} className="text-xs text-[var(--accent)] hover:underline">+ Add</button>
        </div>
        <div className="space-y-2">
          {examples.map((ex, idx) => (
            <div key={idx} className="flex gap-2">
              <textarea
                value={ex}
                onChange={(e) => setExamples((prev) => prev.map((x, i) => (i === idx ? e.target.value : x)))}
                rows={2}
                placeholder="Example content..."
                className="flex-1 bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--accent)] resize-none"
              />
              {examples.length > 1 && (
                <button onClick={() => setExamples((prev) => prev.filter((_, i) => i !== idx))} className="text-red-400 px-2">×</button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
