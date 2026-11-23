import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, CheckCircle, XCircle, AlertTriangle, Activity } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const OUTCOME_COLORS = {
  detected: LOW, not_detected: DANGER, false_positive: MEDIUM,
  needs_tuning: HIGH, validated: CYAN
};

const PLATFORM_COLORS = {
  siem: "#3b82f6", edr: "#10b981", xdr: "#8b5cf6", nta: "#f59e0b", cloud: "#06b6d4"
};

export default function GDSPurpleDetectionsPage() {
  const [expandedRow, setExpandedRow] = useState(null);
  const [platformFilter, setPlatformFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");

  const { data: validations = [], isLoading } = useQuery({
    queryKey: ["purple-detection-validations"], queryFn: () => base44.entities.DetectionValidation.list("-validated_at", 100).catch(() => []),
  });

  const filtered = validations.filter(v => {
    const matchPlatform = platformFilter === "all" || v.detection_platform === platformFilter;
    const matchOutcome = outcomeFilter === "all" || v.outcome === outcomeFilter;
    return matchPlatform && matchOutcome;
  });

  const detected = validations.filter(v => v.outcome === 'detected').length;
  const notDetected = validations.filter(v => v.outcome === 'not_detected').length;
  const falsePositives = validations.filter(v => v.outcome === 'false_positive').length;
  const avgResponseTime = validations.reduce((sum, v) => sum + (v.response_time_seconds || 0), 0) / (validations.length || 1);

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Purple Team", path: "/purple" }, { label: "Detections" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Shield className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Detection Validation</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Validate detection rules across SIEM, EDR, and XDR platforms</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center" style={{ background: `${LOW}08`, border: `1px solid ${LOW}20` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Detected</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{detected}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Not Detected</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{notDetected}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${MEDIUM}08`, border: `1px solid ${MEDIUM}20` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>False Positives</p>
          <p className="text-2xl font-black font-mono" style={{ color: MEDIUM }}>{falsePositives}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Avg Response Time</p>
          <p className="text-2xl font-black font-mono" style={{ color: avgResponseTime < 300 ? LOW : avgResponseTime < 600 ? MEDIUM : DANGER }}>{Math.round(avgResponseTime)}s</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className="px-3 py-2 rounded-xl text-xs font-bold outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Platforms</option>
            {Object.keys(PLATFORM_COLORS).map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
          </select>
          <select value={outcomeFilter} onChange={(e) => setOutcomeFilter(e.target.value)} className="px-3 py-2 rounded-xl text-xs font-bold outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Outcomes</option>
            <option value="detected">Detected</option>
            <option value="not_detected">Not Detected</option>
            <option value="false_positive">False Positive</option>
            <option value="needs_tuning">Needs Tuning</option>
          </select>
        </div>
      </Card>

      {isLoading ? <Skeleton lines={6} /> : filtered.length === 0 ? (
        <EmptyState icon={Shield} title="No validations" description="Detection validation results will appear here" />
      ) : (
        <div className="space-y-2">
          {filtered.map((val) => {
            const outcomeColor = OUTCOME_COLORS[val.outcome] || MUTED;
            const platformColor = PLATFORM_COLORS[val.detection_platform] || MUTED;
            const isExpanded = expandedRow === val.id;
            
            return (
              <Card key={val.id} className="transition-all" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpandedRow(isExpanded ? null : val.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold" style={{ background: `${CYAN}15`, color: CYAN }}>{val.mitred_technique_id || 'T1059.001'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${platformColor}15`, color: platformColor }}>{val.detection_platform?.toUpperCase() || 'SIEM'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${outcomeColor}15`, color: outcomeColor }}>{val.outcome?.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-xs truncate" style={{ color: TEXT }}>{val.rule_name || 'Unnamed Rule'}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {val.alert_fired ? <CheckCircle className="w-4 h-4" style={{ color: LOW }} /> : <XCircle className="w-4 h-4" style={{ color: DANGER }} />}
                    <span className={`text-xs font-bold ${val.response_time_seconds < 300 ? 'text-green-400' : val.response_time_seconds < 600 ? 'text-yellow-400' : 'text-red-400'}`}>{val.response_time_seconds ? `${val.response_time_seconds}s` : '—'}</span>
                    {val.noise_level === 'high' && <AlertTriangle className="w-4 h-4" style={{ color: HIGH }} />}
                    {val.tuning_needed && <Activity className="w-4 h-4" style={{ color: MEDIUM }} />}
                  </div>
                </div>
                {isExpanded && val.recommended_rule && (
                  <div className="px-3 pb-3 pt-0 border-t mt-2" style={{ borderColor: BORDER }}>
                    <div className="mt-3">
                      <p className="text-[10px] font-bold mb-2" style={{ color: MUTED }}>Recommended Rule</p>
                      <pre className="text-[10px] p-3 rounded-lg overflow-x-auto" style={{ background: "rgba(0,0,0,0.3)", color: LOW, fontFamily: 'monospace' }}>{val.recommended_rule}</pre>
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