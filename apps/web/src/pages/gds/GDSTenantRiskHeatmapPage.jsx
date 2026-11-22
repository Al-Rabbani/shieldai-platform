import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, AlertTriangle, Target, Lock, Activity, TrendingUp } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";

function IsolationScoreGauge({ score }) {
  const color = score >= 90 ? LOW : score >= 70 ? MEDIUM : score >= 50 ? HIGH : DANGER;
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;
  
  return (
    <div className="relative w-24 h-24">
      <svg className="w-full h-full" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
        <circle 
          cx="50" cy="50" r="40" 
          fill="none" 
          stroke={color} 
          strokeWidth="8" 
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-black font-mono" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

function RiskHeatmapCell({ tenant, onClick }) {
  const { isolation_score, boundary_violations, config_drift_count, cross_tenant_attempts, status } = tenant;
  
  const riskLevel = isolation_score >= 90 ? 'low' : isolation_score >= 70 ? 'medium' : isolation_score >= 50 ? 'high' : 'critical';
  const riskColor = isolation_score >= 90 ? LOW : isolation_score >= 70 ? MEDIUM : isolation_score >= 50 ? HIGH : DANGER;
  
  return (
    <div 
      onClick={() => onClick(tenant)}
      className="p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-105"
      style={{ 
        background: `${riskColor}10`, 
        borderColor: riskColor,
        borderWidth: riskLevel === 'critical' ? 3 : 2
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-white">{tenant.name}</p>
          <p className="text-[10px] font-mono" style={{ color: MUTED }}>{tenant.tenant_id.slice(-10)}</p>
        </div>
        <IsolationScoreGauge score={isolation_score} />
      </div>
      
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: MUTED }}>Boundary Violations</span>
          <span className={`font-bold ${boundary_violations > 0 ? 'text-red-400' : ''}`} style={{ color: boundary_violations === 0 ? TEXT : undefined }}>
            {boundary_violations}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: MUTED }}>Config Drift</span>
          <span className={`font-bold ${config_drift_count > 0 ? 'text-orange-400' : ''}`} style={{ color: config_drift_count === 0 ? TEXT : undefined }}>
            {config_drift_count}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: MUTED }}>Cross-Tenant Attempts</span>
          <span className={`font-bold ${cross_tenant_attempts > 0 ? 'text-red-400' : ''}`} style={{ color: cross_tenant_attempts === 0 ? TEXT : undefined }}>
            {cross_tenant_attempts}
          </span>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <span className={`text-[10px] px-2 py-1 rounded font-bold ${
          riskLevel === 'critical' ? 'bg-red-400/15 text-red-400' :
          riskLevel === 'high' ? 'bg-orange-400/15 text-orange-400' :
          riskLevel === 'medium' ? 'bg-yellow-400/15 text-yellow-400' :
          'bg-green-400/15 text-green-400'
        }`}>
          {riskLevel.toUpperCase()} RISK
        </span>
        {status !== 'active' && (
          <span className="text-[10px] px-2 py-1 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.1)" }}>
            {status.toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}

