import React, { useState } from "react";
import LiveDataBadge from "@/components/gds/LiveDataBadge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import {
  BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, Skeleton, EmptyState, Breadcrumb, Card, KpiCard, PAGE_BG
} from "@/components/gds/GDSOSShared";

const STRENGTH_COLOR = { high: LOW, medium: MEDIUM, none: DANGER };

function ScoreBar({ score, max = 100 }) {
  const color = score >= 70 ? DANGER : score >= 40 ? MEDIUM : LOW;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full" style={{ width: `${(score / max) * 100}%`, background: color }} />
      </div>
      <span className="text-[11px] font-black font-mono w-6 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

export default function GDSAISecurityRedTeamPage() {
  const [activeTab, setActiveTab] = useState("controls");
  const [scanResults, setScanResults] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [shadowData, setShadowData] = useState(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [customResult, setCustomResult] = useState(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [patternsExpanded, setPatternsExpanded] = useState(false);

  const { data: spmData, isLoading } = useQuery({
    queryKey: ["gds-ai-spm"],
    queryFn: () => base44.functions.invoke("gdsAIRedTeam", { action: "ai_spm" }).then(r => r.data),
  });

  const handleTab = async (tab) => {
    setActiveTab(tab);
    if (tab === "shadow" && !shadowData) {
      try { const r = await base44.functions.invoke("gdsAIRedTeam", { action: "shadow_ai" }); setShadowData(r.data); } catch (e) { console.error(e); }
    }
  };

  const runScan = async () => {
    setScanLoading(true); setScanResults(null);
    try { const r = await base44.functions.invoke("gdsAIRedTeam", { action: "scan_prompts" }); setScanResults(r.data); }
    catch (e) { console.error(e); } finally { setScanLoading(false); }
  };

  const detectInjection = async () => {
    if (!customPrompt.trim()) return;
    setCustomLoading(true); setCustomResult(null);
    try { const r = await base44.functions.invoke("gdsAIRedTeam", { action: "detect_injection", prompt: customPrompt }); setCustomResult(r.data); }
    catch (e) { console.error(e); } finally { setCustomLoading(false); }
  };

  const d = spmData || {};
  const score = d.score ?? 50;
  const grade = d.grade ?? "C";
  const gradeColor = { A: LOW, B: CYAN, C: MEDIUM, D: DANGER }[grade] || MUTED;
  const controls = d.controls || [];
  const patterns = d.injection_patterns || [];

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "AI Security" }]} />
      <div>
        <div className="flex items-center gap-3"><h1 className="text-2xl font-black text-white">AI Security & Red Team</h1><LiveDataBadge /></div>
        <p className="text-sm mt-1" style={{ color: MUTED }}>AI SPM, prompt injection detection, shadow AI, and adversarial testing</p>
      </div>

      {/* Score header */}
      <Card className="p-6">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${gradeColor}15`, border: `2px solid ${gradeColor}60` }}>
            <span className="text-4xl font-black" style={{ color: gradeColor }}>{grade}</span>
          </div>
          <div>
            <p className="text-sm font-bold text-white mb-1">AI Security Score</p>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black font-mono" style={{ color: gradeColor }}>{score}</span>
              <span className="text-xl" style={{ color: MUTED }}>/100</span>
            </div>
          </div>
          <div className="flex-1 ml-4 hidden md:block">
            <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full" style={{ width: `${score}%`, background: `linear-gradient(90deg, ${DANGER}, ${MEDIUM}, ${gradeColor})` }} />
            </div>
            <div className="flex justify-between mt-1 text-[9px]" style={{ color: MUTED }}>
              <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex border-b flex-wrap" style={{ borderColor: BORDER }}>
        {[["controls", "AI Controls"], ["scanner", "Prompt Scanner"], ["shadow", "Shadow AI"], ["patterns", "Injection Patterns"]].map(([id, label]) => (
          <button key={id} onClick={() => handleTab(id)}
            className="px-5 py-3 text-xs font-bold transition-all"
            style={{ color: activeTab === id ? CYAN : MUTED, borderBottom: activeTab === id ? `2px solid ${CYAN}` : "2px solid transparent" }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "controls" && (
        isLoading ? <Skeleton lines={4} /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {controls.map((c, i) => {
              const sc = STRENGTH_COLOR[c.strength] || MUTED;
              return (
                <Card key={i} className="p-4" style={{ borderLeft: `3px solid ${c.implemented ? LOW : DANGER}` }}>
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <p className="text-xs font-bold text-white leading-tight">{c.name}</p>
                    {c.implemented ? <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: LOW }} /> : <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: DANGER }} />}
                  </div>
                  <p className="text-[10px] mb-2" style={{ color: MUTED }}>{c.coverage}</p>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase" style={{ color: sc, background: `${sc}15` }}>{c.strength} strength</span>
                </Card>
              );
            })}
          </div>
        )
      )}

      {activeTab === "scanner" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Adversarial Prompt Suite</h3>
            <button onClick={runScan} disabled={scanLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}40`, color: DANGER }}>
              {scanLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              Test Adversarial Suite
            </button>
          </div>
          {scanResults && (
            <div className="space-y-3">
              <div className="flex gap-4">
                <span className="text-xs" style={{ color: DANGER }}>⚠ {scanResults.injected} injections detected</span>
                <span className="text-xs" style={{ color: LOW }}>✓ {scanResults.total - scanResults.injected} clean</span>
              </div>
              <Card className="overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                      {["Prompt Preview", "Status", "Patterns Detected", "Risk Score"].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scanResults.results?.map((r, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: r.matched ? `${DANGER}05` : undefined }}>
                        <td className="py-2 px-3 max-w-xs" style={{ color: MUTED }}>{r.preview?.slice(0, 60)}…</td>
                        <td className="py-2 px-3"><span className="text-[10px] font-black" style={{ color: r.matched ? DANGER : LOW }}>{r.matched ? "⚠ INJECTED" : "✓ CLEAN"}</span></td>
                        <td className="py-2 px-3">{r.patterns_detected?.map((p, j) => <span key={j} className="text-[9px] mr-1 px-1.5 py-0.5 rounded" style={{ color: DANGER, background: `${DANGER}12` }}>{p}</span>)}</td>
                        <td className="py-2 px-3 w-32"><ScoreBar score={r.risk_score} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-white mb-3">Custom Prompt Detection</h3>
            <div className="flex gap-3">
              <input value={customPrompt} onChange={e => setCustomPrompt(e.target.value)}
                placeholder="Enter a prompt to test for injection…"
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT }}
                onKeyDown={e => e.key === "Enter" && detectInjection()} />
              <button onClick={detectInjection} disabled={customLoading || !customPrompt.trim()}
                className="px-4 py-2 rounded-xl text-sm font-bold hover:opacity-80 disabled:opacity-50"
                style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                {customLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Detect"}
              </button>
            </div>
            {customResult && (
              <div className="mt-3 p-3 rounded-xl" style={{ background: customResult.matched ? `${DANGER}08` : `${LOW}08`, border: `1px solid ${customResult.matched ? DANGER : LOW}30` }}>
                <p className="text-sm font-black mb-1" style={{ color: customResult.matched ? DANGER : LOW }}>
                  {customResult.verdict} — Risk Score: {customResult.risk_score}
                </p>
                {customResult.patterns_detected?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {customResult.patterns_detected.map((p, i) => <span key={i} className="text-[10px] px-2 py-0.5 rounded" style={{ color: DANGER, background: `${DANGER}12` }}>{p}</span>)}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "shadow" && (
        !shadowData ? <Skeleton lines={3} /> : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: `${MEDIUM}08`, border: `1px solid ${MEDIUM}30` }}>
              <AlertTriangle className="w-4 h-4" style={{ color: MEDIUM }} />
              <span className="text-xs font-bold" style={{ color: MEDIUM }}>{shadowData.shadow_ai_signals} Shadow AI signals detected</span>
            </div>
            <Card className="overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Source", "Package", "Severity", "Type"].map(h => (
                      <th key={h} className="text-left py-2 px-4 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shadowData.signals?.map((s, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-4"><span className="text-[10px] px-2 py-0.5 rounded font-mono" style={{ color: CYAN, background: `${CYAN}12` }}>{s.source}</span></td>
                      <td className="py-2 px-4 font-mono text-white">{s.package}</td>
                      <td className="py-2 px-4"><SevBadge sev={s.severity} /></td>
                      <td className="py-2 px-4" style={{ color: MUTED }}>{s.type.replace(/_/g, " ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )
      )}

      {activeTab === "patterns" && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: BORDER }}><h3 className="font-bold text-white">Injection Pattern Library ({patterns.length} patterns)</h3></div>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                {["ID", "Technique", "MITRE", "Severity", "Pattern"].map(h => (
                  <th key={h} className="text-left py-2 px-4 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {patterns.map((p, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                  <td className="py-2 px-4 font-mono" style={{ color: CYAN }}>{p.id}</td>
                  <td className="py-2 px-4 text-white">{p.technique}</td>
                  <td className="py-2 px-4 font-mono text-[10px]" style={{ color: MUTED }}>{p.mitre}</td>
                  <td className="py-2 px-4"><SevBadge sev={p.severity} /></td>
                  <td className="py-2 px-4" style={{ color: MUTED }}>{p.pattern}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}