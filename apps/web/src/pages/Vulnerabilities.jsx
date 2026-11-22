import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import SeverityBadge from "@/components/shared/SeverityBadge";
import StatusBadge from "@/components/shared/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download, RefreshCw } from "lucide-react";

export default function Vulnerabilities() {
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: vulns = [], isLoading } = useQuery({
    queryKey: ["vulns"],
    queryFn: () => base44.entities.Vulnerability.list("-created_date", 200),
    initialData: [],
  });

  const filtered = vulns.filter((v) => {
    if (severityFilter !== "all" && v.severity !== severityFilter) return false;
    if (statusFilter !== "all" && v.status !== statusFilter) return false;
    if (search && !v.title?.toLowerCase().includes(search.toLowerCase()) && !v.cve_id?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    critical: vulns.filter(v => v.severity === "critical").length,
    high: vulns.filter(v => v.severity === "high").length,
    medium: vulns.filter(v => v.severity === "medium").length,
    low: vulns.filter(v => v.severity === "low").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Vulnerability Assessment</h1>
          <p className="text-sm text-muted-foreground mt-1">Automated scanning across cloud infrastructure, containers & AI dependencies</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
          <RefreshCw className="w-4 h-4" /> Run Scan
        </Button>
      </div>

      {/* Severity counters */}
      <div className="flex gap-3">
        {[
          { key: "critical", color: "border-red-500/40 bg-red-500/10" },
          { key: "high", color: "border-orange-500/40 bg-orange-500/10" },
          { key: "medium", color: "border-yellow-500/40 bg-yellow-500/10" },
          { key: "low", color: "border-blue-500/40 bg-blue-500/10" },
        ].map(({ key, color }) => (
          <button
            key={key}
            onClick={() => setSeverityFilter(severityFilter === key ? "all" : key)}
            className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
              severityFilter === key ? color + " ring-1 ring-primary/30" : "border-border bg-card hover:bg-accent"
            }`}
          >
            <span className="capitalize">{key}</span>
            <span className="ml-2 font-mono font-bold">{counts[key]}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or CVE ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-card border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="triaged">Triaged</SelectItem>
            <SelectItem value="in_remediation">In Remediation</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="accepted_risk">Accepted Risk</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="border-border">
          <Download className="w-4 h-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 border-border hover:bg-muted/50">
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase">CVE</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase">Title</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase">Severity</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase">CVSS</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase">Asset</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase">Status</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase">Assignee</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No vulnerabilities found</TableCell>
              </TableRow>
            ) : (
              filtered.map((v) => (
                <TableRow key={v.id} className="border-border hover:bg-accent/50 cursor-pointer transition-colors">
                  <TableCell className="font-mono text-xs text-primary">{v.cve_id || "—"}</TableCell>
                  <TableCell className="font-medium text-sm max-w-[280px] truncate">{v.title}</TableCell>
                  <TableCell><SeverityBadge severity={v.severity} /></TableCell>
                  <TableCell className="font-mono text-sm">{v.cvss_score?.toFixed(1) || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{v.asset_name || "—"}</TableCell>
                  <TableCell><StatusBadge status={v.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{v.assignee || "Unassigned"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}