export default function GDSTenantRiskHeatmapPage() {
  const [filterRisk, setFilterRisk] = useState("all");
  const [selectedTenant, setSelectedTenant] = useState(null);

  const { data: heatmapData, isLoading } = useQuery({
    queryKey: ["tenant-risk-heatmap"],
    queryFn: async () => {
      const tenants = await base44.entities.Tenant.filter({}, '-created_date', 50).catch(() => []);
      const auditLogs = await base44.entities.TenantAuditLog.filter({}, '-created_date', 500).catch(() => []);
      const isolationEvents = await base44.entities.TenantIsolationEvent.filter({}, '-created_date', 500).catch(() => []);
      
      return tenants.map(tenant => {
        const tenantAudits = auditLogs.filter(a => a.tenant_id === tenant.tenant_id);
        const tenantEvents = isolationEvents.filter(e => 
          e.actor_tenant_id === tenant.tenant_id || e.resource_tenant_id === tenant.tenant_id
        );
        
        const boundary_violations = tenantEvents.filter(e => e.violation_type === 'cross_tenant_read' && e.was_blocked).length;
        const config_drift_count = tenantAudits.filter(a => a.audit_type === 'configuration_drift').length;
        const cross_tenant_attempts = tenantEvents.filter(e => e.violation_type === 'cross_tenant_read').length;
        
        // Calculate isolation score (100 = perfect isolation, 0 = breached)
        let isolation_score = 100;
        isolation_score -= boundary_violations * 10;
        isolation_score -= config_drift_count * 5;
        isolation_score -= cross_tenant_attempts * 8;
        isolation_score = Math.max(0, Math.min(100, isolation_score));
        
        return {
          ...tenant,
          isolation_score,
          boundary_violations,
          config_drift_count,
          cross_tenant_attempts,
          risk_level: isolation_score >= 90 ? 'low' : isolation_score >= 70 ? 'medium' : isolation_score >= 50 ? 'high' : 'critical'
        };
      });
    },
    refetchInterval: 15000,
  });

  const filteredData = filterRisk === "all" 
    ? heatmapData 
    : heatmapData?.filter(t => t.risk_level === filterRisk);

  const stats = {
    total: heatmapData?.length || 0,
    critical: heatmapData?.filter(t => t.risk_level === 'critical').length || 0,
    high: heatmapData?.filter(t => t.risk_level === 'high').length || 0,
    medium: heatmapData?.filter(t => t.risk_level === 'medium').length || 0,
    low: heatmapData?.filter(t => t.risk_level === 'low').length || 0,
    avg_score: heatmapData?.length ? Math.round(heatmapData.reduce((s, t) => s + t.isolation_score, 0) / heatmapData.length) : 0
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Tenant Risk Heatmap" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Target className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Tenant Isolation Risk Heatmap</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Color-coded isolation scores, boundary breaches, and misconfigurations</p>
          </div>
          {stats.critical > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${DANGER}10`, border: `1px solid ${DANGER}30` }}>
              <AlertTriangle className="w-3 h-3" style={{ color: DANGER }} />
              <span className="text-[10px] font-black" style={{ color: DANGER }}>{stats.critical} Critical</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)} className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Risk Levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Tenants</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Avg Score</p>
          <p className="text-2xl font-black font-mono" style={{ color: stats.avg_score >= 70 ? LOW : stats.avg_score >= 50 ? HIGH : DANGER }}>{stats.avg_score}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Critical</p>
          <p className="text-2xl font-black font-mono" style={{ color: stats.critical > 0 ? DANGER : MUTED }}>{stats.critical}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>High</p>
          <p className="text-2xl font-black font-mono" style={{ color: stats.high > 0 ? HIGH : MUTED }}>{stats.high}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Medium</p>
          <p className="text-2xl font-black font-mono" style={{ color: stats.medium > 0 ? MEDIUM : MUTED }}>{stats.medium}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Low</p>
          <p className="text-2xl font-black font-mono" style={{ color: stats.low > 0 ? LOW : MUTED }}>{stats.low}</p>
        </Card>
      </div>

      {/* Legend */}
      <Card className="p-4">
        <div className="flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: LOW }} />
            <span style={{ color: MUTED }}>90-100 (Low Risk)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: MEDIUM }} />
            <span style={{ color: MUTED }}>70-89 (Medium Risk)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: HIGH }} />
            <span style={{ color: MUTED }}>50-69 (High Risk)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: DANGER }} />
            <span style={{ color: MUTED }}>0-49 (Critical Risk)</span>
          </div>
        </div>
      </Card>

      {/* Heatmap Grid */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Tenant Isolation Scores</h3>
        {isLoading ? <Skeleton lines={8} /> : filteredData?.length === 0 ? (
          <EmptyState icon={Target} title="No tenant data" description="Provision tenants to see isolation risk heatmap" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredData?.map(tenant => (
              <RiskHeatmapCell 
                key={tenant.tenant_id} 
                tenant={tenant} 
                onClick={setSelectedTenant}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}`, maxHeight: "90vh", overflow: "auto" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white">Tenant Isolation Details</h2>
              <button onClick={() => setSelectedTenant(null)} className="hover:text-white transition-colors" style={{ color: MUTED }}><AlertTriangle className="w-4 h-4" /></button>
            </div>
            
            <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: `${selectedTenant.isolation_score >= 70 ? LOW : DANGER}10`, border: `1px solid ${selectedTenant.isolation_score >= 70 ? LOW : DANGER}` }}>
              <IsolationScoreGauge score={selectedTenant.isolation_score} />
              <div>
                <p className="text-sm font-bold text-white">{selectedTenant.name}</p>
                <p className="text-[10px] font-mono mb-2" style={{ color: MUTED }}>{selectedTenant.tenant_id}</p>
                <span className={`text-[10px] px-2 py-1 rounded font-bold ${
                  selectedTenant.risk_level === 'critical' ? 'bg-red-400/15 text-red-400' :
                  selectedTenant.risk_level === 'high' ? 'bg-orange-400/15 text-orange-400' :
                  'bg-green-400/15 text-green-400'
                }`}>
                  {selectedTenant.risk_level.toUpperCase()} RISK
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4" style={{ color: DANGER }} />
                  <p className="text-xs font-bold" style={{ color: MUTED }}>Boundary Violations</p>
                </div>
                <p className="text-2xl font-black" style={{ color: selectedTenant.boundary_violations > 0 ? DANGER : LOW }}>
                  {selectedTenant.boundary_violations}
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4" style={{ color: HIGH }} />
                  <p className="text-xs font-bold" style={{ color: MUTED }}>Config Drift</p>
                </div>
                <p className="text-2xl font-black" style={{ color: selectedTenant.config_drift_count > 0 ? HIGH : LOW }}>
                  {selectedTenant.config_drift_count}
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4" style={{ color: DANGER }} />
                  <p className="text-xs font-bold" style={{ color: MUTED }}>Cross-Tenant Attempts</p>
                </div>
                <p className="text-2xl font-black" style={{ color: selectedTenant.cross_tenant_attempts > 0 ? DANGER : LOW }}>
                  {selectedTenant.cross_tenant_attempts}
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4" style={{ color: CYAN }} />
                  <p className="text-xs font-bold" style={{ color: MUTED }}>Status</p>
                </div>
                <p className="text-2xl font-black" style={{ color: selectedTenant.status === 'active' ? LOW : MUTED }}>
                  {selectedTenant.status.toUpperCase()}
                </p>
              </Card>
            </div>

            <div className="p-4 rounded-xl" style={{ background: "rgba(0,212,255,0.05)", border: `1px solid ${CYAN}30` }}>
              <p className="text-xs font-bold mb-2" style={{ color: CYAN }}>Recommendations</p>
              <ul className="text-xs space-y-1" style={{ color: MUTED }}>
                {selectedTenant.boundary_violations > 0 && <li>• Review and strengthen tenant boundary rules</li>}
                {selectedTenant.config_drift_count > 0 && <li>• Audit configuration changes and enable auto-remediation</li>}
                {selectedTenant.cross_tenant_attempts > 0 && <li>• Investigate cross-tenant access patterns</li>}
                {selectedTenant.isolation_score < 70 && <li>• Schedule comprehensive isolation audit</li>}
                {selectedTenant.isolation_score >= 70 && <li>• Continue monitoring - isolation posture is healthy</li>}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}