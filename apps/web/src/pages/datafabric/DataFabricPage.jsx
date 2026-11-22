import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Database, FolderTree, HardDrive, CheckCircle2, Plus, X, Activity } from "lucide-react";

const SOURCE_TYPES = ["threat_intel", "cloud_security", "security_scan", "code_security", "database", "vector_db", "cache"];
const PROTOCOLS = ["syslog", "http", "https", "tcp", "udp", "kafka", "sqs", "kinesis", "eventbridge", "pubsub"];
const AUTH_TYPES = ["api_key", "oauth2", "basic", "bearer", "mtls", "none"];
const CLASSIFICATIONS = ["public", "internal", "confidential", "restricted", "sovereign"];

const TYPE_COLOR = {
  threat_intel: "text-red-400 bg-red-500/10 border-red-500/30",
  cloud_security: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  security_scan: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  code_security: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  database: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  vector_db: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  cache: "text-slate-400 bg-slate-500/10 border-slate-500/30",
};
const CLASS_COLOR = {
  public: "text-slate-400", internal: "text-blue-400", confidential: "text-amber-400", restricted: "text-red-400", sovereign: "text-purple-400",
};

export default function DataFabricPage() {
  const [sources, setSources] = useState([]);
  const [catalogs, setCatalogs] = useState([]);
  const [lakes, setLakes] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", source_type: "threat_intel", protocol: "https", endpoint_url: "", auth_type: "api_key", data_classification: "confidential" });

  const load = useCallback(async () => {
    setLoading(true);
    const [s, c, l, r] = await Promise.all([
      base44.entities.DataSource.list("-created_date", 100).catch(() => []),
      base44.entities.DataCatalog.list("-created_date", 100).catch(() => []),
      base44.entities.DataLake.list("-created_date", 100).catch(() => []),
      base44.entities.DataQualityRule.list("-created_date", 100).catch(() => []),
    ]);
    setSources(s); setCatalogs(c); setLakes(l); setRules(r);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submitSource(e) {
    e.preventDefault();
    if (!form.name) return;
    await base44.functions.invoke("gdsDataFabric", {
      action: "register_source",
      name: form.name,
      source_type: form.source_type,
      protocol: form.protocol,
      endpoint_url: form.endpoint_url,
      auth_type: form.auth_type,
      data_classification: form.data_classification,
    });
    setForm({ name: "", source_type: "threat_intel", protocol: "https", endpoint_url: "", auth_type: "api_key", data_classification: "confidential" });
    setShowForm(false);
    load();
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Database size={24} className="text-cyan-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Data Fabric</h1>
            <p className="text-xs text-slate-500">EDP-046 · Unified data ingestion and management</p>
          </div>
        </div>
        <button onClick={() => setShowForm(f => !f)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-cyan-500 text-white hover:bg-cyan-600 transition">
          <Plus size={14} /> Register Source
        </button>
      </div>

      {showForm && (
        <form onSubmit={submitSource} className="rounded-xl p-4 space-y-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-white">Register New Data Source</p>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Source name *" className="px-3 py-2 rounded-lg text-sm bg-[#0a0f1e] border border-slate-700 text-white placeholder-slate-600 focus:border-cyan-500 outline-none" required />
            <select value={form.source_type} onChange={e => setForm({ ...form, source_type: e.target.value })} className="px-3 py-2 rounded-lg text-sm bg-[#0a0f1e] border border-slate-700 text-white focus:border-cyan-500 outline-none">
              {SOURCE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
            <select value={form.protocol} onChange={e => setForm({ ...form, protocol: e.target.value })} className="px-3 py-2 rounded-lg text-sm bg-[#0a0f1e] border border-slate-700 text-white focus:border-cyan-500 outline-none">
              {PROTOCOLS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input value={form.endpoint_url} onChange={e => setForm({ ...form, endpoint_url: e.target.value })} placeholder="Endpoint URL" className="px-3 py-2 rounded-lg text-sm bg-[#0a0f1e] border border-slate-700 text-white placeholder-slate-600 focus:border-cyan-500 outline-none" />
            <select value={form.auth_type} onChange={e => setForm({ ...form, auth_type: e.target.value })} className="px-3 py-2 rounded-lg text-sm bg-[#0a0f1e] border border-slate-700 text-white focus:border-cyan-500 outline-none">
              {AUTH_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={form.data_classification} onChange={e => setForm({ ...form, data_classification: e.target.value })} className="px-3 py-2 rounded-lg text-sm bg-[#0a0f1e] border border-slate-700 text-white focus:border-cyan-500 outline-none">
              {CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button type="submit" className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition">Register Source</button>
        </form>
      )}

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-cyan-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Activity} label="Data Sources" value={sources.length} accent="#06b6d4" />
            <StatCard icon={FolderTree} label="Catalogs" value={catalogs.length} accent="#8b5cf6" />
            <StatCard icon={HardDrive} label="Data Lakes" value={lakes.length} accent="#10b981" />
            <StatCard icon={CheckCircle2} label="Quality Rules" value={rules.length} accent="#f59e0b" />
          </div>

          <Section title="Data Sources" icon={Activity}>
            {sources.length === 0 ? <Empty msg="No data sources registered" /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {sources.map(s => (
                  <div key={s.id} className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${TYPE_COLOR[s.source_type] || ""}`}>{s.source_type?.replace(/_/g, " ")}</span>
                    </div>
                    <div className="space-y-1 text-[11px] text-slate-500">
                      <div className="flex justify-between"><span>Protocol:</span><span className="text-slate-300 font-mono">{s.protocol || "—"}</span></div>
                      <div className="flex justify-between"><span>Endpoint:</span><span className="text-slate-300 font-mono">{s.last_event_at ? "••••••••" : "—"}</span></div>
                      <div className="flex justify-between"><span>Auth:</span><span className="text-slate-300">{s.tags?.[1] || "api_key"}</span></div>
                      <div className="flex justify-between"><span>Classification:</span><span className={`font-medium ${CLASS_COLOR[s.data_classification] || "text-slate-400"}`}>{s.data_classification}</span></div>
                      <div className="flex justify-between"><span>Retention:</span><span className="text-slate-300">{s.retention_days || 90} days</span></div>
                      <div className="flex justify-between"><span>Status:</span><span className={s.is_active ? "text-emerald-400" : "text-red-400"}>{s.is_active ? "● Active" : "○ Inactive"}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="Data Catalog" icon={FolderTree}>
              {catalogs.length === 0 ? <Empty msg="No catalogs configured" /> : (
                <div className="space-y-2">
                  {catalogs.map(c => (
                    <div key={c.id} className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-white">{c.name}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">{c.catalog_type}</span>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-slate-500">
                        <span>Datasets: <span className="text-white font-medium">{c.dataset_count || 0}</span></span>
                        <span>Sources: <span className="text-white font-medium">{c.source_count || 0}</span></span>
                        <span>Owner: {c.owner || "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Data Lakes" icon={HardDrive}>
              {lakes.length === 0 ? <Empty msg="No data lakes configured" /> : (
                <div className="space-y-2">
                  {lakes.map(l => (
                    <div key={l.id} className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-white">{l.name}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded ${l.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>{l.status}</span>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-slate-500">
                        <span>Backend: <span className="text-slate-300 font-mono">{l.storage_backend}</span></span>
                        <span>Type: <span className="text-slate-300">{l.lake_type}</span></span>
                        <span>Datasets: <span className="text-white font-medium">{l.dataset_count || 0}</span></span>
                        <span className={l.encryption_enabled ? "text-emerald-400" : "text-red-400"}>{l.encryption_enabled ? "🔒 Encrypted" : "⚠ No encryption"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>

          <Section title="Data Quality Rules" icon={CheckCircle2}>
            {rules.length === 0 ? <Empty msg="No quality rules configured" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                      <th className="text-left py-2 px-3 font-medium">Rule Name</th>
                      <th className="text-left py-2 px-3 font-medium">Type</th>
                      <th className="text-left py-2 px-3 font-medium">Field</th>
                      <th className="text-left py-2 px-3 font-medium">Condition</th>
                      <th className="text-left py-2 px-3 font-medium">Threshold</th>
                      <th className="text-left py-2 px-3 font-medium">Last Score</th>
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map(r => (
                      <tr key={r.id} className="border-b border-slate-800/50 hover:bg-white/5">
                        <td className="py-2 px-3 text-white font-medium">{r.name}</td>
                        <td className="py-2 px-3 text-slate-400">{r.rule_type}</td>
                        <td className="py-2 px-3 text-slate-400">{r.field || "—"}</td>
                        <td className="py-2 px-3 text-slate-400">{r.condition || "—"}</td>
                        <td className="py-2 px-3 text-slate-300">{r.threshold_pct ? `${r.threshold_pct}%` : "—"}</td>
                        <td className="py-2 px-3">
                          {r.last_score != null && (
                            <span className={r.last_score >= (r.threshold_pct || 0) ? "text-emerald-400 font-medium" : "text-red-400 font-medium"}>{r.last_score}%</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${r.status === "passing" ? "bg-emerald-500/10 text-emerald-400" : r.status === "failing" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}>{r.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: `3px solid ${accent}` }}>
      <div className="flex items-center gap-3">
        <Icon size={20} style={{ color: accent }} />
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-[11px] text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className="text-slate-400" />
        <h2 className="text-sm font-bold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Empty({ msg }) {
  return <div className="text-center py-8"><p className="text-xs text-slate-600">{msg}</p></div>;
}