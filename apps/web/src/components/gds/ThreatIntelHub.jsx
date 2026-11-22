import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, RefreshCw, Search, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Skeleton, Card } from "@/components/gds/GDSOSShared";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function VerdictBadge({ verdict }) {
  const color = verdict === "MALICIOUS" ? DANGER : verdict === "CLEAN" ? LOW : MUTED;
  return <span className="text-sm font-black px-3 py-1 rounded-full" style={{ color, background: `${color}15`, border: `1px solid ${color}40` }}>{verdict}</span>;
}

function KevCell({ value }) {
  const due = new Date(value);
  const past = due < new Date();
  return <span className="text-xs font-mono" style={{ color: past ? DANGER : MEDIUM }}>{value}</span>;
}

export default function ThreatIntelHub() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [iocValue, setIocValue] = useState("");
  const [iocType, setIocType] = useState("ip");
  const [iocLoading, setIocLoading] = useState(false);
  const [iocResult, setIocResult] = useState(null);

  const [cveInput, setCveInput] = useState("");
  const [cveLoading, setCveLoading] = useState(false);
  const [cveResult, setCveResult] = useState(null);

  useEffect(() => {
    base44.functions.invoke("gdsThreatIntelligenceHub", { action: "full_refresh" })
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const checkIOC = async () => {
    if (!iocValue) return;
    setIocLoading(true); setIocResult(null);
    try {
      const res = await base44.functions.invoke("gdsThreatIntelligenceHub", { action: "ioc_check", ioc_value: iocValue, ioc_type: iocType });
      setIocResult(res.data);
    } catch (e) { console.error(e); }
    finally { setIocLoading(false); }
  };

  const enrichCVE = async () => {
    if (!cveInput) return;
    setCveLoading(true); setCveResult(null);
    try {
      const res = await base44.functions.invoke("gdsThreatIntelligenceHub", { action: "enrich", cve_id: cveInput });
      setCveResult(res.data);
    } catch (e) { console.error(e); }
    finally { setCveLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-white">Threat Intelligence Hub</h2>
        <p className="text-xs mt-0.5" style={{ color: MUTED }}>CISA KEV, ransomware tracking, IOC analysis, CVE enrichment</p>
      </div>

      {loading ? <Skeleton lines={4} /> : data && (
        <>
          {/* Live Feed Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "CISA KEV Total", value: data.cisa_kev.total.toLocaleString(), color: DANGER },
              { label: "Added Last 7 Days", value: data.cisa_kev.added_last_7_days, color: HIGH },
              { label: "Ransomware Victims (Recent)", value: data.ransomware.recent_victims_total, color: DANGER },
              { label: "Top Ransomware Groups", value: data.ransomware.top_groups_count, color: MEDIUM },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-4 rounded-2xl" style={{ background: CARD, border: `1px solid ${color}25` }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
                <p className="text-3xl font-black font-mono" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* CISA KEV Recent Table */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b" style={{ borderColor: BORDER }}>
              <h3 className="text-sm font-bold text-white">CISA KEV — Recent Additions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["CVE ID", "Product", "Vendor", "Date Added", "Due Date"].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.cisa_kev.recent_10.map((k, i) => (
                    <tr key={k.cve_id} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                      <td className="px-4 py-3 text-xs font-mono font-bold" style={{ color: DANGER }}>{k.cve_id}</td>
                      <td className="px-4 py-3 text-xs text-white">{k.product}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{k.vendor}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: CYAN }}>{k.date_added}</td>
                      <td className="px-4 py-3"><KevCell value={k.due_date} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Ransomware Groups Chart */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-white mb-4">Top Ransomware Groups — Recent Victims</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.ransomware.top_groups} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: MUTED, fontSize: 10 }} tickLine={false} width={110} />
                <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="recent_victims" radius={[0, 4, 4, 0]}>
                  {data.ransomware.top_groups.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? DANGER : i < 3 ? HIGH : MEDIUM} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {/* IOC Check */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-bold text-white">IOC Check</h3>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={iocType} onChange={e => setIocType(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="ip">IP Address</option>
            <option value="domain">Domain</option>
            <option value="hash">File Hash</option>
          </select>
          <input value={iocValue} onChange={e => setIocValue(e.target.value)}
            onKeyDown={e => e.key === "Enter" && checkIOC()}
            placeholder="Enter IP, domain, or hash…"
            className="flex-1 min-w-0 px-3 py-2 rounded-xl text-xs outline-none"
            style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT }} />
          <button onClick={checkIOC} disabled={iocLoading || !iocValue}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30`, color: CYAN }}>
            {iocLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            Check IOC
          </button>
        </div>
        {iocResult && (
          <div className="p-4 rounded-xl space-y-2" style={{ background: `${iocResult.verdict === "MALICIOUS" ? DANGER : LOW}08`, border: `1px solid ${iocResult.verdict === "MALICIOUS" ? DANGER : LOW}25` }}>
            <div className="flex items-center gap-3">
              <VerdictBadge verdict={iocResult.verdict} />
              <span className="text-xs font-mono" style={{ color: MUTED }}>{iocResult.ioc}</span>
              {iocResult.confidence != null && <span className="text-[10px]" style={{ color: MUTED }}>Confidence: {iocResult.confidence}%</span>}
            </div>
            <p className="text-xs" style={{ color: TEXT }}>{iocResult.recommendation}</p>
            {iocResult.sources?.length > 0 && (
              <p className="text-[10px]" style={{ color: MUTED }}>Sources: {iocResult.sources.join(", ")}</p>
            )}
          </div>
        )}
      </Card>

      {/* CVE Enrichment */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-bold text-white">CVE Enrichment</h3>
        <div className="flex items-center gap-3">
          <input value={cveInput} onChange={e => setCveInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && enrichCVE()}
            placeholder="CVE-2024-1234"
            className="flex-1 px-3 py-2 rounded-xl text-xs font-mono outline-none"
            style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT }} />
          <button onClick={enrichCVE} disabled={cveLoading || !cveInput}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30`, color: CYAN }}>
            {cveLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
            Enrich CVE
          </button>
        </div>
        {cveResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-base font-black font-mono" style={{ color: DANGER }}>{cveResult.cve_id}</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full`} style={{ background: cveResult.in_cisa_kev ? `${DANGER}15` : `${LOW}15`, color: cveResult.in_cisa_kev ? DANGER : LOW, border: `1px solid ${cveResult.in_cisa_kev ? DANGER : LOW}30` }}>
                {cveResult.in_cisa_kev ? "IN CISA KEV" : "NOT IN KEV"}
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: `${cveResult.risk_rating === "CRITICAL" ? DANGER : cveResult.risk_rating === "HIGH" ? HIGH : MEDIUM}15`, color: cveResult.risk_rating === "CRITICAL" ? DANGER : cveResult.risk_rating === "HIGH" ? HIGH : MEDIUM }}>
                {cveResult.risk_rating}
              </span>
            </div>
            {cveResult.kev_details && (
              <div className="p-3 rounded-xl space-y-1" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: DANGER }}>KEV Details</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span style={{ color: MUTED }}>Vendor: <span className="text-white">{cveResult.kev_details.vendor}</span></span>
                  <span style={{ color: MUTED }}>Product: <span className="text-white">{cveResult.kev_details.product}</span></span>
                  <span style={{ color: MUTED }}>Added: <span style={{ color: CYAN }}>{cveResult.kev_details.date_added}</span></span>
                  <span style={{ color: MUTED }}>Due: <KevCell value={cveResult.kev_details.due_date} /></span>
                </div>
              </div>
            )}
            {cveResult.osv_details && (
              <div className="p-3 rounded-xl space-y-1" style={{ background: `${CYAN}05`, border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: CYAN }}>OSV Details</p>
                <p className="text-xs" style={{ color: TEXT }}>{cveResult.osv_details.summary}</p>
                <div className="flex gap-4 text-xs mt-1">
                  <span style={{ color: MUTED }}>Published: <span style={{ color: CYAN }}>{cveResult.osv_details.published}</span></span>
                  <span style={{ color: MUTED }}>CVSS: <span className="font-black font-mono" style={{ color: HIGH }}>{cveResult.osv_details.cvss_score}</span></span>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}