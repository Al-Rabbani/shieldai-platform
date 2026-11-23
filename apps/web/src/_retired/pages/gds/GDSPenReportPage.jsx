import React, { useState } from "react";
import LiveDataBadge from "@/components/gds/LiveDataBadge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw, FileText, ChevronDown, ChevronRight } from "lucide-react";
import {
  BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, Skeleton, Breadcrumb, Card, PAGE_BG
} from "@/components/gds/GDSOSShared";

const RAG_COLOR = { RED: DANGER, AMBER: MEDIUM, GREEN: LOW };
const RISK_COLOR = { CRITICAL: DANGER, HIGH: HIGH, MEDIUM: MEDIUM, LOW: LOW };
const ROI_COLOR = { HIGH: LOW, MEDIUM: MEDIUM, LOW: MUTED };

function FixRateGauge({ pct }) {
  const color = pct >= 70 ? LOW : pct >= 40 ? MEDIUM : DANGER;
  const r = 28, circ = 2 * Math.PI * r;
  return (
    <svg width={70} height={70} viewBox="0 0 70 70">
      <circle cx={35} cy={35} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={7} />
      <circle cx={35} cy={35} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${(pct / 100) * circ} ${circ}`} strokeLinecap="round" transform="rotate(-90 35 35)" />
      <text x={35} y={39} fill={color} fontSize={13} textAnchor="middle" fontWeight="900" fontFamily="monospace">{pct}%</text>
    </svg>
  );
}

function ExpandableFinding({ f }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="cursor-pointer hover:bg-white/[0.02]" onClick={() => setOpen(o => !o)} style={{ borderBottom: open ? "none" : `1px solid ${BORDER}15` }}>
        <td className="py-2 px-3">{open ? <ChevronDown className="w-3 h-3" style={{ color: CYAN }} /> : <ChevronRight className="w-3 h-3" style={{ color: MUTED }} />}</td>
        <td className="py-2 px-3 font-mono text-[10px]" style={{ color: CYAN }}>{f.finding_id}</td>
        <td className="py-2 px-3 text-white max-w-xs">{f.title}</td>
        <td className="py-2 px-3"><SevBadge sev={f.severity} /></td>
        <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{f.source}</td>
        <td className="py-2 px-3 font-mono font-bold" style={{ color: f.cvss >= 9 ? DANGER : f.cvss >= 7 ? HIGH : MEDIUM }}>{f.cvss}</td>
        <td className="py-2 px-3 font-mono text-[10px]" style={{ color: MUTED }}>{f.cve || "—"}</td>
        <td className="py-2 px-3">{f.actively_exploited && <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ color: DANGER, background: `${DANGER}15` }}>EXPLOITED</span>}</td>
        <td className="py-2 px-3">{f.autofix && <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ color: LOW, background: `${LOW}15` }}>AutoFix</span>}</td>
      </tr>
      {open && (
        <tr style={{ borderBottom: `1px solid ${BORDER}15`, background: `${CYAN}03` }}>
          <td colSpan={9} className="px-4 py-3 text-xs" style={{ color: MUTED }}>
            CVSS {f.cvss} · {f.cve || "No CVE"} · Source: {f.source} · {f.actively_exploited ? "⚠ Actively exploited in the wild" : "No known active exploitation"}
          </td>
        </tr>
      )}
    </>
  );
}

function ReportGenerator() {
  const [form, setForm] = useState({ report_type: "executive", target: "", engagement_type: "Grey Box" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openSection, setOpenSection] = useState(null);

  const generate = async () => {
    setLoading(true); setResult(null);
    try { const r = await base44.functions.invoke("gdsAutoPenReport", { action: "generate", ...form }); setResult(r.data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Generate Report</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <select value={form.report_type} onChange={e => setForm(p => ({ ...p, report_type: e.target.value }))}
            className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="executive">Executive Report</option>
            <option value="technical">Technical Report</option>
            <option value="remediation">Remediation Report</option>
          </select>
          <input value={form.target} onChange={e => setForm(p => ({ ...p, target: e.target.value }))} placeholder="Target (e.g. app.example.com)"
            className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT }} />
          <select value={form.engagement_type} onChange={e => setForm(p => ({ ...p, engagement_type: e.target.value }))}
            className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option>Grey Box</option><option>Black Box</option><option>White Box</option>
          </select>
        </div>
        <button onClick={generate} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold hover:opacity-80 disabled:opacity-50"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          Generate Report
        </button>
      </Card>

      {result && (
        <div className="space-y-3">
          {[
            { key: "engagement", label: "Engagement Details", content: (
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[["Target", result.engagement?.target], ["Scope", result.engagement?.scope], ["Start", result.engagement?.start_date], ["End", result.engagement?.end_date], ["Methodology", result.engagement?.methodology], ["Tester", result.engagement?.tester]].map(([l, v]) => (
                  <div key={l}><p style={{ color: MUTED }}>{l}</p><p className="font-bold text-white mt-0.5">{v}</p></div>
                ))}
              </div>
            )},
            { key: "summary", label: "Executive Summary", content: (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-4 gap-2">
                  {[["Critical", result.executive_summary?.critical, DANGER], ["High", result.executive_summary?.high, HIGH], ["Medium", result.executive_summary?.medium, MEDIUM], ["Low", result.executive_summary?.low, LOW]].map(([l, v, c]) => (
                    <div key={l} className="p-2 rounded-lg text-center" style={{ background: `${c}08` }}>
                      <p style={{ color: MUTED }}>{l}</p>
                      <p className="text-lg font-black font-mono" style={{ color: c }}>{v}</p>
                    </div>
                  ))}
                </div>
                <p style={{ color: TEXT }}>{result.executive_summary?.narrative}</p>
                <p className="font-bold" style={{ color: DANGER }}>{result.executive_summary?.business_impact}</p>
              </div>
            )},
            { key: "findings", label: `Findings Detail (${result.findings?.length || 0})`, content: (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                      <th className="py-2 px-3 w-6" />
                      {["ID", "Title", "Severity", "Source", "CVSS", "CVE", "Exploited", "AutoFix"].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>{result.findings?.map((f, i) => <ExpandableFinding key={i} f={f} />)}</tbody>
                </table>
              </div>
            )},
          ].map(({ key, label, content }) => (
            <Card key={key} className="overflow-hidden">
              <button onClick={() => setOpenSection(openSection === key ? null : key)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-all">
                <span className="text-sm font-bold text-white">{label}</span>
                {openSection === key ? <ChevronDown className="w-4 h-4" style={{ color: CYAN }} /> : <ChevronRight className="w-4 h-4" style={{ color: MUTED }} />}
              </button>
              {openSection === key && <div className="px-4 pb-4" style={{ borderTop: `1px solid ${BORDER}` }}><div className="pt-3">{content}</div></div>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GDSPenReportPage() {
  const [activeTab, setActiveTab] = useState("executive");
  const [retestData, setRetestData] = useState(null);
  const [retestLoading, setRetestLoading] = useState(false);

  const { data: execData, isLoading } = useQuery({
    queryKey: ["gds-pen-report-exec"],
    queryFn: () => base44.functions.invoke("gdsAutoPenReport", { action: "executive" }).then(r => r.data),
  });

  const runRetest = async () => {
    setRetestLoading(true); setRetestData(null);
    try { const r = await base44.functions.invoke("gdsAutoPenReport", { action: "retest" }); setRetestData(r.data); }
    catch (e) { console.error(e); } finally { setRetestLoading(false); }
  };

  const d = execData || {};
  const ragColor = RAG_COLOR[d.rag] || MUTED;
  const riskColor = RISK_COLOR[d.risk_rating] || MUTED;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Pen Test Reports" }]} />
      <div>
        <div className="flex items-center gap-3"><h1 className="text-2xl font-black text-white">Penetration Test Reports</h1><LiveDataBadge /></div>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Executive summaries, technical findings, and re-test tracking</p>
      </div>

      <div className="flex border-b flex-wrap" style={{ borderColor: BORDER }}>
        {[["executive", "Executive Report"], ["generate", "Generate Report"], ["retest", "Re-test Report"]].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className="px-5 py-3 text-xs font-bold transition-all"
            style={{ color: activeTab === id ? CYAN : MUTED, borderBottom: activeTab === id ? `2px solid ${CYAN}` : "2px solid transparent" }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "executive" && (
        isLoading ? <Skeleton lines={6} /> : (
          <div className="space-y-4">
            {/* Hero card */}
            <Card className="p-6" style={{ borderLeft: `4px solid ${ragColor}` }}>
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-black text-white mb-1">{d.title}</h2>
                  <p className="text-xs" style={{ color: MUTED }}>Issued: {d.date ? new Date(d.date).toLocaleDateString() : "—"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black px-3 py-1.5 rounded-xl" style={{ color: riskColor, background: `${riskColor}15`, border: `1px solid ${riskColor}40` }}>Risk: {d.risk_rating}</span>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black" style={{ background: `${ragColor}20`, color: ragColor, border: `2px solid ${ragColor}60` }}>{d.rag}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                {[["Critical", d.critical, DANGER], ["High", d.high, HIGH], ["Medium+", d.total_findings, MUTED]].map(([l, v, c]) => (
                  <div key={l} className="p-3 rounded-xl" style={{ background: `${c}08` }}>
                    <p className="text-[10px]" style={{ color: MUTED }}>{l}</p>
                    <p className="text-2xl font-black font-mono" style={{ color: c }}>{v}</p>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5">
                <h3 className="text-sm font-bold text-white mb-3">Key Messages</h3>
                {d.key_messages?.map((m, i) => <p key={i} className="text-xs mb-2" style={{ color: TEXT }}>⚠ {m}</p>)}
              </Card>
              <Card className="p-5">
                <h3 className="text-sm font-bold text-white mb-3">Recommendations</h3>
                {d.recommendations?.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${CYAN}20`, color: CYAN }}>{r.priority}</span>
                    <span className="text-xs flex-1" style={{ color: TEXT }}>{r.action}</span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ color: ROI_COLOR[r.roi] || MUTED }}>{r.roi} ROI</span>
                  </div>
                ))}
                {d.next_board_review && <p className="text-[10px] mt-3" style={{ color: MUTED }}>Next Board Review: <strong style={{ color: CYAN }}>{d.next_board_review}</strong></p>}
              </Card>
            </div>
          </div>
        )
      )}

      {activeTab === "generate" && <ReportGenerator />}

      {activeTab === "retest" && (
        <div className="space-y-4">
          <button onClick={runRetest} disabled={retestLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold hover:opacity-80 disabled:opacity-50"
            style={{ background: `${MEDIUM}15`, border: `1px solid ${MEDIUM}40`, color: MEDIUM }}>
            {retestLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Run Re-test
          </button>

          {retestData && (
            <div className="space-y-4">
              <div className="flex items-center gap-6 flex-wrap">
                <FixRateGauge pct={retestData.fix_rate_pct} />
                <div>
                  <p className="text-2xl font-black text-white">{retestData.fix_rate_pct}% Fix Rate</p>
                  <p className="text-xs" style={{ color: MUTED }}>{retestData.fixed} fixed · {retestData.still_open} still open · {retestData.total_retested} retested</p>
                </div>
              </div>

              <Card className="overflow-hidden">
                <div className="p-3 border-b" style={{ borderColor: BORDER, background: `${LOW}08` }}>
                  <h3 className="text-sm font-bold" style={{ color: LOW }}>✓ Fixed Findings ({retestData.fixed})</h3>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                      {["ID", "Title", "Severity", "Fixed At"].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {retestData.fixed_findings?.map((f, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${BORDER}15` }}>
                        <td className="py-2 px-3 font-mono" style={{ color: CYAN }}>{f.finding_id}</td>
                        <td className="py-2 px-3 text-white">{f.title}</td>
                        <td className="py-2 px-3"><SevBadge sev={f.severity} /></td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{f.fixed_at ? new Date(f.fixed_at).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}