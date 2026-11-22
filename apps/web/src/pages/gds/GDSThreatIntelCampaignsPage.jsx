import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Globe, Target, Shield, TrendingUp } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo, SevBadge } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const TYPE_COLORS = {
  apt: DANGER, ransomware: HIGH, phishing: "#f59e0b",
  data_breach: "#ef4444", malware_distribution: "#a855f7"
};

export default function GDSThreatIntelCampaignsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["threat-campaigns"], queryFn: () => base44.entities.ThreatCampaign.list("-start_date", 100).catch(() => []),
  });

  const filtered = campaigns.filter(c => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || c.campaign_type === typeFilter;
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const activeCount = campaigns.filter(c => c.status === "active").length;
  const totalTargets = campaigns.reduce((sum, c) => sum + (c.target_count || 0), 0);

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Threat Intel", path: "/threat-intel" }, { label: "Campaigns" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Globe className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Campaign Intelligence</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Track coordinated attack campaigns and operations</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Campaigns</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{campaigns.length}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Active</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{activeCount}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Targets</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{totalTargets}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Avg Duration</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{campaigns.length > 0 ? Math.round(campaigns.reduce((s, c) => s + (c.duration_days || 0), 0) / campaigns.length) : 0}d</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns..."
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
            {Object.keys(TYPE_COLORS).map(type => <option key={type} value={type}>{type.replace("_", " ")}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="ongoing">Ongoing</option>
          </select>
        </div>
      </Card>

      {isLoading ? <Skeleton lines={6} /> : filtered.length === 0 ? (
        <EmptyState icon={Globe} title="No campaigns" description="Threat campaign data will appear here" />
      ) : (
        <div className="space-y-3">
          {filtered.map((campaign) => {
            const typeColor = TYPE_COLORS[campaign.campaign_type] || MUTED;
            return (
              <Card key={campaign.id} className="p-5" style={{ background: campaign.status === "active" ? `${DANGER}05` : CARD, border: `1px solid ${campaign.status === "active" ? DANGER + "30" : BORDER}` }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-bold text-white">{campaign.name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${typeColor}15`, color: typeColor }}>
                        {campaign.campaign_type?.replace("_", " ")}
                      </span>
                      {campaign.status === "active" && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${DANGER}15`, color: DANGER }}>ACTIVE</span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: MUTED }}>{campaign.description || "No description"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px]" style={{ color: MUTED }}>Duration</p>
                    <p className="text-sm font-bold" style={{ color: TEXT }}>{campaign.duration_days || 0} days</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <p className="font-bold mb-1" style={{ color: MUTED }}>Attributed Actor</p>
                    <p className="text-sm" style={{ color: TEXT }}>{campaign.attributed_actor || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="font-bold mb-1" style={{ color: MUTED }}>Target Count</p>
                    <p className="text-sm font-bold" style={{ color: campaign.target_count > 10 ? DANGER : TEXT }}>{campaign.target_count || 0}</p>
                  </div>
                  <div>
                    <p className="font-bold mb-1" style={{ color: MUTED }}>Start Date</p>
                    <p className="text-sm" style={{ color: TEXT }}>{campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : "—"}</p>
                  </div>
                  <div>
                    <p className="font-bold mb-1" style={{ color: MUTED }}>End Date</p>
                    <p className="text-sm" style={{ color: TEXT }}>{campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : "Ongoing"}</p>
                  </div>
                </div>
                {campaign.affected_regions?.length > 0 && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: BORDER }}>
                    <p className="text-[10px] font-bold mb-2" style={{ color: MUTED }}>Affected Regions</p>
                    <div className="flex flex-wrap gap-1">
                      {campaign.affected_regions.map((region, i) => (
                        <span key={i} className="text-[9px] px-2 py-0.5 rounded" style={{ background: "rgba(0,212,255,0.08)", color: CYAN }}>{region}</span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}