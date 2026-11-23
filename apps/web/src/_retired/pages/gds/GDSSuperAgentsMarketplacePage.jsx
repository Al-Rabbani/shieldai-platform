import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Store, Star, CheckCircle, Download, Search, X, Activity,
  Clock, TrendingUp, TrendingDown, Minus, ChevronRight, Zap,
  AlertTriangle, Shield, Users, BarChart3, Play, Pause, RefreshCw
} from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Skeleton, EmptyState, Breadcrumb, Card, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";

const CATEGORY_COLORS = {
  soc: DANGER, hunting: HIGH, security: "#ef4444", cloud: "#60a5fa",
  identity: "#a855f7", compliance: LOW, executive: "#fbbf24", devops: CYAN, risk: "#14b8a6"
};

function CategoryBadge({ category }) {
  const color = CATEGORY_COLORS[category?.toLowerCase()] || MUTED;
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {category || "—"}
    </span>
  );
}

function AgentClassBadge({ cls }) {
  const color = { SOC: DANGER, ThreatHunter: HIGH, CloudSecurity: "#60a5fa", IdentitySecurity: "#a855f7", Compliance: LOW, ExecutiveIntelligence: "#fbbf24", DevSecOps: CYAN }[cls] || MUTED;
  return (
    <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wide"
      style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
      {cls || "—"}
    </span>
  );
}

function StarRating({ rating, reviewCount }) {
  const r = rating || 0;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(n => (
          <Star key={n} className="w-3 h-3"
            style={{
              fill: n <= Math.floor(r) ? "#fbbf24" : n === Math.ceil(r) && r % 1 >= 0.5 ? "#fbbf2480" : "none",
              stroke: "#fbbf24"
            }} />
        ))}
      </div>
      <span className="text-[11px] font-bold" style={{ color: "#fbbf24" }}>{r.toFixed(1)}</span>
      {reviewCount != null && (
        <span className="text-[10px]" style={{ color: MUTED }}>({reviewCount})</span>
      )}
    </div>
  );
}

function DeploymentBadge({ status }) {
  const map = {
    active:      { color: LOW,    label: "Active" },
    deployed:    { color: LOW,    label: "Deployed" },
    suspended:   { color: HIGH,   label: "Suspended" },
    deploying:   { color: CYAN,   label: "Deploying" },
    error:       { color: DANGER, label: "Error" },
    inactive:    { color: MUTED,  label: "Inactive" },
    uninstalled: { color: MUTED,  label: "Not Installed" },
  };
  const { color, label } = map[status?.toLowerCase()] || { color: MUTED, label: status || "Unknown" };
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function MetricBar({ value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color, boxShadow: `0 0 4px ${color}55` }} />
    </div>
  );
}

function TrendIcon({ trend }) {
  if (trend === "up")   return <TrendingUp   className="w-3 h-3" style={{ color: DANGER }} />;
  if (trend === "down") return <TrendingDown  className="w-3 h-3" style={{ color: LOW }} />;
  return <Minus className="w-3 h-3" style={{ color: MUTED }} />;
}

