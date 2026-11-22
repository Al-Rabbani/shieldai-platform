import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import StatusBadge from "@/components/shared/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Server, Cloud, Database, Cpu, Globe, Box, Zap, ShieldAlert, UserPlus, CheckCheck, X, Wrench, Tag, Trash2, Archive } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import AssetDrillDownDrawer from "@/components/assets/AssetDrillDownDrawer";
import AssetRiskSectorHeatmap from "@/components/assets/AssetRiskSectorHeatmap";
import AssetDependencyMap from "@/components/assets/AssetDependencyMap";
import { DEFAULT_SCORING_CONFIG, loadScoringConfig } from "@/lib/riskScoring";
import { pushLinearStates } from "@/lib/linearSync";

const typeIcons = {
  compute: Cpu,
  storage: Database,
  database: Database,
  ai_model: Zap,
  api: Globe,
  container: Box,
  serverless: Cloud,
};

const providerColors = {
  AWS: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  GCP: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Azure: "bg-sky-500/15 text-sky-400 border-sky-500/30",
};

const CRITICALITY_RANK = { critical: 5, high: 4, medium: 3, low: 2, unrated: 1 };

const CRITICALITY_STYLE = {
  critical: "text-red-300 border-red-500/40 bg-red-500/10",
  high: "text-orange-300 border-orange-500/40 bg-orange-500/10",
  medium: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  low: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10",
  unrated: "text-slate-400 border-slate-600 bg-slate-700/20",
};

const FILTER_KEY = "gds.assets.filters";

function readSavedFilters() {
  try {
    return JSON.parse(localStorage.getItem(FILTER_KEY)) || {};
  } catch {
    return {};
  }
}

function matchesRiskBand(score, band, thresholds = DEFAULT_SCORING_CONFIG) {
  if (band === "high") return score >= thresholds.critical_threshold;
  if (band === "elevated") return score >= thresholds.high_threshold && score < thresholds.critical_threshold;
  if (band === "moderate") return score >= thresholds.medium_threshold && score < thresholds.high_threshold;
  if (band === "low") return score < thresholds.medium_threshold;
  return true;
}

const SCAN_HOURS = { "24h": 24, "7d": 168, "30d": 720 };

