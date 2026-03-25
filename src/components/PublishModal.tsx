"use client";

import { useState, useEffect, useCallback } from "react";
import type { SocialProfile, CampaignMessage, PublishedPost } from "@/lib/types";
import { PLATFORM_CONFIG } from "@/lib/types";

interface PublishModalProps {
  open: boolean;
  onClose: () => void;
  messages: CampaignMessage[];
  campaignId: string;
  companyId?: string | null;
}

interface PublishItem {
  messageId: string;
  profileId: string;
  customContent: string;
  selected: boolean;
}

export default function PublishModal({
  open,
  onClose,
  messages,
  campaignId,
  companyId,
}: PublishModalProps) {
  const [profiles, setProfiles] = useState<SocialProfile[]>([]);
  const [publishItems, setPublishItems] = useState<PublishItem[]>([]);
  const [publishHistory, setPublishHistory] = useState<PublishedPost[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState<{ message_id: string; profile_id: string; platform: string; success: boolean; external_url?: string; error?: string }[]>([]);
  const [tab, setTab] = useState<"publish" | "history">("publish");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = companyId ? `?company_id=${companyId}` : "";
      const [profilesRes, historyRes] = await Promise.all([
        fetch(`/api/social-profiles${params}`),
        fetch(`/api/publish?campaign_id=${campaignId}`),
      ]);
      const profilesData = await profilesRes.json();
      const historyData = await historyRes.json();

      if (Array.isArray(profilesData)) {
        setProfiles(profilesData.filter((p: SocialProfile) => p.is_active));
      }
      if (Array.isArray(historyData)) setPublishHistory(historyData);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [companyId, campaignId]);

  useEffect(() => {
    if (open) {
      loadData();
      setResults([]);
    }
  }, [open, loadData]);

  // Build publish items when profiles or messages change
  useEffect(() => {
    if (profiles.length === 0 || messages.length === 0) {
      setPublishItems([]);
      return;
    }
    const socialMessages = messages.filter((m) => m.channel === "social");
    const items: PublishItem[] = [];
    for (const msg of socialMessages) {
      for (const profile of profiles) {
        items.push({
          messageId: msg.id,
          profileId: profile.id,
          customContent: msg.body,
          selected: false,
        });
      }
    }
    setPublishItems(items);
  }, [profiles, messages]);

  if (!open) return null;

  const toggleItem = (msgId: string, profId: string) => {
    setPublishItems((prev) =>
      prev.map((item) =>
        item.messageId === msgId && item.profileId === profId
          ? { ...item, selected: !item.selected }
          : item
      )
    );
  };

  const updateCustomContent = (msgId: string, profId: string, content: string) => {
    setPublishItems((prev) =>
      prev.map((item) =>
        item.messageId === msgId && item.profileId === profId
          ? { ...item, customContent: content }
          : item
      )
    );
  };

  const selectAll = () => {
    setPublishItems((prev) => prev.map((item) => ({ ...item, selected: true })));
  };

  const selectNone = () => {
    setPublishItems((prev) => prev.map((item) => ({ ...item, selected: false })));
  };

  const selectedItems = publishItems.filter((i) => i.selected);

  const doPublish = async () => {
    if (selectedItems.length === 0) return;
    setPublishing(true);
    setResults([]);

    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selectedItems.map((i) => ({
            message_id: i.messageId,
            social_profile_id: i.profileId,
            custom_content: i.customContent,
          })),
        }),
      });
      const data = await res.json();
      if (data.results) {
        setResults(data.results);
        await loadData(); // Refresh history
      }
    } catch {
      alert("Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  // Group messages for display
  const socialMessages = messages.filter((m) => m.channel === "social");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1e1e2e",
          borderRadius: 16,
          padding: 28,
          width: "min(780px, 95vw)",
          maxHeight: "90vh",
          overflowY: "auto",
          border: "1px solid #333",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>Publish to Social Media</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", fontSize: 22, cursor: "pointer" }}>
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #333", paddingBottom: 4 }}>
          <button
            onClick={() => setTab("publish")}
            style={{
              padding: "8px 16px",
              borderRadius: "6px 6px 0 0",
              border: "none",
              background: tab === "publish" ? "rgba(139,92,246,0.15)" : "transparent",
              color: tab === "publish" ? "#a78bfa" : "#888",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Publish ({selectedItems.length} selected)
          </button>
          <button
            onClick={() => setTab("history")}
            style={{
              padding: "8px 16px",
              borderRadius: "6px 6px 0 0",
              border: "none",
              background: tab === "history" ? "rgba(139,92,246,0.15)" : "transparent",
              color: tab === "history" ? "#a78bfa" : "#888",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            History ({publishHistory.length})
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Loading...</div>
        ) : tab === "publish" ? (
          <>
            {profiles.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#888" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
                <p style={{ marginBottom: 8 }}>No social profiles connected</p>
                <a
                  href="/social-profiles"
                  style={{ color: "#a78bfa", fontSize: 13 }}
                >
                  Go to Social Profiles to connect accounts →
                </a>
              </div>
            ) : socialMessages.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#888" }}>
                <p>No social content in this campaign to publish.</p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <button onClick={selectAll} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #444", background: "transparent", color: "#aaa", fontSize: 12, cursor: "pointer" }}>
                    Select All
                  </button>
                  <button onClick={selectNone} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #444", background: "transparent", color: "#aaa", fontSize: 12, cursor: "pointer" }}>
                    Clear
                  </button>
                  <div style={{ flex: 1 }} />
                  <div style={{ fontSize: 12, color: "#888", lineHeight: "32px" }}>
                    {profiles.length} profile{profiles.length !== 1 ? "s" : ""} connected
                  </div>
                </div>

                <div style={{ maxHeight: 400, overflowY: "auto" }}>
                  {socialMessages.map((msg) => (
                    <div key={msg.id} style={{ marginBottom: 16, border: "1px solid #333", borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ padding: "10px 14px", background: "#2a2a3c", borderBottom: "1px solid #333" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#ddd" }}>
                          #{msg.sequence_order} — {msg.subject || msg.body.slice(0, 60)}...
                        </div>
                      </div>

                      {profiles.map((profile) => {
                        const item = publishItems.find(
                          (i) => i.messageId === msg.id && i.profileId === profile.id
                        );
                        if (!item) return null;
                        const cfg = PLATFORM_CONFIG[profile.platform];

                        return (
                          <div
                            key={`${msg.id}-${profile.id}`}
                            style={{
                              padding: "10px 14px",
                              borderBottom: "1px solid #2a2a3c",
                              opacity: item.selected ? 1 : 0.5,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => toggleItem(msg.id, profile.id)}
                                style={{ cursor: "pointer" }}
                              />
                              <span style={{ fontSize: 16 }}>{cfg?.icon}</span>
                              <span style={{ fontSize: 13, fontWeight: 600, color: cfg?.color }}>
                                {profile.profile_name}
                              </span>
                              <span style={{ fontSize: 11, color: "#666" }}>{cfg?.label}</span>
                            </div>

                            {item.selected && (
                              <textarea
                                value={item.customContent}
                                onChange={(e) => updateCustomContent(msg.id, profile.id, e.target.value)}
                                rows={3}
                                style={{
                                  width: "100%",
                                  padding: "8px 10px",
                                  borderRadius: 6,
                                  border: "1px solid #444",
                                  background: "#1e1e2e",
                                  color: "#ddd",
                                  fontSize: 12,
                                  resize: "vertical",
                                  lineHeight: 1.5,
                                }}
                                placeholder="Customize content for this profile..."
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Results */}
                {results.length > 0 && (
                  <div style={{ marginTop: 16, border: "1px solid #333", borderRadius: 8, overflow: "hidden" }}>
                    <div style={{ padding: "8px 12px", background: "#2a2a3c", fontSize: 12, fontWeight: 600, color: "#aaa" }}>
                      Results
                    </div>
                    {results.map((r, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "8px 12px",
                          borderTop: "1px solid #2a2a3c",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 12,
                        }}
                      >
                        <span style={{ color: r.success ? "#4ade80" : "#f87171" }}>
                          {r.success ? "✓" : "✗"}
                        </span>
                        <span style={{ color: PLATFORM_CONFIG[r.platform]?.color }}>
                          {PLATFORM_CONFIG[r.platform]?.icon} {r.platform}
                        </span>
                        {r.success && r.external_url ? (
                          <a href={r.external_url} target="_blank" rel="noopener noreferrer" style={{ color: "#a78bfa" }}>
                            View Post →
                          </a>
                        ) : (
                          <span style={{ color: "#f87171" }}>{r.error}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                  <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #444", background: "transparent", color: "#aaa", fontSize: 13, cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button
                    onClick={doPublish}
                    disabled={publishing || selectedItems.length === 0}
                    style={{
                      padding: "10px 24px",
                      borderRadius: 8,
                      border: "none",
                      background: publishing ? "#555" : "#16a34a",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      opacity: publishing || selectedItems.length === 0 ? 0.5 : 1,
                    }}
                  >
                    {publishing
                      ? "Publishing..."
                      : `Publish ${selectedItems.length} Post${selectedItems.length !== 1 ? "s" : ""}`}
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          /* History tab */
          <div style={{ maxHeight: 500, overflowY: "auto" }}>
            {publishHistory.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#888" }}>
                No publish history yet.
              </div>
            ) : (
              publishHistory.map((post) => {
                const cfg = PLATFORM_CONFIG[post.platform];
                return (
                  <div
                    key={post.id}
                    style={{
                      padding: "12px 14px",
                      borderBottom: "1px solid #2a2a3c",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{cfg?.icon || "🌐"}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#ddd" }}>
                        {(post.social_profile as { profile_name?: string })?.profile_name || post.platform}
                      </div>
                      <div style={{ fontSize: 11, color: "#888" }}>
                        {new Date(post.published_at).toLocaleString()}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "3px 8px",
                        borderRadius: 4,
                        background:
                          post.status === "published"
                            ? "rgba(74,222,128,0.15)"
                            : post.status === "failed"
                            ? "rgba(248,113,113,0.15)"
                            : "rgba(255,255,255,0.05)",
                        color:
                          post.status === "published"
                            ? "#4ade80"
                            : post.status === "failed"
                            ? "#f87171"
                            : "#aaa",
                        fontWeight: 600,
                      }}
                    >
                      {post.status}
                    </span>
                    {post.external_url && (
                      <a
                        href={post.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#a78bfa", fontSize: 11 }}
                      >
                        View →
                      </a>
                    )}
                    {post.error_message && (
                      <span style={{ fontSize: 11, color: "#f87171", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {post.error_message}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
