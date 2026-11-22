import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Crosshair, Shield, Globe, AlertTriangle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo, SevBadge } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const MOTIVATION_COLORS = {
  espionage: DANGER, financial: HIGH, hacktivism: "#a855f7", warfare: "#f59e0b",
  reconnaissance: CYAN, sabotage: DANGER, terrorism: "#ef4444"
};

export default function GDSThreatIntelActorsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: actors = [], isLoading: loadA } = useQuery({
    queryKey: ["threat-actors"], queryFn: () => base44.entities.ThreatActor.list("", 100).catch(() => []),
  });

  const { data: aptActors = [], isLoading: loadApt } = useQuery({
    queryKey: ["apt-actors"], queryFn: () => base44.entities.APTActor.list("", 50).catch(() => []),
  });

  const allActors = [...actors, ...aptActors].filter(a => {
    const matchSearch = !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.aliases?.some(alias => alias.toLowerCase().includes(search.toLowerCase()));
    const matchType = typeFilter === "all" || (a.entity_type === typeFilter || (typeFilter === "apt" && a.nation_state));
    return matchSearch && matchType;
  });

  const nationStateCount = aptActors.length + actors.filter(a => a.nation_state).length;
  const activeCount = allActors.filter(a => a.is_active).length;

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Threat Intel", path: "/threat-intel" }, { label: "Threat Actors" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Crosshair className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Threat Actor Intelligence</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Track APT groups, cybercriminal organizations, and hacktivists</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Actors</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{allActors.length}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Nation-State</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{nationStateCount}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Active</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{activeCount}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>APT Groups</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{aptActors.length}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actors..."
            className="px-3 py-2 rounded-xl text-xs font-bold outline-none w-64"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          >
            <option value="all">All Types</option>
            <option value="apt">APT Groups</option>
            <option value="criminal">Criminal Groups</option>
            <option value="hacktivist">Hacktivists</option>
          </select>
        </div>
      </Card>

      {(loadA || loadApt) ? <Skeleton lines={6} /> : allActors.length === 0 ? (
        <EmptyState icon={Crosshair} title="No threat actors" description="Threat actor intelligence will appear here" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allActors.slice(0, 30).map((actor) => {
            const isAPT = !!actor.nation_state || actor.entity_type === "apt";
            const motivationColor = MOTIVATION_COLORS[actor.primary_motivation] || MUTED;
            return (
              <Card key={actor.id} className="p-5" style={{ background: isAPT ? `${DANGER}05` : CARD, border: `1px solid ${isAPT ? DANGER + "30" : BORDER}` }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">{actor.name}</h3>
                    {actor.aliases?.length > 0 && (
                      <p className="text-[9px] mt-1" style={{ color: MUTED }}>AKA: {actor.aliases.slice(0, 2).join(", ")}{actor.aliases.length > 2 ? "..." : ""}</p>
                    )}
                  </div>
                  {isAPT && <Shield className="w-4 h-4" style={{ color: DANGER }} />}
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span style={{ color: MUTED }}>Type</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${isAPT ? "bg-red-400/15 text-red-400" : actor.entity_type === "criminal" ? "bg-orange-400/15 text-orange-400" : "bg-purple-400/15 text-purple-400"}`}>
                      {isAPT ? "APT" : actor.entity_type || "Unknown"}
                    </span>
                  </div>
                  {actor.nation_state && (
                    <div className="flex items-center justify-between">
                      <span style={{ color: MUTED }}>Nation State</span>
                      <span className="text-xs font-bold" style={{ color: TEXT }}>{actor.nation_state}</span>
                    </div>
                  )}
                  {actor.primary_motivation && (
                    <div className="flex items-center justify-between">
                      <span style={{ color: MUTED }}>Motivation</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${motivationColor}15`, color: motivationColor }}>
                        {actor.primary_motivation}
                      </span>
                    </div>
                  )}
                  {actor.sophistication_level && (
                    <div className="flex items-center justify-between">
                      <span style={{ color: MUTED }}>Sophistication</span>
                      <span className="text-xs font-bold" style={{ color: actor.sophistication_level === "high" || actor.sophistication_level === "very_high" ? DANGER : MUTED }}>
                        {actor.sophistication_level.replace("_", " ")}
                      </span>
                    </div>
                  )}
                  {actor.target_sectors?.length > 0 && (
                    <div>
                      <span style={{ color: MUTED }}>Target Sectors</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {actor.target_sectors.slice(0, 3).map((sector, i) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: MUTED }}>{sector}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="pt-3 border-t" style={{ borderColor: BORDER }}>
                    <div className="flex items-center justify-between text-[10px]" style={{ color: MUTED }}>
                      <span>First Observed</span>
                      <span>{timeAgo(actor.first_observed)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]" style={{ color: MUTED }}>
                      <span>Last Observed</span>
                      <span>{timeAgo(actor.last_observed)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}