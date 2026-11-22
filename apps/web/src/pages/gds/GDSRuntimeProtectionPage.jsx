import React, { useState } from "react";
import LiveDataBadge from "@/components/gds/LiveDataBadge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Shield, AlertTriangle, CheckCircle, Activity } from "lucide-react";
import {
  BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, Skeleton, EmptyState, Breadcrumb, Card, KpiCard, PAGE_BG, CARD
} from "@/components/gds/GDSOSShared";

const ACTION_COLOR = { block_and_alert: DANGER, alert: HIGH, throttle: MEDIUM };
const ACTION_LABEL = { block_and_alert: "BLOCK & ALERT", alert: "ALERT", throttle: "THROTTLE" };

export default function GDSRuntimeProtectionPage() {
  const [activeTab, setActiveTab] = useState("ebpf");
  const [threatData, setThreatData] = useState(null);
  const [containerData, setContainerData] = useState(null);
  const [networkData, setNetworkData] = useState(null);
  const [tabLoading, setTabLoading] = useState({});

  const { data: statusData, isLoading } = useQuery({
    queryKey: ["gds-runtime-status"],
    queryFn: () => base44.functions.invoke("gdsRuntimeProtectionEngine", { action: "status" }).then(r => r.data),
  });

  const { data: rulesData, isLoading: rulesLoading } = useQuery({
    queryKey: ["gds-ebpf-rules"],
    queryFn: () => base44.functions.invoke("gdsRuntimeProtectionEngine", { action: "syscall_audit" }).then(r => r.data),
  });

  const load = async (tab, act, setter) => {
    setTabLoading(p => ({ ...p, [tab]: true }));
    try { const r = await base44.functions.invoke("gdsRuntimeProtectionEngine", { action: act }); setter(r.data); }
    catch (e) { console.error(e); } finally { setTabLoading(p => ({ ...p, [tab]: false })); }
  };

  const handleTab = (tab) => {
    setActiveTab(tab);
    if (tab === "threats" && !threatData) load("threats", "threat_detect", setThreatData);
    if (tab === "containers" && !containerData) load("containers", "container_runtime", setContainerData);
    if (tab === "network" && !networkData) load("network", "network_policy", setNetworkData);
  };

  const s = statusData || {};
  const rules = rulesData?.rules || [];

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Runtime Protection" }]} />
      <div>
        <div className="flex items-center gap-3"><h1 className="text-2xl font-black text-white">Runtime Protection</h1><LiveDataBadge /></div>
        <p className="text-sm mt-1" style={{ color: MUTED }}>eBPF kernel-level threat detection, container policies, and network monitoring</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "eBPF Rules Active", value: s.ebpf_rules_active ?? 8, color: CYAN },
          { label: "Policies Total", value: s.policies_total ?? 5, color: MUTED },
          { label: "Enforced", value: s.policies_enforced ?? 3, color: LOW },
          { label: "Container Findings", value: s.container_findings ?? 0, color: HIGH },
          { label: "K8s Findings", value: s.k8s_findings ?? 0, color: HIGH },
          { label: "VM Findings", value: s.vm_findings ?? 0, color: MEDIUM },
        ].map(({ label, value, color }) => (
          <Card key={label} className="p-4 text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
            <p className="text-2xl font-black font-mono" style={{ color }}>{value ?? "—"}</p>
          </Card>
        ))}
      </div>

      <div className="flex border-b flex-wrap" style={{ borderColor: BORDER }}>
        {[["ebpf", "eBPF Rules"], ["threats", "Threat Detection"], ["containers", "Container Runtime"], ["network", "Network Policy"]].map(([id, label]) => (
          <button key={id} onClick={() => handleTab(id)}
            className="px-5 py-3 text-xs font-bold transition-all"
            style={{ color: activeTab === id ? CYAN : MUTED, borderBottom: activeTab === id ? `2px solid ${CYAN}` : "2px solid transparent" }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "ebpf" && (
        rulesLoading ? <Skeleton lines={4} /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map((rule, i) => {
              const ac = ACTION_COLOR[rule.action] || MUTED;
              return (
                <Card key={i} className="p-4" style={{ borderLeft: `3px solid ${ac}` }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded mr-2" style={{ color: CYAN, background: `${CYAN}15` }}>{rule.id}</span>
                      <span className="text-sm font-bold text-white">{rule.name}</span>
                    </div>
                    <SevBadge sev={rule.severity} />
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: MEDIUM, background: `${MEDIUM}12` }}>syscall: {rule.syscall}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.05)" }}>{rule.mitre}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase" style={{ color: ac, background: `${ac}15` }}>{ACTION_LABEL[rule.action]}</span>
                  </div>
                  <p className="text-[11px]" style={{ color: MUTED }}>{rule.description}</p>
                </Card>
              );
            })}
          </div>
        )
      )}

      {activeTab === "threats" && (
        tabLoading.threats ? <Skeleton lines={5} /> : !threatData
          ? <div className="text-center py-8"><p className="text-sm" style={{ color: MUTED }}>Loading…</p></div>
          : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {threatData.all_clear
                  ? <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: `${LOW}08`, border: `1px solid ${LOW}30` }}>
                      <CheckCircle className="w-4 h-4" style={{ color: LOW }} />
                      <span className="text-sm font-bold" style={{ color: LOW }}>All Clear — No threats detected</span>
                    </div>
                  : <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}30` }}>
                      <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} />
                      <span className="text-sm font-bold" style={{ color: DANGER }}>{threatData.triggered_count} rules triggered</span>
                    </div>}
                <button onClick={() => load("threats", "threat_detect", setThreatData)} disabled={tabLoading.threats}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold hover:opacity-80"
                  style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
                  <RefreshCw className={`w-3.5 h-3.5 ${tabLoading.threats ? "animate-spin" : ""}`} />Run Threat Detection
                </button>
              </div>
              <Card className="overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                      {["Rule ID", "Name", "Status", "Matches", "Severity", "MITRE", "Recommendation"].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {threatData.rules?.map((r, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: r.triggered ? `${DANGER}05` : undefined }}>
                        <td className="py-2 px-3 font-mono" style={{ color: CYAN }}>{r.id}</td>
                        <td className="py-2 px-3 text-white">{r.name}</td>
                        <td className="py-2 px-3">
                          <span className="text-[10px] font-black" style={{ color: r.triggered ? DANGER : LOW }}>{r.triggered ? "⚠ TRIGGERED" : "✓ CLEAR"}</span>
                        </td>
                        <td className="py-2 px-3 font-mono" style={{ color: r.match_count > 0 ? DANGER : MUTED }}>{r.match_count}</td>
                        <td className="py-2 px-3"><SevBadge sev={r.severity} /></td>
                        <td className="py-2 px-3 font-mono text-[10px]" style={{ color: MUTED }}>{r.mitre}</td>
                        <td className="py-2 px-3 max-w-xs" style={{ color: MUTED }}>{r.recommendation?.slice(0, 60)}…</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )
      )}

      {activeTab === "containers" && (
        tabLoading.containers ? <Skeleton lines={4} /> : !containerData ? <div /> : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[["Scans", containerData.scan_count, CYAN], ["Findings", containerData.total_findings, HIGH], ["Critical", containerData.critical, DANGER], ["Root Containers", containerData.root_containers, DANGER], ["Privileged", containerData.privileged_containers, HIGH]].map(([l, v, c]) => (
                <Card key={l} className="p-4 text-center">
                  <p className="text-[9px]" style={{ color: MUTED }}>{l}</p>
                  <p className="text-2xl font-black font-mono" style={{ color: c }}>{v ?? 0}</p>
                </Card>
              ))}
            </div>
            <Card className="overflow-hidden">
              <div className="p-4 border-b" style={{ borderColor: BORDER }}><h3 className="font-bold text-white">Runtime Policies</h3></div>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Policy ID", "Name", "Enforced", "Rule", "Coverage"].map(h => (
                      <th key={h} className="text-left py-2 px-4 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {containerData.policies?.map((p, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-4 font-mono" style={{ color: CYAN }}>{p.id}</td>
                      <td className="py-2 px-4 text-white font-medium">{p.name}</td>
                      <td className="py-2 px-4"><span style={{ color: p.enforced ? LOW : MEDIUM }}>{p.enforced ? "✓ Enforced" : "○ Not enforced"}</span></td>
                      <td className="py-2 px-4 max-w-xs" style={{ color: MUTED }}>{p.rule?.slice(0, 60)}…</td>
                      <td className="py-2 px-4" style={{ color: MUTED }}>{p.coverage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )
      )}

      {activeTab === "network" && (
        tabLoading.network ? <Skeleton lines={4} /> : !networkData ? <div /> : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: `${MEDIUM}08`, border: `1px solid ${MEDIUM}30` }}>
              <Activity className="w-4 h-4 flex-shrink-0" style={{ color: MEDIUM }} />
              <p className="text-xs" style={{ color: TEXT }}>{networkData.policy_recommendation}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="overflow-hidden">
                <div className="p-4 border-b" style={{ borderColor: BORDER }}><h3 className="font-bold text-white">Open Ports ({networkData.internet_facing_assets} internet-facing)</h3></div>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                      {["Asset", "Port", "Protocol", "Risk"].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {networkData.open_ports?.map((p, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                        <td className="py-2 px-3 font-mono text-white">{p.asset}</td>
                        <td className="py-2 px-3 font-mono" style={{ color: CYAN }}>{p.port}</td>
                        <td className="py-2 px-3" style={{ color: MUTED }}>{p.protocol}</td>
                        <td className="py-2 px-3"><SevBadge sev={p.risk} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
              <Card className="p-4">
                <h3 className="font-bold text-white mb-3">Network Issues</h3>
                {networkData.network_issues?.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs mb-2" style={{ color: DANGER }}>
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{issue}
                  </div>
                ))}
              </Card>
            </div>
          </div>
        )
      )}
    </div>
  );
}