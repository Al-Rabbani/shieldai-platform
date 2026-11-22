import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Wrench, Search, Filter, Shield, Key, RotateCcw, CheckCircle, Plus, X } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";

const CATEGORY_COLORS = {
  scanner: "#3b82f6", cloud: "#06b6d4", devsecops: "#10b981", identity: "#8b5cf6",
  notification: "#14b8a6", threat_intel: DANGER, compliance: "#22c55e", workflow: "#a855f7",
  ai_model: "#7c3aed", reporting: "#6b7280", data_query: "#0ea5e9", internal: "#f59e0b"
};

const RISK_COLORS = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW };

export default function GDSToolRegistryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [requiresApprovalFilter, setRequiresApprovalFilter] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [validateResult, setValidateResult] = useState(null);

  const [newTool, setNewTool] = useState({
    name: "", display_name: "", description: "", category: "scanner", function_name: "",
    risk_level: "medium", requires_secrets: false, secret_refs: "", supported_actions: "",
    timeout_seconds: 300, retry_enabled: false, max_retries: 3, rollback_supported: false,
    owner_agent: "", tags: ""
  });

  const { data: toolsData, isLoading } = useQuery({
    queryKey: ["tool-registry"],
    queryFn: () => base44.functions.invoke("gdsToolExecutionEngine", { action: "list" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const registerMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke("gdsToolExecutionEngine", { action: "register", ...payload }),
    onSuccess: (data) => {
      qc.invalidateQueries(["tool-registry"]);
      setShowRegisterModal(false);
      setValidateResult(data.data);
    }
  });

  const validateMutation = useMutation({
    mutationFn: (toolName) => base44.functions.invoke("gdsToolExecutionEngine", { action: "validate", tool_name: toolName }),
    onSuccess: (data) => setValidateResult(data.data)
  });

  const tools = toolsData?.tools || [];
  const total = toolsData?.total || 0;

  const filteredTools = tools.filter(tool => {
    const matchSearch = !search || tool.tool_name?.toLowerCase().includes(search.toLowerCase()) || tool.display_name?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || tool.category === categoryFilter;
    const matchRisk = riskFilter === "all" || tool.risk_level === riskFilter;
    const matchApproval = requiresApprovalFilter === null || tool.requires_approval === requiresApprovalFilter;
    return matchSearch && matchCategory && matchRisk && matchApproval;
  });

  const categories = [...new Set(tools.map(t => t.category))].filter(Boolean);

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Tool Registry" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Wrench className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Tool Registry</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: TEXT, background: "rgba(255,255,255,0.1)", border: `1px solid ${BORDER}` }}>{total} tools</span>
          <span className="text-[10px] px-2 py-1 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>34 built-in + DB registered</span>
        </div>
        <button
          onClick={() => setShowRegisterModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          <Plus className="w-4 h-4" />
          Register New Tool
        </button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: MUTED }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tools..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
              />
            </div>
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Categories</option>
            {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
          </select>
          <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Risk Levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={requiresApprovalFilter} onChange={e => setRequiresApprovalFilter(e.target.value === "all" ? null : e.target.value === "true")}
            className="px-3 py-2 rounded-xl text-xs outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Approvals</option>
            <option value="true">Requires Approval</option>
            <option value="false">No Approval</option>
          </select>
        </div>
      </Card>

      {/* Tool Cards Grid */}
      {isLoading ? <Skeleton lines={8} /> : filteredTools.length === 0 ? (
        <EmptyState icon={Wrench} title="No tools found" description="Adjust filters or register new tools" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map((tool, i) => (
            <Card key={tool.tool_id || i} className="p-4" glow>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold font-mono text-white truncate">{tool.tool_name || "Untitled"}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>{tool.display_name || "No description"}</p>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ color: CATEGORY_COLORS[tool.category] || MUTED, background: `${CATEGORY_COLORS[tool.category] || MUTED}15`, border: `1px solid ${CATEGORY_COLORS[tool.category] || MUTED}30` }}>{tool.category || "general"}</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ color: RISK_COLORS[tool.risk_level] || MUTED, background: `${RISK_COLORS[tool.risk_level] || MUTED}15` }}>{tool.risk_level || "unknown"}</span>
                {tool.requires_approval && <Shield className="w-3.5 h-3.5" style={{ color: HIGH }} />}
                {tool.rollback_supported && <RotateCcw className="w-3.5 h-3.5" style={{ color: "#14b8a6" }} />}
                {tool.requires_secrets && <Key className="w-3.5 h-3.5" style={{ color: CYAN }} />}
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {(tool.supported_actions || []).slice(0, 5).map((action, idx) => (
                  <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{action}</span>
                ))}
              </div>
              <div className="flex items-center justify-between text-[10px] mb-3">
                <span style={{ color: MUTED }}>Owner: <span style={{ color: TEXT }}>{tool.owner_agent || "system"}</span></span>
                <span className="px-1.5 py-0.5 rounded" style={{ color: tool.source === "built_in" ? CYAN : MUTED, background: `${CYAN}10` }}>{tool.source === "built_in" ? "Built-in" : "Registered"}</span>
              </div>
              <button
                onClick={() => validateMutation.mutate(tool.tool_name)}
                className="w-full py-2 rounded-lg text-xs font-bold transition-all"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                Validate
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* Validation Result */}
      {validateResult && (
        <Card className="p-4" style={{ border: `1px solid ${validateResult.valid ? LOW : DANGER}` }}>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5" style={{ color: validateResult.valid ? LOW : DANGER }} />
            <div>
              <p className="text-sm font-bold text-white">Validation Result</p>
              <p className="text-[10px]" style={{ color: MUTED }}>{validateResult.message || JSON.stringify(validateResult)}</p>
            </div>
            <button onClick={() => setValidateResult(null)} className="ml-auto hover:text-white" style={{ color: MUTED }}><X className="w-4 h-4" /></button>
          </div>
        </Card>
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}`, maxHeight: "90vh", overflow: "auto" }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-white">Register New Tool</h2>
                <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>Add a custom tool to the registry</p>
              </div>
              <button onClick={() => setShowRegisterModal(false)} className="hover:text-white" style={{ color: MUTED }}><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={newTool.name} onChange={e => setNewTool({...newTool, name: e.target.value})} placeholder="Tool Name (internal)" className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              <input value={newTool.display_name} onChange={e => setNewTool({...newTool, display_name: e.target.value})} placeholder="Display Name" className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              <input value={newTool.description} onChange={e => setNewTool({...newTool, description: e.target.value})} placeholder="Description" className="px-3 py-2 rounded-lg text-xs outline-none md:col-span-2" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              <select value={newTool.category} onChange={e => setNewTool({...newTool, category: e.target.value})} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                <option value="scanner">Scanner</option>
                <option value="cloud">Cloud</option>
                <option value="devsecops">DevSecOps</option>
                <option value="identity">Identity</option>
                <option value="notification">Notification</option>
                <option value="threat_intel">Threat Intel</option>
                <option value="compliance">Compliance</option>
                <option value="workflow">Workflow</option>
                <option value="ai_model">AI Model</option>
                <option value="reporting">Reporting</option>
                <option value="data_query">Data Query</option>
                <option value="internal">Internal</option>
              </select>
              <input value={newTool.function_name} onChange={e => setNewTool({...newTool, function_name: e.target.value})} placeholder="Function Name" className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              <select value={newTool.risk_level} onChange={e => setNewTool({...newTool, risk_level: e.target.value})} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <input type="number" value={newTool.timeout_seconds} onChange={e => setNewTool({...newTool, timeout_seconds: parseInt(e.target.value)})} placeholder="Timeout (seconds)" className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              <input value={newTool.owner_agent} onChange={e => setNewTool({...newTool, owner_agent: e.target.value})} placeholder="Owner Agent" className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              <input value={newTool.secret_refs} onChange={e => setNewTool({...newTool, secret_refs: e.target.value})} placeholder="Secret Refs (comma-separated)" className="px-3 py-2 rounded-lg text-xs outline-none md:col-span-2" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              <input value={newTool.supported_actions} onChange={e => setNewTool({...newTool, supported_actions: e.target.value})} placeholder="Supported Actions (comma-separated)" className="px-3 py-2 rounded-lg text-xs outline-none md:col-span-2" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              <input value={newTool.tags} onChange={e => setNewTool({...newTool, tags: e.target.value})} placeholder="Tags (comma-separated)" className="px-3 py-2 rounded-lg text-xs outline-none md:col-span-2" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
            </div>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-2" style={{ color: TEXT }}>
                <input type="checkbox" checked={newTool.requires_secrets} onChange={e => setNewTool({...newTool, requires_secrets: e.target.checked})} />
                Requires Secrets
              </label>
              <label className="flex items-center gap-2" style={{ color: TEXT }}>
                <input type="checkbox" checked={newTool.retry_enabled} onChange={e => setNewTool({...newTool, retry_enabled: e.target.checked})} />
                Retry Enabled
              </label>
              <label className="flex items-center gap-2" style={{ color: TEXT }}>
                <input type="checkbox" checked={newTool.rollback_supported} onChange={e => setNewTool({...newTool, rollback_supported: e.target.checked})} />
                Rollback Supported
              </label>
            </div>
            <button
              onClick={() => registerMutation.mutate(newTool)}
              disabled={registerMutation.isPending}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all"
              style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN, opacity: registerMutation.isPending ? 0.5 : 1 }}>
              {registerMutation.isPending ? "Registering..." : "Register Tool"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}