import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Shield, AlertTriangle, CheckCircle, BarChart3, RefreshCw } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Card, Breadcrumb, AnimatedArc
} from "@/components/gds/GDSOSShared";
import { Button } from "@/components/ui/button";

export default function GDSComplianceScoresPage() {
  const qc = useQueryClient();

  const calculateScoresMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('gdsCalculateComplianceScores', {});
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries(["compliance-control-status"]);
    },
  });

  const { data: controlStatuses = [], isLoading } = useQuery({
    queryKey: ["compliance-control-status"],
    queryFn: () => base44.entities.ComplianceControlStatus.list("-last_assessed", 100).catch(() => []),
    refetchInterval: 60000,
  });

  const soc2Controls = controlStatuses.filter(c => c.framework === 'soc2');
  const iso27001Controls = controlStatuses.filter(c => c.framework === 'iso27001');

  const soc2Score = soc2Controls.length > 0 
    ? Math.round(soc2Controls.reduce((sum, c) => sum + c.compliance_score, 0) / soc2Controls.length)
    : 0;
  
  const iso27001Score = iso27001Controls.length > 0
    ? Math.round(iso27001Controls.reduce((sum, c) => sum + c.compliance_score, 0) / iso27001Controls.length)
    : 0;

  const stats = {
    soc2_compliant: soc2Controls.filter(c => c.status === 'compliant').length,
    soc2_failing: soc2Controls.filter(c => c.status === 'non_compliant' || c.status === 'partial').length,
    iso27001_compliant: iso27001Controls.filter(c => c.status === 'compliant').length,
    iso27001_failing: iso27001Controls.filter(c => c.status === 'non_compliant' || c.status === 'partial').length,
    total_critical: controlStatuses.reduce((sum, c) => sum + (c.critical_findings || 0), 0),
    total_high: controlStatuses.reduce((sum, c) => sum + (c.high_findings || 0), 0),
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'compliant': return LOW;
      case 'partial': return MEDIUM;
      case 'non_compliant': return DANGER;
      case 'needs_attention': return HIGH;
      default: return MUTED;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'compliant': return CheckCircle;
      case 'partial': return AlertTriangle;
      case 'non_compliant': return AlertTriangle;
      case 'needs_attention': return AlertTriangle;
      default: return CheckCircle;
    }
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Compliance Scores" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40` }}>
            <TrendingUp className="w-6 h-6" style={{ color: CYAN }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Compliance Control Scores</h1>
            <p className="text-sm mt-1" style={{ color: MUTED }}>Real-time SOC 2 and ISO 27001 control compliance status</p>
          </div>
        </div>
        <Button
          onClick={() => calculateScoresMutation.mutate()}
          disabled={calculateScoresMutation.isPending}
          className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
          style={{ 
            background: `${CYAN}15`, 
            border: `1px solid ${CYAN}40`, 
            color: CYAN,
            opacity: calculateScoresMutation.isPending ? 0.7 : 1 
          }}
        >
          <RefreshCw className={`w-4 h-4 ${calculateScoresMutation.isPending ? 'animate-spin' : ''}`} />
          {calculateScoresMutation.isPending ? 'Calculating...' : 'Recalculate Scores'}
        </Button>
      </div>

      {/* Overall Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: CYAN }}>SOC 2 Score</p>
              <p className="text-4xl font-black font-mono" style={{ color: soc2Score >= 70 ? LOW : soc2Score >= 40 ? MEDIUM : DANGER }}>
                {soc2Score}%
              </p>
            </div>
            <AnimatedArc score={soc2Score} size={100} strokeWidth={8} />
          </div>
          <div className="flex gap-4 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: LOW }} />
              <span style={{ color: MUTED }}>{stats.soc2_compliant} Compliant</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: DANGER }} />
              <span style={{ color: MUTED }}>{stats.soc2_failing} Failing</span>
            </span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: HIGH }}>ISO 27001 Score</p>
              <p className="text-4xl font-black font-mono" style={{ color: iso27001Score >= 70 ? LOW : iso27001Score >= 40 ? MEDIUM : DANGER }}>
                {iso27001Score}%
              </p>
            </div>
            <AnimatedArc score={iso27001Score} size={100} strokeWidth={8} />
          </div>
          <div className="flex gap-4 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: LOW }} />
              <span style={{ color: MUTED }}>{stats.iso27001_compliant} Compliant</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: DANGER }} />
              <span style={{ color: MUTED }}>{stats.iso27001_failing} Failing</span>
            </span>
          </div>
        </Card>
      </div>

      {/* Critical Findings Alert */}
      {(stats.total_critical > 0 || stats.total_high > 0) && (
        <Card className="p-4 border-l-4" style={{ background: `${DANGER}08`, borderLeftColor: DANGER, border: `1px solid ${DANGER}30` }}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: DANGER }} />
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: DANGER }}>
                {stats.total_critical > 0 && `${stats.total_critical} critical`}
                {stats.total_critical > 0 && stats.total_high > 0 && ' and '}
                {stats.total_high > 0 && `${stats.total_high} high`} severity findings impacting compliance
              </p>
              <p className="text-[10px]" style={{ color: MUTED }}>
                Immediate remediation required to improve control scores
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* SOC 2 Controls */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">SOC 2 Trust Services Controls</h3>
          </div>
          <BarChart3 className="w-4 h-4" style={{ color: MUTED }} />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />
            ))}
          </div>
        ) : soc2Controls.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: MUTED }}>Run recalculation to load control statuses</p>
          </div>
        ) : (
          <div className="space-y-2">
            {soc2Controls.map(control => {
              const StatusIcon = getStatusIcon(control.status);
              return (
                <div key={control.id} className="p-3 rounded-xl" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold" style={{ color: CYAN }}>{control.control_id}</span>
                        <StatusIcon className="w-3.5 h-3.5" style={{ color: getStatusColor(control.status) }} />
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                          control.status === 'compliant' ? 'bg-green-400/15 text-green-400' :
                          control.status === 'partial' ? 'bg-yellow-400/15 text-yellow-400' :
                          'bg-red-400/15 text-red-400'
                        }`}>
                          {control.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white truncate">{control.control_name}</p>
                      {control.failing_reason && (
                        <p className="text-[10px] mt-1" style={{ color: MUTED }}>{control.failing_reason}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-2xl font-black font-mono" style={{ color: getStatusColor(control.status) }}>
                        {control.compliance_score}%
                      </p>
                      {control.total_findings > 0 && (
                        <p className="text-[9px]" style={{ color: MUTED }}>
                          {control.critical_findings > 0 && <span className="text-red-400">{control.critical_findings} crit</span>}
                          {control.critical_findings > 0 && control.high_findings > 0 && ', '}
                          {control.high_findings > 0 && <span className="text-orange-400">{control.high_findings} high</span>}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ISO 27001 Controls */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: HIGH }} />
            <h3 className="text-sm font-bold text-white">ISO 27001 Annex A Controls</h3>
          </div>
          <BarChart3 className="w-4 h-4" style={{ color: MUTED }} />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />
            ))}
          </div>
        ) : iso27001Controls.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: MUTED }}>Run recalculation to load control statuses</p>
          </div>
        ) : (
          <div className="space-y-2">
            {iso27001Controls.map(control => {
              const StatusIcon = getStatusIcon(control.status);
              return (
                <div key={control.id} className="p-3 rounded-xl" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold" style={{ color: HIGH }}>{control.control_id}</span>
                        <StatusIcon className="w-3.5 h-3.5" style={{ color: getStatusColor(control.status) }} />
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                          control.status === 'compliant' ? 'bg-green-400/15 text-green-400' :
                          control.status === 'partial' ? 'bg-yellow-400/15 text-yellow-400' :
                          'bg-red-400/15 text-red-400'
                        }`}>
                          {control.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white truncate">{control.control_name}</p>
                      {control.failing_reason && (
                        <p className="text-[10px] mt-1" style={{ color: MUTED }}>{control.failing_reason}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-2xl font-black font-mono" style={{ color: getStatusColor(control.status) }}>
                        {control.compliance_score}%
                      </p>
                      {control.total_findings > 0 && (
                        <p className="text-[9px]" style={{ color: MUTED }}>
                          {control.critical_findings > 0 && <span className="text-red-400">{control.critical_findings} crit</span>}
                          {control.critical_findings > 0 && control.high_findings > 0 && ', '}
                          {control.high_findings > 0 && <span className="text-orange-400">{control.high_findings} high</span>}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}