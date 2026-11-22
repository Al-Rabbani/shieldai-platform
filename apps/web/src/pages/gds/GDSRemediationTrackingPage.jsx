import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, CheckCircle2, Clock, Wrench, AlertTriangle, Trophy, Medal, Award, PlayCircle } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, StatusBadge, Skeleton, EmptyState,
  Breadcrumb, Card, KpiCard, PAGE_BG
} from "@/components/gds/GDSOSShared";
import RemediationWorkflowModal from "@/components/gds/RemediationWorkflowModal";

const STATUS_CONFIG = {
  in_remediation: { label: "In Progress",       color: CYAN,   icon: Wrench,       bg: "rgba(0,212,255,0.08)"  },
  open:           { label: "Waiting for Review", color: MEDIUM, icon: Clock,        bg: "rgba(255,215,0,0.08)"  },
  fixed:          { label: "Resolved",           color: LOW,    icon: CheckCircle2, bg: "rgba(0,255,136,0.08)"  },
  accepted_risk:  { label: "Accepted Risk",      color: MUTED,  icon: AlertTriangle,bg: "rgba(100,116,139,0.08)"},
};

const DISPLAY_STATUSES = ["in_remediation", "open", "fixed", "accepted_risk"];

function StatusColumn({ status, findings, onStatusChange, onOpenWorkflow }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  return (
    <div className="flex flex-col min-h-0" style={{ minWidth: 260 }}>
      {/* Column Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3 flex-shrink-0"
        style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
        <Icon className="w-4 h-4 flex-shrink-0" style={{ color: cfg.color }} />
        <span className="text-sm font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
        <span className="ml-auto text-xs font-black font-mono px-2 py-0.5 rounded-full"
          style={{ background: `${cfg.color}20`, color: cfg.color }}>{findings.length}</span>
      </div>

      {/* Cards */}
      <div className="space-y-2 overflow-y-auto pr-1" style={{ scrollbarWidth: "none" }}>
        {findings.map(f => (
          <FindingCard key={f.id} finding={f} currentStatus={status} onStatusChange={onStatusChange} onOpenWorkflow={onOpenWorkflow} />
        ))}
        {findings.length === 0 && (
          <div className="text-center py-8 rounded-xl" style={{ border: `1px dashed ${BORDER}` }}>
            <p className="text-xs" style={{ color: MUTED }}>No findings</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FindingCard({ finding, currentStatus, onStatusChange, onOpenWorkflow }) {
  const sev = (finding.severity || "low").toLowerCase();
  const sevColors = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW, info: CYAN };
  const color = sevColors[sev] || MUTED;
  const nextStatuses = DISPLAY_STATUSES.filter(s => s !== currentStatus);
  const isActionable = currentStatus === "open" || currentStatus === "in_remediation";

  return (
    <div className="p-3 rounded-xl group transition-all hover:scale-[1.01]"
      style={{ background: CARD, border: `1px solid ${color}20`, borderLeft: `3px solid ${color}` }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <SevBadge sev={finding.severity} />
        {finding.sla_breached && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ color: DANGER, background: `${DANGER}15`, border: `1px solid ${DANGER}30` }}>SLA!</span>
        )}
      </div>
      <p className="text-xs font-semibold text-white line-clamp-2 mb-1">{finding.title}</p>
      <p className="text-[10px] mb-2 truncate font-mono" style={{ color: MUTED }}>{finding.asset_name || "—"}</p>

      {finding.assigned_to && (
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black flex-shrink-0"
            style={{ background: `${CYAN}25`, color: CYAN }}>
            {finding.assigned_to[0]?.toUpperCase()}
          </div>
          <span className="text-[10px] truncate" style={{ color: MUTED }}>{finding.assigned_to}</span>
        </div>
      )}

      {/* Time-in-progress badge for in_remediation */}
      {currentStatus === "in_remediation" && finding.remediation_started_at && (
        <div className="flex items-center gap-1 mb-2">
          <Clock className="w-3 h-3" style={{ color: CYAN }} />
          <span className="text-[9px] font-mono" style={{ color: CYAN }}>
            Started {new Date(finding.remediation_started_at).toLocaleDateString()}
          </span>
        </div>
      )}

      {/* Fix time badge for resolved */}
      {currentStatus === "fixed" && finding.fixed_at && finding.remediation_started_at && (
        <div className="flex items-center gap-1 mb-2">
          <CheckCircle2 className="w-3 h-3" style={{ color: LOW }} />
          <span className="text-[9px] font-mono" style={{ color: LOW }}>Fixed</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
        {isActionable && (
          <button
            onClick={() => onOpenWorkflow(finding)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all hover:opacity-80 flex-1"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30`, color: CYAN }}>
            <PlayCircle className="w-3 h-3" />
            {currentStatus === "open" ? "Start Fix" : "Resolve"}
          </button>
        )}
        <select
          className="flex-1 px-2 py-1 rounded-lg text-[10px] outline-none cursor-pointer"
          style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: MUTED }}
          value=""
          onChange={e => { if (e.target.value) onStatusChange(finding.id, e.target.value); }}>
          <option value="">Move to…</option>
          {nextStatuses.map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function MemberRow({ member, findings }) {
  const byStatus = useMemo(() => {
    const m = {};
    DISPLAY_STATUSES.forEach(s => { m[s] = findings.filter(f => f.status === s).length; });
    return m;
  }, [findings]);

  const total = findings.length;
  const resolvedPct = total > 0 ? Math.round((byStatus.fixed / total) * 100) : 0;

  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all hover:bg-white/5"
      style={{ border: `1px solid ${BORDER}20` }}>
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
        style={{ background: `linear-gradient(135deg,${CYAN},#0ea5e9)`, color: "#020817" }}>
        {member[0]?.toUpperCase() || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{member}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full" style={{ width: `${resolvedPct}%`, background: LOW, transition: "width 0.8s ease" }} />
          </div>
          <span className="text-[10px] font-mono flex-shrink-0" style={{ color: LOW }}>{resolvedPct}%</span>
        </div>
      </div>
      <div className="flex gap-3 flex-shrink-0">
        {[
          ["in_remediation", CYAN],
          ["open", MEDIUM],
          ["fixed", LOW],
        ].map(([s, c]) => (
          <div key={s} className="text-center">
            <p className="text-base font-black font-mono" style={{ color: c }}>{byStatus[s]}</p>
            <p className="text-[9px] uppercase tracking-wide" style={{ color: MUTED }}>{STATUS_CONFIG[s].label.split(" ")[0]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const RANK_ICONS = [
  <Trophy className="w-5 h-5" style={{ color: "#ffd700" }} />,
  <Medal className="w-5 h-5" style={{ color: "#c0c0c0" }} />,
  <Award className="w-5 h-5" style={{ color: "#cd7f32" }} />,
];

function LeaderboardView({ byMember }) {
  // Sort by resolved (fixed) count desc
  const ranked = [...byMember]
    .map(([member, findings]) => ({
      member,
      resolved: findings.filter(f => f.status === "fixed").length,
      inProgress: findings.filter(f => f.status === "in_remediation").length,
      total: findings.length,
      criticalFixed: findings.filter(f => f.status === "fixed" && (f.severity || "").toLowerCase() === "critical").length,
    }))
    .sort((a, b) => b.resolved - a.resolved);

  if (ranked.length === 0) {
    return <EmptyState icon={Trophy} title="No data yet" description="Assign findings to team members to build the leaderboard" />;
  }

  const maxResolved = ranked[0]?.resolved || 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5" style={{ color: "#ffd700" }} />
        <h3 className="text-base font-black text-white">Vulnerability Fix Leaderboard</h3>
        <span className="text-xs ml-auto" style={{ color: MUTED }}>Ranked by resolved findings</span>
      </div>
      {ranked.map(({ member, resolved, inProgress, total, criticalFixed }, idx) => {
        const pct = maxResolved > 0 ? Math.round((resolved / maxResolved) * 100) : 0;
        const barColor = idx === 0 ? "#ffd700" : idx === 1 ? "#c0c0c0" : idx === 2 ? "#cd7f32" : LOW;
        return (
          <div key={member}
            className="flex items-center gap-4 px-4 py-4 rounded-2xl transition-all"
            style={{
              background: idx < 3 ? `${barColor}08` : CARD,
              border: `1px solid ${idx < 3 ? barColor + "30" : BORDER}`,
            }}>
            {/* Rank */}
            <div className="w-8 flex-shrink-0 flex items-center justify-center">
              {idx < 3 ? RANK_ICONS[idx] : <span className="text-sm font-black font-mono" style={{ color: MUTED }}>#{idx + 1}</span>}
            </div>
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
              style={{ background: `linear-gradient(135deg,${barColor},${barColor}88)`, color: "#020817" }}>
              {member[0]?.toUpperCase() || "?"}
            </div>
            {/* Name + bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-bold text-white truncate">{member}</span>
                {criticalFixed > 0 && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ color: DANGER, background: `${DANGER}15`, border: `1px solid ${DANGER}30` }}>
                    {criticalFixed} CRIT fixed
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor, transition: "width 1s ease", boxShadow: `0 0 6px ${barColor}66` }} />
                </div>
              </div>
            </div>
            {/* Stats */}
            <div className="flex gap-4 flex-shrink-0 text-center">
              <div>
                <p className="text-xl font-black font-mono" style={{ color: barColor }}>{resolved}</p>
                <p className="text-[9px] uppercase tracking-wide" style={{ color: MUTED }}>Fixed</p>
              </div>
              <div>
                <p className="text-xl font-black font-mono" style={{ color: CYAN }}>{inProgress}</p>
                <p className="text-[9px] uppercase tracking-wide" style={{ color: MUTED }}>Active</p>
              </div>
              <div>
                <p className="text-xl font-black font-mono" style={{ color: MUTED }}>{total}</p>
                <p className="text-[9px] uppercase tracking-wide" style={{ color: MUTED }}>Total</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function GDSRemediationTrackingPage() {
  const qc = useQueryClient();
  const [view, setView] = useState("board"); // "board" | "team" | "leaderboard"
  const [workflowFinding, setWorkflowFinding] = useState(null);

  const { data: findings = [], isLoading } = useQuery({
    queryKey: ["gds-remediation-findings"],
    queryFn: () => base44.entities.TriagedFinding.list("-detected_at", 500).catch(() => []),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.TriagedFinding.update(id, { status }),
    onSuccess: () => qc.invalidateQueries(["gds-remediation-findings"]),
  });

  const handleStatusChange = (id, newStatus) => updateMutation.mutate({ id, status: newStatus });
  const handleWorkflowSaved = () => {
    qc.invalidateQueries(["gds-remediation-findings"]);
    setWorkflowFinding(null);
  };

  // Group by status for board view
  const byStatus = useMemo(() => {
    const m = {};
    DISPLAY_STATUSES.forEach(s => { m[s] = findings.filter(f => f.status === s); });
    return m;
  }, [findings]);

  // Group by assigned member for team view
  const byMember = useMemo(() => {
    const m = {};
    findings.forEach(f => {
      const key = f.assigned_to || "Unassigned";
      if (!m[key]) m[key] = [];
      m[key].push(f);
    });
    return Object.entries(m).sort((a, b) => b[1].length - a[1].length);
  }, [findings]);

  const inProgress  = findings.filter(f => f.status === "in_remediation").length;
  const waiting     = findings.filter(f => f.status === "open").length;
  const resolved    = findings.filter(f => f.status === "fixed").length;
  const slaBreached = findings.filter(f => f.sla_breached && f.status !== "fixed").length;

  // Avg fix time: from remediation_started_at → fixed_at for resolved findings
  const avgFixTimeHours = useMemo(() => {
    const timed = findings.filter(f => f.status === "fixed" && f.remediation_started_at && f.fixed_at);
    if (!timed.length) return null;
    const totalMs = timed.reduce((sum, f) => sum + (new Date(f.fixed_at) - new Date(f.remediation_started_at)), 0);
    const avgHours = totalMs / timed.length / 3600000;
    return avgHours < 24 ? `${Math.round(avgHours)}h` : `${(avgHours / 24).toFixed(1)}d`;
  }, [findings]);

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Remediation Tracking" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">Remediation Tracking</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Track vulnerability remediation progress by status and team member</p>
        </div>
        {/* View toggle */}
        <div className="flex items-center rounded-xl overflow-hidden flex-shrink-0"
          style={{ border: `1px solid ${BORDER}` }}>
          {[["board", "Board View"], ["team", "Team View"], ["leaderboard", "🏆 Leaderboard"]].map(([v, label]) => (
            <button key={v} onClick={() => setView(v)}
              className="px-4 py-2 text-xs font-bold transition-all"
              style={{
                background: view === v ? `${CYAN}15` : "transparent",
                color: view === v ? CYAN : MUTED,
                borderRight: v !== "leaderboard" ? `1px solid ${BORDER}` : "none",
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="In Progress"    value={inProgress}            color={CYAN}   icon={Wrench} />
        <KpiCard label="Awaiting Review" value={waiting}              color={MEDIUM} icon={Clock} />
        <KpiCard label="Resolved"       value={resolved}              color={LOW}    icon={CheckCircle2} />
        <KpiCard label="SLA Breached"   value={slaBreached}           color={DANGER} icon={AlertTriangle} pulse={slaBreached > 0} />
        <KpiCard label="Avg Fix Time"   value={avgFixTimeHours ?? "—"} color={CYAN}  icon={Clock} sub="remediation → resolved" />
      </div>

      {isLoading ? <Skeleton lines={5} /> : (
        <>
          {/* ── Board View ───────────────────────────────────────── */}
          {view === "board" && (
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-4" style={{ minWidth: DISPLAY_STATUSES.length * 280 }}>
                {DISPLAY_STATUSES.map(status => (
                  <div key={status} className="flex-1" style={{ minWidth: 260 }}>
                    <StatusColumn
                      status={status}
                      findings={byStatus[status] || []}
                      onStatusChange={handleStatusChange}
                      onOpenWorkflow={setWorkflowFinding}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Leaderboard View ─────────────────────────────────── */}
          {view === "leaderboard" && (
            <LeaderboardView byMember={byMember} />
          )}

          {/* ── Team View ────────────────────────────────────────── */}
          {view === "team" && (
            <Card className="overflow-hidden">
              <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: BORDER }}>
                <Users className="w-4 h-4" style={{ color: CYAN }} />
                <h3 className="font-bold text-white">Remediation by Team Member</h3>
                <span className="text-xs ml-auto" style={{ color: MUTED }}>{byMember.length} assignees</span>
              </div>
              {byMember.length === 0
                ? <EmptyState icon={Users} title="No assigned findings" description="Assign findings to team members to track progress here" />
                : (
                  <div className="p-4 space-y-2">
                    {byMember.map(([member, mFindings]) => (
                      <MemberRow key={member} member={member} findings={mFindings} />
                    ))}
                  </div>
                )}
            </Card>
          )}
        </>
      )}

      {workflowFinding && (
        <RemediationWorkflowModal
          finding={workflowFinding}
          onClose={() => setWorkflowFinding(null)}
          onSaved={handleWorkflowSaved}
        />
      )}
    </div>
  );
}