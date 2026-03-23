"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Company, CampaignFolder } from "@/lib/types";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [folders, setFolders] = useState<CampaignFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [addFolderFor, setAddFolderFor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [compRes, folderRes] = await Promise.all([
      supabase.from("companies").select("*").order("name"),
      supabase.from("campaign_folders").select("*").order("name"),
    ]);
    setCompanies(compRes.data || []);
    setFolders(folderRes.data || []);
    setLoading(false);
  }

  async function createCompany() {
    if (!newName.trim()) return;
    const { data } = await supabase
      .from("companies")
      .insert({ name: newName.trim(), website: newWebsite.trim() || null })
      .select()
      .single();
    if (data) {
      setCompanies((prev) => [...prev, data]);
      setNewName("");
      setNewWebsite("");
    }
  }

  async function deleteCompany(id: string) {
    if (!confirm("Delete this company? Campaigns will be unlinked (not deleted).")) return;
    await supabase.from("companies").delete().eq("id", id);
    setCompanies((prev) => prev.filter((c) => c.id !== id));
    setFolders((prev) => prev.filter((f) => f.company_id !== id));
  }

  async function createFolder(companyId: string) {
    if (!newFolderName.trim()) return;
    const { data } = await supabase
      .from("campaign_folders")
      .insert({ name: newFolderName.trim(), company_id: companyId })
      .select()
      .single();
    if (data) {
      setFolders((prev) => [...prev, data]);
      setNewFolderName("");
      setAddFolderFor(null);
    }
  }

  async function deleteFolder(id: string) {
    await supabase.from("campaign_folders").delete().eq("id", id);
    setFolders((prev) => prev.filter((f) => f.id !== id));
  }

  function companyFolders(companyId: string) {
    return folders.filter((f) => f.company_id === companyId);
  }

  if (loading) {
    return <div className="text-center py-20 text-[var(--muted)]">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Companies & Folders</h1>
          <p className="text-[var(--muted)] mt-1">
            Organize campaigns by company and folder.
          </p>
        </div>
        <a href="/" className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors">
          Back to Campaigns
        </a>
      </div>

      {/* Create Company */}
      <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-5 mb-8">
        <h3 className="text-sm font-semibold mb-3">Add New Company</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Company name"
            className="flex-1 bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
            onKeyDown={(e) => e.key === "Enter" && createCompany()}
          />
          <input
            type="text"
            value={newWebsite}
            onChange={(e) => setNewWebsite(e.target.value)}
            placeholder="Website (optional)"
            className="flex-1 bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
            onKeyDown={(e) => e.key === "Enter" && createCompany()}
          />
          <button
            onClick={createCompany}
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            + Add Company
          </button>
        </div>
      </div>

      {/* Companies List */}
      {companies.length === 0 ? (
        <div className="text-center py-16 text-[var(--muted)]">
          <p className="text-lg mb-2">No companies yet</p>
          <p className="text-sm">Add a company above to start organizing your campaigns.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {companies.map((company) => (
            <div
              key={company.id}
              className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-5"
            >
              {editingId === company.id ? (
                <EditCompany
                  company={company}
                  onSaved={(updated) => {
                    setCompanies((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-lg font-semibold">{company.name}</h2>
                      {company.website && (
                        <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent)] hover:underline">
                          {company.website}
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAddFolderFor(addFolderFor === company.id ? null : company.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        + Folder
                      </button>
                      <button
                        onClick={() => setEditingId(company.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteCompany(company.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Add Folder Input */}
                  {addFolderFor === company.id && (
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="New folder name"
                        className="flex-1 bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                        onKeyDown={(e) => e.key === "Enter" && createFolder(company.id)}
                        autoFocus
                      />
                      <button
                        onClick={() => createFolder(company.id)}
                        className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                      >
                        Create
                      </button>
                    </div>
                  )}

                  {/* Folders */}
                  {companyFolders(company.id).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {companyFolders(company.id).map((folder) => (
                        <div
                          key={folder.id}
                          className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 text-xs group"
                        >
                          <span>📁 {folder.name}</span>
                          <button
                            onClick={() => deleteFolder(folder.id)}
                            className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditCompany({
  company,
  onSaved,
  onCancel,
}: {
  company: Company;
  onSaved: (company: Company) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(company.name);
  const [website, setWebsite] = useState(company.website || "");
  const [notes, setNotes] = useState(company.notes || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const { data } = await supabase
      .from("companies")
      .update({ name, website: website || null, notes: notes || null })
      .eq("id", company.id)
      .select()
      .single();
    if (data) onSaved(data);
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
      />
      <input
        type="text"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        placeholder="Website URL"
        className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes about this company..."
        rows={2}
        className="w-full bg-[var(--bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] resize-none"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
