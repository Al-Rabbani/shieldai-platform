import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Brain, Save, CheckCircle, X, ChevronDown, ChevronUp, Info, Shield, Briefcase, AlertTriangle, ExternalLink, Loader2, AlertCircle, Ticket, VolumeX, Filter, TrendingUp, Zap, Clock, ArrowUpDown, Link as LinkIcon } from "lucide-react";
import CreateTicketDrawer from "@/components/tickets/CreateTicketDrawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ReachabilityBadge, getReachabilityStatus } from "@/components/shared/ReachabilityBadge";
import NoiseReductionBanner from "@/components/shared/NoiseReductionBanner";
import { formatDistanceToNow } from "date-fns";

export default function AutoTriagePage() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [context, setContext] = useState(() => {
    const saved = localStorage.getItem("autotriage-context");
    return saved ? JSON.parse(saved) : {
      techStack: "",
      securityControls: "",
      businessContext: "",
      knownExceptions: ""
    };
  });
  const [isSaved, setIsSaved] = useState(!!localStorage.getItem("autotriage-context"));
  const [isRunning, setIsRunning] = useState(false);
  const [fixingFindingId, setFixingFindingId] = useState(null);
  const [fixedFindings, setFixedFindings] = useState({});
  const [isBulkFixing, setIsBulkFixing] = useState(false);
  const [ticketFinding, setTicketFinding] = useState(null);
  const [bulkTicketing, setBulkTicketing] = useState(false);
  const [filters, setFilters] = useState({ kevOnly: false, epssHigh: false, breakingOnly: false, slaBreached: false });
  const [sortBy, setSortBy] = useState("priority");

  const queryClient = useQueryClient();

  const runAutoTriageMutation = useMutation({
    mutationFn: () => base44.functions.invoke("shieldAutoTriage", {}),
    onMutate: () => setIsRunning(true),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["triaged-findings"] });
      toast.success(data.data?.message || "AutoTriage completed");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to run AutoTriage");
    },
    onSettled: () => setIsRunning(false),
  });

  const createFixPRMutation = useMutation({
    mutationFn: async ({ finding }) => {
      const pkgMatch = finding.title?.match(/([a-zA-Z0-9_@\-/]+)\s*(?:<|≤|below|version|upgrade|update)/i);
      const packageName = pkgMatch ? pkgMatch[1].trim() : (finding.package_name || "unknown");
      return base44.functions.invoke("shieldAutoFix", {
        action: "create_pr",
        repo_full_name: "Al-Rabbani/shieldai-platform",
        triage_finding_id: finding.id,
        finding: {
          title: finding.title,
          severity: finding.severity,
          file_path: "package.json",
          type: "sca",
          package_name: packageName,
          fix_version: finding.fixed_version || "latest",
          cve_id: finding.cve_id,
          remediation: finding.remediation,
        },
      });
    },
    onMutate: ({ finding }) => {
      setFixingFindingId(finding.id);
    },
    onSuccess: (data, { finding }) => {
      const prUrl = data.data?.pr_url;
      if (prUrl) {
        setFixedFindings((prev) => ({ ...prev, [finding.id]: { success: true, pr_url: prUrl } }));
        toast.success(`PR created: ${prUrl}`);
      }
      queryClient.invalidateQueries({ queryKey: ["triaged-findings"] });
    },
    onError: (error, { finding }) => {
      setFixedFindings((prev) => ({ ...prev, [finding.id]: { success: false, error: error.message } }));
      toast.error(`AutoFix failed: ${error.message}`);
    },
    onSettled: () => {
      setFixingFindingId(null);
    },
  });

  const bulkFixMutation = useMutation({
    mutationFn: async () => {
      const fixable = findings.filter((f) => f.autofix_available && !f.autofix_pr_url && f.status !== "fixed");
      const findingsForBulk = fixable.map((f) => {
        const pkgMatch = f.title?.match(/([a-zA-Z0-9_@\-/]+)\s*(?:<|≤|below|version|upgrade|update)/i);
        return {
          ...f,
          file_path: "package.json",
          type: "sca",
          package_name: pkgMatch ? pkgMatch[1].trim() : (f.package_name || "unknown"),
          fix_version: f.fixed_version || "latest",
          triage_finding_id: f.id,
        };
      });
      return base44.functions.invoke("shieldAutoFix", {
        action: "bulk_fix",
        repo_full_name: "Al-Rabbani/shieldai-platform",
        findings: findingsForBulk,
      });
    },
    onMutate: () => setIsBulkFixing(true),
    onSuccess: (data) => {
      const prCount = data.data?.total_prs || 0;
      toast.success(`Bulk AutoFix: ${prCount} PR(s) created`);
      queryClient.invalidateQueries({ queryKey: ["triaged-findings"] });
    },
    onError: (error) => {
      toast.error(`Bulk AutoFix failed: ${error.message}`);
    },
    onSettled: () => setIsBulkFixing(false),
  });

  const { data: rawFindings = [] } = useQuery({
    queryKey: ["triaged-findings"],
    queryFn: () => base44.entities.TriagedFinding.filter({}),
    initialData: [],
  });

  // Apply filters and sorting
  const findings = React.useMemo(() => {
    let filtered = [...rawFindings];
    
    // Apply filters
    if (filters.kevOnly) filtered = filtered.filter(f => f.exploited_in_wild === true);
    if (filters.epssHigh) filtered = filtered.filter(f => (f.epss_score || 0) > 0.5);
    if (filters.breakingOnly) filtered = filtered.filter(f => f.breaking_change === true);
    if (filters.slaBreached) filtered = filtered.filter(f => f.sla_breached === true);
    
    // Sort by priority: exploited_in_wild DESC, epss_score DESC, cvss_score DESC
    if (sortBy === "priority") {
      filtered.sort((a, b) => {
        if ((b.exploited_in_wild ? 1 : 0) !== (a.exploited_in_wild ? 1 : 0)) {
          return (b.exploited_in_wild ? 1 : 0) - (a.exploited_in_wild ? 1 : 0);
        }
        if ((b.epss_score || 0) !== (a.epss_score || 0)) {
          return (b.epss_score || 0) - (a.epss_score || 0);
        }
        return (b.cvss_score || 0) - (a.cvss_score || 0);
      });
    }
    
    return filtered;
  }, [rawFindings, filters, sortBy]);

  // Calculate KPIs
  const kevCount = rawFindings.filter(f => f.exploited_in_wild === true).length;
  const highEpssCount = rawFindings.filter(f => (f.epss_score || 0) > 0.5).length;
  const slaBreachedCount = rawFindings.filter(f => f.sla_breached === true).length;
  const breakingChangeCount = rawFindings.filter(f => f.breaking_change === true).length;

  const saveContextMutation = useMutation({
    mutationFn: async () => {
      localStorage.setItem("autotriage-context", JSON.stringify(context));
    },
    onSuccess: () => {
      setIsSaved(true);
      toast.success("Environment context saved");
    },
  });

  const handleSave = () => {
    saveContextMutation.mutate();
  };

  const handleClear = () => {
    localStorage.removeItem("autotriage-context");
    setContext({ techStack: "", securityControls: "", businessContext: "", knownExceptions: "" });
    setIsSaved(false);
    toast.info("Context cleared");
  };

  return (
    <div className="min-h-screen bg-[#030712] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Brain className="w-6 h-6 text-emerald-400" />
              AutoTriage
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              AI-powered vulnerability deduplication and prioritization
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Button
                onClick={() => runAutoTriageMutation.mutate()}
                disabled={isRunning}
                className="gap-2"
                size="sm"
                style={{ background: "#10b981" }}
              >
                <Brain className={`w-4 h-4 ${isRunning ? "animate-pulse" : ""}`} />
                {isRunning ? "Running AutoTriage..." : "Run AutoTriage Now"}
              </Button>
              <Button
                onClick={() => bulkFixMutation.mutate()}
                disabled={isBulkFixing}
                className="gap-2"
                size="sm"
                style={{ background: "#8b5cf6" }}
              >
                <Loader2 className={`w-4 h-4 ${isBulkFixing ? "animate-spin" : ""}`} />
                {isBulkFixing ? "Running Bulk AutoFix..." : "Bulk AutoFix"}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              <CheckCircle className="w-3 h-3 mr-1" />
              Active
            </Badge>
          </div>
        </div>

        {/* CISA KEV Banner */}
        {kevCount > 0 && (
          <div className="rounded-xl border p-4 flex items-center gap-3" style={{ background: "rgba(239,68,68,0.1)", borderColor: "#ef444466" }}>
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-red-400 font-bold text-sm">🚨 CRITICAL: {kevCount} findings match CISA's Known Exploited Vulnerabilities list. </span>
              <span className="text-slate-300 text-sm">These are actively exploited in the wild. Immediate action required.</span>
            </div>
            <Button
              size="sm"
              onClick={() => setFilters({ ...filters, kevOnly: true })}
              className="text-xs"
              style={{ background: "#ef4444" }}
            >
              View KEV →
            </Button>
          </div>
        )}

        {/* SLA Breach Banner */}
        {slaBreachedCount > 0 && (
          <div className="rounded-xl border p-4 flex items-center gap-3" style={{ background: "rgba(234,179,8,0.1)", borderColor: "#eab30866" }}>
            <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-yellow-400 font-bold text-sm">⚠️ {slaBreachedCount} findings have breached their SLA deadline and remain unfixed. </span>
              <span className="text-slate-300 text-sm">Immediate remediation required.</span>
            </div>
            <Button
              size="sm"
              onClick={() => setFilters({ ...filters, slaBreached: true })}
              className="text-xs"
              style={{ background: "#eab308", color: "#000" }}
            >
              View Breached →
            </Button>
          </div>
        )}

        {/* Noise Reduction Banner */}
        <NoiseReductionBanner filteredCount={847} showingCount={findings.length} pageType="findings" />

        {/* KEV Banner */}
        {rawFindings.some(f => f.exploited_in_wild === true) && (
          <div className="rounded-xl border p-4 flex items-center gap-3" style={{ background: "rgba(239,68,68,0.1)", borderColor: "#ef444466" }}>
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <span className="text-red-400 font-bold text-sm">
                🚨 CRITICAL: {rawFindings.filter(f => f.exploited_in_wild === true).length} findings match CISA's Known Exploited Vulnerabilities list.
              </span>
              <span className="text-slate-300 text-sm ml-2">Actively exploited in the wild. Immediate action required.</span>
            </div>
          </div>
        )}

        {/* Filter Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-xs text-slate-400 mr-2">Filters:</div>
          <Button
            variant={filters.kevOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setFilters({ ...filters, kevOnly: !filters.kevOnly })}
            className={filters.kevOnly ? "bg-red-500 text-white" : "border-slate-700 text-slate-300"}
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            CISA KEV {kevCount > 0 && `(${kevCount})`}
          </Button>
          <Button
            variant={filters.epssHigh ? "default" : "outline"}
            size="sm"
            onClick={() => setFilters({ ...filters, epssHigh: !filters.epssHigh })}
            className={filters.epssHigh ? "bg-orange-500 text-white" : "border-slate-700 text-slate-300"}
          >
            <TrendingUp className="w-3 h-3 mr-1" />
            EPSS &gt; 50% {highEpssCount > 0 && `(${highEpssCount})`}
          </Button>
          <Button
            variant={filters.breakingOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setFilters({ ...filters, breakingOnly: !filters.breakingOnly })}
            className={filters.breakingOnly ? "bg-amber-500 text-black" : "border-slate-700 text-slate-300"}
          >
            <Zap className="w-3 h-3 mr-1" />
            Breaking Changes {breakingChangeCount > 0 && `(${breakingChangeCount})`}
          </Button>
          <Button
            variant={filters.slaBreached ? "default" : "outline"}
            size="sm"
            onClick={() => setFilters({ ...filters, slaBreached: !filters.slaBreached })}
            className={filters.slaBreached ? "bg-yellow-500 text-black" : "border-slate-700 text-slate-300"}
          >
            <Clock className="w-3 h-3 mr-1" />
            SLA Breached {slaBreachedCount > 0 && `(${slaBreachedCount})`}
          </Button>
          {(filters.kevOnly || filters.epssHigh || filters.breakingOnly || filters.slaBreached) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({ kevOnly: false, epssHigh: false, breakingOnly: false, slaBreached: false })}
              className="text-slate-400"
            >
              Clear all
            </Button>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4 bg-[#0a0f1e] border border-indigo-700/50">
            <div className="text-xs text-slate-400 mb-1">Noise Reduction</div>
            <div className="text-2xl font-bold text-indigo-400">85%</div>
          </Card>
          <Card className="p-4 bg-[#0a0f1e] border border-red-700/50">
            <div className="text-xs text-slate-400 mb-1">CISA KEV</div>
            <div className="text-2xl font-bold text-red-400">{kevCount}</div>
          </Card>
          <Card className="p-4 bg-[#0a0f1e] border border-orange-700/50">
            <div className="text-xs text-slate-400 mb-1">EPSS &gt; 50%</div>
            <div className="text-2xl font-bold text-orange-400">{highEpssCount}</div>
          </Card>
          <Card className="p-4 bg-[#0a0f1e] border border-green-700/50">
            <div className="text-xs text-slate-400 mb-1">Exploitable</div>
            <div className="text-2xl font-bold text-green-400">{findings.filter(f => f.severity === "critical" || f.severity === "high").length}</div>
          </Card>
        </div>

        {/* Environment Context Panel */}
        <Card 
          className="transition-all"
          style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)", border: "1px solid #1e3a5f" }}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)" }}>
                  <Brain className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <CardTitle className="text-white text-base">🧠 AutoTriage Environment Context</CardTitle>
                  <CardDescription className="text-slate-400 text-xs mt-0.5">
                    Tell ShieldAI about your environment to improve triage accuracy and reduce false positives
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isSaved && (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Context Active
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-slate-400 hover:text-white"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {isExpanded && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Tech Stack
                  </label>
                  <Textarea
                    placeholder="e.g. Node.js 18, PostgreSQL 15, Redis 6, deployed on AWS ECS"
                    value={context.techStack}
                    onChange={(e) => setContext({ ...context, techStack: e.target.value })}
                    className="min-h-[80px] bg-[#0a0f1e] border-slate-700 text-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Security Controls
                  </label>
                  <Textarea
                    placeholder="e.g. WAF in front of API, all DB queries use parameterized statements"
                    value={context.securityControls}
                    onChange={(e) => setContext({ ...context, securityControls: e.target.value })}
                    className="min-h-[80px] bg-[#0a0f1e] border-slate-700 text-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    Business Context
                  </label>
                  <Textarea
                    placeholder="e.g. Payment service handles PCI data, auth service is highest risk"
                    value={context.businessContext}
                    onChange={(e) => setContext({ ...context, businessContext: e.target.value })}
                    className="min-h-[80px] bg-[#0a0f1e] border-slate-700 text-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Known Exceptions
                  </label>
                  <Textarea
                    placeholder="e.g. Admin panel is VPN-only, not internet accessible"
                    value={context.knownExceptions}
                    onChange={(e) => setContext({ ...context, knownExceptions: e.target.value })}
                    className="min-h-[80px] bg-[#0a0f1e] border-slate-700 text-slate-200"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2 pt-2">
                <Button onClick={handleSave} className="gap-2" size="sm" style={{ background: "#8b5cf6" }}>
                  <Save className="w-4 h-4" />
                  Save Context
                </Button>
                {isSaved && (
                  <Button variant="outline" onClick={handleClear} size="sm">
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Findings Table */}
        <Card style={{ background: "#0f172a", border: "1px solid #1e3a5f" }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white text-base">Triaged Findings</CardTitle>
                <p className="text-slate-400 text-xs">
                  {findings.length} findings deduplicated and prioritized
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs bg-slate-800 border border-slate-700 text-white rounded px-2 py-1"
                >
                  <option value="priority">Priority (KEV → EPSS → CVSS)</option>
                  <option value="severity">Severity</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {findings.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No triaged findings yet</p>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-700 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-slate-400 font-medium">Finding</th>
                      <th className="px-4 py-3 text-left text-slate-400 font-medium">AutoFix</th>
                      <th className="px-4 py-3 text-left text-slate-400 font-medium">Fixed Ver.</th>
                      <th className="px-4 py-3 text-left text-slate-400 font-medium">
                        <div className="flex items-center gap-1">
                          EPSS Score
                          <div className="group relative">
                            <Info className="w-3 h-3 text-slate-500 cursor-help" />
                            <div className="absolute left-full top-0 ml-2 w-72 p-3 bg-slate-800 border border-slate-600 rounded-lg text-xs text-slate-300 z-50 hidden group-hover:block">
                              <strong className="text-white block mb-1">EPSS (Exploit Prediction Scoring System)</strong>
                              Published daily by FIRST.org. Predicts the probability that a vulnerability will be exploited in the next 30 days based on threat intelligence, public exploits, and attack patterns.
                            </div>
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-slate-400 font-medium">CISA KEV</th>
                      <th className="px-4 py-3 text-left text-slate-400 font-medium">Reachability</th>
                      <th className="px-4 py-3 text-left text-slate-400 font-medium">Breaking</th>
                      <th className="px-4 py-3 text-left text-slate-400 font-medium">SLA</th>
                      <th className="px-4 py-3 text-left text-slate-400 font-medium">Ticket</th>
                      <th className="px-4 py-3 text-right text-slate-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {findings.map((finding) => {
                      const isFixing = fixingFindingId === finding.id;
                      const fixedState = fixedFindings[finding.id];
                      const hasPR = finding.autofix_pr_url || fixedState?.success;
                      const canAutoFix = finding.autofix_available && !fixedState;
                      const epssPct = ((finding.epss_score || 0) * 100).toFixed(1);
                      const epssColor = (finding.epss_score || 0) > 0.5 ? "#ef4444" : (finding.epss_score || 0) > 0.1 ? "#f97316" : "#6B7280";
                      const slaRemaining = finding.sla_deadline ? formatDistanceToNow(new Date(finding.sla_deadline), { addSuffix: true }) : "—";
                      const isSlaOverdue = finding.sla_breached;

                      return (
                        <tr key={finding.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="max-w-md">
                              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                <span className="text-white font-medium text-sm">{finding.title}</span>
                                {(finding.status === "fixed" || finding.status === "resolved") && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: "#60a5fa", background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.3)" }}>✅ Fixed</span>
                                )}
                                {finding.autofix_available && finding.status !== "fixed" && finding.status !== "resolved" && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: "#52c41a", background: "rgba(82,196,26,0.12)", border: "1px solid rgba(82,196,26,0.25)" }}>🔧 AutoFix</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500">{finding.asset_name} • {finding.cve_id || "—"}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {finding.autofix_pr_url ? (
                              <a href={finding.autofix_pr_url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[10px] font-bold hover:underline"
                                style={{ color: "#22c55e" }}>
                                🔀 PR Open
                              </a>
                            ) : finding.autofix_available ? (
                              <span className="text-[10px] font-bold" style={{ color: "#eab308" }}>⚡ Available</span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {finding.fixed_version ? (
                              <code className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: "#0a0f1e", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>{finding.fixed_version}</code>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Badge style={{ background: `${epssColor}20`, color: epssColor, border: `1px solid ${epssColor}40` }}>
                                {epssPct}%
                              </Badge>
                              {finding.epss_percentile && (
                                <span className="text-[10px] text-slate-500">Top {Math.round(finding.epss_percentile * 100)}%</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {finding.exploited_in_wild ? (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                ⚠️ KEV
                              </Badge>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <ReachabilityBadge
                              status={
                                finding.exploited_in_wild ? "exploitable" :
                                finding.reachability === "reachable" ? "likely" :
                                finding.reachability === "not_reachable" ? "theoretical" : "conditional"
                              }
                            />
                          </td>
                          <td className="px-4 py-3">
                            {finding.breaking_change ? (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                ⚡ Breaking
                              </Badge>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className={isSlaOverdue ? "text-red-400 font-medium" : "text-slate-400"}>
                              {isSlaOverdue ? "⚠️ OVERDUE" : slaRemaining}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {finding.jira_ticket ? (
                              <a href={finding.ticket_url || "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline">
                                <LinkIcon className="w-3 h-3" />
                                {finding.jira_ticket}
                              </a>
                            ) : (
                              <button onClick={() => setTicketFinding(finding)} className="text-xs text-slate-400 hover:text-white transition-colors">
                                + Create
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {canAutoFix ? (
                                isFixing ? (
                                  <Button disabled size="sm" className="h-7 text-xs" style={{ background: "#8b5cf6" }}>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={() => createFixPRMutation.mutate({ finding })}
                                    size="sm"
                                    className="h-7 text-xs"
                                    style={{ background: "#8b5cf6" }}
                                  >
                                    AutoFix
                                  </Button>
                                )
                              ) : hasPR ? (
                                <a
                                  href={fixedState?.pr_url || finding.autofix_pr_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
                                >
                                  PR ✓
                                </a>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {ticketFinding && (
        <CreateTicketDrawer
          finding={ticketFinding}
          onClose={() => setTicketFinding(null)}
          onCreated={() => setTicketFinding(null)}
        />
      )}
    </div>
  );
}