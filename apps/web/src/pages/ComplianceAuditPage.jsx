import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, CheckCircle2, XCircle, AlertTriangle, MinusCircle, Search, ChevronDown, ChevronRight, Filter } from "lucide-react";

const GOLD = "#C9A84C";

const FRAMEWORKS = ["SOC2", "ISO27001", "NIST_CSF", "CIS_Benchmark", "PCI_DSS", "GDPR", "HIPAA"];

const FRAMEWORK_META = {
  SOC2:          { color: "#6366F1", desc: "Trust Service Criteria" },
  ISO27001:      { color: "#0EA5E9", desc: "Information Security Management" },
  NIST_CSF:      { color: "#22c55e", desc: "Cybersecurity Framework" },
  CIS_Benchmark: { color: "#f97316", desc: "Center for Internet Security" },
  PCI_DSS:       { color: "#ef4444", desc: "Payment Card Industry" },
  GDPR:          { color: "#8b5cf6", desc: "Data Protection Regulation" },
  HIPAA:         { color: "#06b6d4", desc: "Health Data Privacy" },
};

const STATUS_META = {
  passing:        { label: "Passing",        color: "#22c55e", bg: "rgba(34,197,94,0.1)",  icon: CheckCircle2 },
  failing:        { label: "Failing",        color: "#ef4444", bg: "rgba(239,68,68,0.1)",  icon: XCircle },
  partial:        { label: "Partial",        color: "#eab308", bg: "rgba(234,179,8,0.1)",  icon: AlertTriangle },
  not_applicable: { label: "N/A",            color: "#6B7280", bg: "rgba(107,114,128,0.1)", icon: MinusCircle },
  not_tested:     { label: "Not Tested",     color: "#374151", bg: "rgba(55,65,81,0.1)",   icon: MinusCircle },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.not_tested;
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ color: m.color, background: m.bg }}>
      <Icon className="w-3 h-3" /> {m.label}
    </span>
  );
}

function ScoreRing({ score, color }) {
  const r = 28, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={72} height={72} viewBox="0 0 72 72">
      <circle cx={36} cy={36} r={r} fill="none" stroke="#1F2937" strokeWidth={7} />
      <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ * 0.25} strokeLinecap="round" />
      <text x={36} y={40} textAnchor="middle" fill={color} fontSize={16} fontWeight="800" fontFamily="Inter">{score}%</text>
    </svg>
  );
}

function FrameworkCard({ framework, controls, isSelected, onClick }) {
  const meta = FRAMEWORK_META[framework] || { color: GOLD, desc: "" };
  const total = controls.length;
  const passing = controls.filter(c => c.status === "passing").length;
  const failing = controls.filter(c => c.status === "failing").length;
  const partial = controls.filter(c => c.status === "partial").length;
  const score = total > 0 ? Math.round((passing + partial * 0.5) / total * 100) : 0;

  return (
    <button onClick={onClick}
      className={`w-full text-left rounded-xl p-4 border transition-all hover:scale-[1.01] ${isSelected ? "border-opacity-80" : "border-[#1F2937]"}`}
      style={{ background: "#111827", borderColor: isSelected ? meta.color : "#1F2937" }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold text-white">{framework.replace("_", " ")}</span>
            {isSelected && <ChevronRight className="w-3.5 h-3.5" style={{ color: meta.color }} />}
          </div>
          <p className="text-[10px] text-slate-500">{meta.desc}</p>
          <div className="flex items-center gap-3 mt-2 text-[10px]">
            <span className="text-emerald-400">✓ {passing} passing</span>
            {failing > 0 && <span className="text-red-400">✗ {failing} failing</span>}
            {partial > 0 && <span className="text-yellow-400">~ {partial} partial</span>}
          </div>
        </div>
        <ScoreRing score={score} color={meta.color} />
      </div>
      <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "#1F2937" }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: meta.color }} />
      </div>
    </button>
  );
}

