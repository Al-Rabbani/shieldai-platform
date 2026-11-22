import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Brain, AlertTriangle, DollarSign, Shield, Globe, ChevronRight, X, ExternalLink, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const PROVIDER_COLORS = {
  openai: "#10b981",
  anthropic: "#f97316",
  google: "#3b82f6",
  mistral: "#8b5cf6",
  aws_bedrock: "#eab308",
  cohere: "#06b6d4",
  meta: "#6366f1",
  other: "#6b7280",
};

const PROVIDER_LABELS = {
  openai: "OpenAI", anthropic: "Anthropic", google: "Google",
  mistral: "Mistral", aws_bedrock: "AWS Bedrock", cohere: "Cohere",
  meta: "Meta", other: "Other",
};

const STATUS_STYLES = {
  allowed: { color: "#10b981", bg: "rgba(16,185,129,0.1)", label: "ALLOWED" },
  blocked: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", label: "BLOCKED" },
  flagged: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", label: "FLAGGED" },
  logged: { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", label: "LOGGED" },
};

const REGION_FLAGS = {
  "us-east-1": "🇺🇸",
  "us-west-2": "🇺🇸",
  "us-central1": "🇺🇸",
  "eu-west-1": "🇪🇺",
  "eu-west-2": "🇬🇧",
  "eu-central-1": "🇩🇪",
  "ap-southeast-1": "🇸🇬",
  "ap-northeast-1": "🇯🇵",
};

const COMPLIANCE_EXPLANATIONS = {
  PII_IN_PROMPT_GDPR: { label: "PII IN PROMPT — GDPR", color: "#f59e0b", desc: "Personal data sent to external AI model. GDPR Article 28 requires a Data Processing Agreement with the AI provider." },
  HIPAA_PHI_RISK: { label: "HIPAA PHI RISK", color: "#ef4444", desc: "Protected Health Information detected in AI prompt. HIPAA §164.312 compliance risk — AI providers are not HIPAA BAAs by default." },
  PII_CRITICAL_PCI_GDPR: { label: "PCI-DSS + GDPR CRITICAL", color: "#ef4444", desc: "Payment card or SSN data sent to AI model. Critical PCI-DSS and GDPR violation. Immediate remediation required." },
  PROMPT_INJECTION_BLOCKED: { label: "PROMPT INJECTION", color: "#ef4444", desc: "Attempt to manipulate AI model via injected instructions. Request blocked by ShieldAI Zen." },
};

function ProviderBadge({ provider }) {
  const color = PROVIDER_COLORS[provider] || "#6b7280";
  const label = PROVIDER_LABELS[provider] || provider;
  return (
    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold"
      style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
      {label}
    </span>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.logged;
  return (
    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
      style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

function EventDrawer({ event, open, onClose }) {
  if (!event) return null;
  const flags = event.compliance_flags ? event.compliance_flags.split(",").map(f => f.trim()) : [];
  const piiTypes = event.pii_types ? event.pii_types.split(",").map(t => t.trim()) : [];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto" style={{ background: "#0a0f1e", border: "none", borderLeft: "1px solid rgba(124,58,237,0.3)" }}>
        <SheetHeader>
          <SheetTitle className="text-white text-sm font-mono flex items-center gap-2">
            <Brain className="w-4 h-4 text-violet-400" />
            LLM Event Detail
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={event.status} />
            <span className="text-xs text-slate-400 font-mono">{event.app_name}</span>
            <span className="text-xs text-white font-bold">{event.model}</span>
            <ProviderBadge provider={event.provider} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Tokens In", value: (event.tokens_in || 0).toLocaleString(), color: "#94a3b8" },
              { label: "Tokens Out", value: (event.tokens_out || 0).toLocaleString(), color: "#94a3b8" },
              { label: "Cost", value: `$${(event.cost_usd || 0).toFixed(4)}`, color: "#a78bfa" },
              { label: "Latency", value: `${event.latency_ms}ms`, color: "#94a3b8" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg p-3" style={{ background: "#0f172a", border: "1px solid rgba(30,58,95,0.4)" }}>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-mono font-bold mt-1" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg p-3 space-y-2" style={{ background: "#0f172a", border: "1px solid rgba(30,58,95,0.4)" }}>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Data Destination</p>
            <p className="text-xs font-mono text-slate-300">{event.data_destination_url}</p>
            <p className="text-xs text-slate-400">{REGION_FLAGS[event.data_destination_region] || "🌐"} {event.data_destination_region}</p>
            <p className="text-xs font-mono text-slate-600">{event.endpoint}</p>
          </div>

          {piiTypes.length > 0 && (
            <div className="rounded-lg p-3" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.3)" }}>
              <p className="text-[10px] text-amber-400 uppercase tracking-wider font-mono mb-2">⚠️ PII Detected</p>
              <div className="flex flex-wrap gap-1.5">
                {piiTypes.map(t => (
                  <span key={t} className="text-[11px] px-2 py-0.5 rounded font-mono"
                    style={{ color: "#fbbf24", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {event.prompt_injection_detected && event.prompt_injection_payload && (
            <div className="rounded-lg p-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <p className="text-[10px] text-red-400 uppercase tracking-wider font-mono mb-2">🚨 Prompt Injection Payload</p>
              <pre className="text-xs font-mono text-red-300 whitespace-pre-wrap leading-relaxed">{event.prompt_injection_payload}</pre>
            </div>
          )}

          {flags.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Compliance Flags</p>
              {flags.map(flag => {
                const info = COMPLIANCE_EXPLANATIONS[flag];
                if (!info) return null;
                return (
                  <div key={flag} className="rounded-lg p-3" style={{ background: "rgba(239,68,68,0.06)", border: `1px solid ${info.color}30` }}>
                    <p className="text-[11px] font-mono font-bold mb-1" style={{ color: info.color }}>{info.label}</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{info.desc}</p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <Button size="sm" className="text-xs h-8 bg-violet-600 hover:bg-violet-500 text-white"
              onClick={() => { toast.success("Compliance ticket created"); onClose(); }}>
              Create Compliance Ticket
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-8 border-red-500/30 text-red-400 hover:bg-red-500/10"
              onClick={() => { toast.success("Model blocked for this app"); onClose(); }}>
              Block This Model
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-8 border-slate-700 text-slate-400"
              onClick={() => { toast.success("Event exported for DPA review"); }}>
              Export for DPA Review
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const PAGE_SIZE = 25;

export default function LLMMonitorPage() {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterApp, setFilterApp] = useState("all");
  const [filterModel, setFilterModel] = useState("all");
  const [filterProvider, setFilterProvider] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPII, setFilterPII] = useState(false);
  const [filterInjection, setFilterInjection] = useState(false);
  const [page, setPage] = useState(1);

  const qc = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["llm-events"],
    queryFn: () => base44.entities.LLMUsageEvent.list("-called_at", 200),
    initialData: [],
  });

  const today = new Date().toISOString().slice(0, 10);
  const todayEvents = events.filter(e => e.called_at?.slice(0, 10) === today);
  const totalCallsToday = todayEvents.length;
  const injectionBlocked = events.filter(e => e.prompt_injection_detected).length;
  const piiIncidents = events.filter(e => e.pii_detected).length;
  const totalCostToday = todayEvents.reduce((s, e) => s + (e.cost_usd || 0), 0);
  const modelsInUse = new Set(events.map(e => e.model)).size;
  const blockedCalls = events.filter(e => e.status === "blocked").length;

  const costByModel = useMemo(() => {
    const map = {};
    events.forEach(e => {
      if (!map[e.model]) map[e.model] = { model: e.model, provider: e.provider, cost: 0, calls: 0 };
      map[e.model].cost += e.cost_usd || 0;
      map[e.model].calls += 1;
    });
    return Object.values(map).sort((a, b) => b.cost - a.cost);
  }, [events]);

  const destByRegion = useMemo(() => {
    const map = {};
    events.forEach(e => {
      const r = e.data_destination_region || "unknown";
      if (!map[r]) map[r] = 0;
      map[r]++;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [events]);

  const allApps = [...new Set(events.map(e => e.app_name))];
  const allModels = [...new Set(events.map(e => e.model))];
  const allProviders = [...new Set(events.map(e => e.provider))];

  const filtered = useMemo(() => events.filter(e => {
    if (filterApp !== "all" && e.app_name !== filterApp) return false;
    if (filterModel !== "all" && e.model !== filterModel) return false;
    if (filterProvider !== "all" && e.provider !== filterProvider) return false;
    if (filterStatus !== "all" && e.status !== filterStatus) return false;
    if (filterPII && !e.pii_detected) return false;
    if (filterInjection && !e.prompt_injection_detected) return false;
    return true;
  }), [events, filterApp, filterModel, filterProvider, filterStatus, filterPII, filterInjection]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const tooltipStyle = { backgroundColor: "#0f172a", border: "1px solid #1e3a5f", borderRadius: 8, color: "#e2e8f0", fontSize: 11 };

  return (
    <div className="space-y-6">
      {/* HERO */}
      <div className="relative rounded-2xl overflow-hidden p-8" style={{
        background: "linear-gradient(135deg, #0d0720 0%, #130a2e 50%, #0a0f1e 100%)",
        border: "1px solid rgba(124,58,237,0.3)",
      }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 80% 50%, #7c3aed 0%, transparent 60%)" }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-violet-400" />
            <span className="text-[11px] font-mono text-violet-400 uppercase tracking-widest">AI/LLM Usage Intelligence</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-3" style={{ fontFamily: "JetBrains Mono, monospace" }}>
            AI Usage Monitor
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed mb-6">
            Know exactly which AI models your applications are calling, where your data goes, how much it costs, and whether it's compliant.{" "}
            <span className="text-violet-400 font-semibold">The only AppSec platform that monitors LLM usage properly.</span>
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="text-xs px-3 py-1.5 rounded-full font-mono" style={{ background: "rgba(124,58,237,0.12)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.3)" }}>
              {modelsInUse} models in use
            </span>
            <span className="text-xs px-3 py-1.5 rounded-full font-mono" style={{ background: "rgba(124,58,237,0.12)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.3)" }}>
              ${totalCostToday.toFixed(3)} total spend today
            </span>
            <span className="text-xs px-3 py-1.5 rounded-full font-mono" style={{ background: piiIncidents > 0 ? "rgba(245,158,11,0.12)" : "rgba(124,58,237,0.12)", color: piiIncidents > 0 ? "#fbbf24" : "#c4b5fd", border: `1px solid ${piiIncidents > 0 ? "rgba(245,158,11,0.3)" : "rgba(124,58,237,0.3)"}` }}>
              {piiIncidents} PII incidents flagged
            </span>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "LLM Calls Today", value: totalCallsToday, color: "#a78bfa" },
          { label: "Injections Blocked", value: injectionBlocked, color: "#ef4444" },
          { label: "PII Incidents", value: piiIncidents, color: "#f59e0b" },
          { label: "Cost Today", value: `$${totalCostToday.toFixed(3)}`, color: "#a78bfa" },
          { label: "Models in Use", value: modelsInUse, color: "#06b6d4" },
          { label: "Blocked Calls", value: blockedCalls, color: "#ef4444" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-4 text-center" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
            <p className="text-xl font-black font-mono" style={{ color }}>{value}</p>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* PII ALERT BANNER */}
      {piiIncidents > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)" }}>
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="text-sm text-amber-300">
            <strong>{piiIncidents} events</strong> flagged for PII in AI prompts.{" "}
            <span className="text-amber-400/80">Review for GDPR/HIPAA compliance. Personal data sent to external AI providers may require a Data Processing Agreement.</span>
          </span>
          <button onClick={() => setFilterPII(true)} className="ml-auto text-xs text-amber-400 underline flex-shrink-0">
            View all PII events →
          </button>
        </div>
      )}

      {/* ANALYTICS PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Cost by Model */}
        <div className="rounded-xl p-5" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          <h3 className="text-sm font-bold text-white mb-4">Cost by Model</h3>
          <div className="space-y-3">
            {costByModel.map(({ model, provider, cost, calls }) => {
              const maxCost = costByModel[0]?.cost || 1;
              return (
                <div key={model}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-white">{model}</span>
                      <ProviderBadge provider={provider} />
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-violet-300">${cost.toFixed(4)}</span>
                      <span className="text-[10px] text-slate-500 ml-2">{calls} calls</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "rgba(30,58,95,0.5)" }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${(cost / maxCost) * 100}%`, background: PROVIDER_COLORS[provider] || "#7c3aed" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Data Destinations */}
        <div className="rounded-xl p-5" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          <h3 className="text-sm font-bold text-white mb-4">Data Destinations</h3>
          <div className="space-y-3">
            {destByRegion.map(([region, count]) => {
              const isEU = region.startsWith("eu");
              const flag = REGION_FLAGS[region] || "🌐";
              const hasEUUserData = !isEU && events.some(e => e.data_destination_region === region && e.pii_detected);
              return (
                <div key={region} className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: "#0f172a", border: `1px solid ${hasEUUserData ? "rgba(245,158,11,0.3)" : "rgba(30,58,95,0.3)"}` }}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{flag}</span>
                    <div>
                      <p className="text-xs font-mono text-white">{region}</p>
                      {hasEUUserData && <p className="text-[10px] text-amber-400">⚠️ EU user data sent here</p>}
                      {isEU && <p className="text-[10px] text-emerald-400">EU data staying in EU ✓</p>}
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold text-slate-300">{count} calls</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={filterApp} onValueChange={setFilterApp}>
          <SelectTrigger className="h-8 w-40 text-xs border-slate-700 bg-[#0a0f1e]"><SelectValue placeholder="All Apps" /></SelectTrigger>
          <SelectContent className="bg-[#0f172a] border-slate-700">
            <SelectItem value="all" className="text-xs">All Apps</SelectItem>
            {allApps.map(a => <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterModel} onValueChange={setFilterModel}>
          <SelectTrigger className="h-8 w-44 text-xs border-slate-700 bg-[#0a0f1e]"><SelectValue placeholder="All Models" /></SelectTrigger>
          <SelectContent className="bg-[#0f172a] border-slate-700">
            <SelectItem value="all" className="text-xs">All Models</SelectItem>
            {allModels.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterProvider} onValueChange={setFilterProvider}>
          <SelectTrigger className="h-8 w-36 text-xs border-slate-700 bg-[#0a0f1e]"><SelectValue placeholder="All Providers" /></SelectTrigger>
          <SelectContent className="bg-[#0f172a] border-slate-700">
            <SelectItem value="all" className="text-xs">All Providers</SelectItem>
            {allProviders.map(p => <SelectItem key={p} value={p} className="text-xs">{PROVIDER_LABELS[p]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-32 text-xs border-slate-700 bg-[#0a0f1e]"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent className="bg-[#0f172a] border-slate-700">
            <SelectItem value="all" className="text-xs">All Status</SelectItem>
            {["allowed","blocked","flagged","logged"].map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <button onClick={() => setFilterPII(f => !f)}
          className="h-8 px-3 text-xs rounded-md font-mono transition-colors"
          style={{ background: filterPII ? "rgba(245,158,11,0.15)" : "#0a0f1e", color: filterPII ? "#fbbf24" : "#6b7280", border: `1px solid ${filterPII ? "rgba(245,158,11,0.4)" : "rgba(30,58,95,0.4)"}` }}>
          {filterPII ? "✓" : ""} PII Only
        </button>
        <button onClick={() => setFilterInjection(f => !f)}
          className="h-8 px-3 text-xs rounded-md font-mono transition-colors"
          style={{ background: filterInjection ? "rgba(239,68,68,0.15)" : "#0a0f1e", color: filterInjection ? "#f87171" : "#6b7280", border: `1px solid ${filterInjection ? "rgba(239,68,68,0.4)" : "rgba(30,58,95,0.4)"}` }}>
          {filterInjection ? "✓" : ""} Injections Only
        </button>
        {(filterApp !== "all" || filterModel !== "all" || filterProvider !== "all" || filterStatus !== "all" || filterPII || filterInjection) && (
          <button onClick={() => { setFilterApp("all"); setFilterModel("all"); setFilterProvider("all"); setFilterStatus("all"); setFilterPII(false); setFilterInjection(false); setPage(1); }}
            className="h-8 px-3 text-xs text-slate-500 hover:text-white transition-colors">
            Clear filters
          </button>
        )}
        <span className="ml-auto text-[11px] text-slate-500 font-mono">{filtered.length} events</span>
      </div>

      {/* EVENTS TABLE */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(30,58,95,0.4)" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#0f172a", borderBottom: "1px solid rgba(30,58,95,0.4)" }}>
                {["Status","App","Model","Endpoint","Tokens","Cost","Latency","Region","Flags","Time"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-mono text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} style={{ borderTop: "1px solid rgba(30,58,95,0.2)" }}>
                    {[...Array(10)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: "#1e293b", width: "60%" }} /></td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-slate-600 text-sm">No events match filters</td></tr>
              ) : paginated.map((e, i) => {
                const minsAgo = Math.round((Date.now() - new Date(e.called_at)) / 60000);
                return (
                  <tr key={e.id} onClick={() => setSelectedEvent(e)}
                    className="cursor-pointer hover:bg-white/[0.02] transition-colors"
                    style={{ background: i % 2 === 0 ? "#070d1a" : "#0a0f1e", borderTop: "1px solid rgba(30,58,95,0.2)" }}>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={e.status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-300 font-mono whitespace-nowrap">{e.app_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <p className="text-xs font-bold text-white">{e.model}</p>
                        <ProviderBadge provider={e.provider} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[11px] font-mono text-slate-500 max-w-[160px] truncate">{e.endpoint}</td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-400 whitespace-nowrap">{e.tokens_in} → {e.tokens_out}</td>
                    <td className="px-4 py-3 text-xs font-mono font-bold text-violet-300 whitespace-nowrap">${(e.cost_usd || 0).toFixed(4)}</td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-400 whitespace-nowrap">{e.latency_ms}ms</td>
                    <td className="px-4 py-3 text-[11px] font-mono text-slate-500 whitespace-nowrap">
                      {REGION_FLAGS[e.data_destination_region] || "🌐"} {e.data_destination_region}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-1.5">
                        {e.pii_detected && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold"
                            style={{ color: "#f59e0b", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)" }}>
                            ⚠️ PII
                          </span>
                        )}
                        {e.prompt_injection_detected && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold"
                            style={{ color: "#ef4444", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
                            🚨 INJECT
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-600 font-mono whitespace-nowrap">{minsAgo}m ago</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid rgba(30,58,95,0.4)", background: "#0f172a" }}>
            <span className="text-[11px] text-slate-500 font-mono">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs border-slate-700" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs border-slate-700" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* AI MODEL GOVERNANCE */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(30,58,95,0.4)" }}>
        <div className="p-4" style={{ background: "#0f172a", borderBottom: "1px solid rgba(30,58,95,0.4)" }}>
          <h3 className="text-sm font-bold text-white">AI Model Governance</h3>
          <p className="text-[11px] text-slate-500 mt-1">Allow or block AI models used by your applications</p>
        </div>
        <div className="divide-y" style={{ "--tw-divide-color": "rgba(30,58,95,0.3)" }}>
          {costByModel.map(({ model, provider, cost, calls }) => {
            const piiCount = events.filter(e => e.model === model && e.pii_detected).length;
            return (
              <div key={model} className="flex items-center gap-4 px-5 py-3 flex-wrap" style={{ background: "#070d1a" }}>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-xs font-mono font-bold text-white">{model}</span>
                  <ProviderBadge provider={provider} />
                </div>
                <div className="flex items-center gap-5 text-xs flex-wrap">
                  <div className="text-center">
                    <p className="font-mono text-slate-300">{calls}</p>
                    <p className="text-[10px] text-slate-600">calls</p>
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-violet-300">${cost.toFixed(4)}</p>
                    <p className="text-[10px] text-slate-600">total cost</p>
                  </div>
                  <div className="text-center">
                    <p className="font-mono" style={{ color: piiCount > 0 ? "#f59e0b" : "#10b981" }}>{piiCount}</p>
                    <p className="text-[10px] text-slate-600">PII events</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-[10px] border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={() => toast.success(`${model} added to blocklist`)}>
                    Block
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                    onClick={() => toast.success(`Approval required for ${model}`)}>
                    Require Approval
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] border-slate-700 text-slate-400"
                    onClick={() => toast.success(`Cost limit set for ${model}`)}>
                    Set Cost Limit
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <EventDrawer event={selectedEvent} open={!!selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}