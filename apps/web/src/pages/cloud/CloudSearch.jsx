import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, Filter, Cloud, Shield, AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const RESOURCE_TYPES = [
  "EC2", "S3", "RDS", "Lambda", "IAM", "VPC", "Security Group",
  "GKE", "AKS", "EKS", "Cloud Storage", "BigQuery", "VM Instance"
];

const PROVIDERS = [
  { name: "AWS", color: "#f97316" },
  { name: "Azure", color: "#0078d4" },
  { name: "GCP", color: "#4285f4" },
];

export default function CloudSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    provider: "all",
    resourceType: "all",
    region: "all",
    risk: "all",
    hasFindings: "all",
  });

  const { data: cloudAccounts = [] } = useQuery({
    queryKey: ["cloud-search-accounts"],
    queryFn: () => base44.entities.CloudAccount.list("-created_date", 500),
    initialData: [],
  });
  const { data: cloudFindings = [] } = useQuery({
    queryKey: ["cloud-search-findings"],
    queryFn: () => base44.entities.CloudFinding.list("-created_date", 500),
    initialData: [],
  });

  // Mock cloud resources (would come from actual cloud API)
  const mockResources = useMemo(() => {
    return cloudAccounts.map(acc => ({
      id: acc.id,
      name: acc.account_name || acc.account_id,
      type: "Account",
      provider: acc.provider || "AWS",
      region: acc.region || "us-east-1",
      account: acc.account_id,
      risk: acc.risk_score || "medium",
      tags: acc.tags || "",
      lastSeen: acc.last_synced_at || acc.created_date,
      findings: cloudFindings.filter(f => f.cloud_account_id === acc.id).length,
    }));
  }, [cloudAccounts, cloudFindings]);

  const filteredResources = useMemo(() => {
    return mockResources.filter(r => {
      // Search query
      if (searchQuery && !r.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !r.type.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !r.region.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Filters
      if (filters.provider !== "all" && r.provider !== filters.provider) return false;
      if (filters.resourceType !== "all" && r.type !== filters.resourceType) return false;
      if (filters.risk !== "all" && r.risk !== filters.risk) return false;
      if (filters.hasFindings === "yes" && r.findings === 0) return false;
      if (filters.hasFindings === "no" && r.findings > 0) return false;
      return true;
    });
  }, [mockResources, searchQuery, filters]);

  const quickViews = [
    { label: "🔴 Internet-facing", count: mockResources.filter(r => r.risk === "critical").length },
    { label: "⚠️ Critical findings", count: mockResources.filter(r => r.findings > 0 && r.risk === "critical").length },
    { label: "🪣 Unencrypted storage", count: 0 },
    { label: "🔑 Over-permissive IAM", count: 0 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-heading">Cloud Asset Inventory</h1>
        <p className="text-sm text-slate-500 mt-1">
          Search and explore every resource across all your connected cloud accounts.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search cloud resources — e.g. 'prod S3 buckets', 'EC2 us-east-1', 'unencrypted RDS'..."
          className="w-full pl-12 pr-4 py-3 rounded-xl text-sm"
          style={{ 
            background: "#0a0f1e", 
            border: "1px solid rgba(30,58,95,0.4)",
            color: "#f8fafc",
          }}
        />
      </div>

      {/* Quick Views */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {quickViews.map((view, i) => (
          <button
            key={i}
            className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ 
              background: view.count > 0 ? "rgba(239,68,68,0.1)" : "#0a0f1e",
              border: `1px solid ${view.count > 0 ? "rgba(239,68,68,0.3)" : "rgba(30,58,95,0.4)"}`,
              color: view.count > 0 ? "#ef4444" : "#94a3b8",
            }}
          >
            {view.label} ({view.count})
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-slate-500" />
        <select
          value={filters.provider}
          onChange={(e) => setFilters({ ...filters, provider: e.target.value })}
          className="px-3 py-1.5 rounded-lg text-xs"
          style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)", color: "#f8fafc" }}
        >
          <option value="all">All Providers</option>
          {PROVIDERS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
        </select>
        <select
          value={filters.resourceType}
          onChange={(e) => setFilters({ ...filters, resourceType: e.target.value })}
          className="px-3 py-1.5 rounded-lg text-xs"
          style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)", color: "#f8fafc" }}
        >
          <option value="all">All Types</option>
          {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filters.risk}
          onChange={(e) => setFilters({ ...filters, risk: e.target.value })}
          className="px-3 py-1.5 rounded-lg text-xs"
          style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)", color: "#f8fafc" }}
        >
          <option value="all">All Risk Levels</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={filters.hasFindings}
          onChange={(e) => setFilters({ ...filters, hasFindings: e.target.value })}
          className="px-3 py-1.5 rounded-lg text-xs"
          style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)", color: "#f8fafc" }}
        >
          <option value="all">All Findings</option>
          <option value="yes">Has Findings</option>
          <option value="no">No Findings</option>
        </select>
      </div>

      {/* Results Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: "rgba(30,58,95,0.4)" }}>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Resource</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Provider</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Region</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Risk</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Findings</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredResources.map((resource) => (
                <tr key={resource.id} className="border-b last:border-0 hover:bg-white/5 transition-colors" style={{ borderColor: "rgba(30,58,95,0.2)" }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Cloud className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-white font-medium">{resource.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-400">{resource.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const provider = PROVIDERS.find(p => p.name === resource.provider);
                      return (
                        <span className="text-xs font-medium" style={{ color: provider?.color || "#94a3b8" }}>
                          {resource.provider}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-400">{resource.region}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded",
                      resource.risk === "critical" ? "text-red-400 bg-red-500/10" :
                      resource.risk === "high" ? "text-orange-400 bg-orange-500/10" :
                      resource.risk === "medium" ? "text-amber-400 bg-amber-500/10" :
                      "text-blue-400 bg-blue-500/10"
                    )}>
                      {resource.risk?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {resource.findings > 0 ? (
                      <span className="text-xs text-red-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {resource.findings}
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Clean
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                      View <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredResources.length === 0 && (
          <div className="text-center py-12 text-slate-600">
            <Cloud className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No resources found</p>
          </div>
        )}
      </div>
    </div>
  );
}