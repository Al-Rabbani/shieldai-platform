import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Fish, AlertTriangle, CheckCircle, Shield, RefreshCw, Plus, Copy, Loader2, Mail, Globe, Lock, Server } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function Shimmer({ className }) {
  return <div className={cn("rounded animate-pulse", className)} style={{ background: "linear-gradient(90deg,#1F2937,#374151,#1F2937)", backgroundSize: "400%", animation: "shimmer 1.5s infinite" }} />;
}

function RiskBar({ score }) {
  const color = score >= 70 ? "#EF4444" : score >= 40 ? "#F97316" : score >= 20 ? "#EAB308" : "#10B981";
  return (
    <div className="w-24 h-1.5 rounded-full bg-[#1F2937] overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
    </div>
  );
}

const STATUS_STYLE = {
  active_phishing: { color: "#EF4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)", label: "Active Phishing", pulse: true },
  suspicious: { color: "#F97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)", label: "Suspicious", pulse: false },
  parked: { color: "#EAB308", bg: "rgba(234,179,8,0.1)", border: "rgba(234,179,8,0.3)", label: "Parked", pulse: false },
  taken_down: { color: "#10B981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)", label: "Taken Down", pulse: false },
};

const KEYWORDS = ["ShieldAI", "shield-ai", "shieldai", "shieldaisec", "shield-security"];

