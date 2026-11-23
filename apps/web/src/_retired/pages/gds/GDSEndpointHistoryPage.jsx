import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  History, AlertTriangle, Shield, CheckCircle, Clock, Filter, Search,
  TrendingUp, ArrowRight, Eye, Calendar, Activity
} from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Card, Breadcrumb, timeAgo, SevBadge, StatusBadge
} from "@/components/gds/GDSOSShared";

export default function GDSEndpointHistoryPage() {
  const [search, setSearch] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedMethod, setSelectedMethod] = useState("all");

  const { data: endpoints = [], isLoading } = useQuery({
    queryKey: ["web-endpoints-history"],
    queryFn: () => base44.entities.WebEndpoint.list("-last_tested", 500).catch(() => []),
  });

  const { data: findings = [] } = useQuery({
    queryKey: ["dast-findings-history"],
    queryFn: () => base44.entities.DASTFinding.list("-detected_at", 1000).catch(() => []),
  });

  // Group findings by endpoint
  const endpointHistory = endpoints.map(endpoint => {
    const endpointFindings = findings.filter(f => 
      f.url?.includes(endpoint.url) || f.endpoint_url === endpoint.url
    ).sort((a, b) => new Date(b.detected_at) - new Date(a.detected_at));

    const latestFinding = endpointFindings[0];
    const statusChanges = endpointFindings.map(f => ({
      date: f.detected_at,
      status: f.status,
      severity: f.severity,
      title: f.title
    }));

    return {
      ...endpoint,
      findings: endpointFindings,
      latestFinding,
      statusChanges,
      totalFindings: endpointFindings.length,
      criticalFindings: endpointFindings.filter(f => f.severity === 'critical').length,
      openFindings: endpointFindings.filter(f => f.status === 'open').length,
    };
  }).filter(ep => {
    const matchesSearch = search === "" || 
      ep.url.toLowerCase().includes(search.toLowerCase()) ||
      ep.app_name?.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = selectedSeverity === "all" || 
      ep.criticalFindings > 0 && selectedSeverity === "critical" ||
      ep.findings.some(f => f.severity === selectedSeverity);
    const matchesStatus = selectedStatus === "all" || 
      (selectedStatus === "has-findings" && ep.totalFindings > 0) ||
      (selectedStatus === "clean" && ep.totalFindings === 0);
    const matchesMethod = selectedMethod === "all" || ep.method === selectedMethod;
    
    return matchesSearch && matchesSeverity && matchesStatus && matchesMethod;
  });

  const stats = {
    total: endpoints.length,
    withFindings: endpointHistory.filter(ep => ep.totalFindings > 0).length,
    critical: endpointHistory.filter(ep => ep.criticalFindings > 0).length,
    clean: endpointHistory.filter(ep => ep.totalFindings === 0).length,
  };

  const methods = [...new Set(endpoints.map(ep => ep.method))].filter(Boolean);

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[
        { label: "Web Security", path: "/web" },
        { label: "Endpoint History" }
      ]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40` }}>
            <History className="w-6 h-6" style={{ color: CYAN }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Endpoint History Log</h1>
            <p className="text-sm mt-0.5" style={{ color: MUTED }}>Track vulnerability lifecycle across all web endpoints</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Endpoints</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${HIGH}08`, border: `1px solid ${HIGH}30` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>With Findings</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{stats.withFindings}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}30` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Critical Risk</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{stats.critical}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${LOW}08`, border: `1px solid ${LOW}30` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Clean</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{stats.clean}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search endpoints, apps..."
              className="w-full pl-10 pr-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
            />
          </div>
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          >
            <option value="all">All Methods</option>
            {methods.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          >
            <option value="all">All Status</option>
            <option value="has-findings">Has Findings</option>
            <option value="clean">Clean</option>
          </select>
        </div>
      </Card>

      {/* Endpoint History Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />
          ))}
        </div>
      ) : endpointHistory.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <History className="w-12 h-12 mx-auto mb-4" style={{ color: MUTED }} />
            <p className="text-sm font-bold" style={{ color: MUTED }}>No endpoint history found</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {endpointHistory.map(endpoint => (
            <Card key={endpoint.id} className="p-5" style={{ border: `1px solid ${endpoint.criticalFindings > 0 ? DANGER + "30" : BORDER}` }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      endpoint.method === 'GET' ? 'bg-blue-500/15 text-blue-400' :
                      endpoint.method === 'POST' ? 'bg-green-500/15 text-green-400' :
                      endpoint.method === 'DELETE' ? 'bg-red-500/15 text-red-400' :
                      'bg-yellow-500/15 text-yellow-400'
                    }`}>
                      {endpoint.method}
                    </span>
                    <code className="text-sm font-bold text-white">{endpoint.url}</code>
                    {endpoint.is_admin && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${DANGER}15`, color: DANGER }}>
                        ADMIN
                      </span>
                    )}
                    {endpoint.requires_auth && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${LOW}15`, color: LOW }}>
                        AUTH REQUIRED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs" style={{ color: MUTED }}>
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      {endpoint.app_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Last scanned: {timeAgo(endpoint.last_tested)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Risk Score: {endpoint.risk_score || 0}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-bold" style={{ color: MUTED }}>FINDINGS</span>
                    <span className="text-lg font-black" style={{ color: endpoint.totalFindings > 0 ? HIGH : LOW }}>
                      {endpoint.totalFindings}
                    </span>
                  </div>
                  {endpoint.criticalFindings > 0 && (
                    <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: `${DANGER}15`, color: DANGER }}>
                      {endpoint.criticalFindings} Critical
                    </span>
                  )}
                </div>
              </div>

              {/* Findings Timeline */}
              {endpoint.findings.length > 0 && (
                <div className="border-t pt-4" style={{ borderColor: BORDER }}>
                  <p className="text-xs font-bold mb-3" style={{ color: MUTED }}>LATEST FINDINGS</p>
                  <div className="space-y-2">
                    {endpoint.findings.slice(0, 5).map((finding, idx) => (
                      <div key={finding.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                        <div className="flex items-center gap-3 flex-1">
                          <SevBadge sev={finding.severity} />
                          <StatusBadge status={finding.status} />
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-white">{finding.title}</p>
                            <p className="text-[10px]" style={{ color: MUTED }}>
                              {timeAgo(finding.detected_at)} • {finding.vulnerability_type || 'Vulnerability'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {finding.status === 'remediated' && (
                            <CheckCircle className="w-4 h-4" style={{ color: LOW }} />
                          )}
                          {finding.status === 'open' && (
                            <AlertTriangle className="w-4 h-4" style={{ color: HIGH }} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Status Changes Timeline */}
                  {endpoint.statusChanges.length > 1 && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: BORDER }}>
                      <p className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: MUTED }}>
                        <Clock className="w-3 h-3" />
                        LIFECYCLE TIMELINE
                      </p>
                      <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                        {endpoint.statusChanges.slice(0, 8).map((change, idx) => (
                          <React.Fragment key={idx}>
                            <div className="flex-shrink-0 text-center">
                              <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${
                                change.status === 'remediated' ? 'bg-green-400' :
                                change.status === 'in_progress' ? 'bg-yellow-400' :
                                'bg-red-400'
                              }`} />
                              <p className="text-[8px] font-bold" style={{ color: MUTED }}>{change.status}</p>
                              <p className="text-[7px]" style={{ color: MUTED }}>{timeAgo(change.date)}</p>
                            </div>
                            {idx < endpoint.statusChanges.length - 1 && (
                              <ArrowRight className="w-3 h-3 flex-shrink-0" style={{ color: BORDER }} />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {endpoint.findings.length === 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: `${LOW}05`, border: `1px solid ${LOW}20` }}>
                  <CheckCircle className="w-4 h-4" style={{ color: LOW }} />
                  <p className="text-xs" style={{ color: LOW }}>No security findings detected — endpoint is clean</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}