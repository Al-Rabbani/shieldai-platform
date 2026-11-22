import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, CheckCircle, TrendingUp, Activity, BarChart3, Calendar, AlertCircle, Clock, Target } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Card, Breadcrumb, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";

export default function GDSTeamPerformancePage() {
  const [timeRange, setTimeRange] = useState("30");

  const { data: findings = [], isLoading } = useQuery({
    queryKey: ["findings-performance", timeRange],
    queryFn: () => base44.entities.Finding.filter({}, '-created_date', 500).catch(() => []),
    refetchInterval: 60000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-performance"],
    queryFn: () => base44.entities.User.list().catch(() => []),
  });

  // Calculate team member metrics
  const teamMetrics = useMemo(() => {
    return users.map(user => {
      const userFindings = findings.filter(f => f.assigned_to === user.id);
      const assigned = userFindings.length;
      const resolved = userFindings.filter(f => f.workflow_status === 'resolved' || f.status === 'resolved').length;
      const inProgress = userFindings.filter(f => f.workflow_status === 'in_progress').length;
      const review = userFindings.filter(f => f.workflow_status === 'review').length;
      const overdue = userFindings.filter(f => f.due_date && new Date(f.due_date) < new Date() && f.workflow_status !== 'resolved').length;
      
      const weeks = Math.max(1, parseInt(timeRange) / 7);
      const velocity = parseFloat((resolved / weeks).toFixed(2));
      
      const resolvedFindings = userFindings.filter(f => {
        if (f.workflow_status !== 'resolved' && f.status !== 'resolved') return false;
        if (!f.assignment_date && !f.created_date) return false;
        return true;
      });
      
      let avgResolutionTime = null;
      if (resolvedFindings.length > 0) {
        const totalDays = resolvedFindings.reduce((sum, f) => {
          const assigned = new Date(f.assignment_date || f.created_date);
          const resolvedDate = new Date(f.updated_date || Date.now());
          return sum + (resolvedDate - assigned) / (1000 * 60 * 60 * 24);
        }, 0);
        avgResolutionTime = Math.round(totalDays / resolvedFindings.length);
      }

      const workloadScore = (assigned * 1) + (inProgress * 2) + (overdue * 5);
      
      const severityBreakdown = {
        critical: userFindings.filter(f => f.severity === 'critical').length,
        high: userFindings.filter(f => f.severity === 'high').length,
        medium: userFindings.filter(f => f.severity === 'medium').length,
        low: userFindings.filter(f => f.severity === 'low').length,
      };

      return {
        user,
        assigned,
        resolved,
        inProgress,
        review,
        overdue,
        velocity,
        avgResolutionTime,
        workloadScore,
        severityBreakdown,
        completionRate: assigned > 0 ? Math.round((resolved / assigned) * 100) : 0,
      };
    }).sort((a, b) => b.workloadScore - a.workloadScore);
  }, [users, findings, timeRange]);

  const totalAssigned = findings.filter(f => f.assigned_to).length;
  const totalResolved = findings.filter(f => f.workflow_status === 'resolved' || f.status === 'resolved').length;
  const avgVelocity = teamMetrics.length > 0 
    ? (teamMetrics.reduce((sum, m) => sum + m.velocity, 0) / teamMetrics.length).toFixed(2)
    : 0;
  const overallCompletionRate = totalAssigned > 0 ? Math.round((totalResolved / totalAssigned) * 100) : 0;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Team Performance" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
            <Users className="w-6 h-6" style={{ color: CYAN }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Team Performance</h1>
            <p className="text-sm mt-0.5" style={{ color: MUTED }}>Security team workload distribution and resolution velocity</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {[
            { days: "7", label: "7D" },
            { days: "30", label: "30D" },
            { days: "90", label: "90D" },
          ].map(range => (
            <button
              key={range.days}
              onClick={() => setTimeRange(range.days)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeRange === range.days ? "" : "hover:opacity-70"
              }`}
              style={{
                background: timeRange === range.days ? `${CYAN}15` : "rgba(255,255,255,0.04)",
                border: `1px solid ${timeRange === range.days ? CYAN + "40" : BORDER}`,
                color: timeRange === range.days ? CYAN : MUTED
              }}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-5 h-full">
          <div className="flex items-start justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Team Members</span>
            <Users className="w-4 h-4" style={{ color: CYAN }} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black font-mono leading-none" style={{ color: CYAN }}>{teamMetrics.length}</span>
          </div>
        </Card>

        <Card className="p-5 h-full">
          <div className="flex items-start justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Total Assigned</span>
            <AlertCircle className="w-4 h-4" style={{ color: HIGH }} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black font-mono leading-none" style={{ color: HIGH }}>{totalAssigned}</span>
          </div>
        </Card>

        <Card className="p-5 h-full">
          <div className="flex items-start justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Total Resolved</span>
            <CheckCircle className="w-4 h-4" style={{ color: LOW }} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black font-mono leading-none" style={{ color: LOW }}>{totalResolved}</span>
          </div>
        </Card>

        <Card className="p-5 h-full">
          <div className="flex items-start justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Avg Velocity</span>
            <TrendingUp className="w-4 h-4" style={{ color: CYAN }} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black font-mono leading-none" style={{ color: CYAN }}>{avgVelocity}</span>
            <span className="text-[11px] mt-2" style={{ color: MUTED }}>res/week</span>
          </div>
        </Card>

        <Card className="p-5 h-full">
          <div className="flex items-start justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Completion Rate</span>
            <Activity className="w-4 h-4" style={{ color: LOW }} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black font-mono leading-none" style={{ color: LOW }}>{overallCompletionRate}%</span>
          </div>
        </Card>
      </div>

      <div>
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" style={{ color: CYAN }} />
          Individual Performance Metrics
        </h3>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />
            ))}
          </div>
        ) : teamMetrics.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-3" style={{ color: MUTED }} />
            <p className="text-sm font-bold" style={{ color: MUTED }}>No team members found</p>
            <p className="text-[10px]" style={{ color: MUTED }}>Team performance data will appear here</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {teamMetrics.map(({ user, assigned, resolved, inProgress, review, overdue, velocity, avgResolutionTime, workloadScore, severityBreakdown, completionRate }) => (
              <Card key={user.id} className="p-5" style={{ border: `1px solid ${workloadScore > 10 ? DANGER + "30" : BORDER}` }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black" 
                      style={{ background: `linear-gradient(135deg,${CYAN},#0ea5e9)`, color: "#020817" }}>
                      {user.full_name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{user.full_name || "Unknown"}</h4>
                      <p className="text-[10px]" style={{ color: MUTED }}>{user.email}</p>
                    </div>
                  </div>
                  {workloadScore > 10 && (
                    <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase" 
                      style={{ background: `${DANGER}15`, color: DANGER, border: `1px solid ${DANGER}30` }}>
                      High Load
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="text-center p-2 rounded-xl" style={{ background: "rgba(0,212,255,0.05)" }}>
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>Assigned</p>
                    <p className="text-lg font-black font-mono" style={{ color: CYAN }}>{assigned}</p>
                  </div>
                  <div className="text-center p-2 rounded-xl" style={{ background: "rgba(0,255,136,0.05)" }}>
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>Resolved</p>
                    <p className="text-lg font-black font-mono" style={{ color: LOW }}>{resolved}</p>
                  </div>
                  <div className="text-center p-2 rounded-xl" style={{ background: "rgba(255,140,0,0.05)" }}>
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>In Progress</p>
                    <p className="text-lg font-black font-mono" style={{ color: HIGH }}>{inProgress}</p>
                  </div>
                  <div className="text-center p-2 rounded-xl" style={{ background: "rgba(255,59,59,0.05)" }}>
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>Overdue</p>
                    <p className="text-lg font-black font-mono" style={{ color: DANGER }}>{overdue}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4 pb-4 border-b" style={{ borderColor: BORDER }}>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>Velocity</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black font-mono" style={{ color: CYAN }}>{velocity}</span>
                      <span className="text-[10px]" style={{ color: MUTED }}>res/week</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>Avg Resolution</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black font-mono" style={{ color: CYAN }}>
                        {avgResolutionTime != null ? avgResolutionTime : "—"}
                      </span>
                      <span className="text-[10px]" style={{ color: MUTED }}>days</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>Completion</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black font-mono" style={{ color: LOW }}>{completionRate}%</span>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Severity Breakdown</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {severityBreakdown.critical > 0 && (
                      <span className="text-[9px] px-2 py-0.5 rounded font-bold" 
                        style={{ background: `${DANGER}15`, color: DANGER, border: `1px solid ${DANGER}30` }}>
                        {severityBreakdown.critical} Critical
                      </span>
                    )}
                    {severityBreakdown.high > 0 && (
                      <span className="text-[9px] px-2 py-0.5 rounded font-bold" 
                        style={{ background: `${HIGH}15`, color: HIGH, border: `1px solid ${HIGH}30` }}>
                        {severityBreakdown.high} High
                      </span>
                    )}
                    {severityBreakdown.medium > 0 && (
                      <span className="text-[9px] px-2 py-0.5 rounded font-bold" 
                        style={{ background: `${MEDIUM}15`, color: MEDIUM, border: `1px solid ${MEDIUM}30` }}>
                        {severityBreakdown.medium} Medium
                      </span>
                    )}
                    {severityBreakdown.low > 0 && (
                      <span className="text-[9px] px-2 py-0.5 rounded font-bold" 
                        style={{ background: `${LOW}15`, color: LOW, border: `1px solid ${LOW}30` }}>
                        {severityBreakdown.low} Low
                      </span>
                    )}
                    {assigned === 0 && (
                      <span className="text-[9px]" style={{ color: MUTED }}>No assignments</span>
                    )}
                  </div>
                </div>

                {assigned > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold" style={{ color: MUTED }}>Workload Distribution</span>
                      <span className="text-[9px] font-mono" style={{ color: CYAN }}>{Math.min(100, workloadScore * 5)}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div 
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ 
                          width: `${Math.min(100, workloadScore * 5)}%`,
                          background: workloadScore > 10 ? DANGER : workloadScore > 5 ? HIGH : CYAN,
                          boxShadow: `0 0 8px ${workloadScore > 10 ? DANGER : workloadScore > 5 ? HIGH : CYAN}66`
                        }} 
                      />
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {teamMetrics.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: CYAN }} />
                Team Velocity Trend
              </h3>
              <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Resolution velocity over the selected time period</p>
            </div>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {teamMetrics.slice(0, 6).map(({ user, velocity }) => (
              <div key={user.id} className="text-center p-3 rounded-xl" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}` }}>
                <p className="text-[9px] font-semibold mb-2 truncate" style={{ color: MUTED }}>{user.full_name?.split(' ')[0] || "User"}</p>
                <div className="flex items-end justify-center gap-1 h-16">
                  <div 
                    className="w-3 rounded-t-lg transition-all duration-1000"
                    style={{ 
                      height: `${Math.min(100, velocity * 20)}%`,
                      background: `linear-gradient(to top, ${CYAN}, #0ea5e9)`,
                      boxShadow: `0 0 12px ${CYAN}40`
                    }} 
                  />
                </div>
                <p className="text-xs font-black font-mono mt-2" style={{ color: CYAN }}>{velocity}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Workload Distribution Heatmap */}
      {teamMetrics.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4" style={{ color: CYAN }} />
                Vulnerability Workload Heatmap
              </h3>
              <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Distribution of vulnerability workload across team members by severity</p>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded" style={{ background: DANGER }} />
                <span style={{ color: MUTED }}>Critical</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded" style={{ background: HIGH }} />
                <span style={{ color: MUTED }}>High</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded" style={{ background: MEDIUM }} />
                <span style={{ color: MUTED }}>Medium</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded" style={{ background: LOW }} />
                <span style={{ color: MUTED }}>Low</span>
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {teamMetrics.map(({ user, severityBreakdown, workloadScore }) => {
              const total = severityBreakdown.critical + severityBreakdown.high + severityBreakdown.medium + severityBreakdown.low;
              const maxSeverity = severityBreakdown.critical > 0 ? 'critical' : 
                                 severityBreakdown.high > 0 ? 'high' : 
                                 severityBreakdown.medium > 0 ? 'medium' : 'low';
              
              return (
                <div key={user.id} className="space-y-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0" 
                        style={{ background: `linear-gradient(135deg,${CYAN},#0ea5e9)`, color: "#020817" }}>
                        {user.full_name?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{user.full_name || "Unknown"}</p>
                        <p className="text-[9px]" style={{ color: MUTED }}>{total} total findings</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {severityBreakdown.critical > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-bold" style={{ color: DANGER }}>{severityBreakdown.critical}</span>
                          <div className="w-16 h-2 rounded-full overflow-hidden bg-red-400/15">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, severityBreakdown.critical * 20)}%`, background: DANGER }} />
                          </div>
                        </div>
                      )}
                      {severityBreakdown.high > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-bold" style={{ color: HIGH }}>{severityBreakdown.high}</span>
                          <div className="w-16 h-2 rounded-full overflow-hidden bg-orange-400/15">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, severityBreakdown.high * 20)}%`, background: HIGH }} />
                          </div>
                        </div>
                      )}
                      {severityBreakdown.medium > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-bold" style={{ color: MEDIUM }}>{severityBreakdown.medium}</span>
                          <div className="w-16 h-2 rounded-full overflow-hidden bg-yellow-400/15">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, severityBreakdown.medium * 20)}%`, background: MEDIUM }} />
                          </div>
                        </div>
                      )}
                      {severityBreakdown.low > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-bold" style={{ color: LOW }}>{severityBreakdown.low}</span>
                          <div className="w-16 h-2 rounded-full overflow-hidden bg-green-400/15">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, severityBreakdown.low * 20)}%`, background: LOW }} />
                          </div>
                        </div>
                      )}
                      {total === 0 && (
                        <span className="text-[9px]" style={{ color: MUTED }}>No assignments</span>
                      )}
                    </div>
                  </div>
                  {/* Workload intensity bar */}
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div 
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${Math.min(100, total * 10)}%`,
                        background: workloadScore > 10 ? DANGER : workloadScore > 5 ? HIGH : CYAN,
                        boxShadow: `0 0 8px ${workloadScore > 10 ? DANGER : workloadScore > 5 ? HIGH : CYAN}66`
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-4 border-t" style={{ borderColor: BORDER }}>
            <div className="text-center p-3 rounded-xl" style={{ background: `${DANGER}05`, border: `1px solid ${DANGER}20` }}>
              <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>Total Critical</p>
              <p className="text-xl font-black font-mono" style={{ color: DANGER }}>
                {teamMetrics.reduce((sum, m) => sum + m.severityBreakdown.critical, 0)}
              </p>
            </div>
            <div className="text-center p-3 rounded-xl" style={{ background: `${HIGH}05`, border: `1px solid ${HIGH}20` }}>
              <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>Total High</p>
              <p className="text-xl font-black font-mono" style={{ color: HIGH }}>
                {teamMetrics.reduce((sum, m) => sum + m.severityBreakdown.high, 0)}
              </p>
            </div>
            <div className="text-center p-3 rounded-xl" style={{ background: `${MEDIUM}05`, border: `1px solid ${MEDIUM}20` }}>
              <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>Total Medium</p>
              <p className="text-xl font-black font-mono" style={{ color: MEDIUM }}>
                {teamMetrics.reduce((sum, m) => sum + m.severityBreakdown.medium, 0)}
              </p>
            </div>
            <div className="text-center p-3 rounded-xl" style={{ background: `${LOW}05`, border: `1px solid ${LOW}20` }}>
              <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>Total Low</p>
              <p className="text-xl font-black font-mono" style={{ color: LOW }}>
                {teamMetrics.reduce((sum, m) => sum + m.severityBreakdown.low, 0)}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}