export default function PhishingMonitorPage() {
  const [scanning, setScanning] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [showAddKw, setShowAddKw] = useState(false);
  const qc = useQueryClient();

  const { data: domains = [], isLoading } = useQuery({
    queryKey: ["phishing-domains"],
    queryFn: () => base44.entities.PhishingDomain.list("-risk_score", 100),
  });

  const activeDomains = domains.filter(d => d.status === "active_phishing");
  const takenDown = domains.filter(d => d.status === "taken_down");

  const { mutate: runScan } = useMutation({
    mutationFn: () => base44.functions.invoke("shieldBrandProtection", {}),
    onSuccess: () => { qc.invalidateQueries(["phishing-domains"]); toast.success("Brand protection scan complete"); },
    onError: () => toast.error("Scan failed"),
  });

  const { mutate: markTakenDown } = useMutation({
    mutationFn: (id) => base44.functions.invoke("shieldBrandProtection", { action: "takedown", domain_id: id }),
    onSuccess: () => { qc.invalidateQueries(["phishing-domains"]); toast.success("Domain marked as taken down"); },
  });

  const { mutate: addToBlocklist } = useMutation({
    mutationFn: (id) => base44.entities.PhishingDomain.update(id, { status: "taken_down" }),
    onSuccess: () => { qc.invalidateQueries(["phishing-domains"]); toast.success("Added to blocklist"); },
  });

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); toast.success("Copied!"); };

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <style>{`
        @keyframes shimmer { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes pulse-border { 0%,100%{border-color:rgba(239,68,68,0.3)} 50%{border-color:rgba(239,68,68,0.8)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.4s ease both; }
        .phish-active { animation: pulse-border 2s infinite; }
      `}</style>

      {/* Header */}
      <div className="fade-up">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
          <Shield className="w-3.5 h-3.5" /><span>Threat Intelligence</span><span>/</span>
          <span className="text-[#C9A84C]">Phishing Monitor</span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-3">
              <Fish className="w-6 h-6 text-[#C9A84C]" /> Phishing Domain Monitor
            </h1>
            <p className="text-slate-400 text-sm mt-1">Detect lookalike domains, typosquatting, and active phishing campaigns</p>
          </div>
          <button onClick={() => runScan()} disabled={scanning}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#C9A84C,#b8973b)", color: "#0A0E1A" }}>
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Scan Now
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 fade-up" style={{ animationDelay: "100ms" }}>
        {[
          { label: "Lookalike Domains", value: domains.length, color: "#6366F1" },
          { label: "Active Phishing", value: activeDomains.length, color: "#EF4444" },
          { label: "Taken Down", value: takenDown.length, color: "#10B981" },
          { label: "Monitored Keywords", value: KEYWORDS.length, color: "#C9A84C" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-5 border transition-all hover:scale-[1.02]"
            style={{ background: "#111827", borderColor: s.color + "33" }}>
            {isLoading ? <><Shimmer className="h-4 w-24 mb-3" /><Shimmer className="h-8 w-16" /></> : (
              <>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{s.label}</div>
                <div className="text-3xl font-black text-white" style={{ color: s.value > 0 && s.color === "#EF4444" ? s.color : "white" }}>{s.value}</div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Domain List */}
        <div className="xl:col-span-2 fade-up" style={{ animationDelay: "150ms" }}>
          <div className="rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "#1F2937" }}>
              <h3 className="text-sm font-bold text-white">Domain Risk Map</h3>
              <span className="text-xs text-slate-500">{domains.length} detected</span>
            </div>

            {isLoading ? (
              <div className="p-4 space-y-3">{[1,2,3].map(i => <Shimmer key={i} className="h-20 w-full" />)}</div>
            ) : domains.length === 0 ? (
              <div className="p-12 text-center">
                <Fish className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-400">No lookalike domains found</p>
                <p className="text-xs text-slate-600 mt-1">Run a brand protection scan to detect phishing domains</p>
                <button onClick={() => runScan()}
                  className="mt-4 px-5 py-2 rounded-xl text-sm font-bold"
                  style={{ background: "linear-gradient(135deg,#C9A84C,#b8973b)", color: "#0A0E1A" }}>
                  Run Scan
                </button>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "#1F2937" }}>
                {domains.map(domain => {
                  const s = STATUS_STYLE[domain.status] || STATUS_STYLE.suspicious;
                  return (
                    <div key={domain.id}
                      className={cn("p-4 transition-all hover:bg-[#1F2937]/30", domain.status === "active_phishing" && "phish-active")}
                      style={domain.status === "active_phishing" ? { borderLeft: "3px solid #EF4444" } : { borderLeft: "3px solid transparent" }}>
                      <div className="flex items-start gap-3 flex-wrap">
                        <code className="text-sm font-bold text-white font-mono flex-1 min-w-[160px]">{domain.domain}</code>
                        <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold"
                          style={{ color: s.color, background: s.bg, borderColor: s.border }}>{s.label}</span>
                        <div className="flex items-center gap-1 ml-auto">
                          {domain.has_mx && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" }}>MX</span>
                          )}
                          {domain.has_ssl && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(249,115,22,0.15)", color: "#F97316", border: "1px solid rgba(249,115,22,0.3)" }}>SSL</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <RiskBar score={domain.risk_score || 0} />
                          <span className="text-xs text-slate-400 font-mono">{domain.risk_score || 0}</span>
                        </div>
                        <span className="text-xs text-slate-500">Similarity: {domain.similarity_pct || 0}%</span>
                        {domain.first_seen && <span className="text-xs text-slate-500">First seen: {new Date(domain.first_seen).toLocaleDateString()}</span>}
                        <div className="ml-auto flex items-center gap-1">
                          <button onClick={() => copyToClipboard(domain.domain)}
                            className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-[#374151] transition-all">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {domain.status !== "taken_down" && (
                            <>
                              <button onClick={() => markTakenDown(domain.id)}
                                className="px-3 py-1 rounded-lg text-[10px] font-bold transition-all hover:scale-105"
                                style={{ background: "rgba(16,185,129,0.15)", color: "#10B981", border: "1px solid rgba(16,185,129,0.3)" }}>
                                Takedown
                              </button>
                              <button onClick={() => addToBlocklist(domain.id)}
                                className="px-3 py-1 rounded-lg text-[10px] font-bold transition-all hover:scale-105"
                                style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                                Blocklist
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Protected Keywords */}
        <div className="space-y-4 fade-up" style={{ animationDelay: "200ms" }}>
          <div className="rounded-xl border" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "#1F2937" }}>
              <h3 className="text-sm font-bold text-white">Protected Keywords</h3>
              <button onClick={() => setShowAddKw(!showAddKw)} className="text-[#C9A84C] hover:text-[#b8973b]">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {showAddKw && (
              <div className="p-3 border-b" style={{ borderColor: "#1F2937" }}>
                <div className="flex gap-2">
                  <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)}
                    placeholder="Add keyword..."
                    className="flex-1 px-3 py-1.5 rounded-lg text-sm text-white border outline-none"
                    style={{ background: "#1F2937", borderColor: "#374151" }} />
                  <button onClick={() => { toast.success(`Monitoring "${newKeyword}"`); setNewKeyword(""); setShowAddKw(false); }}
                    className="px-3 py-1.5 rounded-lg text-sm font-bold"
                    style={{ background: "#C9A84C", color: "#0A0E1A" }}>Add</button>
                </div>
              </div>
            )}
            <div className="p-3 space-y-2">
              {KEYWORDS.map(kw => (
                <div key={kw} className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: "#1F2937" }}>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <code className="text-sm text-slate-200 flex-1">{kw}</code>
                  <span className="text-[10px] text-emerald-400">Monitoring</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Campaigns */}
          <div className="rounded-xl border" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <div className="p-4 border-b" style={{ borderColor: "#1F2937" }}>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-red-400" /> Active Campaigns
              </h3>
            </div>
            <div className="p-4">
              {activeDomains.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No active campaigns detected</p>
                </div>
              ) : activeDomains.slice(0, 3).map(d => (
                <div key={d.id} className="p-3 rounded-lg mb-2 border" style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.3)" }}>
                  <code className="text-xs text-red-300 font-bold">{d.domain}</code>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {d.hosting_provider || "Unknown host"} · Risk: {d.risk_score}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}