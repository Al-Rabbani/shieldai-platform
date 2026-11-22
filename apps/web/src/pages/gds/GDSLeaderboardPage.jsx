import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Trophy, Medal, Star, Zap, ShieldCheck, Clock } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  Breadcrumb, Card, KpiCard, Skeleton, EmptyState, PAGE_BG
} from "@/components/gds/GDSOSShared";

const RANK_STYLES = [
  { bg: "linear-gradient(135deg,#ffd700,#ff8c00)", color: "#020817", icon: Trophy,    label: "1st" },
  { bg: "linear-gradient(135deg,#c0c0c0,#94a3b8)", color: "#020817", icon: Medal,     label: "2nd" },
  { bg: "linear-gradient(135deg,#cd7f32,#92400e)", color: "#fff",    icon: Star,      label: "3rd" },
];

function PodiumCard({ rank, member, resolved, total, criticalFixed, avgHours }) {
  const style = RANK_STYLES[rank] || { bg: CARD, color: "#fff", icon: ShieldCheck, label: `${rank + 1}th` };
  const Icon = style.icon;
  const isPodium = rank < 3;

  return (
    <div className={`relative p-5 rounded-2xl flex flex-col items-center text-center transition-all ${isPodium ? "hover:scale-[1.02]" : "hover:bg-white/5"}`}
      style={{
        background: isPodium ? style.bg : CARD,
        border: `1px solid ${isPodium ? "transparent" : BORDER}`,
        boxShadow: isPodium ? `0 8px 32px rgba(0,0,0,0.4)` : "none",
      }}>
      {isPodium && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-black"
          style={{ background: "#020817", color: isPodium ? "#ffd700" : MUTED, border: `1px solid ${BORDER}` }}>
          {style.label}
        </div>
      )}
      <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black mb-3 mt-2"
        style={{ background: isPodium ? "rgba(0,0,0,0.25)" : `${CYAN}18`, color: isPodium ? style.color : CYAN }}>
        {member[0]?.toUpperCase() || "?"}
      </div>
      <p className="text-sm font-bold mb-0.5" style={{ color: isPodium ? style.color : "#fff" }}>{member}</p>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-3xl font-black font-mono" style={{ color: isPodium ? style.color : LOW }}>{resolved}</span>
        <span className="text-xs" style={{ color: isPodium ? `${style.color}99` : MUTED }}>fixed</span>
      </div>
      <div className="mt-3 w-full grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="rounded-lg p-1.5" style={{ background: "rgba(0,0,0,0.2)" }}>
          <p className="font-black" style={{ color: isPodium ? style.color : DANGER }}>{criticalFixed}</p>
          <p style={{ color: isPodium ? `${style.color}80` : MUTED }}>criticals</p>
        </div>
        <div className="rounded-lg p-1.5" style={{ background: "rgba(0,0,0,0.2)" }}>
          <p className="font-black" style={{ color: isPodium ? style.color : CYAN }}>{avgHours ? `${avgHours}h` : "—"}</p>
          <p style={{ color: isPodium ? `${style.color}80` : MUTED }}>avg fix</p>
        </div>
      </div>
    </div>
  );
}

function LeaderRow({ rank, member, resolved, total, criticalFixed, inProgress, avgHours }) {
  const pct = total > 0 ? Math.round((resolved / total) * 100) : 0;
  const isTop = rank < 3;

  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all hover:bg-white/5"
      style={{ border: `1px solid ${BORDER}20` }}>
      {/* Rank */}
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
        style={{
          background: rank === 0 ? "#ffd700" : rank === 1 ? "#c0c0c0" : rank === 2 ? "#cd7f32" : `${CYAN}15`,
          color: rank < 3 ? "#020817" : MUTED,
        }}>
        {rank + 1}
      </div>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
        style={{ background: `${CYAN}20`, color: CYAN }}>
        {member[0]?.toUpperCase()}
      </div>

      {/* Name + bar */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{member}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: LOW, transition: "width 0.8s ease" }} />
          </div>
          <span className="text-[10px] font-mono flex-shrink-0" style={{ color: LOW }}>{pct}%</span>
        </div>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex gap-4 flex-shrink-0 text-center">
        <div>
          <p className="text-base font-black font-mono" style={{ color: LOW }}>{resolved}</p>
          <p className="text-[9px] uppercase tracking-wide" style={{ color: MUTED }}>Fixed</p>
        </div>
        <div>
          <p className="text-base font-black font-mono" style={{ color: DANGER }}>{criticalFixed}</p>
          <p className="text-[9px] uppercase tracking-wide" style={{ color: MUTED }}>Critical</p>
        </div>
        <div>
          <p className="text-base font-black font-mono" style={{ color: CYAN }}>{inProgress}</p>
          <p className="text-[9px] uppercase tracking-wide" style={{ color: MUTED }}>Active</p>
        </div>
        <div>
          <p className="text-base font-black font-mono" style={{ color: MEDIUM }}>{avgHours ? `${avgHours}h` : "—"}</p>
          <p className="text-[9px] uppercase tracking-wide" style={{ color: MUTED }}>Avg Fix</p>
        </div>
      </div>

      {/* Mobile stats */}
      <div className="sm:hidden flex gap-3 flex-shrink-0 text-center">
        <div>
          <p className="text-base font-black font-mono" style={{ color: LOW }}>{resolved}</p>
          <p className="text-[9px] uppercase" style={{ color: MUTED }}>Fixed</p>
        </div>
        <div>
          <p className="text-base font-black font-mono" style={{ color: DANGER }}>{criticalFixed}</p>
          <p className="text-[9px] uppercase" style={{ color: MUTED }}>Crit</p>
        </div>
      </div>
    </div>
  );
}

