import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { VECTOR_DEFS, evaluateVector, observeVectors } from "@/lib/attackVectors";
import { buildAttackGraph, findBestPath, describeExposure } from "@/lib/attackPaths";
import AttackPathGraph from "@/components/attack/AttackPathGraph";
import AttackEntryPointMap from "@/components/attack/AttackEntryPointMap";
import AttackPathDetail from "@/components/attack/AttackPathDetail";
import { Radar, ShieldAlert, ShieldCheck, ShieldX, Activity, Network } from "lucide-react";

const VERDICT_STYLE = {
  Contained: { color: "#10b981", icon: ShieldCheck },
  "Partially contained": { color: "#f59e0b", icon: ShieldAlert },
  Exposed: { color: "#ef4444", icon: ShieldX },
};

export default function AttackVectorSimulatorPage() {
  const [data, setData] = useState({ aiPolicies: [], authorizationPolicies: [], promptAttacks: [], jailbreakAttempts: [], findings: [], incidents: [], assets: [], dependencies: [] });
  const [selected, setSelected] = useState("prompt_injection");
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [aiPolicies, authorizationPolicies, promptAttacks, jailbreakAttempts, findings, incidents, assets, dependencies] = await Promise.all([
        base44.entities.AIPolicy.list("-created_date", 200).catch(() => []),
        base44.entities.AuthorizationPolicy.list("-risk_score", 200).catch(() => []),
        base44.entities.PromptAttack.list("-detected_at", 300).catch(() => []),
        base44.entities.JailbreakAttempt.list("-detected_at", 300).catch(() => []),
        base44.entities.TriagedFinding.list("-detected_at", 400).catch(() => []),
        base44.entities.Incident.list("-created_date", 300).catch(() => []),
        base44.entities.Asset.list("-created_date", 300).catch(() => []),
        base44.entities.AssetDependency.list("-created_date", 400).catch(() => []),
      ]);
      setData({
        aiPolicies: aiPolicies || [],
        authorizationPolicies: authorizationPolicies || [],
        promptAttacks: promptAttacks || [],
        jailbreakAttempts: jailbreakAttempts || [],
        findings: findings || [],
        incidents: incidents || [],
        assets: assets || [],
        dependencies: dependencies || [],
      });
      setLoading(false);
    })();
  }, []);

  const observed = useMemo(() => observeVectors(data), [data]);
  const evaluation = useMemo(() => evaluateVector(selected, data), [selected, data]);

  const graph = useMemo(() => buildAttackGraph(data), [data]);
  const exposure = useMemo(() => describeExposure(graph), [graph]);
  const path = useMemo(() => (selectedAssetId ? findBestPath(graph, selectedAssetId) : null), [graph, selectedAssetId]);
  const selectedNode = useMemo(() => graph.nodes.find((node) => node.id === selectedAssetId) || null, [graph, selectedAssetId]);
  const aiPath = useMemo(() => (graph.hasAiTarget ? graph.targets.map((targetId) => findBestPath(graph, targetId)).find(Boolean) : null), [graph]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0f1e" }}>
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin" />
      </div>
    );
  }

  const verdict = VERDICT_STYLE[evaluation.verdict] || VERDICT_STYLE.Exposed;
  const VerdictIcon = verdict.icon;

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex items-center gap-3">
        <Radar size={24} className="text-blue-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Attack Vector Simulator</h1>
          <p className="text-xs text-slate-500">Choose an attack vector and trace how your stored controls respond</p>
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div className="flex items-center gap-2 mb-1">
          <Network size={15} className="text-blue-400" />
          <h2 className="text-sm font-bold text-white">Cloud attack path map</h2>
          <span className="text-[10px] text-slate-500 ml-auto">{exposure.reachableCount} of {exposure.totalCount} asset(s) reachable from the internet</span>
        </div>
        <p className="text-[11px] text-slate-500 mb-2">
          {graph.hasAiTarget
            ? exposure.aiReachable
              ? "A critical finding on an exposed asset reaches your AI infrastructure. Click any asset to trace its path."
              : "No complete path to your AI infrastructure is recorded. Click any asset to trace the paths that do exist."
            : "No AI infrastructure asset is recorded yet, so the deepest reachable layer is highlighted instead."}
        </p>
        <div className={aiPath ? "mb-2 text-[11px] text-red-300" : "mb-2 text-[11px] text-slate-500"}>
          {aiPath ? `Deepest chain: ${aiPath.map((id) => graph.nodes.find((node) => node.id === id)?.name).filter(Boolean).join(" → ")}` : "No internet-to-asset chain recorded."}
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-2 text-[9px] text-slate-500">
          <span className="flex items-center gap-1"><span className="w-4 h-px bg-slate-500 inline-block" /> recorded dependency</span>
          <span className="flex items-center gap-1"><span className="w-4 h-px inline-block" style={{ background: "#a16207", borderTop: "1px dashed #a16207" }} /> inferred pivot</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> critical finding</span>
          <span className="ml-auto">{graph.openFindingCount} open finding(s) mapped</span>
        </div>

        {!graph.hasRecordedDependencies && (
          <p className="mb-2 rounded px-2 py-1.5 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/30">
            No asset dependency rows are recorded yet, so pivots are inferred from asset layer and cloud provider. Add dependencies in the asset inventory to replace them with real links.
          </p>
        )}
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Entry point → vulnerable asset → deepest hop</p>
        <AttackEntryPointMap graph={graph} selectedId={selectedAssetId} onSelect={(id) => setSelectedAssetId((current) => (current === id ? null : id))} />

        <div className="mt-2 rounded-lg p-2" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
          <AttackPathGraph
            graph={graph}
            selectedId={selectedAssetId}
            pathIds={path || []}
            onSelect={(id) => setSelectedAssetId((current) => (current === id ? null : id))}
          />
        </div>
        <div className="mt-2">
          <AttackPathDetail graph={graph} node={selectedNode} path={path} onSelect={setSelectedAssetId} />
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div className="flex items-center gap-2 mb-3">
          <Activity size={15} className="text-blue-400" />
          <h2 className="text-sm font-bold text-white">Top 10 observed attack vectors</h2>
          <span className="text-[10px] text-slate-500 ml-auto">From CWE classes, MITRE techniques and AI attack telemetry</span>
        </div>
        {observed.length === 0 ? (
          <p className="text-xs text-slate-500">No attack telemetry recorded yet. Vectors appear as findings, incidents and AI attack records accumulate.</p>
        ) : (
          <div className="space-y-1.5">
            {observed.map((row, index) => (
              <div key={`${row.source}-${row.label}`} className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-600 w-4">{index + 1}</span>
                <span className="text-[11px] text-white w-32 sm:w-44 truncate" title={row.label}>{row.label}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "#1F2937" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.max(row.share, 3)}%`, background: "#3b82f6" }} />
                </div>
                <span className="text-[10px] font-mono text-slate-400 w-14 text-right">{row.count} · {row.share}%</span>
                <span className="hidden sm:inline text-[9px] text-slate-500 w-32 text-right truncate">{row.source}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {VECTOR_DEFS.map((def) => (
          <button
            key={def.key}
            onClick={() => setSelected(def.key)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${selected === def.key ? "bg-blue-500/20 text-blue-300 border-blue-500/40" : "bg-slate-800/40 text-slate-400 border-slate-700 hover:text-slate-200"}`}
          >
            {def.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl p-4" style={{ background: "#111827", border: `1px solid ${verdict.color}50` }}>
        <div className="flex items-start gap-3">
          <VerdictIcon size={22} style={{ color: verdict.color }} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white">{evaluation.def.label}</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">{evaluation.def.summary}</p>
            <p className="text-lg font-bold mt-2" style={{ color: verdict.color }}>
              {evaluation.verdict} <span className="text-xs text-slate-500">· {evaluation.met}/{evaluation.total} controls in place</span>
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {evaluation.checks.map((check) => (
            <div key={check.label} className="flex items-start gap-2 rounded-lg px-3 py-2" style={{ background: "#0a0f1e", border: "1px solid #1F2937", borderLeft: `3px solid ${check.met ? "#10b981" : "#ef4444"}` }}>
              <span className={`text-[10px] font-bold mt-0.5 ${check.met ? "text-emerald-400" : "text-red-400"}`}>{check.met ? "PASS" : "GAP"}</span>
              <div className="min-w-0">
                <p className="text-xs text-white">{check.label}</p>
                <p className="text-[10px] text-slate-500">{check.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-lg px-3 py-2" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
          <p className="text-[10px] uppercase text-slate-500">{evaluation.history.label}</p>
          <p className="text-xs text-slate-300 mt-0.5">
            {evaluation.history.total === 0
              ? "No events recorded yet."
              : `${evaluation.history.total} event(s) recorded · ${evaluation.history.contained} contained or blocked (${Math.round((evaluation.history.contained / evaluation.history.total) * 100)}%)`}
          </p>
        </div>

        <p className="text-[10px] text-slate-500 mt-3">
          This evaluation reads your stored control records and history. It does not send an attack, and a passing result reflects configuration on file rather than a live penetration test.
        </p>
      </div>
    </div>
  );
}