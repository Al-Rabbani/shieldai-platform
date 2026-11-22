import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { 
  Shield, GitBranch, Package, Key, Cloud, Monitor, 
  ScanSearch, Target, Bug, FileCode, Filter, Download,
  CheckCircle, Clock, AlertTriangle, XCircle, MessageSquare,
  ChevronRight, ChevronDown, ExternalLink, Zap, Calendar,
  Users, TrendingUp, ArrowRight, Search, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import SeverityBadge from "@/components/shared/SeverityBadge";
import StatusBadge from "@/components/shared/StatusBadge";

const SCANNER_ICONS = {
  sast: FileCode,
  sca: Package,
  secrets: Key,
  iac: GitBranch,
  cloud: Cloud,
  container: Monitor,
  vm: Monitor,
  dast: ScanSearch,
  pentest: Target,
  malware: Bug,
};

const SCANNER_COLORS = {
  sast: "#3b82f6",
  sca: "#f97316",
  secrets: "#ef4444",
  iac: "#8b5cf6",
  cloud: "#0ea5e9",
  container: "#10b981",
  vm: "#64748b",
  dast: "#eab308",
  pentest: "#ef4444",
  malware: "#dc2626",
};

const TEAM_COLORS = {
  Backend: "#3b82f6",
  Frontend: "#8b5cf6",
  DevOps: "#f97316",
  "ML Platform": "#ec4899",
  Security: "#10b981",
  Platform: "#06b6d4",
};

export default function Feed() {
  const [viewMode, setViewMode] = useState("focus"); // focus | all
  const [activeTab, setActiveTab] = useState("open"); // open | snoozed | ignored | resolved
  const [selectedFindings, setSelectedFindings] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState([]);
  const [filters, setFilters] = useState({
    type: "all",
    severity: "all",
    team: "all",
    sla: "all",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [detailFinding, setDetailFinding] = useState(null);

  // Fetch all finding types
  const { data: sastFindings = [] } = useQuery({
    queryKey: ["feed-sast"],
    queryFn: () => base44.entities.SASTFinding.list("-detected_at", 500),
    initialData: [],
  });
  const { data: scaFindings = [] } = useQuery({
    queryKey: ["feed-sca"],
    queryFn: () => base44.entities.RealSCAFinding.list("-created_date", 500),
    initialData: [],
  });
  const { data: secretFindings = [] } = useQuery({
    queryKey: ["feed-secrets"],
    queryFn: () => base44.entities.RealSecretFinding.list("-detected_at", 500),
    initialData: [],
  });
  const { data: triagedFindings = [] } = useQuery({
    queryKey: ["feed-triaged"],
    queryFn: () => base44.entities.TriagedFinding.list("-detected_at", 500),
    initialData: [],
  });

  // Normalize all findings to unified format
  const allFindings = useMemo(() => {
    const normalize = (findings, type) => findings.map(f => ({
      id: f.id,
      title: f.title || "Untitled",
      severity: f.severity || "medium",
      status: f.status || "open",
      type,
      scanner: type,
      asset: f.repo_name || f.asset_name || "Unknown",
      team: "Backend",
      detected_at: f.detected_at || f.created_date,
      autofix_available: f.autofix_available || false,
      jira_ticket: f.jira_ticket || null,
      sla_breached: f.sla_breached || false,
      sla_deadline: f.sla_deadline || null,
      raw: f,
    })).filter(f => f.title); // Filter out any findings without titles

    return [
      ...normalize(sastFindings, "sast"),
      ...normalize(scaFindings, "sca"),
      ...normalize(secretFindings, "secrets"),
      ...normalize(triagedFindings, "triaged"),
    ];
  }, [sastFindings, scaFindings, secretFindings, triagedFindings]);

  // Filter findings
  const filteredFindings = useMemo(() => {
    return allFindings.filter(f => {
      // Tab filter
      if (activeTab === "open" && !["open", "verified"].includes(f.status)) return false;
      if (activeTab === "snoozed" && f.status !== "snoozed") return false;
      if (activeTab === "ignored" && f.status !== "ignored") return false;
      if (activeTab === "resolved" && !["fixed", "resolved"].includes(f.status)) return false;

      // Focus mode filter
      if (viewMode === "focus") {
        if (["snoozed", "ignored", "false_positive"].includes(f.status)) return false;
      }

      // Type filter
      if (filters.type !== "all" && f.type !== filters.type) return false;

      // Severity filter
      if (filters.severity !== "all" && f.severity !== filters.severity) return false;

      // Team filter
      if (filters.team !== "all" && f.team !== filters.team) return false;

      // SLA filter
      if (filters.sla === "breached" && !f.sla_breached) return false;
      if (filters.sla === "week" && f.sla_deadline) {
        const deadline = new Date(f.sla_deadline);
        const weekFromNow = new Date(Date.now() + 7 * 86400000);
        if (deadline > weekFromNow) return false;
      }

      // Search
      if (searchQuery && !(f.title || "").toLowerCase().includes(searchQuery.toLowerCase())) return false;

      return true;
    });
  }, [allFindings, viewMode, activeTab, filters, searchQuery]);

  // Group related findings
  const groupedFindings = useMemo(() => {
    const groups = {};
    filteredFindings.forEach(f => {
      const key = (f.title || "").toLowerCase().replace(/[^a-z0-9]/g, "-");
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    });
    return Object.entries(groups).map(([key, findings]) => ({
      key,
      title: findings[0].title || "Untitled",
      findings,
      scannerCount: findings.length,
    }));
  }, [filteredFindings]);

  // Team stats
  const teamStats = useMemo(() => {
    const stats = {};
    allFindings.forEach(f => {
      const team = f.team || "Unassigned";
      if (!stats[team]) stats[team] = 0;
      stats[team]++;
    });
    return stats;
  }, [allFindings]);

  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: ({ id, type, status }) => {
      return base44.entities[type === "sast" ? "SASTFinding" : type === "sca" ? "RealSCAFinding" : "RealSecretFinding"].update(id, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const getStatusBadge = (finding) => {
    const age = new Date(finding.detected_at);
    const daysOld = Math.floor((Date.now() - age) / 86400000);
    
    if (daysOld < 7 && finding.status === "open") {
      return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">🆕 NEW</span>;
    }
    if (finding.jira_ticket) {
      return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">🎫 {finding.jira_ticket}</span>;
    }
    if (finding.autofix_available) {
      return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-green-500/10 text-green-400 border border-green-500/20">🔀 PR OPEN</span>;
    }
    return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">📋 TO DO</span>;
  };

  const toggleGroup = (key) => {
    setExpandedGroups(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleSelect = (id) => {
    setSelectedFindings(prev =>
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-[#030712] p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white font-heading">Security Feed</h1>
        <p className="text-sm text-slate-500 mt-1">Every finding from every scanner — deduplicated, triaged, and ready to act on.</p>
      </div>

      {/* Focus/All Toggle */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setViewMode("focus")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            viewMode === "focus"
              ? "bg-blue-500 text-white"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          )}
        >
          Focus
        </button>
        <button
          onClick={() => setViewMode("all")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            viewMode === "all"
              ? "bg-blue-500 text-white"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          )}
        >
          All
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-500">{filteredFindings.length} findings</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4 border-b border-slate-800">
        {[
          { id: "open", label: "Open", count: allFindings.filter(f => ["open", "verified"].includes(f.status)).length },
          { id: "snoozed", label: "Snoozed", count: allFindings.filter(f => f.status === "snoozed").length },
          { id: "ignored", label: "Ignored", count: allFindings.filter(f => f.status === "ignored").length },
          { id: "resolved", label: "Resolved", count: allFindings.filter(f => ["fixed", "resolved"].includes(f.status)).length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2",
              activeTab === tab.id
                ? "text-white border-blue-500"
                : "text-slate-500 border-transparent hover:text-slate-300"
            )}
          >
            {tab.label} {tab.count > 0 && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-800">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300"
          >
            <option value="all">All Types</option>
            <option value="sast">SAST</option>
            <option value="sca">SCA</option>
            <option value="secrets">Secrets</option>
            <option value="triaged">Triaged</option>
          </select>
        </div>

        <select
          value={filters.severity}
          onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={filters.team}
          onChange={(e) => setFilters(prev => ({ ...prev, team: e.target.value }))}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300"
        >
          <option value="all">All Teams</option>
          {Object.entries(teamStats).map(([team, count]) => (
            <option key={team} value={team || "Unassigned"}>{team || "Unassigned"} ({count})</option>
          ))}
        </select>

        <select
          value={filters.sla}
          onChange={(e) => setFilters(prev => ({ ...prev, sla: e.target.value }))}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300"
        >
          <option value="all">All SLA</option>
          <option value="breached">Out of SLA</option>
          <option value="week">Due this week</option>
        </select>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search findings..."
              className="pl-9 pr-4 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-700">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs text-slate-500">Quick views:</span>
        <button className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">
          🔴 Out of SLA
        </button>
        <button className="px-3 py-1.5 text-xs rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20">
          ⚡ Exploited in Wild
        </button>
        <button className="px-3 py-1.5 text-xs rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20">
          🔧 AutoFix Available
        </button>
        <button className="px-3 py-1.5 text-xs rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20">
          🆕 New this week
        </button>
      </div>

      {/* Findings Table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-900/50">
            <tr className="text-xs text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={selectedFindings.length > 0 && filteredFindings.length > 0}
                  onChange={(e) => setSelectedFindings(e.target.checked ? filteredFindings.map(f => f.id) : [])}
                  className="rounded border-slate-700 bg-slate-800"
                />
              </th>
              <th className="px-4 py-3 text-left">Severity</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Finding</th>
              <th className="px-4 py-3 text-left">Scanner</th>
              <th className="px-4 py-3 text-left">Asset</th>
              <th className="px-4 py-3 text-left">Age</th>
              <th className="px-4 py-3 text-left">Team</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {groupedFindings.map((group) => (
              <React.Fragment key={group.key}>
                <tr
                  className={cn(
                    "hover:bg-slate-800/30 cursor-pointer transition-colors",
                    expandedGroups.includes(group.key) && "bg-slate-800/20"
                  )}
                  onClick={() => toggleGroup(group.key)}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={group.findings.every(f => selectedFindings.includes(f.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFindings(prev => [...prev, ...group.findings.map(f => f.id)]);
                        } else {
                          setSelectedFindings(prev => prev.filter(id => !group.findings.some(f => f.id === id)));
                        }
                      }}
                      className="rounded border-slate-700 bg-slate-800"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <SeverityBadge severity={group.findings[0].severity} />
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(group.findings[0])}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-slate-500 transition-transform",
                          expandedGroups.includes(group.key) && "rotate-180"
                        )}
                      />
                      <span className="text-sm text-white font-medium">{group.title}</span>
                      {group.scannerCount > 1 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {group.scannerCount} scanners
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {group.findings.map((f, i) => {
                        const Icon = SCANNER_ICONS[f.scanner] || Shield;
                        const color = SCANNER_COLORS[f.scanner];
                        return (
                          <div
                            key={i}
                            className="w-6 h-6 rounded flex items-center justify-center"
                            style={{ background: `${color}20`, border: `1px solid ${color}40` }}
                            title={f.scanner}
                          >
                            <Icon className="w-3 h-3" style={{ color }} />
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-300">{group.findings[0].asset}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-500">
                      {Math.floor((Date.now() - new Date(group.findings[0].detected_at)) / 86400000)}d
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded"
                      style={{
                        background: `${TEAM_COLORS[group.findings[0].team] || "#475569"}20`,
                        color: TEAM_COLORS[group.findings[0].team] || "#94a3b8",
                      }}
                    >
                      {group.findings[0].team}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailFinding(group.findings[0]);
                      }}
                      className="text-xs text-blue-400 hover:underline flex items-center gap-1 justify-end"
                    >
                      Details <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
                {expandedGroups.includes(group.key) && (
                  <tr className="bg-slate-900/30">
                    <td colSpan={9} className="px-4 py-4">
                      <div className="ml-8 space-y-2">
                        <p className="text-xs text-slate-500 mb-2">Detected by {group.scannerCount} scanners:</p>
                        {group.findings.map((f, i) => {
                          const Icon = SCANNER_ICONS[f.scanner] || Shield;
                          const color = SCANNER_COLORS[f.scanner];
                          return (
                            <div key={i} className="flex items-center gap-3 text-sm">
                              <Icon className="w-4 h-4" style={{ color }} />
                              <span className="text-slate-300">{f.scanner.toUpperCase()} finding</span>
                              <span className="text-xs text-slate-500">• {f.asset}</span>
                              <button
                                onClick={() => setDetailFinding(f)}
                                className="text-xs text-blue-400 hover:underline ml-auto"
                              >
                                View details
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk Actions Bar */}
      {selectedFindings.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-4 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-white">{selectedFindings.length} selected</span>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600">
                AutoFix Selected
              </button>
              <button className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700">
                Snooze Selected
              </button>
              <button className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700">
                Ignore Selected
              </button>
              <button className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700">
                Create Task
              </button>
            </div>
            <button
              onClick={() => setSelectedFindings([])}
              className="text-sm text-slate-400 hover:text-slate-300"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {detailFinding && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDetailFinding(null)} />
          <div className="relative w-[480px] bg-[#0a0f1e] border-l border-slate-800 h-full overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <SeverityBadge severity={detailFinding.severity} />
                  <h2 className="text-lg font-bold text-white mt-3">{detailFinding.title}</h2>
                  <p className="text-sm text-slate-500 mt-1">{detailFinding.asset}</p>
                </div>
                <button onClick={() => setDetailFinding(null)} className="text-slate-500 hover:text-slate-300">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Group Actions */}
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button className="px-3 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/20">
                    Assign
                  </button>
                  <button className="px-3 py-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg text-sm hover:bg-purple-500/20">
                    Create Task
                  </button>
                  {detailFinding.autofix_available && (
                    <button className="px-3 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/20">
                      AutoFix
                    </button>
                  )}
                  <button className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-sm hover:bg-amber-500/20">
                    Snooze
                  </button>
                  <button className="px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/20">
                    Ignore
                  </button>
                  <button className="px-3 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-700">
                    Adjust Severity
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Scanner</h3>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = SCANNER_ICONS[detailFinding.scanner] || Shield;
                      const color = SCANNER_COLORS[detailFinding.scanner];
                      return (
                        <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
                          <Icon className="w-4 h-4" style={{ color }} />
                        </div>
                      );
                    })()}
                    <span className="text-sm text-white">{detailFinding.scanner.toUpperCase()}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Status</h3>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(detailFinding)}
                    {detailFinding.sla_breached && (
                      <span className="text-xs text-red-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> SLA Breached
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Detected</h3>
                  <p className="text-sm text-slate-300">
                    {new Date(detailFinding.detected_at).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Team</h3>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded"
                    style={{
                      background: `${TEAM_COLORS[detailFinding.team] || "#475569"}20`,
                      color: TEAM_COLORS[detailFinding.team] || "#94a3b8",
                    }}
                  >
                    {detailFinding.team}
                  </span>
                </div>

                <button className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 flex items-center justify-center gap-2">
                  Open Full Detail <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}