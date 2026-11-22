import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Play, RefreshCw } from "lucide-react";
import { BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, CARD, PAGE_BG, SevBadge, Card, KpiCard, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";

const OWASP_LLM = [
  { id: "LLM01", name: "Prompt Injection" }, { id: "LLM02", name: "Insecure Output" },
  { id: "LLM03", name: "Training Data Poisoning" }, { id: "LLM04", name: "Model DoS" },
  { id: "LLM05", name: "Supply Chain" }, { id: "LLM06", name: "Sensitive Info" },
  { id: "LLM07", name: "Insecure Plugins" }, { id: "LLM08", name: "Excessive Agency" },
  { id: "LLM09", name: "Overreliance" }, { id: "LLM10", name: "Model Theft" },
];

export default function GDSAISPMPage() {
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);

  const { data: findings = [], isLoading } = useQuery({
    queryKey: ["ai-spm-findings"],
    queryFn: () => base44.entities.TriagedFinding.list("-created_date", 100).catch(() => []),
  });
  const aiFindings = findings.filter(f => (f.source_scanners || f.scanner || "").toLowerCase().includes("ai_spm"));

  const scan = async () => {
    setScanning(true); setError(null);
    try {
      const res = await base44.functions.invoke("gdsAISPM", { action: "full_scan", repo_full_name: "Al-Rabbani/gds-os" });
      setResult(res.data);
    } catch (e) { setError(e.message); } finally { setScanning(false); }
  };

  const owaspExposed = result?.owasp_exposure || {};
  const aiScore = result?.ai_risk_score ?? null;
  const scoreColor = aiScore === null ? MUTED : aiScore <= 30 ? LOW : aiScore <= 60 ? HIGH : DANGER;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">🤖</span>
        <div>
          <h1 className="text-2xl font-black text-white">AI Security Posture</h1>
          <p className="text-sm mt-0.5" style={{ color: MUTED }}>Inventory all AI/LLM packages and audit for OWASP LLM Top 10 2025</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={scan} disabled={scanning}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {scanning ? "Scanning…" : "Scan AI Posture"}
        </button>
        {error && <p className="text-sm" style={{ color: DANGER }}>{error}</p>}
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="p-4 flex flex-col items-center justify-center" style={{ border: `1px solid ${scoreColor}30` }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>AI Risk Score</p>
              <div className="text-5xl font-black font-mono" style={{ color: scoreColor }}>{aiScore ?? "—"}</div>
            </Card>
            <KpiCard label="AI Packages" value={result.ai_packages_discovered ?? 0} color={CYAN} icon={Play} />
            <KpiCard label="Critical Packages" value={result.critical_packages ?? 0} color={DANGER} icon={Play} pulse />
            <KpiCard label="High Risk" value={result.high_risk_packages ?? 0} color={HIGH} icon={Play} />
            <KpiCard label="Guardrails Detected" value={result.guardrails_detected ?? 0} color={LOW} icon={Play} />
          </div>

          {/* OWASP Grid */}
          <Card className="p-5">
            <h3 className="font-bold text-white mb-4">OWASP LLM Top 10 2025 Exposure</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {OWASP_LLM.map(item => {
                const exposed = owaspExposed[item.id] ?? false;
                return (
                  <div key={item.id} className="p-3 rounded-xl text-center"
                    style={{ background: exposed ? `${DANGER}10` : `${LOW}08`, border: `1px solid ${exposed ? DANGER : LOW}25` }}>
                    <div className="text-[11px] font-black font-mono mb-1" style={{ color: exposed ? DANGER : LOW }}>{item.id}</div>
                    <div className="text-[10px] mb-2" style={{ color: MUTED }}>{item.name}</div>
                    <div className="text-lg">{exposed ? "🔴" : "🟢"}</div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* AI Packages */}
          {result.packages?.length > 0 && (
            <Card className="overflow-hidden">
              <div className="p-4 border-b" style={{ borderColor: BORDER }}>
                <h3 className="font-bold text-white">AI Packages Discovered</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                      {["Package", "Risk Level", "Concerns", "OWASP Categories"].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.packages.map((p, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                        <td className="px-4 py-2 text-xs font-mono text-white">{p.name}</td>
                        <td className="px-4 py-2"><SevBadge sev={p.risk_level} /></td>
                        <td className="px-4 py-2 text-xs truncate max-w-[200px]" style={{ color: MUTED }}>{Array.isArray(p.concerns) ? p.concerns.join(", ") : p.concerns || "—"}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1 flex-wrap">
                            {(p.owasp_categories || []).map(cat => (
                              <span key={cat} className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{cat}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* AI SPM Findings from DB */}
      {aiFindings.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: BORDER }}>
            <h3 className="font-bold text-white">AI SPM Findings ({aiFindings.length})</h3>
          </div>
          {isLoading ? <Skeleton /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Severity", "Title", "Rule", "File", "Status"].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {aiFindings.slice(0, 50).map((f, i) => (
                    <tr key={f.id || i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                      <td className="px-4 py-2"><SevBadge sev={f.severity || f.normalized_severity} /></td>
                      <td className="px-4 py-2 text-xs text-white truncate max-w-[200px]">{f.title}</td>
                      <td className="px-4 py-2 text-[10px] font-mono" style={{ color: CYAN }}>{f.rule_id || "—"}</td>
                      <td className="px-4 py-2 text-[10px] font-mono truncate max-w-[160px]" style={{ color: MUTED }}>{f.file_path || f.asset_name || "—"}</td>
                      <td className="px-4 py-2 text-[10px]" style={{ color: MUTED }}>{f.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}