function RiskBar({ score, thresholds = DEFAULT_SCORING_CONFIG }) {
  const color = score >= thresholds.critical_threshold ? "#ef4444"
    : score >= thresholds.high_threshold ? "#f97316"
    : score >= thresholds.medium_threshold ? "#eab308" : "#22c55e";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "#1F2937" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-mono font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

export default function Assets() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [riskBand, setRiskBand] = useState(() => readSavedFilters().riskBand || "any");
  const [scanWindow, setScanWindow] = useState(() => readSavedFilters().scanWindow || "any");
  const [depType, setDepType] = useState(() => readSavedFilters().depType || "any");
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [assignee, setAssignee] = useState("__none__");
  const [remediationStatus, setRemediationStatus] = useState("in_remediation");
  const [tagInput, setTagInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState(null);
  const [riskConfig, setRiskConfig] = useState(DEFAULT_SCORING_CONFIG);
  const [criticalityFilter, setCriticalityFilter] = useState("all");
  const [criticalityValue, setCriticalityValue] = useState("critical");

  useEffect(() => {
    loadScoringConfig().then(({ config }) => setRiskConfig(config)).catch(() => {});
  }, []);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: () => base44.entities.Asset.list("-created_date", 200),
    initialData: [],
  });

  const queryClient = useQueryClient();
  const { data: team = [] } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => base44.entities.TeamMember.list("-created_date", 100),
    initialData: [],
  });

  const { data: dependencies = [] } = useQuery({
    queryKey: ["asset-dependencies"],
    queryFn: () => base44.entities.AssetDependency.list("-created_date", 300),
    initialData: [],
  });

  useEffect(() => {
    localStorage.setItem(FILTER_KEY, JSON.stringify({ riskBand, scanWindow, depType }));
  }, [riskBand, scanWindow, depType]);

  // Deep links from Slack alerts open the asset's own drill-down.
  useEffect(() => {
    const assetId = new URLSearchParams(window.location.search).get("asset");
    if (!assetId || assets.length === 0) return;
    const match = assets.find((asset) => asset.id === assetId);
    if (match) setSelectedAsset(match);
  }, [assets]);

  const dependencyTypeByName = {};
  dependencies.forEach((dependency) => {
    [dependency.asset_name, dependency.depends_on_name].forEach((name) => {
      if (!name) return;
      dependencyTypeByName[name] = dependencyTypeByName[name] || new Set();
      if (dependency.dependency_type) dependencyTypeByName[name].add(dependency.dependency_type);
    });
  });
  const dependencyTypes = [...new Set(dependencies.map((dependency) => dependency.dependency_type).filter(Boolean))];

  const filtered = assets.filter((a) => {
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    if (providerFilter !== "all" && a.cloud_provider !== providerFilter) return false;
    if (search && !a.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (criticalityFilter !== "all" && (a.business_criticality || "unrated") !== criticalityFilter) return false;

    if (riskBand === "unscored") {
      if (a.risk_score != null) return false;
    } else if (riskBand !== "any") {
      if (a.risk_score == null || !matchesRiskBand(a.risk_score, riskBand, riskConfig)) return false;
    }

    if (scanWindow === "never") {
      if (a.last_scanned) return false;
    } else if (scanWindow !== "any") {
      if (!a.last_scanned) return false;
      const hours = SCAN_HOURS[scanWindow] || 24;
      if ((Date.now() - new Date(a.last_scanned).getTime()) / 3600000 > hours) return false;
    }

    if (depType !== "any") {
      const types = dependencyTypeByName[a.name];
      if (!types || !types.has(depType)) return false;
    }

    return true;
  });

  // Business-critical systems are listed first so scans and pentests reach them before anything else.
  const ranked = [...filtered].sort(
    (a, b) =>
      (CRITICALITY_RANK[b.business_criticality] || 0) - (CRITICALITY_RANK[a.business_criticality] || 0) ||
      (b.risk_score || 0) - (a.risk_score || 0)
  );

  const filtersActive = riskBand !== "any" || scanWindow !== "any" || depType !== "any";
  function resetPersistentFilters() {
    setRiskBand("any");
    setScanWindow("any");
    setDepType("any");
  }

  const typeCounts = {};
  assets.forEach(a => { typeCounts[a.type] = (typeCounts[a.type] || 0) + 1; });

  const selectedAssets = assets.filter((a) => selectedIds.includes(a.id));
  const allVisibleSelected = filtered.length > 0 && filtered.every((a) => selectedIds.includes(a.id));

  function toggleAsset(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAllVisible() {
    setSelectedIds(allVisibleSelected ? [] : filtered.map((a) => a.id));
  }

  async function openFindingsForSelection() {
    const names = new Set(selectedAssets.map((a) => a.name));
    const open = await base44.entities.TriagedFinding.filter({ status: "open" }, "-detected_at", 500);
    return (open || []).filter((f) => names.has(f.asset_name));
  }

  async function assignSelected() {
    if (assignee === "__none__" || selectedAssets.length === 0) return;
    setBusy(true);
    setBulkMessage(null);
    try {
      await base44.entities.Asset.bulkUpdate(selectedAssets.map((a) => ({ id: a.id, assigned_to: assignee })));
      const findings = await openFindingsForSelection();
      if (findings.length > 0) {
        await base44.entities.TriagedFinding.bulkUpdate(findings.map((f) => ({ id: f.id, assigned_to: assignee })));
      }
      setBulkMessage(`Assigned ${selectedAssets.length} asset(s) and ${findings.length} open finding(s) to ${assignee}.`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    } catch (error) {
      setBulkMessage(`Could not assign: ${error.message}`);
    }
    setBusy(false);
  }

  async function resolveSelected() {
    if (selectedAssets.length === 0) return;
    setBusy(true);
    setBulkMessage(null);
    try {
      const findings = await openFindingsForSelection();
      const now = new Date().toISOString();
      if (findings.length > 0) {
        await base44.entities.TriagedFinding.bulkUpdate(findings.map((f) => ({ id: f.id, status: "fixed", fixed_at: now })));
      }
      await base44.entities.Asset.bulkUpdate(selectedAssets.map((a) => ({ id: a.id, open_findings: 0 })));
      await pushLinearStates(findings.map((f) => f.id));
      setBulkMessage(`Marked ${findings.length} open finding(s) fixed across ${selectedAssets.length} asset(s) · linked Linear tickets updated.`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    } catch (error) {
      setBulkMessage(`Could not resolve: ${error.message}`);
    }
    setBusy(false);
  }

  async function applyRemediationStatus() {
    if (selectedAssets.length === 0) return;
    setBusy(true);
    setBulkMessage(null);
    try {
      const names = new Set(selectedAssets.map((a) => a.name));
      const active = await base44.entities.TriagedFinding.filter({ status: { $in: ["open", "in_remediation"] } }, "-detected_at", 500);
      const targets = (active || []).filter((f) => names.has(f.asset_name));
      if (targets.length > 0) {
        await base44.entities.TriagedFinding.bulkUpdate(targets.map((f) => ({ id: f.id, status: remediationStatus })));
        await pushLinearStates(targets.map((f) => f.id));
      }
      setBulkMessage(`Set ${targets.length} open finding(s) across ${selectedAssets.length} asset(s) to ${remediationStatus.replace("_", " ")} · linked Linear tickets updated.`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    } catch (error) {
      setBulkMessage(`Could not update status: ${error.message}`);
    }
    setBusy(false);
  }

  async function tagSelected() {
    const tag = tagInput.trim();
    if (!tag || selectedAssets.length === 0) return;
    setBusy(true);
    setBulkMessage(null);
    try {
      const rows = selectedAssets.map((a) => ({
        id: a.id,
        tags: [...new Set([...(a.tags || []), tag])],
      }));
      await base44.entities.Asset.bulkUpdate(rows);
      setBulkMessage(`Tagged ${rows.length} asset(s) with "${tag}".`);
      setTagInput("");
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    } catch (error) {
      setBulkMessage(`Could not tag: ${error.message}`);
    }
    setBusy(false);
  }

  async function setCriticalitySelected() {
    if (selectedAssets.length === 0) return;
    setBusy(true);
    setBulkMessage(null);
    try {
      await base44.entities.Asset.bulkUpdate(selectedAssets.map((a) => ({ id: a.id, business_criticality: criticalityValue })));
      setBulkMessage(`Rated ${selectedAssets.length} asset(s) as ${criticalityValue} business criticality.`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    } catch (error) {
      setBulkMessage(`Could not rate assets: ${error.message}`);
    }
    setBusy(false);
  }

  const decommissionedSelected = selectedAssets.filter((a) => a.status === "decommissioned");

  async function archiveDecommissioned() {
    if (decommissionedSelected.length === 0) {
      setBulkMessage("Select decommissioned assets to archive — active assets are left untouched.");
      return;
    }
    setBusy(true);
    setBulkMessage(null);
    try {
      await base44.entities.Asset.bulkUpdate(decommissionedSelected.map((a) => ({ id: a.id, status: "archived" })));
      const skipped = selectedAssets.length - decommissionedSelected.length;
      setBulkMessage(
        `Archived ${decommissionedSelected.length} decommissioned asset(s)${skipped > 0 ? ` · ${skipped} non-decommissioned asset(s) left untouched` : ""}.`
      );
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    } catch (error) {
      setBulkMessage(`Could not archive: ${error.message}`);
    }
    setBusy(false);
  }

  async function deleteSelected() {
    if (selectedAssets.length === 0) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setBulkMessage(`Press delete again to permanently remove ${selectedAssets.length} asset(s).`);
      return;
    }
    setBusy(true);
    setBulkMessage(null);
    try {
      await base44.entities.Asset.deleteMany({ id: { $in: selectedIds } });
      setBulkMessage(`Deleted ${selectedIds.length} asset(s).`);
      setSelectedIds([]);
      setConfirmDelete(false);
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    } catch (error) {
      setBulkMessage(`Could not delete: ${error.message}`);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-heading">Asset Inventory</h1>
        <p className="text-sm text-muted-foreground mt-1">Auto-discovered cloud assets across all providers</p>
      </div>

      {/* Type breakdown */}
      <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
        {["compute", "storage", "database", "ai_model", "api", "container", "serverless"].map((t) => {
          const Icon = typeIcons[t] || Server;
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(typeFilter === t ? "all" : t)}
              className={`p-3 rounded-lg border text-center transition-all ${
                typeFilter === t ? "border-primary/50 bg-primary/10" : "border-border bg-card hover:bg-accent"
              }`}
            >
              <Icon className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-[10px] capitalize text-muted-foreground">{t.replace("_", " ")}</p>
              <p className="text-sm font-bold font-mono text-foreground">{typeCounts[t] || 0}</p>
            </button>
          );
        })}
      </div>

      <AssetRiskSectorHeatmap assets={filtered} onSelect={setSelectedAsset} />

      <AssetDependencyMap assets={assets} />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-36 bg-card border-border">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            <SelectItem value="AWS">AWS</SelectItem>
            <SelectItem value="GCP">GCP</SelectItem>
            <SelectItem value="Azure">Azure</SelectItem>
          </SelectContent>
        </Select>

        <Select value={riskBand} onValueChange={setRiskBand}>
          <SelectTrigger className="w-40 bg-card border-border">
            <SelectValue placeholder="Risk score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any risk score</SelectItem>
            <SelectItem value="high">Risk {riskConfig.critical_threshold}–100</SelectItem>
            <SelectItem value="elevated">Risk {riskConfig.high_threshold}–{riskConfig.critical_threshold - 1}</SelectItem>
            <SelectItem value="moderate">Risk {riskConfig.medium_threshold}–{riskConfig.high_threshold - 1}</SelectItem>
            <SelectItem value="low">Risk below {riskConfig.medium_threshold}</SelectItem>
            <SelectItem value="unscored">Unscored</SelectItem>
          </SelectContent>
        </Select>

        <Select value={scanWindow} onValueChange={setScanWindow}>
          <SelectTrigger className="w-40 bg-card border-border">
            <SelectValue placeholder="Last scan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any scan date</SelectItem>
            <SelectItem value="24h">Scanned last 24h</SelectItem>
            <SelectItem value="7d">Scanned last 7 days</SelectItem>
            <SelectItem value="30d">Scanned last 30 days</SelectItem>
            <SelectItem value="never">Never scanned</SelectItem>
          </SelectContent>
        </Select>

        <Select value={depType} onValueChange={setDepType}>
          <SelectTrigger className="w-40 bg-card border-border">
            <SelectValue placeholder="Dependency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any dependency</SelectItem>
            {dependencyTypes.map((type) => (
              <SelectItem key={type} value={type}>{type.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
          <SelectTrigger className="w-44 bg-card border-border">
            <SelectValue placeholder="Business criticality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any criticality</SelectItem>
            <SelectItem value="critical">Critical only</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="unrated">Unrated</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-[11px] text-muted-foreground">{filtered.length} of {assets.length} assets</span>
        {filtersActive && (
          <button onClick={resetPersistentFilters} className="text-[11px] font-medium text-primary hover:underline">
            Reset saved filters
          </button>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-foreground">{selectedIds.length} asset{selectedIds.length === 1 ? "" : "s"} selected</span>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="w-44 h-8 bg-card border-border text-xs">
                <SelectValue placeholder="Team member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Choose team member…</SelectItem>
                {team.map((m) => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <button
              onClick={assignSelected}
              disabled={busy || assignee === "__none__"}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-primary text-primary-foreground hover:opacity-90 transition disabled:opacity-40"
            >
              <UserPlus className="w-3.5 h-3.5" /> Assign
            </button>
            <Select value={remediationStatus} onValueChange={setRemediationStatus}>
              <SelectTrigger className="w-40 h-8 bg-card border-border text-xs">
                <SelectValue placeholder="Remediation status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_remediation">In remediation</SelectItem>
                <SelectItem value="fixed">Fixed</SelectItem>
                <SelectItem value="accepted_risk">Accepted risk</SelectItem>
                <SelectItem value="false_positive">False positive</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={applyRemediationStatus}
              disabled={busy}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 transition disabled:opacity-40"
            >
              <Wrench className="w-3.5 h-3.5" /> Apply status
            </button>
            <Select value={criticalityValue} onValueChange={setCriticalityValue}>
              <SelectTrigger className="w-40 h-8 bg-card border-border text-xs">
                <SelectValue placeholder="Criticality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="unrated">Unrated</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={setCriticalitySelected}
              disabled={busy}
              title="Rate the selected assets so the most business-critical ones are scanned first"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition disabled:opacity-40"
            >
              <ShieldAlert className="w-3.5 h-3.5" /> Set criticality
            </button>
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") tagSelected(); }}
              placeholder="New tag…"
              className="w-32 h-8 px-2.5 rounded-lg text-xs bg-card border border-border text-foreground placeholder:text-muted-foreground focus:border-primary outline-none"
            />
            <button
              onClick={tagSelected}
              disabled={busy || !tagInput.trim()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition disabled:opacity-40"
            >
              <Tag className="w-3.5 h-3.5" /> Tag assets
            </button>
            <button
              onClick={archiveDecommissioned}
              disabled={busy || decommissionedSelected.length === 0}
              title="Archive every selected asset that is decommissioned"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-500/20 text-slate-300 border border-slate-600 hover:bg-slate-500/30 transition disabled:opacity-40"
            >
              <Archive className="w-3.5 h-3.5" /> Archive decommissioned ({decommissionedSelected.length})
            </button>
            <button
              onClick={deleteSelected}
              disabled={busy}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition disabled:opacity-40 ${
                confirmDelete
                  ? "bg-red-500 text-white border-red-500 hover:bg-red-600"
                  : "bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30"
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" /> {confirmDelete ? "Confirm delete" : "Delete"}
            </button>
            <button
              onClick={resolveSelected}
              disabled={busy}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition disabled:opacity-40"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Resolve findings
            </button>
            <button
              onClick={() => { setSelectedIds([]); setBulkMessage(null); setConfirmDelete(false); }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          </div>
          {bulkMessage && <p className="text-[11px] text-foreground/80">{bulkMessage}</p>}
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 border-border hover:bg-muted/50">
              <TableHead className="w-8">
                <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAllVisible} aria-label="Select all assets" />
              </TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase">Name</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase">Type</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase">Provider</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase">Region</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase">Business</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase">Risk</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase">Findings</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase">Status</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase">Assigned To</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase">Last Scanned</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">No assets found</TableCell>
              </TableRow>
            ) : (
              ranked.map((a) => {
                const Icon = typeIcons[a.type] || Server;
                return (
                  <React.Fragment key={a.id}>
                    <TableRow
                      className="border-border hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedAsset(a)}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(a.id)}
                          onCheckedChange={() => toggleAsset(a.id)}
                          aria-label={`Select ${a.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{a.name}</span>
                          {(a.tags || []).map((tag) => (
                            <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">{tag}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs capitalize text-muted-foreground">{a.type?.replace("_", " ")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] border ${providerColors[a.cloud_provider] || ""}`}>
                          {a.cloud_provider}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{a.region || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] capitalize border ${CRITICALITY_STYLE[a.business_criticality] || CRITICALITY_STYLE.unrated}`}>
                          {a.business_criticality || "unrated"}
                        </Badge>
                      </TableCell>
                      <TableCell><RiskBar score={a.risk_score || 0} thresholds={riskConfig} /></TableCell>
                      <TableCell>
                        <span className="font-mono text-sm" style={{ color: (a.open_findings || 0) > 0 ? "#ef4444" : "#22c55e" }}>
                          {a.open_findings || 0}
                        </span>
                      </TableCell>
                      <TableCell><StatusBadge status={a.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.assigned_to || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {a.last_scanned ? (
                          <span title={format(new Date(a.last_scanned), "MMM d, HH:mm")}>
                            {formatDistanceToNow(new Date(a.last_scanned), { addSuffix: true })}
                          </span>
                        ) : <span className="text-red-400">Never</span>}
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AssetDrillDownDrawer asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
    </div>
  );
}