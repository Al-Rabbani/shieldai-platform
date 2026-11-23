import React from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Loader2, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { PageHeader, StatTile, StatTileSkeleton } from "@/components/platform/PageTemplate";

/* This page used to call useAgentPage("intel", "threat_intel"), which posts to gdsMasterOrchestrator with
 * action "execute". The adapter refuses that action on purpose (its only real equivalent needs the shared bridge key,
 * which must not live in a browser bundle), so the page sat on "Could not load - retrying..." above four zeros. It now
 * reads the feed that is actually served: GET /threat-intel/feed, derived from this tenant's own findings register. */

const SEV_COLOR = { critical: "text-destructive", high: "text-orange-500", medium: "text-amber-500", low: "text-emerald-600" };

export default function ThreatIntelPage() {
  const { data: items = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["defensive-threat-intel"],
    queryFn: () => base44.entities.ThreatIntelFeed.list("-detected_at", 50).catch(() => []),
    initialData: [],
  });

  const { data: summary } = useQuery({
    queryKey: ["defensive-threat-intel-summary"],
    queryFn: () => base44.entities.ThreatIntelFeed.summary().catch(() => null),
    initialData: null,
  });

  const counts = summary?.counts || {};
  const basis = summary?.basis || {};
  const unavailable = summary?.unavailable || {};
  const kev = Number(counts.kev_listed || 0);

  return (
    <div>
      <PageHeader
        branch="defensive"
        title="Threat Intelligence"
        agentName="Derived feed"
        onRun={() => refetch()}
        running={isFetching}
      />

      <div className="rounded-xl border px-4 py-3 text-sm mb-5 bg-muted border-border">
        <span className="font-semibold">
          {counts.total === undefined
            ? "Reading the KEV position from the register…"
            : kev > 0
              ? `${kev} CVE${kev === 1 ? "" : "s"} in this register are listed in the CISA KEV catalogue.`
              : "No CVE in this register is listed in the CISA KEV catalogue."}
        </span>
        <p className="text-xs text-muted-foreground mt-1">{basis.kev || "KEV flags come from the CISA catalogue fetched by enrich_findings.py."}</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {counts.total === undefined ? (
          [...Array(4)].map((_, i) => <StatTileSkeleton key={i} />)
        ) : (
          <>
            <StatTile label="CVEs in register" value={counts.total} subtitle="findings carrying a CVE" />
            <StatTile label="Open" value={counts.open} subtitle="not resolved or accepted" />
            <StatTile label="KEV listed" value={kev} color={kev > 0 ? "text-destructive" : "text-emerald-600"} subtitle="known exploited" />
            <StatTile
              label="KEV never checked"
              value={counts.kev_unknown}
              color={Number(counts.kev_unknown || 0) > 0 ? "text-amber-500" : "text-foreground"}
              subtitle="unknown, not clean"
            />
          </>
        )}
      </div>

      <div className="mb-5">
        <h2 className="text-sm font-bold mb-3 uppercase tracking-widest text-muted-foreground">Highest EPSS findings</h2>
        {isLoading || (isFetching && items.length === 0) ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-6">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Reading the register…
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground border rounded-lg p-6 bg-card">No finding in this register carries a CVE.</p>
        ) : (
          <div className="space-y-2">
            {items.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3 border rounded-lg p-3 bg-card">
                <div className="min-w-0">
                  <span className="font-semibold text-sm block truncate">{f.title}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {f.feed_type} · {f.package_name || "package not recorded"} · {f.affected_asset || "asset not recorded"}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {f.epss_score != null && (
                    <span className="text-[11px] font-mono text-muted-foreground">EPSS {Math.round(f.epss_score * 100)}%</span>
                  )}
                  <span className={`text-xs font-medium capitalize ${SEV_COLOR[f.severity] || "text-muted-foreground"}`}>{f.severity}</span>
                  {f.cve_id && (
                    <button
                      onClick={() => window.open(`https://nvd.nist.gov/vuln/detail/${f.cve_id}`, "_blank")}
                      className="text-[11px] font-mono text-primary flex items-center gap-1 hover:underline"
                    >
                      {f.cve_id} <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-dashed p-4">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5">No source on this platform</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(unavailable).map(([name, why]) => (
            <span key={name} className="text-[11px] text-muted-foreground" title={why}>
              <span className="font-semibold">{name}</span> · no collector
            </span>
          ))}
          {Object.keys(unavailable).length === 0 && <span className="text-[11px] text-muted-foreground">reading…</span>}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground mt-4 flex items-center gap-1.5">
        <RefreshCw className="w-3 h-3" /> Re-read with the button above; the register is the only source.
      </p>
    </div>
  );
}
