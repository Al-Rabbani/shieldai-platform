import React, { useState, useEffect } from "react";
import LiveDataBadge from "@/components/gds/LiveDataBadge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Package, Download, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, StatusBadge, Skeleton, EmptyState, Breadcrumb, Card, KpiCard, PAGE_BG, TOOLTIP_STYLE
} from "@/components/gds/GDSOSShared";

const LICENSE_RISK_COLOR = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW };
const EOL_STATUS_COLOR = { EOL: DANGER, ENDING_SOON: MEDIUM, ACTIVE: LOW };

export default function GDSSBOMIntelligencePage() {
  const [activeTab, setActiveTab] = useState("eol");
  const [eolData, setEolData] = useState(null);
  const [licenseData, setLicenseData] = useState(null);
  const [tabLoading, setTabLoading] = useState({});
  const [genRepo, setGenRepo] = useState("");
  const [genEco, setGenEco] = useState("npm");
  const [genData, setGenData] = useState(null);
  const [genLoading, setGenLoading] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["gds-sbom-summary"],
    queryFn: () => base44.functions.invoke("gdsSBOMIntelligence", { action: "analyze" }).then(r => r.data),
  });

  const loadTab = async (tab) => {
    const actionMap = { eol: "eol_check", license: "license_audit" };
    const act = actionMap[tab];
    if (!act) return;
    setTabLoading(p => ({ ...p, [tab]: true }));
    try {
      const res = await base44.functions.invoke("gdsSBOMIntelligence", { action: act });
      if (tab === "eol") setEolData(res.data);
      if (tab === "license") setLicenseData(res.data);
    } catch (e) { console.error(e); }
    finally { setTabLoading(p => ({ ...p, [tab]: false })); }
  };

  const handleTab = (tab) => {
    setActiveTab(tab);
    if (tab === "eol" && !eolData) loadTab("eol");
    if (tab === "license" && !licenseData) loadTab("license");
  };

  React.useEffect(() => { loadTab("eol"); }, []);

  const generateSBOM = async () => {
    if (!genRepo.trim()) return;
    setGenLoading(true); setGenData(null);
    try {
      const res = await base44.functions.invoke("gdsSBOMIntelligence", { action: "generate", repo: genRepo, ecosystem: genEco });
      setGenData(res.data);
    } catch (e) { console.error(e); }
    finally { setGenLoading(false); }
  };

  const downloadSBOM = () => {
    if (!genData) return;
    const blob = new Blob([JSON.stringify(genData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `sbom-${genRepo}-${new Date().toISOString().slice(0,10)}.json`; a.click();
  };

  const d = summary || {};
  const licSlices = licenseData?.licenses?.map(l => ({ name: l.license, value: l.count, color: LICENSE_RISK_COLOR[l.risk] || MUTED })) || [];

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "SBOM Intelligence" }]} />
      <div>
        <div className="flex items-center gap-3"><h1 className="text-2xl font-black text-white">SBOM Intelligence</h1><LiveDataBadge /></div>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Software Bill of Materials — dependency analysis, EOL tracking, and license audit</p>
      </div>

      {/* Summary tiles */}
      {isLoading ? <Skeleton lines={2} /> : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Packages", value: d.total_packages, color: CYAN },
            { label: "Vulnerable", value: d.vulnerable, color: HIGH },
            { label: "Critical CVEs", value: d.critical_cves, color: DANGER },
            { label: "KEV in Deps", value: d.kev_in_deps, color: DANGER },
            { label: "License Risks", value: d.license_risks, color: MEDIUM },
            { label: "EOL Packages", value: d.eol_packages, color: HIGH },
          ].map(({ label, value, color }) => (
            <Card key={label} className="p-4 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
              <p className="text-2xl font-black font-mono" style={{ color }}>{value ?? "—"}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: BORDER }}>
        {[["eol", "EOL Check"], ["license", "License Audit"], ["generate", "Generate SBOM"]].map(([id, label]) => (
          <button key={id} onClick={() => handleTab(id)}
            className="px-5 py-3 text-xs font-bold transition-all"
            style={{ color: activeTab === id ? CYAN : MUTED, borderBottom: activeTab === id ? `2px solid ${CYAN}` : "2px solid transparent" }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "eol" && (
        tabLoading.eol ? <Skeleton lines={6} /> : !eolData ? <div /> : (
          <div className="space-y-4">
            {eolData.detected_count > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}30` }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: DANGER }} />
                <p className="text-xs" style={{ color: DANGER }}><strong>{eolData.detected_count} repos</strong> contain EOL packages requiring immediate action.</p>
              </div>
            )}
            <Card className="overflow-hidden">
              <div className="p-4 border-b" style={{ borderColor: BORDER }}><h3 className="font-bold text-white">EOL Package Database</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                      {["Package", "EOL Date", "Status", "Successor", "Action"].map(h => (
                        <th key={h} className="text-left py-2 px-4 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {eolData.eol_database?.map((row, i) => {
                      const sc = EOL_STATUS_COLOR[row.status] || MUTED;
                      return (
                        <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                          <td className="py-3 px-4 font-mono text-white">{row.package}</td>
                          <td className="py-3 px-4 font-mono" style={{ color: MUTED }}>{row.eol_date}</td>
                          <td className="py-3 px-4">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase" style={{ color: sc, background: `${sc}15` }}>{row.status.replace(/_/g, " ")}</span>
                          </td>
                          <td className="py-3 px-4" style={{ color: CYAN }}>{row.successor}</td>
                          <td className="py-3 px-4">
                            {row.action_required && <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: DANGER, background: `${DANGER}15`, border: `1px solid ${DANGER}30` }}>UPGRADE NOW</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )
      )}

      {activeTab === "license" && (
        tabLoading.license ? <Skeleton lines={5} /> : !licenseData ? <div /> : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Card className="overflow-hidden">
                <div className="p-4 border-b" style={{ borderColor: BORDER }}><h3 className="font-bold text-white">License Risk Table</h3></div>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                      {["License", "Count", "Risk", "Commercial Use", "Reason"].map(h => (
                        <th key={h} className="text-left py-2 px-4 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {licenseData.licenses?.map((l, i) => {
                      const lc = LICENSE_RISK_COLOR[l.risk] || MUTED;
                      return (
                        <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                          <td className="py-2 px-4 font-mono text-white">{l.license}</td>
                          <td className="py-2 px-4 font-mono" style={{ color: CYAN }}>{l.count}</td>
                          <td className="py-2 px-4"><SevBadge sev={l.risk} /></td>
                          <td className="py-2 px-4">
                            <span style={{ color: l.commercial_use ? LOW : DANGER }}>{l.commercial_use ? "✓ Yes" : "✗ No"}</span>
                          </td>
                          <td className="py-2 px-4 max-w-xs" style={{ color: MUTED }}>{l.reason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            </div>
            <Card className="p-5">
              <h3 className="text-sm font-bold text-white mb-3">Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={licSlices} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={35}>
                    {licSlices.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )
      )}

      {activeTab === "generate" && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Generate CycloneDX SBOM</h3>
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <input value={genRepo} onChange={e => setGenRepo(e.target.value)} placeholder="Repository name (e.g. my-app)"
              className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT }} />
            <select value={genEco} onChange={e => setGenEco(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT }}>
              {["npm","PyPI","Go","Maven","Cargo","NuGet"].map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <button onClick={generateSBOM} disabled={genLoading || !genRepo.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
              {genLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
              Generate
            </button>
          </div>
          {genData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[["Format", genData.metadata?.format], ["Version", genData.metadata?.spec_version], ["Components", genData.total], ["Vulnerable", genData.vulnerable]].map(([l, v]) => (
                  <div key={l} className="p-3 rounded-xl text-center" style={{ background: "rgba(0,212,255,0.05)", border: `1px solid ${CYAN}20` }}>
                    <p className="text-[9px]" style={{ color: MUTED }}>{l}</p>
                    <p className="text-sm font-black font-mono" style={{ color: CYAN }}>{v ?? "—"}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] font-mono" style={{ color: MUTED }}>Serial: {genData.metadata?.serial_number}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                      {["Name", "PURL", "License", "Vulnerabilities"].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {genData.components?.map((c, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                        <td className="py-2 px-3 font-mono text-white">{c.name}</td>
                        <td className="py-2 px-3 font-mono text-xs max-w-xs truncate" style={{ color: MUTED }}>{c.purl}</td>
                        <td className="py-2 px-3" style={{ color: CYAN }}>{c.license}</td>
                        <td className="py-2 px-3 font-mono" style={{ color: c.vulnerabilities > 0 ? DANGER : LOW }}>{c.vulnerabilities}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={downloadSBOM}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
                style={{ background: `${LOW}15`, border: `1px solid ${LOW}40`, color: LOW }}>
                <Download className="w-4 h-4" />Download CycloneDX JSON
              </button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}