function ControlRow({ control, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const meta = FRAMEWORK_META[control.framework] || { color: GOLD };

  return (
    <div className="border-b last:border-0" style={{ borderColor: "#1F2937" }}>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] cursor-pointer transition-colors"
        onClick={() => setOpen(o => !o)}>
        <ChevronRight className={`w-3.5 h-3.5 text-slate-600 flex-shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
        <span className="text-[10px] font-mono font-bold w-20 flex-shrink-0" style={{ color: meta.color }}>
          {control.control_id}
        </span>
        <p className="text-xs text-slate-300 flex-1 truncate">{control.title}</p>
        {control.risk_level && (
          <span className={`text-[10px] font-bold flex-shrink-0 ${
            control.risk_level === "critical" ? "text-red-400" :
            control.risk_level === "high" ? "text-orange-400" :
            control.risk_level === "medium" ? "text-yellow-400" : "text-blue-400"}`}>
            {control.risk_level.toUpperCase()}
          </span>
        )}
        {control.assigned_to && (
          <span className="text-[10px] text-slate-500 flex-shrink-0 hidden md:block">{control.assigned_to}</span>
        )}
        <div className="flex-shrink-0">
          <StatusBadge status={control.status} />
        </div>
        <select
          value={control.status}
          onClick={e => e.stopPropagation()}
          onChange={e => onStatusChange(control.id, e.target.value)}
          className="text-[10px] px-2 py-1 rounded-lg text-slate-300 outline-none flex-shrink-0"
          style={{ background: "#1F2937", border: "1px solid #374151" }}>
          {Object.keys(STATUS_META).map(s => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
      </div>

      {open && (
        <div className="px-10 pb-4 space-y-2">
          {control.description && (
            <p className="text-xs text-slate-400 leading-relaxed">{control.description}</p>
          )}
          <div className="flex items-center gap-4 text-[10px] text-slate-500 flex-wrap">
            {control.category && <span>Category: <span className="text-slate-300">{control.category}</span></span>}
            {control.evidence_count > 0 && <span>Evidence: <span className="text-slate-300">{control.evidence_count} items</span></span>}
            {control.automated && <span className="text-emerald-400">⚡ Automated</span>}
            {control.last_tested && <span>Last tested: <span className="text-slate-300">{new Date(control.last_tested).toLocaleDateString()}</span></span>}
          </div>
          {control.remediation_notes && (
            <p className="text-xs text-slate-400 italic border-l-2 border-[#374151] pl-3">{control.remediation_notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

// Seed controls for a given framework so the page is useful with no data
const SEED_CONTROLS = {
  SOC2: [
    { control_id: "CC6.1", title: "Logical Access Controls", category: "Common Criteria", risk_level: "critical" },
    { control_id: "CC6.2", title: "Authentication & Authorization", category: "Common Criteria", risk_level: "high" },
    { control_id: "CC7.1", title: "System Monitoring", category: "Common Criteria", risk_level: "high" },
    { control_id: "CC8.1", title: "Change Management Process", category: "Common Criteria", risk_level: "medium" },
    { control_id: "A1.1", title: "Availability SLAs Defined", category: "Availability", risk_level: "medium" },
  ],
  ISO27001: [
    { control_id: "A.9.1", title: "Access Control Policy", category: "Access Control", risk_level: "critical" },
    { control_id: "A.12.1", title: "Operational Procedures", category: "Operations Security", risk_level: "high" },
    { control_id: "A.14.2", title: "Security in Dev Lifecycle", category: "System Acquisition", risk_level: "high" },
    { control_id: "A.16.1", title: "Incident Management", category: "Incident Management", risk_level: "critical" },
    { control_id: "A.18.1", title: "Legal Compliance", category: "Compliance", risk_level: "medium" },
  ],
};

export default function ComplianceAuditPage() {
  const [selectedFramework, setSelectedFramework] = useState("SOC2");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const qc = useQueryClient();

  const { data: controls = [], isLoading } = useQuery({
    queryKey: ["compliance-controls"],
    queryFn: () => base44.entities.ComplianceControl.list("-created_date", 500).catch(() => []),
    initialData: [],
  });

  const { data: frameworks = [] } = useQuery({
    queryKey: ["compliance-frameworks"],
    queryFn: () => base44.entities.ComplianceFramework.list().catch(() => []),
    initialData: [],
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }) => base44.entities.ComplianceControl.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance-controls"] }),
  });

  // Group controls by framework, falling back to seed data for display
  const controlsByFramework = useMemo(() => {
    const grouped = {};
    FRAMEWORKS.forEach(fw => {
      grouped[fw] = controls.filter(c => c.framework === fw);
    });
    return grouped;
  }, [controls]);

  // Augment with seed data for frameworks that have no real controls yet
  const displayControls = useMemo(() => {
    const real = controlsByFramework[selectedFramework] || [];
    if (real.length > 0) return real;
    // Return seed controls as read-only placeholders
    return (SEED_CONTROLS[selectedFramework] || []).map((c, i) => ({
      ...c,
      id: `seed-${i}`,
      framework: selectedFramework,
      status: ["passing", "failing", "partial", "not_tested"][i % 4],
      automated: i % 3 === 0,
    }));
  }, [controlsByFramework, selectedFramework]);

  const filtered = useMemo(() => displayControls.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search && !c.title?.toLowerCase().includes(search.toLowerCase()) &&
        !c.control_id?.toLowerCase().includes(search.toLowerCase()) &&
        !c.category?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [displayControls, statusFilter, search]);

  const overallScore = useMemo(() => {
    const all = controls.length > 0 ? controls : Object.values(SEED_CONTROLS).flat().map((c, i) => ({
      ...c, status: ["passing", "failing", "partial", "not_tested"][i % 4]
    }));
    const pass = all.filter(c => c.status === "passing").length;
    const partial = all.filter(c => c.status === "partial").length;
    return all.length > 0 ? Math.round((pass + partial * 0.5) / all.length * 100) : 0;
  }, [controls]);

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <style>{`@keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fu 0.35s ease both}`}</style>

      {/* Header */}
      <div className="fu">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <ClipboardCheck className="w-3.5 h-3.5" /><span>Governance</span><span>/</span>
          <span style={{ color: GOLD }}>Compliance Audit</span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Compliance Audit View</h1>
            <p className="text-slate-400 text-sm mt-0.5">Real-time control mapping across SOC 2, ISO 27001, and more</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-3xl font-black" style={{ color: overallScore >= 70 ? "#22c55e" : overallScore >= 40 ? "#eab308" : "#ef4444" }}>
                {overallScore}%
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Overall Score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Framework cards */}
      <div className="fu grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3" style={{ animationDelay: "60ms" }}>
        {FRAMEWORKS.map(fw => (
          <FrameworkCard
            key={fw}
            framework={fw}
            controls={controlsByFramework[fw]?.length > 0 ? controlsByFramework[fw] : (SEED_CONTROLS[fw] || []).map((c, i) => ({ ...c, status: ["passing", "failing", "partial", "not_tested"][i % 4] }))}
            isSelected={selectedFramework === fw}
            onClick={() => setSelectedFramework(fw)}
          />
        ))}
      </div>

      {/* Controls table */}
      <div className="fu rounded-2xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937", animationDelay: "100ms" }}>
        {/* Table header */}
        <div className="p-4 border-b flex items-center gap-3 flex-wrap" style={{ borderColor: "#1F2937" }}>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: FRAMEWORK_META[selectedFramework]?.color || GOLD }} />
            <h2 className="text-sm font-bold text-white">{selectedFramework.replace("_", " ")} Controls</h2>
            <span className="text-[10px] text-slate-500">({filtered.length} shown)</span>
          </div>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {/* Status filter */}
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg text-slate-300 outline-none"
              style={{ background: "#1F2937", border: "1px solid #374151" }}>
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search controls…"
                className="pl-8 pr-3 py-1.5 rounded-lg text-xs text-slate-300 outline-none w-44"
                style={{ background: "#1F2937", border: "1px solid #374151" }} />
            </div>
          </div>
        </div>

        {/* Status summary bar */}
        <div className="px-4 py-3 flex items-center gap-4 border-b flex-wrap" style={{ borderColor: "#1F2937", background: "#0d1220" }}>
          {Object.entries(STATUS_META).map(([k, m]) => {
            const count = displayControls.filter(c => c.status === k).length;
            return count > 0 ? (
              <button key={k} onClick={() => setStatusFilter(statusFilter === k ? "all" : k)}
                className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${statusFilter === k ? "ring-1" : ""}`}
                style={{ color: m.color, background: m.bg, ringColor: m.color }}>
                <m.icon className="w-3 h-3" /> {count} {m.label}
              </button>
            ) : null;
          })}
        </div>

        {/* Controls list */}
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading controls…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardCheck className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No controls match your filters</p>
          </div>
        ) : (
          <div>
            {filtered.map(control => (
              <ControlRow
                key={control.id}
                control={control}
                onStatusChange={(id, status) => {
                  if (id.startsWith("seed-")) return; // can't update seed rows
                  updateMut.mutate({ id, status });
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}