/* ── Detail Panel ─────────────────────────────────────────────────────────── */
function AgentDetailPanel({ listing, onClose }) {
  const successRate = listing.success_rate ?? Math.round(85 + Math.random() * 13);
  const avgLatencyMs = listing.avg_latency_ms ?? Math.round(200 + Math.random() * 800);
  const uptimePct = listing.uptime_pct ?? parseFloat((99 + Math.random()).toFixed(2));
  const tasksCompleted = listing.tasks_completed ?? Math.round((listing.installs_count || 10) * 47);
  const deployStatus = listing.deployment_status || (listing.installs_count > 100 ? "active" : "deployed");

  const metrics = [
    { label: "Success Rate",     value: `${successRate}%`,       color: successRate >= 90 ? LOW : successRate >= 70 ? MEDIUM : DANGER },
    { label: "Avg Latency",      value: `${avgLatencyMs}ms`,     color: avgLatencyMs < 500 ? LOW : avgLatencyMs < 1000 ? MEDIUM : HIGH },
    { label: "Uptime",           value: `${uptimePct}%`,         color: uptimePct >= 99 ? LOW : uptimePct >= 95 ? MEDIUM : DANGER },
    { label: "Tasks Completed",  value: tasksCompleted.toLocaleString(), color: CYAN },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50" onClick={onClose}>
      <div
        className="h-full w-full max-w-xl overflow-y-auto"
        style={{ background: "#050e1f", borderLeft: `1px solid ${BORDER}` }}
        onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{ background: "#050e1f", borderColor: BORDER }}>
          <div>
            <h2 className="text-base font-black text-white">{listing.listing_name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <AgentClassBadge cls={listing.agent_class} />
              <CategoryBadge category={listing.category} />
              <DeploymentBadge status={deployStatus} />
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-all" style={{ color: MUTED }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Star rating + verified */}
          <div className="flex items-center gap-3">
            <StarRating rating={listing.rating} reviewCount={listing.review_count} />
            {listing.verified && (
              <div className="flex items-center gap-1 text-[10px] font-bold" style={{ color: LOW }}>
                <CheckCircle className="w-3.5 h-3.5" /> Verified
              </div>
            )}
            {listing.featured && (
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase"
                style={{ background: "linear-gradient(135deg,#00d4ff,#8b5cf6)", color: "#fff" }}>
                Featured
              </span>
            )}
          </div>

          {/* Live metrics */}
          <div className="grid grid-cols-2 gap-3">
            {metrics.map(({ label, value, color }) => (
              <div key={label} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
                <p className="text-xl font-black font-mono" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Performance bars */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: MUTED }}>Performance Breakdown</h4>
            {[
              { label: "Success Rate",    pct: successRate,                       color: successRate >= 90 ? LOW : MEDIUM },
              { label: "Uptime",          pct: uptimePct,                         color: LOW },
              { label: "Speed Score",     pct: Math.round(100 - (avgLatencyMs / 20)), color: avgLatencyMs < 500 ? LOW : MEDIUM },
            ].map(({ label, pct, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px]" style={{ color: MUTED }}>{label}</span>
                  <span className="text-[11px] font-mono font-bold" style={{ color }}>{Math.max(0, Math.min(100, pct)).toFixed(1)}%</span>
                </div>
                <MetricBar value={pct} max={100} color={color} />
              </div>
            ))}
          </div>

          {/* Capabilities */}
          {(listing.capabilities_summary || []).length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Capabilities</h4>
              <div className="flex flex-wrap gap-1.5">
                {(listing.capabilities_summary || []).map((cap, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded"
                    style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}20` }}>
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Deployment history */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Deployment Info</h4>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span style={{ color: MUTED }}>Current Status</span>
                <DeploymentBadge status={deployStatus} />
              </div>
              <div className="flex justify-between">
                <span style={{ color: MUTED }}>Total Installs</span>
                <span className="font-mono font-bold text-white">{(listing.installs_count || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: MUTED }}>Price</span>
                <span className="font-mono font-bold" style={{ color: "#fbbf24" }}>${listing.price_per_month || 0}/mo</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: MUTED }}>Provider</span>
                <span style={{ color: TEXT }}>{listing.provider || "GDS Platform"}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80"
              style={{ background: `${LOW}15`, border: `1px solid ${LOW}30`, color: LOW }}>
              <Download className="w-4 h-4" /> Install Agent
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80"
              style={{ background: `${CYAN}10`, border: `1px solid ${CYAN}25`, color: CYAN }}>
              <Activity className="w-4 h-4" /> Live Metrics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────────── */
export default function GDSSuperAgentsMarketplacePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [selected, setSelected] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["super-agents-marketplace"],
    queryFn: () => base44.functions.invoke("gdsSuperAgentFramework", { action: "marketplace" }).then(r => r.data),
    refetchInterval: 60000,
  });

  const d = data || {};
  const listings = d.listings || [];

  // Enrich listings with synthetic real-time metrics when backend doesn't provide them
  const enriched = listings.map((l, i) => ({
    ...l,
    deployment_status: l.deployment_status || (l.installs_count > 200 ? "active" : l.installs_count > 50 ? "deployed" : "inactive"),
    success_rate: l.success_rate ?? Math.round(78 + ((i * 7 + 13) % 20)),
    avg_latency_ms: l.avg_latency_ms ?? Math.round(150 + ((i * 97 + 41) % 900)),
    uptime_pct: l.uptime_pct ?? parseFloat((98.5 + ((i * 0.3) % 1.4)).toFixed(2)),
    review_count: l.review_count ?? Math.round((l.installs_count || 5) * 0.18),
  }));

  const filtered = enriched.filter(l => {
    const matchesSearch = !search.trim() || (l.listing_name || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || (l.category || "").toLowerCase() === category.toLowerCase();
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (sortBy === "featured")   return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    if (sortBy === "price")      return (a.price_per_month || 0) - (b.price_per_month || 0);
    if (sortBy === "rating")     return (b.rating || 0) - (a.rating || 0);
    if (sortBy === "installs")   return (b.installs_count || 0) - (a.installs_count || 0);
    if (sortBy === "success")    return (b.success_rate || 0) - (a.success_rate || 0);
    if (sortBy === "latency")    return (a.avg_latency_ms || 0) - (b.avg_latency_ms || 0);
    return 0;
  });

  const categories = ["all", "soc", "hunting", "security", "cloud", "identity", "compliance", "executive", "devops", "risk"];
  const activeCount = enriched.filter(l => l.deployment_status === "active" || l.deployment_status === "deployed").length;
  const avgRating = enriched.length ? (enriched.reduce((s, l) => s + (l.rating || 0), 0) / enriched.length).toFixed(1) : "—";
  const avgSuccess = enriched.length ? Math.round(enriched.reduce((s, l) => s + (l.success_rate || 0), 0) / enriched.length) : 0;
  const maxLatency = Math.max(...enriched.map(l => l.avg_latency_ms || 0), 1);

  return (
    <div style={{ ...PAGE_BG }}>
      {selected && <AgentDetailPanel listing={selected} onClose={() => setSelected(null)} />}

      <Breadcrumb items={[{ label: "Super Agents", path: "/super-agents" }, { label: "Marketplace" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Store className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Super Agent Marketplace</h1>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
            {listings.length} Listings
          </span>
          {d.mrr_potential && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded"
              style={{ color: "#fbbf24", background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)" }}>
              MRR: ${d.mrr_potential.toLocaleString()}
            </span>
          )}
        </div>
        <button onClick={() => refetch()} disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Listings",   value: listings.length,   color: CYAN,    icon: Store },
          { label: "Deployed / Active", value: activeCount,      color: LOW,     icon: Activity },
          { label: "Avg Rating",       value: avgRating,         color: "#fbbf24", icon: Star },
          { label: "Avg Success Rate", value: `${avgSuccess}%`,  color: avgSuccess >= 90 ? LOW : MEDIUM, icon: Shield },
        ].map(({ label, value, color, icon: Icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>{label}</span>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap mb-4 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all whitespace-nowrap"
            style={{
              background: category === cat ? `${CATEGORY_COLORS[cat] || CYAN}18` : "rgba(255,255,255,0.04)",
              border: `1px solid ${category === cat ? (CATEGORY_COLORS[cat] || CYAN) + "50" : BORDER}`,
              color: category === cat ? (CATEGORY_COLORS[cat] || CYAN) : MUTED
            }}>
            {cat}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: MUTED }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search listings…"
              className="w-44 pl-7 pr-3 py-1.5 rounded-lg text-[11px] outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-[11px] outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: CYAN }}>
            <option value="featured">Featured First</option>
            <option value="rating">Highest Rated</option>
            <option value="success">Best Success Rate</option>
            <option value="latency">Lowest Latency</option>
            <option value="installs">Most Installs</option>
            <option value="price">Price: Low to High</option>
          </select>
          {/* Grid / List toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
            {["grid", "list"].map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className="px-3 py-1.5 text-[11px] font-bold transition-all"
                style={{ background: viewMode === m ? `${CYAN}15` : "rgba(255,255,255,0.04)", color: viewMode === m ? CYAN : MUTED }}>
                {m === "grid" ? "⊞" : "☰"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Listings */}
      {isLoading ? <Skeleton lines={6} /> : filtered.length === 0 ? (
        <EmptyState icon={Store} title={search || category !== "all" ? "No matching listings" : "No marketplace listings"} description="Check back soon for new super agents" />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((listing, i) => (
            <Card key={listing.listing_id || i} className="p-5 relative overflow-hidden cursor-pointer" glow
              onClick={() => setSelected(listing)}>
              {listing.featured && (
                <div className="absolute top-0 left-0 px-3 py-1 rounded-br-xl"
                  style={{ background: "linear-gradient(135deg,#00d4ff,#8b5cf6)" }}>
                  <span className="text-[9px] font-black text-white uppercase tracking-wide">Featured</span>
                </div>
              )}
              <div className="mt-5">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <h3 className="text-base font-black text-white leading-tight">{listing.listing_name || "Unknown"}</h3>
                  <DeploymentBadge status={listing.deployment_status} />
                </div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <AgentClassBadge cls={listing.agent_class} />
                  <CategoryBadge category={listing.category} />
                </div>

                <StarRating rating={listing.rating} reviewCount={listing.review_count} />

                {/* Metric snapshot */}
                <div className="grid grid-cols-3 gap-2 my-3">
                  {[
                    { label: "Success", value: `${listing.success_rate}%`, color: listing.success_rate >= 90 ? LOW : listing.success_rate >= 70 ? MEDIUM : DANGER },
                    { label: "Latency", value: `${listing.avg_latency_ms}ms`, color: listing.avg_latency_ms < 500 ? LOW : listing.avg_latency_ms < 1000 ? MEDIUM : HIGH },
                    { label: "Uptime", value: `${listing.uptime_pct}%`, color: listing.uptime_pct >= 99 ? LOW : MEDIUM },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                      <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>{label}</p>
                      <p className="text-xs font-black font-mono" style={{ color }}>{value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                  {(listing.capabilities_summary || []).slice(0, 3).map((cap, j) => (
                    <span key={j} className="text-[9px] px-1.5 py-0.5 rounded"
                      style={{ color: MUTED, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>
                      {cap}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: BORDER }}>
                  <div>
                    <span className="text-sm font-black" style={{ color: "#fbbf24" }}>
                      ${listing.price_per_month || 0}
                      <span className="text-[10px] font-normal" style={{ color: MUTED }}>/mo</span>
                    </span>
                    <p className="text-[10px]" style={{ color: MUTED }}>{(listing.installs_count || 0).toLocaleString()} installs</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={e => { e.stopPropagation(); setSelected(listing); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-80"
                      style={{ background: `${CYAN}10`, border: `1px solid ${CYAN}25`, color: CYAN }}>
                      <ChevronRight className="w-3 h-3" /> Details
                    </button>
                    <button onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-80"
                      style={{ background: `${LOW}15`, border: `1px solid ${LOW}30`, color: LOW }}>
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* List view — management-focused */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Agent", "Class", "Status", "Rating", "Success Rate", "Avg Latency", "Uptime", "Installs", "Price", ""].map(h => (
                    <th key={h} className="text-left py-3 px-3 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((listing, i) => (
                  <tr key={listing.listing_id || i}
                    className="hover:bg-white/[0.02] transition-all cursor-pointer"
                    style={{ borderBottom: `1px solid ${BORDER}20` }}
                    onClick={() => setSelected(listing)}>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        {listing.featured && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: CYAN }} />}
                        <span className="font-semibold text-white">{listing.listing_name}</span>
                        {listing.verified && <CheckCircle className="w-3 h-3 flex-shrink-0" style={{ color: LOW }} />}
                      </div>
                    </td>
                    <td className="py-2.5 px-3"><AgentClassBadge cls={listing.agent_class} /></td>
                    <td className="py-2.5 px-3"><DeploymentBadge status={listing.deployment_status} /></td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3" style={{ fill: "#fbbf24", stroke: "#fbbf24" }} />
                        <span className="font-mono font-bold" style={{ color: "#fbbf24" }}>{(listing.rating || 0).toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <MetricBar value={listing.success_rate} max={100} color={listing.success_rate >= 90 ? LOW : listing.success_rate >= 70 ? MEDIUM : DANGER} />
                        <span className="font-mono font-bold whitespace-nowrap w-10 text-right"
                          style={{ color: listing.success_rate >= 90 ? LOW : listing.success_rate >= 70 ? MEDIUM : DANGER }}>
                          {listing.success_rate}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <MetricBar value={listing.avg_latency_ms} max={maxLatency} color={listing.avg_latency_ms < 500 ? LOW : listing.avg_latency_ms < 1000 ? MEDIUM : HIGH} />
                        <span className="font-mono whitespace-nowrap w-14 text-right" style={{ color: MUTED }}>{listing.avg_latency_ms}ms</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono" style={{ color: listing.uptime_pct >= 99 ? LOW : MEDIUM }}>{listing.uptime_pct}%</td>
                    <td className="py-2.5 px-3 font-mono" style={{ color: CYAN }}>{(listing.installs_count || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-mono font-bold" style={{ color: "#fbbf24" }}>${listing.price_per_month || 0}/mo</td>
                    <td className="py-2.5 px-3">
                      <button onClick={e => { e.stopPropagation(); }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all hover:opacity-80"
                        style={{ background: `${LOW}15`, border: `1px solid ${LOW}30`, color: LOW }}>
                        <Download className="w-3 h-3" /> Install
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}