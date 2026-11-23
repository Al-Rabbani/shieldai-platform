import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Package, AlertTriangle, Globe } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  SEV_COLOR, TOOLTIP_STYLE, SevBadge, Skeleton, EmptyState,
  Breadcrumb, Card, KpiCard, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";
import { format, parseISO } from "date-fns";

const REGISTRY_COLORS = { npm: "#cb3837", pypi: "#3776ab", go: "#00add8", maven: "#c71a36", nuget: "#004880" };

function RegistryBadge({ registry }) {
  const color = REGISTRY_COLORS[registry?.toLowerCase()] || MUTED;
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase"
      style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
      {registry || "—"}
    </span>
  );
}

function EventTypeBadge({ type }) {
  const map = {
    malicious: DANGER, typosquat: HIGH, dependency_confusion: HIGH,
    compromised: DANGER, vulnerable: MEDIUM, deprecated: MUTED
  };
  const color = map[type?.toLowerCase()] || CYAN;
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize"
      style={{ color, background: `${color}15` }}>
      {(type || "—").replace(/_/g, " ")}
    </span>
  );
}

export default function GDSSupplyChainPage() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["gds-supply-chain"],
    queryFn: () => base44.entities.SupplyChainEvent.list("-detected_at", 200).catch(() => []),
  });

  const critCount = events.filter(e => e.severity === "critical").length;
  const npmCount = events.filter(e => (e.registry || "").toLowerCase() === "npm").length;
  const pypiCount = events.filter(e => (e.registry || "").toLowerCase() === "pypi").length;
  const goCount = events.filter(e => (e.registry || "").toLowerCase() === "go").length;

  // Group by date for area chart
  const byDate = events.reduce((acc, e) => {
    const date = e.detected_at ? format(parseISO(e.detected_at), "MMM dd") : "Unknown";
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});
  const chartData = Object.entries(byDate).slice(-14).map(([date, count]) => ({ date, count }));

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Supply Chain" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Supply Chain Security</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Malicious packages, typosquats, and dependency compromises</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Total Events" value={events.length} color={CYAN} icon={Package} />
        <KpiCard label="Critical" value={critCount} color={DANGER} icon={AlertTriangle} pulse />
        <KpiCard label="npm" value={npmCount} color="#cb3837" icon={Package} />
        <KpiCard label="PyPI" value={pypiCount} color="#3776ab" icon={Package} />
        <KpiCard label="Go" value={goCount} color="#00add8" icon={Globe} />
      </div>

      {/* Trend Chart */}
      {chartData.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Events Over Time (Last 14 days)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ left: -20 }}>
              <defs>
                <linearGradient id="scGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CYAN} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CYAN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 10 }} />
              <YAxis tick={{ fill: MUTED, fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="count" stroke={CYAN} fill="url(#scGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Events */}
      {isLoading ? <Skeleton lines={5} /> : events.length === 0
        ? <EmptyState icon={Package} title="No supply chain events detected" description="GDS is monitoring your package ecosystem for malicious activity" />
        : (
          <div className="space-y-3">
            {events.slice(0, 50).map((e, i) => (
              <div key={e.id || i} className="p-4 rounded-2xl"
                style={{ background: CARD, border: `1px solid ${SEV_COLOR[e.severity] || BORDER}30`, borderLeft: `3px solid ${SEV_COLOR[e.severity] || BORDER}` }}>
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-bold text-white">{e.package_name}</span>
                      {e.version && <span className="text-xs font-mono" style={{ color: MUTED }}>v{e.version}</span>}
                      <RegistryBadge registry={e.registry} />
                      <EventTypeBadge type={e.event_type} />
                      <SevBadge sev={e.severity} />
                    </div>
                    <p className="text-xs text-slate-300">{e.description}</p>
                    {e.install_command && (
                      <code className="block mt-2 text-[10px] px-3 py-1.5 rounded-lg font-mono"
                        style={{ background: "rgba(0,0,0,0.3)", color: LOW, border: `1px solid ${BORDER}` }}>
                        {e.install_command}
                      </code>
                    )}
                  </div>
                  <span className="text-[10px] flex-shrink-0" style={{ color: MUTED }}>{timeAgo(e.detected_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}