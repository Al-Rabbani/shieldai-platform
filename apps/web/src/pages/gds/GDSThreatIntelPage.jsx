import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Zap, AlertTriangle, Globe, Users, Network } from "lucide-react";
import ThreatIntelGraph from "@/components/gds/ThreatIntelGraph";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  SEV_COLOR, SevBadge, Skeleton, EmptyState,
  Breadcrumb, Card, KpiCard, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";

function ThreatLevelDot({ level }) {
  const colors = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW };
  const color = colors[level?.toLowerCase()] || MUTED;
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold capitalize" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
      {level || "—"}
    </span>
  );
}

export default function GDSThreatIntelPage() {
  const { data: feeds = [], isLoading: loadF } = useQuery({
    queryKey: ["gds-ti-feeds"],
    queryFn: () => base44.entities.ThreatIntelFeed.list("-published_at", 100).catch(() => []),
  });
  const { data: actors = [], isLoading: loadA } = useQuery({
    queryKey: ["gds-actors"],
    queryFn: () => base44.entities.ThreatActor.list().catch(() => []),
  });
  const { data: ransomware = [], isLoading: loadR } = useQuery({
    queryKey: ["gds-ransomware"],
    queryFn: () => base44.entities.RansomwareGroup.list().catch(() => []),
  });
  const { data: apts = [], isLoading: loadAPT } = useQuery({
    queryKey: ["gds-apts"],
    queryFn: () => base44.entities.APTActor.list().catch(() => []),
  });

  const { data: cloudAssets = [], isLoading: loadCA } = useQuery({
    queryKey: ["cloud-assets-graph"],
    queryFn: () => base44.entities.ASMCloudAsset.filter({ risk_score: { $gte: 50 } }, "", 50).catch(() => []),
  });

  const { data: cves = [], isLoading: loadCVE } = useQuery({
    queryKey: ["cve-records-graph"],
    queryFn: () => base44.entities.CVERecord.filter({ cvss_score: { $gte: 7 } }, "", 50).catch(() => []),
  });

  const { data: relationships = [], isLoading: loadRel } = useQuery({
    queryKey: ["threat-relationships"],
    queryFn: () => base44.entities.ThreatRelationship.list("", 100).catch(() => []),
  });

  const relevantFeeds = feeds.filter(f => f.affects_you);
  const critFeeds = feeds.filter(f => f.severity === "critical").length;
  const activeGroups = ransomware.filter(g => g.status === "active").length;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Threat Intel" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Threat Intelligence</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>CVEs, APT groups, ransomware tracking, and threat actor profiling</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Intel Feeds" value={feeds.length} color={CYAN} icon={Zap} />
        <KpiCard label="Critical Threats" value={critFeeds} color={DANGER} icon={AlertTriangle} pulse />
        <KpiCard label="Affects You" value={relevantFeeds.length} color={HIGH} icon={Globe} pulse={relevantFeeds.length > 0} />
        <KpiCard label="Active Ransomware" value={activeGroups} color={DANGER} icon={Users} pulse={activeGroups > 0} />
      </div>

      {/* Threat Intelligence Graph */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Threat Intelligence Graph</h3>
          </div>
          <div className="text-[10px]" style={{ color: MUTED }}>
            Interactive mapping of threat actors, vulnerabilities, and assets
          </div>
        </div>
        <ThreatIntelGraph
          actors={actors}
          vulnerabilities={cves}
          assets={cloudAssets}
          relationships={relationships}
        />
      </Card>

      {/* Threat Intel Feed */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: CYAN }} />
            <h3 className="font-bold text-white">Live Threat Feed</h3>
          </div>
        </div>
        {loadF ? <Skeleton /> : feeds.length === 0
          ? <EmptyState icon={Zap} title="No threat feeds" description="Connect a threat intel integration to receive live data" />
          : (
            <div className="divide-y" style={{ borderColor: `${BORDER}40` }}>
              {feeds.slice(0, 50).map((f, i) => (
                <div key={f.id || i} className="flex items-start gap-3 p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ color: CYAN, background: `${CYAN}15` }}>
                      {(f.feed_type || "intel").toUpperCase().slice(0,6)}
                    </span>
                    {f.affects_you && <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ color: DANGER, background: `${DANGER}15` }}>⚡YOU</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white">{f.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {f.cve_id && <span className="text-[10px] font-mono" style={{ color: CYAN }}>{f.cve_id}</span>}
                      {f.source && <span className="text-[10px]" style={{ color: MUTED }}>via {f.source}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <SevBadge sev={f.severity} />
                    <span className="text-[10px]" style={{ color: MUTED }}>{timeAgo(f.published_at || f.detected_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
      </Card>

      {/* Threat Actors */}
      {(actors.length > 0 || !loadA) && (
        <div>
          <h3 className="text-sm font-bold text-white mb-3">Threat Actors</h3>
          {loadA ? <Skeleton lines={2} /> : actors.length === 0
            ? <EmptyState icon={Users} title="No threat actors tracked" description="Connect a threat intel feed to track APT groups and cybercriminals" />
            : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {actors.slice(0, 9).map((a, i) => (
                  <Card key={a.id || i} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-bold text-white">{a.actor_name || a.name}</p>
                      <ThreatLevelDot level={a.threat_level} />
                    </div>
                    <div className="text-[10px] space-y-1" style={{ color: MUTED }}>
                      <p>Type: <span className="text-white capitalize">{(a.actor_type || a.type || "—").replace(/_/g," ")}</span></p>
                      <p>Origin: <span className="text-white">{a.origin_country || "—"}</span></p>
                      {a.target_industries && <p>Targets: <span className="text-white">{a.target_industries}</span></p>}
                      {a.last_seen && <p>Last seen: {timeAgo(a.last_seen)}</p>}
                    </div>
                  </Card>
                ))}
              </div>
            )}
        </div>
      )}

      {/* Ransomware Groups */}
      {ransomware.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-white mb-3">Ransomware Groups</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ransomware.slice(0, 9).map((g, i) => (
              <Card key={g.id || i} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-white">{g.group_name}</p>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold"
                    style={{ color: g.status === "active" ? DANGER : MUTED }}>
                    <span className={`w-1.5 h-1.5 rounded-full ${g.status === "active" ? "animate-pulse" : ""}`}
                      style={{ background: g.status === "active" ? DANGER : MUTED }} />
                    {(g.status || "—").replace(/_/g," ")}
                  </span>
                </div>
                <div className="text-[10px] space-y-1" style={{ color: MUTED }}>
                  <p>Victims: <span className="font-bold" style={{ color: DANGER }}>{g.victims_count ?? 0}</span></p>
                  <ThreatLevelDot level={g.threat_level} />
                  {g.target_sectors && <p className="truncate">Sectors: {g.target_sectors}</p>}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* APT Actors */}
      {apts.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-white mb-3">APT Actors</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apts.slice(0, 6).map((a, i) => (
              <Card key={a.id || i} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-white">{a.actor_name || a.name}</p>
                  <ThreatLevelDot level={a.threat_level} />
                </div>
                <div className="text-[10px] space-y-1" style={{ color: MUTED }}>
                  {a.aliases && <p>AKA: <span className="text-white">{a.aliases}</span></p>}
                  <p>Origin: <span className="text-white">{a.origin_country || "—"}</span></p>
                  {a.active_campaigns != null && <p>Active campaigns: <span className="font-bold" style={{ color: HIGH }}>{a.active_campaigns}</span></p>}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}