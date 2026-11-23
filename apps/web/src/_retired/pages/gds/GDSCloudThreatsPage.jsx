import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, Shield, AlertTriangle, Target, Globe } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, SevBadge, timeAgo } from "@/components/gds/GDSOSShared";

function ProviderBadge({ provider }) {
  const colors = { aws: "#ff9900", azure: "#0078d4", gcp: "#4285f4" };
  const labels = { aws: "AWS", azure: "Azure", gcp: "GCP" };
  const color = colors[provider?.toLowerCase()] || MUTED;
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {labels[provider?.toLowerCase()] || provider || "—"}
    </span>
  );
}

const threatTypeColors = {
  data_exfiltration: DANGER,
  privilege_escalation: HIGH,
  credential_abuse: MEDIUM,
  crypto_mining: "#f97316",
  lateral_movement: "#8b5cf6",
  reconnaissance: CYAN,
};

export default function GDSCloudThreatsPage() {
  const [filter, setFilter] = useState("all");

  const { data: threats = [] } = useQuery({
    queryKey: ["cloud-threats"],
    queryFn: () => base44.entities.CloudThreat?.list("-detected_at", 500).catch(() => []),
  });

  const activeThreats = threats.filter(t => t.status === "active");
  const criticalThreats = threats.filter(t => t.severity === "critical");
  const uniqueTypes = [...new Set(threats.map(t => t.threat_type))].length;

  const filtered = filter === "all" ? threats : threats.filter(t => t.status === filter);

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Cloud Security" }, { label: "Threat Dashboard" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Cloud Threat Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Active threats, MITRE ATT&CK mapping, and kill chain analysis</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: CYAN }} />
          <span className="text-[10px] font-bold" style={{ color: CYAN }}>LIVE DATA</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4" glow>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4" style={{ color: DANGER }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Active Threats</p>
          </div>
          <p className="text-2xl font-black" style={{ color: DANGER }}>{activeThreats.length}</p>
        </Card>

        <Card className="p-4" glow>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Critical</p>
          </div>
          <p className="text-2xl font-black" style={{ color: DANGER }}>{criticalThreats.length}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4" style={{ color: CYAN }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Threat Types</p>
          </div>
          <p className="text-2xl font-black text-white">{uniqueTypes}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4" style={{ color: LOW }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Mitigated</p>
          </div>
          <p className="text-2xl font-black" style={{ color: LOW }}>{threats.filter(t => t.status === "mitigated").length}</p>
        </Card>
      </div>

      {/* Threats Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="font-bold text-white">Active Threats</h3>
            <div className="flex gap-2">
              {[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "investigating", label: "Investigating" },
                { value: "mitigated", label: "Mitigated" }
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: filter === f.value ? `${CYAN}15` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${filter === f.value ? CYAN + "40" : BORDER}`,
                    color: filter === f.value ? CYAN : MUTED
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                {["Title", "Provider", "Type", "Severity", "Confidence", "MITRE Technique", "Kill Chain", "Source", "Blast Radius", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((t, i) => (
                <tr key={t.id || i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                  <td className="px-4 py-3 text-xs font-bold text-white max-w-xs truncate">{t.title}</td>
                  <td className="px-4 py-3"><ProviderBadge provider={t.provider} /></td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${threatTypeColors[t.threat_type] || MUTED}15`, color: threatTypeColors[t.threat_type] || MUTED }}>
                      {t.threat_type || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3"><SevBadge sev={t.severity} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <div className="w-16 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                        <div className="h-full rounded-full" style={{ width: `${t.confidence || 0}%`, background: (t.confidence || 0) >= 80 ? LOW : (t.confidence || 0) >= 50 ? MEDIUM : DANGER }} />
                      </div>
                      <span className="text-[10px] font-mono" style={{ color: MUTED }}>{t.confidence || 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: CYAN }}>{t.mitre_technique || "—"}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{t.kill_chain_stage || "—"}</td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: MUTED }}>{t.source_ip || t.country || "—"}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{t.blast_radius || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded ${
                      t.status === "active" ? `bg-[${DANGER}15] text-[${DANGER}]` :
                      t.status === "mitigated" ? `bg-[${LOW}15] text-[${LOW}]` :
                      "bg-gray-700 text-gray-300"
                    }`} style={{
                      background: t.status === "active" ? `${DANGER}15` : t.status === "mitigated" ? `${LOW}15` : "rgba(100,116,139,0.15)",
                      color: t.status === "active" ? DANGER : t.status === "mitigated" ? LOW : MUTED
                    }}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MITRE ATT&CK Heatmap Placeholder */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">MITRE ATT&CK Coverage</h3>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {["Recon", "Initial", "Execution", "Persistence", "PrivEsc", "Defense Evasion", "Credential", "Discovery", "Lateral", "Collection", "Exfil", "Impact"].map((tactic, i) => {
            const count = threats.filter(t => t.mitre_technique?.includes(tactic)).length;
            const intensity = count > 5 ? DANGER : count > 2 ? HIGH : count > 0 ? MEDIUM : "rgba(255,255,255,0.05)";
            return (
              <div key={i} className="p-3 rounded-lg text-center" style={{ background: intensity }}>
                <p className="text-[9px] font-bold text-white mb-1">{tactic}</p>
                <p className="text-lg font-black text-white">{count}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}