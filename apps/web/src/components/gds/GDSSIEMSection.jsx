import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Copy, Download, Send, RefreshCw } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card } from "@/components/gds/GDSOSShared";

const SIEMS = ["Splunk", "Elastic", "Microsoft Sentinel", "IBM QRadar"];

const SIEM_LOGOS = {
  Splunk: { color: "#65a637", abbr: "SPL" },
  Elastic: { color: "#f04e98", abbr: "ELK" },
  "Microsoft Sentinel": { color: "#0078d4", abbr: "MSS" },
  "IBM QRadar": { color: "#1f70c1", abbr: "QRD" },
};

export default function SIEMSection() {
  const [format, setFormat] = useState("CEF");
  const [sevFilter, setSevFilter] = useState("critical");
  const [cefData, setCefData] = useState(null);
  const [ecsData, setEcsData] = useState(null);
  const [schemaData, setSchemaData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [siemTarget, setSiemTarget] = useState("Splunk");
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [pushResult, setPushResult] = useState(null);
  const [pushing, setPushing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ecsExpanded, setEcsExpanded] = useState(false);

  const loadFormat = async (fmt, sev) => {
    setLoading(true);
    try {
      const action = fmt === "CEF" ? "cef_export" : "ecs_export";
      const r = await base44.functions.invoke("gdsAlertRuleEngine", {
        action, severity_filter: sev || sevFilter,
      });
      if (fmt === "CEF") setCefData(r.data);
      else setEcsData(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  React.useEffect(() => { loadFormat("CEF", sevFilter); }, []);

  const switchFormat = (fmt) => {
    setFormat(fmt);
    if (fmt === "CEF" && !cefData) loadFormat("CEF", sevFilter);
    if (fmt === "ECS" && !ecsData) loadFormat("ECS");
  };

  const loadSchema = async () => {
    try {
      const r = await base44.functions.invoke("gdsAlertRuleEngine", { action: "schema" });
      setSchemaData(r.data);
    } catch (e) { console.error(e); }
  };

  const pushFindings = async () => {
    setPushing(true); setPushResult(null);
    try {
      const r = await base44.functions.invoke("gdsAlertRuleEngine", {
        action: "push_findings",
        siem_target: siemTarget.toLowerCase().replace(/\s/g, "_"),
        endpoint_url: endpoint,
        api_key: apiKey,
      });
      setPushResult(r.data);
    } catch (e) { setPushResult({ error: e.message }); }
    finally { setPushing(false); }
  };

  const copyAll = () => {
    const text = format === "CEF"
      ? (cefData?.events || cefData?.cef_events || []).join("\n")
      : JSON.stringify(ecsData?.events || ecsData?.ecs_events || {}, null, 2);
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const download = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  };

  const inputStyle = {
    background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`,
    color: TEXT, borderRadius: 8, padding: "7px 10px", fontSize: 12, outline: "none", width: "100%"
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-5 border-b flex items-center gap-3" style={{ borderColor: BORDER }}>
        <Send className="w-4 h-4" style={{ color: CYAN }} />
        <h3 className="text-sm font-bold text-white">SIEM Integration</h3>
      </div>

      <div className="p-5 space-y-5">
        {/* Format + Severity selectors */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
            {["CEF", "ECS"].map(f => (
              <button key={f} onClick={() => switchFormat(f)}
                className="px-5 py-2 text-xs font-bold transition-all"
                style={{ background: format === f ? `${CYAN}15` : "transparent", color: format === f ? CYAN : MUTED }}>
                {f}
              </button>
            ))}
          </div>
          <select value={sevFilter} onChange={e => { setSevFilter(e.target.value); loadFormat(format, e.target.value); }}
            style={{ ...inputStyle, width: "auto", cursor: "pointer" }}>
            {["all", "critical", "high", "medium"].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          {loading && <RefreshCw className="w-4 h-4 animate-spin" style={{ color: MUTED }} />}
        </div>

        {/* CEF content */}
        {format === "CEF" && (() => {
          const events = cefData?.events || cefData?.cef_events || [];
          const count = cefData?.total_events ?? cefData?.event_count ?? events.length;
          return (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: MUTED }}>{count} events exported</p>
              <div className="relative">
                <pre className="text-[10px] font-mono p-4 rounded-xl overflow-x-auto max-h-48 leading-relaxed"
                  style={{ background: "#030712", border: `1px solid ${BORDER}`, color: "#94a3b8" }}>
                  {events.length > 0
                    ? events.slice(0, 3).join("\n")
                    : `CEF:0|GDS-OS|SecurityPlatform|3.0|100|Critical Finding|10|src=10.0.0.1 msg=No CEF data available yet\nCEF:0|GDS-OS|SecurityPlatform|3.0|100|High Finding|8|src=10.0.0.2 msg=Configure your cloud scanner\nCEF:0|GDS-OS|SecurityPlatform|3.0|100|Medium Finding|5|src=10.0.0.3 msg=Run a scan to generate events`}
                </pre>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={copyAll}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                  style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? "Copied!" : "Copy All"}
                </button>
                <button onClick={() => download(events.join("\n") || "", "findings.txt", "text/plain")}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, color: MUTED }}>
                  <Download className="w-3.5 h-3.5" />
                  Download .txt
                </button>
              </div>
            </div>
          );
        })()}

        {/* ECS content */}
        {format === "ECS" && (() => {
          const events = ecsData?.events || ecsData?.ecs_events || [];
          const sample = events[0] || ecsData?.sample || { "@timestamp": new Date().toISOString(), "event.kind": "alert", "event.category": "vulnerability", "vulnerability.severity": "critical" };
          return (
            <div className="space-y-3">
              <div>
                <button onClick={() => setEcsExpanded(o => !o)}
                  className="text-xs font-bold mb-2 hover:opacity-80" style={{ color: CYAN }}>
                  {ecsExpanded ? "▲ Hide" : "▼ Show"} ECS JSON Sample
                </button>
                {ecsExpanded && (
                  <pre className="text-[10px] font-mono p-4 rounded-xl overflow-x-auto max-h-48"
                    style={{ background: "#030712", border: `1px solid ${BORDER}`, color: "#94a3b8" }}>
                    {JSON.stringify(sample, null, 2)}
                  </pre>
                )}
              </div>
              <button onClick={loadSchema}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, color: MUTED }}>
                Schema Reference →
              </button>
              {schemaData && (
                <pre className="text-[10px] font-mono p-4 rounded-xl overflow-x-auto max-h-60"
                  style={{ background: "#030712", border: `1px solid ${BORDER}`, color: "#94a3b8" }}>
                  {JSON.stringify(schemaData, null, 2)}
                </pre>
              )}
            </div>
          );
        })()}

        {/* Supported SIEMs */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>Supported Integrations</p>
          <div className="flex flex-wrap gap-3">
            {SIEMS.map(s => (
              <div key={s} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: `${SIEM_LOGOS[s].color}10`, border: `1px solid ${SIEM_LOGOS[s].color}30` }}>
                <span className="text-[10px] font-black w-7 text-center" style={{ color: SIEM_LOGOS[s].color }}>{SIEM_LOGOS[s].abbr}</span>
                <span className="text-xs font-semibold" style={{ color: TEXT }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Push to SIEM */}
        <div className="p-4 rounded-xl space-y-4" style={{ background: "rgba(0,212,255,0.03)", border: `1px solid ${BORDER}` }}>
          <p className="text-sm font-bold text-white">Push to SIEM</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select value={siemTarget} onChange={e => setSiemTarget(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}>
              {SIEMS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input placeholder="Endpoint URL (https://…)" value={endpoint}
              onChange={e => setEndpoint(e.target.value)} style={inputStyle} />
            <input placeholder="API Key" value={apiKey} type="password"
              onChange={e => setApiKey(e.target.value)} style={inputStyle} />
          </div>
          <button onClick={pushFindings} disabled={pushing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: `${DANGER}12`, border: `1px solid ${DANGER}30`, color: DANGER }}>
            <Send className={`w-4 h-4 ${pushing ? "animate-pulse" : ""}`} />
            {pushing ? "Pushing…" : "Push Critical Findings"}
          </button>
          {pushResult && (
            <div className="flex items-center gap-4 p-3 rounded-lg text-xs"
              style={{ background: pushResult.error ? `${DANGER}08` : `${LOW}08`, border: `1px solid ${pushResult.error ? DANGER : LOW}25` }}>
              {pushResult.error
                ? <span style={{ color: DANGER }}>Error: {pushResult.error}</span>
                : (
                  <>
                    <span style={{ color: LOW }}>{pushResult.accepted ?? pushResult.events_sent ?? 0} accepted</span>
                    {pushResult.errors != null && <span style={{ color: DANGER }}>{pushResult.errors} errors</span>}
                  </>
                )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}