export default function GDSLeaderboardPage() {
  const { data: findings = [], isLoading } = useQuery({
    queryKey: ["gds-leaderboard-findings"],
    queryFn: () => base44.entities.TriagedFinding.list("-detected_at", 1000).catch(() => []),
  });

  const leaderboard = useMemo(() => {
    const map = {};
    findings.forEach(f => {
      const key = f.assigned_to || "Unassigned";
      if (!map[key]) map[key] = { member: key, resolved: 0, criticalFixed: 0, inProgress: 0, total: 0, fixTimes: [] };
      map[key].total++;
      if (f.status === "fixed" || f.status === "resolved") {
        map[key].resolved++;
        if ((f.severity || "").toLowerCase() === "critical") map[key].criticalFixed++;
        // Estimate fix time from detected_at to updated_date in hours
        if (f.detected_at && f.updated_date) {
          const hrs = Math.round((new Date(f.updated_date) - new Date(f.detected_at)) / 3600000);
          if (hrs > 0 && hrs < 8760) map[key].fixTimes.push(hrs);
        }
      }
      if (f.status === "in_remediation") map[key].inProgress++;
    });

    return Object.values(map)
      .map(m => ({
        ...m,
        avgHours: m.fixTimes.length > 0 ? Math.round(m.fixTimes.reduce((a, b) => a + b, 0) / m.fixTimes.length) : null,
        score: m.resolved * 10 + m.criticalFixed * 25 + m.inProgress * 2,
      }))
      .sort((a, b) => b.score - a.score);
  }, [findings]);

  const totalResolved  = leaderboard.reduce((s, m) => s + m.resolved, 0);
  const totalCriticals = leaderboard.reduce((s, m) => s + m.criticalFixed, 0);
  const topResolver    = leaderboard[0];
  const fastestFixer   = [...leaderboard].filter(m => m.avgHours).sort((a, b) => a.avgHours - b.avgHours)[0];

  const podium = leaderboard.slice(0, 3);
  const rest   = leaderboard.slice(3);

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Remediation Tracking", path: "/remediation-tracking" }, { label: "Leaderboard" }]} />

      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Trophy className="w-6 h-6" style={{ color: "#ffd700" }} />
          Remediation Leaderboard
        </h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Ranked by fixes completed — criticals count 2.5× more</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Resolved"    value={totalResolved}                  color={LOW}    icon={ShieldCheck} />
        <KpiCard label="Criticals Fixed"   value={totalCriticals}                 color={DANGER} icon={Zap} />
        <KpiCard label="Top Resolver"      value={topResolver?.member?.split(" ")[0] || "—"} color={CYAN} icon={Trophy} />
        <KpiCard label="Fastest Fix Avg"   value={fastestFixer ? `${fastestFixer.avgHours}h` : "—"} color={MEDIUM} icon={Clock} sub={fastestFixer?.member} />
      </div>

      {isLoading ? <Skeleton lines={6} /> : leaderboard.length === 0 ? (
        <EmptyState icon={Trophy} title="No data yet" description="Assign findings to team members and mark them as fixed to populate the leaderboard" />
      ) : (
        <>
          {/* Podium */}
          {podium.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>🏆 Top Performers</h3>
              <div className={`grid gap-4 ${podium.length === 1 ? "grid-cols-1 max-w-xs" : podium.length === 2 ? "grid-cols-2 max-w-md" : "grid-cols-1 sm:grid-cols-3"}`}>
                {podium.map((m, i) => (
                  <PodiumCard key={m.member} rank={i} member={m.member} resolved={m.resolved}
                    total={m.total} criticalFixed={m.criticalFixed} avgHours={m.avgHours} />
                ))}
              </div>
            </div>
          )}

          {/* Full table */}
          {leaderboard.length > 0 && (
            <Card className="overflow-hidden">
              <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: BORDER }}>
                <Trophy className="w-4 h-4" style={{ color: "#ffd700" }} />
                <h3 className="font-bold text-white">Full Rankings</h3>
                <span className="text-xs ml-auto" style={{ color: MUTED }}>{leaderboard.length} contributors</span>
              </div>
              <div className="p-3 space-y-1.5">
                {leaderboard.map((m, i) => (
                  <LeaderRow key={m.member} rank={i} member={m.member} resolved={m.resolved}
                    total={m.total} criticalFixed={m.criticalFixed} inProgress={m.inProgress} avgHours={m.avgHours} />
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}