import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";
import {
  IndBreadcrumb, IndBanner, IND_PAGE_BG, BORDER, MUTED, TEXT,
  IND_AMBER, IND_ORANGE, IND_RED, IND_GREEN, IND_PURPLE, IND_CRITICAL,
  INDUSTRY_COLORS, formatNumberK, formatCurrencyUSD, timeAgo
} from "@/components/gds/IndustrialSecurityShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";
import PredictiveRiskHeatmap from "@/components/gds/PredictiveRiskHeatmap";
import { Factory, AlertTriangle, Shield, Activity, Cpu, TrendingUp } from "lucide-react";

export default function GDSIndustrialAnalyticsPage() {
  const { data: industrialAssets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ["industrial-assets-analytics"],
    queryFn: () => base44.entities.IndustrialAsset.list(),
  });
  const { data: incidents = [], isLoading: incidentsLoading } = useQuery({
    queryKey: ["industrial-incidents-analytics"],
    queryFn: () => base44.entities.IndustrialIncident.filter({}, "-detected_at", 100),
  });
  const { data: threats = [], isLoading: threatsLoading } = useQuery({
    queryKey: ["industrial-threats-analytics"],
    queryFn: () => base44.entities.IndustrialThreat.filter({ status: "active" }),
  });
  const { data: factories = [], isLoading: factoriesLoading } = useQuery({
    queryKey: ["factories"],
    queryFn: () => base44.entities.Factory.list(),
  });

  const safetyIncidents = incidents?.filter(i => i.patient_safety_risk || i.safety_system_triggered).length || 0;
  const existentialThreats = threats?.filter(t => t.severity === "existential").length || 0;
  const totalAssets = industrialAssets?.length || 0;
  const highRiskAssets = industrialAssets?.filter(a => a.risk_score > 70).length || 0;

  return (
    <div style={IND_PAGE_BG}>
      <div className="flex items-center justify-between mb-4">
        <IndBreadcrumb items={[{ label: "Industrial Analytics" }]} />
        <LiveDataBadge />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Factory className="w-7 h-7" style={{ color: IND_AMBER }} />
            Industrial Operational Analytics
          </h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>
            OT/ICS Risk Intelligence & Predictive Analytics
          </p>
        </div>
      </div>

      <IndBanner safetyIncident={safetyIncidents > 0} existentialThreat={existentialThreats} />

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <Card className="p-4" glow>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${IND_AMBER}15`, border: `1px solid ${IND_AMBER}30` }}>
              <Factory className="w-5 h-5" style={{ color: IND_AMBER }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Total Assets</p>
              <p className="text-2xl font-black" style={{ color: IND_AMBER }}>{totalAssets}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4" glow>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${IND_RED}15`, border: `1px solid ${IND_RED}30` }}>
              <AlertTriangle className="w-5 h-5" style={{ color: IND_RED }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>High Risk</p>
              <p className="text-2xl font-black" style={{ color: IND_RED }}>{highRiskAssets}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4" glow>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${IND_ORANGE}15`, border: `1px solid ${IND_ORANGE}30` }}>
              <Activity className="w-5 h-5" style={{ color: IND_ORANGE }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Active Incidents</p>
              <p className="text-2xl font-black" style={{ color: IND_ORANGE }}>{incidents?.filter(i => i.status !== "closed").length || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4" glow>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${IND_PURPLE}15`, border: `1px solid ${IND_PURPLE}30` }}>
              <Shield className="w-5 h-5" style={{ color: IND_PURPLE }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Active Threats</p>
              <p className="text-2xl font-black" style={{ color: IND_PURPLE }}>{threats?.length || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4" glow>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${IND_GREEN}15`, border: `1px solid ${IND_GREEN}30` }}>
              <TrendingUp className="w-5 h-5" style={{ color: IND_GREEN }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Factories</p>
              <p className="text-2xl font-black" style={{ color: IND_GREEN }}>{factories?.length || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Predictive Risk Heatmap */}
      <div className="mb-6">
        <PredictiveRiskHeatmap
          incidents={incidents}
          threats={threats}
          assets={industrialAssets}
          predictions={[]}
        />
      </div>

      {/* Asset List */}
      <Card className="p-5" glow>
        <h3 className="text-sm font-bold text-white mb-4">Critical Industrial Assets</h3>
        {assetsLoading ? <Skeleton lines={6} /> : industrialAssets?.length === 0 ? (
          <EmptyState icon={Factory} title="No assets" description="Add industrial assets to monitor" />
        ) : (
          <div className="space-y-2">
            {industrialAssets?.slice(0, 10).map(asset => (
              <div key={asset.id} className="flex items-center gap-3 p-3 rounded-lg" 
                style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" 
                  style={{ background: `${INDUSTRY_COLORS[asset.industry_type] || IND_AMBER}15`, border: `1px solid ${INDUSTRY_COLORS[asset.industry_type] || IND_AMBER}30` }}>
                  <Cpu className="w-5 h-5" style={{ color: INDUSTRY_COLORS[asset.industry_type] || IND_AMBER }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-white">{asset.name || asset.site_name}</p>
                  <p className="text-[9px]" style={{ color: MUTED }}>
                    {asset.industry_type || "industrial"} · {asset.location || "Unknown"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black" style={{ color: asset.risk_score > 70 ? IND_RED : asset.risk_score > 40 ? IND_ORANGE : IND_GREEN }}>
                    {asset.risk_score}
                  </p>
                  <p className="text-[8px]" style={{ color: MUTED }}>Risk</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}