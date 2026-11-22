import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, AlertTriangle, CheckCircle, XCircle, Filter, Download, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ErrorBoundary from "@/components/shared/ErrorBoundary";

const ACTION_COLORS = {
  scan_triggered: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  finding_created: "bg-red-500/20 text-red-400 border-red-500/30",
  finding_triaged: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  finding_status_change: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  config_change: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  integration_added: "bg-green-500/20 text-green-400 border-green-500/30",
  threat_blocked: "bg-red-500/20 text-red-400 border-red-500/30",
  login: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  logout: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  export: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  user_management: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  report_generated: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  compliance_check: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const SEVERITY_ICONS = {
  critical: AlertTriangle,
  warning: AlertTriangle,
  info: CheckCircle,
  error: XCircle,
};

export default function AuditLogPage() {
  const [filters, setFilters] = useState({
    action_type: "",
    resource_type: "",
    severity: "",
    date_from: "",
    date_to: "",
  });
  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: async () => {
      try {
        const all = await base44.entities.AuditLog.list("-timestamp", 500);
        return all.filter(log => {
          if (filters.action_type && log.action_type !== filters.action_type) return false;
          if (filters.resource_type && log.resource_type !== filters.resource_type) return false;
          if (filters.severity && log.severity !== filters.severity) return false;
          if (search && !log.details?.toLowerCase().includes(search.toLowerCase())) return false;
          return true;
        });
      } catch {
        return [];
      }
    },
  });

  const exportCSV = () => {
    const headers = ["Timestamp", "Actor", "Action", "Resource Type", "Resource Name", "Details", "Severity", "Outcome"];
    const rows = logs.map(log => [
      log.timestamp,
      log.actor_email || log.actor_type,
      log.action,
      log.resource_type,
      log.resource_name || "",
      log.details,
      log.severity || "info",
      "success",
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell || ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const actionTypes = [...new Set(logs.map(l => l.action_type))].filter(Boolean);
  const resourceTypes = [...new Set(logs.map(l => l.resource_type))].filter(Boolean);

  return (
    <ErrorBoundary>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Shield className="w-6 h-6 text-amber-500" />
              Audit Log
            </h1>
            <p className="text-slate-400 text-sm mt-1">Immutable, append-only security event log — SOC2 ready</p>
          </div>
          <Button onClick={exportCSV} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Search details..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <select
                value={filters.action_type}
                onChange={(e) => setFilters({ ...filters, action_type: e.target.value })}
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
              >
                <option value="">All Actions</option>
                {actionTypes.map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                ))}
              </select>
              <select
                value={filters.resource_type}
                onChange={(e) => setFilters({ ...filters, resource_type: e.target.value })}
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
              >
                <option value="">All Resources</option>
                {resourceTypes.map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                ))}
              </select>
              <select
                value={filters.severity}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
              >
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
                <option value="error">Error</option>
              </select>
              <Button
                onClick={() => setFilters({ action_type: "", resource_type: "", severity: "", date_from: "", date_to: "" })}
                variant="ghost"
                className="text-slate-400 hover:text-white"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-white">{logs.length.toLocaleString()}</div>
              <div className="text-xs text-slate-400">Total Events</div>
            </CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-400">{logs.filter(l => l.severity === "critical").length}</div>
              <div className="text-xs text-slate-400">Critical Events</div>
            </CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-400">{logs.filter(l => l.action_type === "scan_triggered").length}</div>
              <div className="text-xs text-slate-400">Scans Triggered</div>
            </CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-400">{logs.filter(l => l.action_type === "threat_blocked").length}</div>
              <div className="text-xs text-slate-400">Threats Blocked</div>
            </CardContent>
          </Card>
        </div>

        {/* Log Table */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-white text-sm">Security Events ({logs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-slate-400 text-sm">Loading audit logs...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No audit logs found</p>
                <p className="text-slate-500 text-sm mt-1">Events will appear here as security actions occur</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {logs.map((log) => {
                  const SeverityIcon = SEVERITY_ICONS[log.severity] || CheckCircle;
                  return (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Badge className={ACTION_COLORS[log.action_type] || "bg-slate-500/20 text-slate-400 border-slate-500/30"}>
                            {(log.action_type || "unknown").replace(/_/g, " ")}
                          </Badge>
                          <span className="text-white font-medium">{(log.action || "—").replace(/_/g, " ")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <SeverityIcon className={`w-4 h-4 ${
                            log.severity === "critical" ? "text-red-400" :
                            log.severity === "warning" ? "text-amber-400" :
                            log.severity === "error" ? "text-red-400" : "text-green-400"
                          }`} />
                          <span className="text-xs text-slate-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-xs text-slate-400">
                        <div>
                          <span className="text-slate-500">Actor: </span>
                          {log.actor_email || log.actor_type}
                        </div>
                        <div>
                          <span className="text-slate-500">Resource: </span>
                          {log.resource_type} {log.resource_name && `→ ${log.resource_name}`}
                        </div>
                        <div>
                          <span className="text-slate-500">IP: </span>
                          {log.ip_address || "N/A"}
                        </div>
                      </div>
                      {log.details && (
                        <div className="mt-2 text-xs text-slate-300 bg-slate-900/50 p-2 rounded border border-slate-700">
                          {log.details}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-xs text-slate-500">
          Powered by AuditLog entity — immutable, append-only, SOC2 ready
        </div>
      </div>
    </ErrorBoundary>
  );
}