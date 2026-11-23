import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MapPin, AlertTriangle, Search, Filter, TrendingUp, DollarSign, Clock, User, Building, Shield, FileText, Activity } from "lucide-react";
import { Card, Breadcrumb, Skeleton, EmptyState, timeAgo, SevBadge } from "@/components/gds/GDSOSShared";
import { FINBreadcrumb, FINBanner, FINBadge, FIN_PAGE_BG, FIN_CARD, FIN_GOLD, FIN_GREEN, FIN_RED, FIN_ORANGE, BORDER, MUTED, TEXT, FRAUD_TYPE_COLORS } from "@/components/gds/FinancialSecurityShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";

const formatCurrency = (n) => `$${(n || 0).toLocaleString()}`;

export default function GDSFinancialOverviewPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const { data: fraudAlerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ["fin-fraud-alerts-overview"],
    queryFn: () => base44.entities.FraudAlert.filter({ status: { $in: ["new", "investigating", "pending_review"] } }, "-detected_at", 200).catch(() => [])
  });

  const { data: fraudCases = [], isLoading: casesLoading } = useQuery({
    queryKey: ["fin-fraud-cases-active"],
    queryFn: () => base44.entities.FraudCase.filter({ status: { $in: ["open", "investigating", "pending_review"] } }, "-detected_at", 200).catch(() => [])
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["fin-suspicious-transactions"],
    queryFn: () => base44.entities.SuspiciousTransaction.filter({ status: "flagged" }, "-flagged_at", 100).catch(() => [])
  });

  // Filter alerts
  const filteredAlerts = fraudAlerts.filter(alert => {
    const matchesSearch = !searchTerm || 
      (alert.alert_ref && alert.alert_ref.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (alert.customer_id && alert.customer_id.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSeverity = filterSeverity === "all" || alert.severity === filterSeverity;
    const matchesType = filterType === "all" || alert.fraud_type === filterType;
    return matchesSearch && matchesSeverity && matchesType;
  });

  const stats = {
    totalAlerts: fraudAlerts.length,
    critical: fraudAlerts.filter(a => a.severity === "critical").length,
    high: fraudAlerts.filter(a => a.severity === "high").length,
    totalAmount: fraudAlerts.reduce((s, a) => s + (a.amount_usd || 0), 0),
    openCases: fraudCases.length,
    suspiciousTx: transactions.length,
  };

  return (
    <div style={FIN_PAGE_BG}>
      <FINBreadcrumb items={[{ label: "Overview" }]} />
      <FINBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">FINANCIAL SECURITY OPERATIONS</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-003 · Fraud Detection & Prevention</p>
        </div>
        <LiveDataBadge />
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <Card className="p-4 text-center" style={FIN_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Alerts</p>
          <p className="text-3xl font-black text-white">{stats.totalAlerts}</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid ${FIN_RED}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Critical</p>
          <p className="text-3xl font-black text-red-400">{stats.critical}</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid ${FIN_ORANGE}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>High Severity</p>
          <p className="text-3xl font-black" style={{ color: FIN_ORANGE }}>{stats.high}</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid ${FIN_RED}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Amount at Risk</p>
          <p className="text-2xl font-black text-red-400">{formatCurrency(stats.totalAmount)}</p>
        </Card>
        <Card className="p-4 text-center" style={FIN_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Open Cases</p>
          <p className="text-3xl font-black text-white">{stats.openCases}</p>
        </Card>
        <Card className="p-4 text-center" style={FIN_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Flagged Tx</p>
          <p className="text-3xl font-black" style={{ color: FIN_GOLD }}>{stats.suspiciousTx}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LIVE FRAUD ALERTS MAP */}
        <Card className="p-5" style={FIN_CARD}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4" style={{ color: FIN_GOLD }} />
              Live Fraud Alerts Map
            </h3>
            <span className="text-[10px]" style={{ color: MUTED }}>{filteredAlerts.length} active alerts</span>
          </div>
          
          <div className="relative rounded-xl overflow-hidden" style={{ height: "400px", background: "rgba(0,0,0,0.3)" }}>
            {/* Mock map background */}
            <div className="absolute inset-0" style={{ 
              background: "radial-gradient(circle at 30% 40%, rgba(201,168,76,0.05) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(16,185,129,0.05) 0%, transparent 50%)",
              border: `1px solid ${BORDER}`
            }} />
            
            {/* Alert points */}
            {filteredAlerts.slice(0, 30).map((alert, i) => {
              const top = 20 + (i * 37) % 60;
              const left = 15 + (i * 53) % 70;
              const color = alert.severity === "critical" ? FIN_RED : alert.severity === "high" ? FIN_ORANGE : FIN_GREEN;
              return (
                <div key={alert.id || i} className="absolute group cursor-pointer" style={{ top: `${top}%`, left: `${left}%` }}>
                  <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: color, boxShadow: `0 0 12px ${color}80` }} />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10"
                    style={{ background: "rgba(10,22,40,0.95)", border: `1px solid ${color}40`, backdropFilter: "blur(8px)" }}>
                    <p className="text-[9px] font-bold text-white">{alert.alert_ref}</p>
                    <p className="text-[8px]" style={{ color: MUTED }}>{formatCurrency(alert.amount_usd)} · {alert.fraud_type}</p>
                  </div>
                </div>
              );
            })}

            {/* Map legend */}
            <div className="absolute bottom-3 left-3 flex gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: FIN_RED }} />
                <span className="text-[9px]" style={{ color: MUTED }}>Critical</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: FIN_ORANGE }} />
                <span className="text-[9px]" style={{ color: MUTED }}>High</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: FIN_GREEN }} />
                <span className="text-[9px]" style={{ color: MUTED }}>Medium</span>
              </div>
            </div>
          </div>
        </Card>

        {/* ACTIVE CASES NEEDING INVESTIGATION */}
        <Card className="p-5" style={FIN_CARD}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: FIN_GOLD }} />
              Active Cases Needing Investigation
            </h3>
            <span className="text-[10px]" style={{ color: MUTED }}>{fraudCases.length} open</span>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {fraudCases.length === 0 ? (
              <EmptyState icon={Shield} title="All Clear" description="No active cases requiring investigation" />
            ) : (
              fraudCases.slice(0, 15).map((c, i) => (
                <div key={c.id} className="p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <FINBadge color={FRAUD_TYPE_COLORS[c.fraud_type] || FIN_GOLD}>{c.fraud_type || "unknown"}</FINBadge>
                        <SevBadge sev={c.severity} />
                      </div>
                      <p className="text-xs font-bold text-white">{c.case_ref}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-red-400">{formatCurrency(c.amount_at_risk_usd)}</p>
                      <p className="text-[9px]" style={{ color: MUTED }}>at risk</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3" style={{ color: MUTED }} />
                      <span className="text-[9px]" style={{ color: MUTED }}>{c.customer_id || "Unknown"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" style={{ color: MUTED }} />
                      <span className="text-[9px]" style={{ color: MUTED }}>{timeAgo(c.detected_at)}</span>
                    </div>
                    <FINBadge color={c.status === "investigating" ? FIN_ORANGE : c.status === "pending_review" ? FIN_GOLD : FIN_GREEN}>
                      {c.status || "open"}
                    </FINBadge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* FILTERS & CONTROLS */}
      <div className="flex items-center gap-3 mt-6 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: MUTED }} />
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search alerts by ref or customer..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none transition-all"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
        </div>
        <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm outline-none"
          style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm outline-none"
          style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
          <option value="all">All Types</option>
          {Array.from(new Set(fraudAlerts.map(a => a.fraud_type))).filter(Boolean).map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* ALERTS TABLE */}
      <Card className="p-5" style={FIN_CARD}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4" style={{ color: FIN_GOLD }} />
            Live Fraud Alerts
          </h3>
          <span className="text-[10px]" style={{ color: MUTED }}>{filteredAlerts.length} shown</span>
        </div>

        {alertsLoading ? (
          <Skeleton lines={8} />
        ) : filteredAlerts.length === 0 ? (
          <EmptyState icon={Shield} title="No Alerts" description="No fraud alerts match your filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                  <th className="pb-3">Alert Ref</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Severity</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Confidence</th>
                  <th className="pb-3">Detected</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="text-[11px]">
                {filteredAlerts.slice(0, 50).map(a => (
                  <tr key={a.id} className="border-t hover:bg-white/5 transition-colors" style={{ borderColor: BORDER }}>
                    <td className="py-3 font-mono" style={{ color: FIN_GOLD }}>{a.alert_ref}</td>
                    <td className="py-3"><FINBadge color={FRAUD_TYPE_COLORS[a.fraud_type] || FIN_GOLD}>{a.fraud_type || "unknown"}</FINBadge></td>
                    <td className="py-3"><SevBadge sev={a.severity} /></td>
                    <td className="py-3 font-bold text-red-400">{formatCurrency(a.amount_usd)}</td>
                    <td className="py-3 text-white">{a.customer_id || "—"}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-white/10">
                          <div className="h-full rounded-full" style={{ width: `${a.confidence_pct || 0}%`, background: (a.confidence_pct || 0) > 80 ? FIN_GREEN : (a.confidence_pct || 0) > 50 ? FIN_ORANGE : FIN_RED }} />
                        </div>
                        <span className="text-[9px]" style={{ color: MUTED }}>{a.confidence_pct || 0}%</span>
                      </div>
                    </td>
                    <td className="py-3" style={{ color: MUTED }}>{timeAgo(a.detected_at)}</td>
                    <td className="py-3"><FINBadge color={a.status === "investigating" ? FIN_ORANGE : a.status === "pending_review" ? FIN_GOLD : FIN_GREEN}>{a.status || "new"}</FINBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}