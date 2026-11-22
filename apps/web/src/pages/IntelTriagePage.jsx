import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Brain, Zap, AlertTriangle, TrendingUp, RefreshCw, ChevronUp, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SeverityBadge from "@/components/shared/SeverityBadge";

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function computePriorityScore(vuln, threatFeeds) {
  let score = 0;
  const sev = vuln.severity || "low";
  score += (4 - SEVERITY_ORDER[sev]) * 25;
  if (vuln.cvss_score) score += vuln.cvss_score * 2;

  // Boost if CVE matches a threat feed
  const cveMatch = threatFeeds.find(f =>
    f.cve_id && vuln.cve_id && f.cve_id === vuln.cve_id
  );
  if (cveMatch) {
    score += 30;
    if (cveMatch.epss_score) score += cveMatch.epss_score * 20;
  }

  // Boost if affects_you intel
  const affecsYou = threatFeeds.find(f =>
    f.affects_you && f.affected_asset && vuln.asset_name &&
    vuln.asset_name.toLowerCase().includes(f.affected_asset.toLowerCase())
  );
  if (affecsYou) score += 20;

  return Math.round(Math.min(100, score));
}

function PriorityBar({ score }) {
  const color = score >= 80 ? "#ef4444" : score >= 60 ? "#f97316" : score >= 40 ? "#eab308" : "#3b82f6";
  return (
    <div className="flex items-center gap-2 w-32">
      <div className="flex-1 h-1.5 rounded-full bg-[#1F2937] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-mono font-bold w-6 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

export default function IntelTriagePage() {
  const [triaged, setTriaged] = useState(false);
  const qc = useQueryClient();

  const { data: vulns = [] } = useQuery({
    queryKey: ["triage-vulns"],
    queryFn: () => base44.entities.Vulnerability.list("-created_date", 200),
    initialData: [],
  });

  const { data: threats = [] } = useQuery({
    queryKey: ["triage-threats"],
    queryFn: () => base44.entities.ThreatIntelFeed.list("-created_date", 100),
    initialData: [],
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vulnerability.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["triage-vulns"] }),
  });

  const scored = vulns.map(v => ({
    ...v,
    _priority: computePriorityScore(v, threats),
    _intelMatch: threats.find(f => f.cve_id && f.cve_id === v.cve_id),
  })).sort((a, b) => b._priority - a._priority);

  const runTriage = async () => {
    const criticals = scored.filter(v => v._priority >= 75 && v.status === "open");
    await Promise.all(criticals.map(v =>
      updateMut.mutateAsync({ id: v.id, data: { status: "triaged" } })
    ));
    setTriaged(true);
  };

  const cveMatches = scored.filter(v => v._intelMatch).length;
  const criticalPriority = scored.filter(v => v._priority >= 75).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-[#6366F1]" /> Intel-Driven Auto-Triage
          </h1>
          <p className="text-sm text-slate-400 mt-1">Vulnerabilities scored against live threat intelligence feeds</p>
        </div>
        <Button onClick={runTriage} disabled={updateMut.isPending}
          className="bg-[#6366F1] hover:bg-[#5558e3] text-white">
          <Zap className="w-4 h-4 mr-2" />
          {updateMut.isPending ? "Running Triage…" : "Run Auto-Triage"}
        </Button>
      </div>

      {triaged && (
        <div className="rounded-xl p-4 bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-400 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Triage complete — all high-priority findings moved to "Triaged" status.
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Findings", value: vulns.length, color: "#6366F1" },
          { label: "Intel Matches", value: cveMatches, color: "#f97316" },
          { label: "Critical Priority", value: criticalPriority, color: "#ef4444" },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-5 bg-[#111827] border border-[#1F2937]">
            <div className="text-3xl font-black mb-1" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs text-slate-400">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[#1F2937] bg-[#111827] overflow-hidden">
        <div className="p-4 border-b border-[#1F2937] flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#6366F1]" />
          <span className="text-sm font-semibold text-white">Priority Queue</span>
          <span className="ml-auto text-xs text-slate-500 flex items-center gap-1">
            <ChevronUp className="w-3 h-3" /> Sorted by priority score
          </span>
        </div>
        <div className="divide-y divide-[#1F2937]">
          {scored.slice(0, 50).map((v, i) => (
            <div key={v.id} className={`flex items-center gap-4 p-4 hover:bg-[#1F2937]/50 transition-colors ${v._priority >= 75 ? "bg-red-500/5" : ""}`}>
              <span className="text-xs font-mono text-slate-600 w-6 text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <SeverityBadge severity={v.severity} />
                  <span className="text-sm font-medium text-white truncate">{v.title}</span>
                  {v._intelMatch && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 flex-shrink-0">
                      Intel Match
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{v.asset_name || "Unknown asset"}</span>
                  {v.cve_id && <span className="font-mono">{v.cve_id}</span>}
                  {v.cvss_score && <span>CVSS {v.cvss_score}</span>}
                </div>
              </div>
              <PriorityBar score={v._priority} />
              <Badge variant="outline" className="text-[10px] border-[#374151] text-slate-400 capitalize">
                {v.status?.replace("_", " ") || "open"}
              </Badge>
            </div>
          ))}
          {scored.length === 0 && (
            <div className="p-10 text-center text-slate-500 text-sm">No vulnerabilities found</div>
          )}
        </div>
      </div>
    </div>
  );
}