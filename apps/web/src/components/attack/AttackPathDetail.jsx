import React from "react";
import { ArrowRight, ShieldX } from "lucide-react";
import { SEVERITY_COLOR } from "@/lib/attackPaths";

export default function AttackPathDetail({ graph, node, path, onSelect }) {
  if (!node) {
    return (
      <div className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
        <p className="text-[11px] text-slate-500">Click any asset on the graph to see the path an attacker would take to reach it and the vulnerabilities they would exploit.</p>
      </div>
    );
  }

  const hops = path ? path.map((id) => graph.nodes.find((item) => item.id === id)).filter(Boolean) : [];

  return (
    <div className="rounded-lg p-3 space-y-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-white">{node.name}</p>
          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-300">{String(node.type).replace(/_/g, " ")}</span>
          {node.riskScore != null && <span className="text-[10px] text-slate-400 ml-auto">Risk {Math.round(node.riskScore)}/100</span>}
        </div>
        {path ? (
          <p className="text-[11px] text-amber-300 mt-1">
            Reachable from the internet in {Math.max(0, hops.length - 1)} hop{hops.length === 2 ? "" : "s"}
          </p>
        ) : (
          <p className="text-[11px] text-slate-500 mt-1">No path from an externally reachable asset to this node in the recorded dependency map.</p>
        )}
      </div>

      {hops.length > 1 && (
        <div className="flex flex-wrap items-center gap-1">
          {hops.map((hop, index) => (
            <React.Fragment key={hop.id}>
              <button
                onClick={() => onSelect(hop.id)}
                className={`px-1.5 py-1 rounded text-[10px] border ${hop.id === node.id ? "bg-red-500/15 text-red-300 border-red-500/40" : "bg-slate-800/50 text-slate-300 border-slate-700 hover:text-white"}`}
              >
                {hop.name}
              </button>
              {index < hops.length - 1 && <ArrowRight size={10} className="text-slate-600" />}
            </React.Fragment>
          ))}
        </div>
      )}

      {hops.length > 1 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase font-bold text-slate-500">Vulnerabilities exploited along the way</p>
          {hops.slice(1).map((hop) => (
            <div key={`vulns-${hop.id}`} className="rounded px-2 py-1.5" style={{ background: "#111827", border: "1px solid #1F2937" }}>
              <p className="text-[10px] font-bold text-slate-300">{hop.name}</p>
              {hop.vulns.length === 0 ? (
                <p className="text-[10px] text-slate-600">No open finding on this hop — the pivot uses inherited credentials.</p>
              ) : (
                hop.vulns.slice(0, 4).map((vuln) => (
                  <p key={vuln.id} className="text-[10px] text-slate-400 truncate">
                    <span className="font-bold mr-1" style={{ color: SEVERITY_COLOR[vuln.severity || vuln.normalized_severity] || "#94a3b8" }}>
                      {(vuln.severity || vuln.normalized_severity || "info").toUpperCase()}
                    </span>
                    {vuln.title}
                    {vuln.cve_id ? ` · ${vuln.cve_id}` : ""}
                  </p>
                ))
              )}
              {hop.vulns.length > 4 && <p className="text-[9px] text-slate-600">+{hop.vulns.length - 4} more open finding(s)</p>}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1">
        <p className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1"><ShieldX size={10} /> Open findings on this asset ({node.vulns.length})</p>
        {node.vulnBasis === "class" && (
          <p className="text-[9px] text-amber-300/80">No open finding names this asset directly, so this lists open findings in the same asset class — the vulnerabilities this kind of asset is currently exposed to.</p>
        )}
        {node.vulns.length === 0 ? (
          <p className="text-[10px] text-slate-600">No open finding recorded against this asset.</p>
        ) : (
          node.vulns.slice(0, 6).map((vuln) => (
            <div key={vuln.id} className="text-[10px] text-slate-400 flex items-start gap-1.5">
              <span className="font-bold flex-shrink-0" style={{ color: SEVERITY_COLOR[vuln.severity || vuln.normalized_severity] || "#94a3b8" }}>
                {(vuln.severity || vuln.normalized_severity || "info").toUpperCase()}
              </span>
              <span className="min-w-0 truncate">{vuln.title}{vuln.cve_id ? ` · ${vuln.cve_id}` : ""}{vuln.cvss_score != null ? ` · CVSS ${vuln.cvss_score}` : ""}</span>
            </div>
          ))
        )}
      </div>

      <p className="text-[9px] text-slate-600">
        Paths are derived from the stored asset inventory, the recorded dependency map and open findings. Pivots drawn dashed amber are inferred from asset layer where no dependency is recorded. They model reachability on paper, not a live exploitation attempt.
      </p>
    </div>
  );
}