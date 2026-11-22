import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, CheckCircle, XCircle, Activity } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const TYPE_COLORS = {
  preventive: "#3b82f6", detective: LOW, corrective: HIGH,
  compensating: MEDIUM, administrative: "#8b5cf6"
};

const CATEGORY_COLORS = {
  endpoint: CYAN, network: "#10b981", cloud: "#06b6d4", identity: "#f59e0b",
  application: "#8b5cf6", data: "#ec4899"
};

export default function GDSPurpleControlsPage() {
  const [expandedRow, setExpandedRow] = useState(null);

  const { data: controls = [], isLoading: loadC } = useQuery({
    queryKey: ["purple-security-controls"], queryFn: () => base44.entities.SecurityControl.list("", 100).catch(() => []),
  });

  const { data: validations = [], isLoading: loadV } = useQuery({
    queryKey: ["purple-control-validations"], queryFn: () => base44.entities.ControlValidation.list("-validated_at", 200).catch(() => []),
  });

  const activeCount = controls.filter(c => c.is_active).length;
  const avgEffectiveness = controls.reduce((sum, c) => sum + (c.effectiveness_pct || 0), 0) / (controls.length || 1);

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Purple Team", path: "/purple" }, { label: "Controls" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Shield className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Security Control Validation</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Validate security control effectiveness across all categories</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Controls</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{controls.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Active</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{activeCount}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Avg Effectiveness</p>
          <p className="text-2xl font-black font-mono" style={{ color: avgEffectiveness >= 80 ? LOW : avgEffectiveness >= 50 ? MEDIUM : DANGER }}>{avgEffectiveness.toFixed(0)}%</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Validations</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{validations.length}</p>
        </Card>
      </div>

      {loadC ? <Skeleton lines={6} /> : controls.length === 0 ? (
        <EmptyState icon={Shield} title="No controls" description="Security controls will appear here" />
      ) : (
        <div className="space-y-2">
          {controls.map((control) => {
            const typeColor = TYPE_COLORS[control.control_type] || MUTED;
            const categoryColor = CATEGORY_COLORS[control.category] || MUTED;
            const effectivenessColor = control.effectiveness_pct >= 80 ? LOW : control.effectiveness_pct >= 50 ? MEDIUM : DANGER;
            const controlValidations = validations.filter(v => v.control_id === control.id);
            const isExpanded = expandedRow === control.id;
            
            return (
              <Card key={control.id} className="transition-all" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpandedRow(isExpanded ? null : control.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${typeColor}15`, color: typeColor }}>{control.control_type?.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${categoryColor}15`, color: categoryColor }}>{control.category}</span>
                      {control.is_active ? <CheckCircle className="w-3 h-3" style={{ color: LOW }} /> : <XCircle className="w-3 h-3" style={{ color: MUTED }} />}
                    </div>
                    <p className="text-xs truncate font-bold" style={{ color: TEXT }}>{control.control_name}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="w-32">
                      <div className="flex items-center justify-between text-[9px] mb-1" style={{ color: MUTED }}>
                        <span>Effectiveness</span>
                        <span style={{ color: effectivenessColor }}>{control.effectiveness_pct}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                        <div className="h-full rounded-full" style={{ width: `${control.effectiveness_pct}%`, background: effectivenessColor }} />
                      </div>
                    </div>
                    <span className="text-xs font-bold" style={{ color: controlValidations.filter(v => v.outcome === 'failed').length > 0 ? DANGER : TEXT }}>
                      {controlValidations.filter(v => v.outcome === 'failed').length} Gaps
                    </span>
                    <span className="text-[10px]" style={{ color: MUTED }}>{controlValidations.length} validations</span>
                  </div>
                </div>
                {isExpanded && controlValidations.length > 0 && (
                  <div className="px-3 pb-3 pt-0 border-t mt-2" style={{ borderColor: BORDER }}>
                    <p className="text-[10px] font-bold mt-3 mb-2" style={{ color: MUTED }}>Validation History</p>
                    <div className="space-y-2">
                      {controlValidations.slice(0, 5).map((val, i) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2 rounded" style={{ background: "rgba(255,255,255,0.03)" }}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${val.outcome === 'passed' ? 'bg-green-400' : val.outcome === 'failed' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                            <span style={{ color: TEXT }}>{val.outcome}</span>
                          </div>
                          <span style={{ color: MUTED }}>{new Date(val.validated_at).toLocaleDateString()}</span>
                        </div>
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