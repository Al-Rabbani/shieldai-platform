import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import FixStrategyCard from "@/components/fixes/FixStrategyCard";
import FixStrategyForm from "@/components/fixes/FixStrategyForm";
import AutoRemediationToggles from "@/components/fixes/AutoRemediationToggles";
import { loadFixStrategies, refreshFixStrategies } from "@/lib/fixStrategyMatch";
import { BookOpen, Plus, Search } from "lucide-react";

export default function FixStrategyLibraryPage() {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const rows = await refreshFixStrategies();
    setStrategies(rows || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const tags = useMemo(() => {
    const set = new Set();
    strategies.forEach((s) => (s.tags || []).forEach((t) => set.add(t)));
    return [...set].sort();
  }, [strategies]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return strategies.filter((s) => {
      const tagOk = !activeTag || (s.tags || []).includes(activeTag);
      if (!tagOk) return false;
      if (!q) return true;
      return [s.title, s.vulnerability_type, s.summary, (s.tags || []).join(" ")]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [strategies, query, activeTag]);

  async function save(values) {
    setSaving(true);
    if (editing) {
      await base44.entities.FixStrategy.update(editing.id, values);
    } else {
      await base44.entities.FixStrategy.create({ ...values, source: "manual", times_reused: 0 });
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    load();
  }

  async function remove(strategy) {
    await base44.entities.FixStrategy.delete(strategy.id);
    load();
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BookOpen size={22} className="text-violet-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Fix Strategy Library</h1>
            <p className="text-xs text-slate-500">{strategies.length} proven {strategies.length === 1 ? "fix" : "fixes"} · recommended inline in the triage fix panel</p>
          </div>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm((v) => !v); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-violet-500 text-white hover:bg-violet-600 transition"
        >
          <Plus size={14} /> Add strategy
        </button>
      </div>

      <AutoRemediationToggles />

      {(showForm || editing) && (
        <FixStrategyForm
          initial={editing}
          saving={saving}
          onSave={save}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search fixes, CWE, CVE or tags"
            className="w-full pl-7 pr-3 py-2 rounded-lg text-xs bg-[#111827] border border-slate-700 text-white placeholder-slate-600 focus:border-violet-500 outline-none"
          />
        </div>
        <button
          onClick={() => setActiveTag(null)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${!activeTag ? "bg-violet-500/20 text-violet-200 border-violet-500/40" : "bg-slate-800 text-slate-400 border-slate-700"}`}
        >
          All tags
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag === activeTag ? null : tag)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${activeTag === tag ? "bg-violet-500/20 text-violet-200 border-violet-500/40" : "bg-slate-800 text-slate-400 border-slate-700"}`}
          >
            {tag}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-violet-500 border-white/10 rounded-full animate-spin mx-auto mt-16" />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <p className="text-sm text-slate-400">No strategies match this filter yet.</p>
          <p className="text-xs text-slate-600 mt-1">Add the fix that worked so the next engineer starts from it.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((strategy) => (
            <FixStrategyCard
              key={strategy.id}
              strategy={strategy}
              onEdit={(s) => { setEditing(s); setShowForm(false); }}
              onDelete={remove}
            />
          ))}
        </div>
      )}
    </div>
  );
}