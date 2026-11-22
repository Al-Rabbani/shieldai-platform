import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import AssetForensicHistory from "@/components/assets/AssetForensicHistory";
import SlaCountdown from "@/components/triage/SlaCountdown";
import { format, formatDistanceToNow } from "date-fns";

const SEV_COLOR = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  info: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "forensics", label: "Forensic history" },
];

function riskColor(score) {
  if (score >= 80) return "#ef4444";
  if (score >= 60) return "#f97316";
  if (score >= 40) return "#eab308";
  return "#22c55e";
}

export default function AssetDrillDownDrawer({ asset, onClose }) {
  // A deep link can land straight on the 30-day forensic history.
  const [tab, setTab] = React.useState(() =>
    new URLSearchParams(window.location.search).get("tab") === "forensics" ? "forensics" : "overview"
  );

  const { data: findings = [], isLoading } = useQuery({
    queryKey: ["asset-findings", asset?.name],
    queryFn: () => base44.entities.TriagedFinding.filter({ asset_name: asset.name, status: "open" }, "-detected_at", 100),
    enabled: !!asset,
  });

  const critical = findings.filter(f => f.severity === "critical").length;
  const high = findings.filter(f => f.severity === "high").length;

  return (
    <Sheet open={!!asset} onOpenChange={(open) => { if (!open) { onClose(); setTab("overview"); } }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        {asset && (
          <>
            <SheetHeader>
              <SheetTitle>{asset.name}</SheetTitle>
              <SheetDescription>
                {asset.type?.replace("_", " ")} · {asset.cloud_provider} · {asset.region || "—"}
                {asset.business_criticality ? ` · ${asset.business_criticality} business criticality` : ""}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-3 flex items-center gap-1 rounded-lg p-0.5" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
              {TABS.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setTab(option.key)}
                  className={`flex-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition ${tab === option.key ? "bg-blue-500/25 text-blue-200" : "text-slate-400 hover:text-slate-200"}`}
                >
                  {option.label}{option.key === "forensics" ? " (30d)" : ""}
                </button>
              ))}
            </div>

            {tab === "forensics" ? (
              <AssetForensicHistory asset={asset} />
            ) : (
              <>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border p-3 bg-card">
                    <p className="text-[10px] text-muted-foreground uppercase">Risk Score</p>
                    <p className="text-xl font-bold font-mono" style={{ color: riskColor(asset.risk_score || 0) }}>{asset.risk_score || 0}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 bg-card">
                    <p className="text-[10px] text-muted-foreground uppercase">Critical</p>
                    <p className="text-xl font-bold font-mono text-red-400">{critical}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 bg-card">
                    <p className="text-[10px] text-muted-foreground uppercase">High</p>
                    <p className="text-xl font-bold font-mono text-orange-400">{high}</p>
                  </div>
                </div>

                {asset.last_scanned ? (
                  <p className="text-xs text-muted-foreground mt-3">
                    Last scan: {formatDistanceToNow(new Date(asset.last_scanned), { addSuffix: true })} ({format(new Date(asset.last_scanned), "MMM d, HH:mm")})
                  </p>
                ) : (
                  <p className="text-xs text-red-400 mt-3">⚠ Never scanned</p>
                )}

                <div className="mt-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Active Vulnerabilities ({findings.length})
                  </p>
                  {isLoading ? (
                    <div className="w-6 h-6 border-2 border-t-primary border-white/10 rounded-full animate-spin mx-auto my-8" />
                  ) : findings.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">No active vulnerabilities for this asset.</p>
                  ) : (
                    <div className="space-y-2">
                      {findings.map(f => (
                        <div key={f.id} className="rounded-lg border border-border p-3 bg-card">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium truncate">{f.title}</span>
                            <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${SEV_COLOR[f.severity] || SEV_COLOR.info}`}>{f.severity}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                            {f.cve_id && <span className="font-mono">{f.cve_id}</span>}
                            {f.cvss_score != null && <span>CVSS {f.cvss_score}</span>}
                            {f.exploited_in_wild && <span className="text-red-400 font-semibold">Exploited in wild</span>}
                            <span className="ml-auto"><SlaCountdown finding={f} /></span>
                          </div>
                          {f.remediation && (
                            <p className="text-[11px] text-emerald-300/90 mt-1.5">Remediation: {f.remediation}</p>
                          )}
                          {!f.remediation && f.next_action_item && (
                            <p className="text-[11px] text-blue-300/90 mt-1.5">Next action: {f.next_action_item}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}