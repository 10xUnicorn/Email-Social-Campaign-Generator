"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { VariableSet, Variable } from "@/lib/types";

export default function VariablesPage() {
  const [sets, setSets] = useState<VariableSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSet, setExpandedSet] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [newSetPlatform, setNewSetPlatform] = useState("");
  const [newSetDesc, setNewSetDesc] = useState("");
  const [addingVarTo, setAddingVarTo] = useState<string | null>(null);
  const [newVarTag, setNewVarTag] = useState("");
  const [newVarLabel, setNewVarLabel] = useState("");
  const [newVarCategory, setNewVarCategory] = useState("contact");
  const [newVarDefault, setNewVarDefault] = useState("");
  const [editingVar, setEditingVar] = useState<string | null>(null);
  const [editTag, setEditTag] = useState("");
  const [editLabel, setEditLabel] = useState("");

  useEffect(() => {
    loadSets();
  }, []);

  async function loadSets() {
    const { data } = await supabase
      .from("variable_sets")
      .select("*, variables(*)")
      .order("name");
    setSets(data || []);
    setLoading(false);
  }

  async function createSet() {
    if (!newSetName.trim()) return;
    const { data } = await supabase
      .from("variable_sets")
      .insert({
        name: newSetName.trim(),
        platform: newSetPlatform.trim() || null,
        description: newSetDesc.trim() || null,
      })
      .select("*, variables(*)")
      .single();
    if (data) {
      setSets((prev) => [...prev, data]);
      setNewSetName("");
      setNewSetPlatform("");
      setNewSetDesc("");
      setShowCreate(false);
      setExpandedSet(data.id);
    }
  }

  async function deleteSet(id: string) {
    if (!confirm("Delete this variable set and all its variables?")) return;
    await supabase.from("variable_sets").delete().eq("id", id);
    setSets((prev) => prev.filter((s) => s.id !== id));
  }

  async function addVariable(setId: string) {
    if (!newVarTag.trim() || !newVarLabel.trim()) return;
    const maxOrder = sets.find((s) => s.id === setId)?.variables?.length || 0;
    const { data } = await supabase
      .from("variables")
      .insert({
        variable_set_id: setId,
        tag: newVarTag.trim(),
        label: newVarLabel.trim(),
        category: newVarCategory,
        default_value: newVarDefault.trim() || null,
        sort_order: maxOrder + 1,
      })
      .select()
      .single();

    if (data) {
      setSets((prev) =>
        prev.map((s) =>
          s.id === setId
            ? { ...s, variables: [...(s.variables || []), data] }
            : s
        )
      );
      setNewVarTag("");
      setNewVarLabel("");
      setNewVarDefault("");
      setNewVarCategory("contact");
    }
  }

  async function deleteVariable(setId: string, varId: string) {
    await supabase.from("variables").delete().eq("id", varId);
    setSets((prev) =>
      prev.map((s) =>
        s.id === setId
          ? { ...s, variables: (s.variables || []).filter((v) => v.id !== varId) }
          : s
      )
    );
  }

  async function updateVariable(varId: string, setId: string) {
    await supabase.from("variables").update({ tag: editTag, label: editLabel }).eq("id", varId);
    setSets((prev) =>
      prev.map((s) =>
        s.id === setId
          ? {
              ...s,
              variables: (s.variables || []).map((v) =>
                v.id === varId ? { ...v, tag: editTag, label: editLabel } : v
              ),
            }
          : s
      )
    );
    setEditingVar(null);
  }

  const categoryColors: Record<string, string> = {
    contact: "bg-blue-500/20 text-blue-400",
    company: "bg-purple-500/20 text-purple-400",
    custom: "bg-green-500/20 text-green-400",
    system: "bg-orange-500/20 text-orange-400",
  };

  if (loading) {
    return <div className="text-center py-20 text-[var(--muted)]">Loading variables...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Variable Sets</h1>
          <p className="text-[var(--muted)] mt-1">
            Platform-specific merge tags used in AI-generated campaigns.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + New Variable Set
        </button>
      </div>

      {showCreate && (
        <div className="bg-[var(--card)] border border-[var(--accent)]/30 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold mb-3">Create Variable Set</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              value={newSetName}
              onChange={(e) => setNewSetName(e.target.value)}
              placeholder="Set name (e.g. My CRM Tags)"
              className="bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
            <input
              type="text"
              value={newSetPlatform}
              onChange={(e) => setNewSetPlatform(e.target.value)}
              placeholder="Platform (e.g. Mailchimp, Custom)"
              className="bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <input
            type="text"
            value={newSetDesc}
            onChange={(e) => setNewSetDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] mb-3"
          />
          <button
            onClick={createSet}
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Create Set
          </button>
        </div>
      )}

      <div className="space-y-4">
        {sets.map((set) => (
          <div key={set.id} className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl">
            <div
              className="flex items-center justify-between p-5 cursor-pointer"
              onClick={() => setExpandedSet(expandedSet === set.id ? null : set.id)}
            >
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{set.name}</h3>
                  {set.platform && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-[var(--muted)]">
                      {set.platform}
                    </span>
                  )}
                  <span className="text-xs text-[var(--muted)]">
                    {set.variables?.length || 0} variables
                  </span>
                </div>
                {set.description && (
                  <p className="text-xs text-[var(--muted)] mt-1">{set.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSet(set.id); }}
                  className="text-xs px-3 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  Delete
                </button>
                <span className="text-[var(--muted)]">
                  {expandedSet === set.id ? "▼" : "▶"}
                </span>
              </div>
            </div>

            {expandedSet === set.id && (
              <div className="border-t border-[var(--card-border)] p-5">
                {/* Variables list */}
                <div className="space-y-2 mb-4">
                  {(set.variables || [])
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((v) => (
                    <div key={v.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[var(--bg)]">
                      {editingVar === v.id ? (
                        <>
                          <input
                            value={editTag}
                            onChange={(e) => setEditTag(e.target.value)}
                            className="bg-[var(--card)] border border-[var(--card-border)] rounded px-2 py-1 text-xs font-mono w-40 focus:outline-none focus:border-[var(--accent)]"
                          />
                          <input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="bg-[var(--card)] border border-[var(--card-border)] rounded px-2 py-1 text-xs flex-1 focus:outline-none focus:border-[var(--accent)]"
                          />
                          <button
                            onClick={() => updateVariable(v.id, set.id)}
                            className="text-xs text-green-400 hover:underline"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingVar(null)}
                            className="text-xs text-[var(--muted)] hover:underline"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <code className="text-xs font-mono text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded">
                            {v.tag}
                          </code>
                          <span className="text-sm flex-1">{v.label}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[v.category]}`}>
                            {v.category}
                          </span>
                          {v.default_value && (
                            <span className="text-xs text-[var(--muted)]">Default: {v.default_value}</span>
                          )}
                          <button
                            onClick={() => { setEditingVar(v.id); setEditTag(v.tag); setEditLabel(v.label); }}
                            className="text-xs text-[var(--muted)] hover:text-[var(--fg)]"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteVariable(set.id, v.id)}
                            className="text-xs text-red-400 hover:underline"
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add variable */}
                {addingVarTo === set.id ? (
                  <div className="bg-[var(--bg)] rounded-lg p-3">
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      <input
                        value={newVarTag}
                        onChange={(e) => setNewVarTag(e.target.value)}
                        placeholder="Tag (e.g. {{first_name}})"
                        className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
                      />
                      <input
                        value={newVarLabel}
                        onChange={(e) => setNewVarLabel(e.target.value)}
                        placeholder="Label (e.g. First Name)"
                        className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--accent)]"
                      />
                      <select
                        value={newVarCategory}
                        onChange={(e) => setNewVarCategory(e.target.value)}
                        className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--accent)]"
                      >
                        <option value="contact">Contact</option>
                        <option value="company">Company</option>
                        <option value="custom">Custom</option>
                        <option value="system">System</option>
                      </select>
                      <input
                        value={newVarDefault}
                        onChange={(e) => setNewVarDefault(e.target.value)}
                        placeholder="Default value (optional)"
                        className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => addVariable(set.id)}
                        className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      >
                        Add Variable
                      </button>
                      <button
                        onClick={() => setAddingVarTo(null)}
                        className="text-xs text-[var(--muted)] hover:underline px-3 py-1.5"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingVarTo(set.id)}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    + Add Variable
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
