import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Target, RefreshCw, AlertTriangle, ChevronRight, Globe } from "lucide-react";
import {
  BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, EmptyState, Card, KpiCard, PAGE_BG, SEV_COLOR
} from "@/components/gds/GDSOSShared";

function StepChain({ steps }) {
  if (!steps || steps.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 mt-3">
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <div className="px-2.5 py-1 rounded-lg text-[10px] font-semibold" style={{ background: "rgba(0,212,255,0.08)", border: `1px solid ${BORDER}`, color: TEXT }}>
            {typeof step === "string" ? step : (step.node || step.action || step.label || JSON.stringify(step))}
          </div>
          {i < steps.length - 1 && <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: MUTED }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function AttackPathCard({ path }) {
  const [expanded, setExpanded] = useState(false);
  const sev = path.severity || "high";
  const color = SEV_COLOR[sev] || MUTED;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <SevBadge sev={sev} />
            {path.internet_facing && (
              <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: DANGER }}>
                <Globe className="w-3 h-3" /> Internet Exposed
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-white">{path.title || path.name || "Attack Path"}</h3>
          {path.description && <p className="text-xs mt-1" style={{ color: MUTED }}>{path.description}</p>}
          {path.mitre_techniques && (
            <p className="text-[10px] mt-1 font-mono" style={{ color: CYAN }}>MITRE: {path.mitre_techniques}</p>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          {path.blast_radius !== undefined && (
            <div className="text-lg font-black font-mono" style={{ color }}>{path.blast_radius}</div>
          )}
          <div className="text-[9px] uppercase tracking-wider" style={{ color: MUTED }}>blast radius</div>
        </div>
      </div>
      <button onClick={() => setExpanded(!expanded)}
        className="mt-3 text-[11px] font-semibold transition-colors hover:opacity-80"
        style={{ color: CYAN }}>
        {expanded ? "Hide steps ▲" : "Show attack chain ▼"}
      </button>
      {expanded && <StepChain steps={path.steps || path.attack_chain || []} />}
    </Card>
  );
}

export default function GDSAttackPathsPage() {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("gdsAttackPath", {});
      setResult(res.data);
    } catch (e) {
      setError(e.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const paths = result?.attack_paths || [];

  return (
    <div className="space-y-6" style={PAGE_BG}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-widest" style={{ color: CYAN }}>ATTACK PATH ANALYSIS</h1>
          <p className="text-[10px] font-bold tracking-[0.2em] mt-0.5 uppercase" style={{ color: MUTED }}>GDS OS · Lateral Movement &amp; Exploit Chain Detection</p>
        </div>
        <button onClick={handleAnalyze} disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          <RefreshCw className={`w-4 h-4 ${analyzing ? "animate-spin" : ""}`} />
          {analyzing ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm" style={{ background: `${DANGER}10`, border: `1px solid ${DANGER}30`, color: DANGER }}>{error}</div>
      )}

      {result && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard label="Exploitable Paths" value={result.exploitable_paths ?? paths.length} color={DANGER} icon={Target} pulse />
          <KpiCard label="Critical Paths" value={result.critical_paths ?? paths.filter(p => p.severity === "critical").length} color={DANGER} icon={AlertTriangle} />
          <KpiCard label="Internet-Facing Assets" value={result.internet_facing_assets ?? paths.filter(p => p.internet_facing).length} color={HIGH} icon={Globe} />
        </div>
      )}

      {!result && !analyzing && (
        <Card className="p-12 text-center">
          <Target className="w-12 h-12 mx-auto mb-4" style={{ color: MUTED }} />
          <h3 className="text-base font-bold text-white mb-2">No analysis run yet</h3>
          <p className="text-sm" style={{ color: MUTED }}>Click "Analyze" to detect exploitable attack paths in your infrastructure.</p>
        </Card>
      )}

      {analyzing && (
        <Card className="p-8 text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: CYAN }} />
          <p className="text-sm font-medium" style={{ color: MUTED }}>Analyzing attack paths across your infrastructure…</p>
        </Card>
      )}

      {paths.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white">Detected Attack Paths ({paths.length})</h3>
          {paths.map((path, i) => <AttackPathCard key={i} path={path} />)}
        </div>
      )}
    </div>
  );
}