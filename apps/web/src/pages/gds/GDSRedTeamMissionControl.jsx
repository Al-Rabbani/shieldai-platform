import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Target, Clock, CheckCircle, AlertCircle, TrendingUp, Shield, Zap, Users } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, StatusBadge, Skeleton, EmptyState, Card, KpiCard, timeAgo, Breadcrumb, PAGE_BG
} from "@/components/gds/GDSOSShared";

const STATUS_COLORS = {
  active: DANGER,
  running: CYAN,
  paused: MUTED,
  completed: LOW,
  failed: HIGH,
  planned: "#a855f7"
};

const STATUS_WIDTHS = {
  active: "w-2/3",
  running: "w-1/2", 
  paused: "w-1/3",
  completed: "w-full",
  failed: "w-1/4",
  planned: "w-1/4"
};

export default function GDSRedTeamMissionControl() {
  const [filter, setFilter] = useState("all");

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["redteam-campaigns"],
    queryFn: () => base44.entities.PentestCampaign.list("-created_date", 50).catch(() => []),
    refetchInterval: 30000,
  });

  const { data: simulations = [] } = useQuery({
    queryKey: ["redteam-simulations"],
    queryFn: () => base44.entities.AttackSimulation.list("-started_at", 100).catch(() => []),
  });

  const filteredCampaigns = filter === "all" 
    ? campaigns 
    : campaigns.filter(c => c.status === filter);

  const stats = {
    active: campaigns.filter(c => c.status === "active").length,
    completed: campaigns.filter(c => c.status === "completed").length,
    total_findings: campaigns.reduce((sum, c) => sum + (c.total_findings || 0), 0),
    critical: campaigns.reduce((sum, c) => sum + (c.critical_findings || 0), 0),
  };

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Red Team OS" }, { label: "Mission Control" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}30` }}>
            <Target className="w-6 h-6" style={{ color: DANGER }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Red Team Mission Control</h1>
            <p className="text-sm mt-0.5" style={{ color: MUTED }}>AI-Powered Autonomous Offensive Security Operations</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          {[
            { key: "all", label: "All" },
            { key: "active", label: "Active" },
            { key: "running", label: "Running" },
            { key: "completed", label: "Completed" },
            { key: "planned", label: "Planned" },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === f.key ? "" : "hover:opacity-70"
              }`}
              style={{
                background: filter === f.key ? `${STATUS_COLORS[f.key]}15` : "rgba(255,255,255,0.04)",
                border: `1px solid ${filter === f.key ? STATUS_COLORS[f.key] + "40" : BORDER}`,
                color: filter === f.key ? STATUS_COLORS[f.key] : MUTED
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Active Campaigns" value={stats.active} color={DANGER} icon={Shield} pulse />
        <KpiCard label="Completed" value={stats.completed} color={LOW} icon={CheckCircle} />
        <KpiCard label="Total Findings" value={stats.total_findings} color={HIGH} icon={AlertCircle} />
        <KpiCard label="Critical Findings" value={stats.critical} color={DANGER} icon={Zap} pulse />
        <KpiCard label="Simulations Run" value={simulations.length} color={CYAN} icon={Users} />
      </div>

      {/* Visual Progress Board */}
      <div>
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: CYAN }} />
          Assessment Progress Board
        </h3>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />
            ))}
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <EmptyState icon={Target} title="No pentest campaigns" description="Start a new assessment to see progress" />
        ) : (
          <div className="space-y-4">
            {filteredCampaigns.map((campaign, idx) => {
              const statusColor = STATUS_COLORS[campaign.status] || MUTED;
              const progress = campaign.coverage_percent || 0;
              const completion = campaign.steps_completed && campaign.steps_total 
                ? (campaign.steps_completed / campaign.steps_total) * 100 
                : progress;

              return (
                <Card key={campaign.id || idx} className="p-5" style={{ border: `1px solid ${statusColor}30` }}>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-base font-bold text-white">{campaign.name}</h4>
                        <span 
                          className="text-[10px] font-black px-2 py-0.5 rounded uppercase"
                          style={{ background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30` }}
                        >
                          {campaign.status}
                        </span>
                        {campaign.type === "continuous" && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}30` }}>
                            CONTINUOUS
                          </span>
                        )}
                      </div>
                      <p className="text-sm" style={{ color: MUTED }}>{campaign.description}</p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" style={{ color: DANGER }} />
                          <span className="font-bold" style={{ color: DANGER }}>{campaign.critical_findings || 0}</span>
                          <span style={{ color: MUTED }}>critical</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" style={{ color: HIGH }} />
                          <span className="font-bold" style={{ color: HIGH }}>{campaign.high_findings || 0}</span>
                          <span style={{ color: MUTED }}>high</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" style={{ color: LOW }} />
                          <span className="font-bold" style={{ color: LOW }}>{campaign.total_findings || 0}</span>
                          <span style={{ color: MUTED }}>total</span>
                        </div>
                      </div>
                      {campaign.agents_deployed && (
                        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: CYAN }}>
                          <Users className="w-3 h-3" />
                          <span>{campaign.agents_deployed} agents deployed</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
                        {campaign.type === "continuous" ? "Coverage" : "Progress"}
                      </span>
                      <span className="text-xs font-black font-mono" style={{ color: statusColor }}>
                        {completion.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${STATUS_WIDTHS[campaign.status] || "w-1/2"}`}
                        style={{ 
                          background: statusColor,
                          boxShadow: `0 0 12px ${statusColor}66`,
                          width: `${completion}%`
                        }} 
                      />
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: BORDER }}>
                    <div className="flex items-center gap-4 text-[10px]">
                      <div className="flex items-center gap-1.5" style={{ color: MUTED }}>
                        <Clock className="w-3 h-3" />
                        <span>Started: {timeAgo(campaign.start_date)}</span>
                      </div>
                      {campaign.end_date && (
                        <div className="flex items-center gap-1.5" style={{ color: MUTED }}>
                          <CheckCircle className="w-3 h-3" />
                          <span>Ended: {timeAgo(campaign.end_date)}</span>
                        </div>
                      )}
                      {campaign.exploits_successful > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: DANGER }} />
                          <span className="font-bold" style={{ color: DANGER }}>{campaign.exploits_successful} successful exploits</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] px-2 py-0.5 rounded font-mono" style={{ background: "rgba(255,255,255,0.05)", color: MUTED }}>
                        {campaign.target_scope?.slice(0, 40)}{campaign.target_scope?.length > 40 ? "..." : ""}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Simulations */}
      {simulations.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: CYAN }} />
            Recent Attack Simulations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {simulations.slice(0, 6).map((sim, i) => (
              <Card key={sim.id || i} className="p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-xs font-bold text-white truncate flex-1">{sim.name}</h4>
                  <StatusBadge status={sim.status} />
                </div>
                <p className="text-[10px] mb-3" style={{ color: MUTED }}>{sim.scenario_type}</p>
                <div className="flex items-center justify-between text-[10px]">
                  <span style={{ color: MUTED }}>
                    {sim.steps_completed}/{sim.steps_total} steps
                  </span>
                  {sim.blast_radius_score && (
                    <span className="font-bold" style={{ color: sim.blast_radius_score > 70 ? DANGER : HIGH }}>
                      BR: {sim.blast_radius_score}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}