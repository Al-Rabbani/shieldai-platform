import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, AlertTriangle, Zap, Clock, X, CheckCircle2 } from "lucide-react";

const SEV_STYLE = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.35)", stripe: "#ef4444", glow: "rgba(239,68,68,0.3)" },
  high: { color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.3)", stripe: "#f97316", glow: "none" },
  medium: { color: "#eab308", bg: "rgba(234,179,8,0.08)", border: "rgba(234,179,8,0.25)", stripe: "#eab308", glow: "none" },
  low: { color: "#3b82f6", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.25)", stripe: "#3b82f6", glow: "none" },
};
const STATUS_STYLE = {
  active: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)" },
  investigating: { color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)" },
  contained: { color: "#eab308", bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.3)" },
  resolved: { color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)" },
  false_positive: { color: "#475569", bg: "rgba(71,85,105,0.12)", border: "rgba(71,85,105,0.3)" },
};
const INC_STEPS = ["open", "triaging", "containment", "eradication", "recovery", "closed"];
const INC_STEP_COLORS = { open: "#ef4444", triaging: "#f97316", containment: "#eab308", eradication: "#8b5cf6", recovery: "#3b82f6", closed: "#10b981", post_mortem: "#10b981" };

function ConfidenceRing({ score }) {
  const r = 14, c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  const color = score >= 80 ? "#ef4444" : score >= 50 ? "#eab308" : "#10b981";
  return (
    <svg width="36" height="36" className="flex-shrink-0">
      <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(30,58,95,0.5)" strokeWidth="3" />
      <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
        transform="rotate(-90 18 18)" />
      <text x="18" y="22" textAnchor="middle" fontSize="8" fill={color} fontFamily="JetBrains Mono" fontWeight="bold">{score}%</text>
    </svg>
  );
}

function KillSwitchModal({ threat, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(3,7,18,0.85)", backdropFilter: "blur(8px)" }}>
      <div className="rounded-2xl p-6 w-full max-w-md animate-slide-in-up" style={{ background: "#0f172a", border: "2px solid rgba(239,68,68,0.4)", boxShadow: "0 0 40px rgba(239,68,68,0.2)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <Zap className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Activate Kill Switch</h3>
            <p className="text-[11px] text-slate-500 font-mono">IRREVERSIBLE ACTION</p>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-600 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-3 rounded-lg mb-4" style={{ background: "#030712", border: "1px solid rgba(239,68,68,0.2)" }}>
          <p className="text-xs font-mono text-slate-300">{threat?.service_name}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{threat?.threat_type?.replace(/_/g," ")}</p>
        </div>
        <div className="flex items-center gap-2 mb-4 p-2.5 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-[11px] text-red-400">This will immediately isolate {threat?.service_name} from all network traffic. This action cannot be undone.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors" style={{ background: "#1e293b", border: "1px solid rgba(30,58,95,0.5)" }}>
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-lg text-sm font-bold text-white transition-all hover:scale-105 btn-interactive"
            style={{ background: "linear-gradient(135deg, #dc2626, #ef4444)", boxShadow: "0 0 20px rgba(239,68,68,0.4)" }}>
            ⚡ ACTIVATE KILL SWITCH
          </button>
        </div>
      </div>
    </div>
  );
}

function ThreatCard({ threat, onKillSwitch }) {
  const sev = SEV_STYLE[threat.severity] || SEV_STYLE.low;
  const isCritical = threat.severity === "critical" && threat.status === "active";
  return (
    <div className="rounded-xl p-4 card-hover animate-slide-in-up relative overflow-hidden"
      style={{
        background: sev.bg,
        border: `1px solid ${sev.border}`,
        borderLeft: `4px solid ${sev.stripe}`,
        boxShadow: isCritical ? `0 0 20px ${sev.glow}` : "none",
        animation: isCritical ? `pulse-red 3s infinite` : undefined,
      }}>
      {isCritical && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
      <div className="flex items-start gap-3">
        <ConfidenceRing score={threat.confidence_score || 0} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-bold text-white font-mono">{threat.service_name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium capitalize"
              style={{ color: sev.color, background: sev.bg, border: `1px solid ${sev.border}` }}>
              {threat.threat_type?.replace(/_/g, " ")}
            </span>
            {threat.mitre_technique && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded text-slate-500"
                style={{ background: "#030712", border: "1px solid rgba(30,58,95,0.4)" }}>
                {threat.mitre_technique}
              </span>
            )}
          </div>
          {threat.description && <p className="text-[11px] text-slate-400 mb-1.5 line-clamp-2">{threat.description}</p>}
          <div className="flex items-center gap-4 text-[10px] font-mono">
            {threat.source_ip && <span className="text-red-400">{threat.source_ip}</span>}
            {threat.target_resource && <span className="text-slate-500">→ {threat.target_resource}</span>}
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded capitalize font-medium"
              style={{ color: STATUS_STYLE[threat.status]?.color, background: STATUS_STYLE[threat.status]?.bg, border: `1px solid ${STATUS_STYLE[threat.status]?.border}` }}>
              {threat.status}
            </span>
            {threat.mitre_tactic && <span className="text-[10px] px-1.5 py-0.5 rounded text-blue-400" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>{threat.mitre_tactic}</span>}
            <span className="text-[10px] text-slate-600">{threat.event_count} events</span>
          </div>
        </div>
        {threat.status === "active" && !threat.kill_switch_triggered && (
          <button onClick={() => onKillSwitch(threat)}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold text-red-400 transition-all hover:scale-105 btn-interactive"
            style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", boxShadow: "0 0 12px rgba(239,68,68,0.2)" }}>
            ⚡ Kill Switch
          </button>
        )}
        {threat.kill_switch_triggered && (
          <span className="flex-shrink-0 text-[10px] px-2 py-1 rounded font-bold text-amber-400" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
            ISOLATED
          </span>
        )}
      </div>
    </div>
  );
}

function IncidentStepper({ incident }) {
  const stepIdx = INC_STEPS.indexOf(incident.status);
  const sev = SEV_STYLE[incident.severity] || SEV_STYLE.low;
  return (
    <div className="rounded-xl p-4 mb-3" style={{ background: "#0a0f1e", border: `1px solid ${sev.border}`, borderLeft: `3px solid ${sev.stripe}` }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-white">{incident.threat_name}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{incident.assigned_to || "Unassigned"}</p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded border font-bold uppercase" style={{ color: sev.color, border: `1px solid ${sev.border}`, background: sev.bg }}>{incident.severity}</span>
      </div>
      {/* Stepper */}
      <div className="space-y-1.5 mb-3">
        {INC_STEPS.map((step, i) => {
          const isDone = i < stepIdx;
          const isCurrent = i === stepIdx;
          const stepColor = INC_STEP_COLORS[step];
          return (
            <div key={step} className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: isDone ? stepColor : isCurrent ? `${stepColor}30` : "rgba(30,41,59,0.8)",
                  border: `1px solid ${isDone || isCurrent ? stepColor : "rgba(30,58,95,0.4)"}`,
                  boxShadow: isCurrent ? `0 0 8px ${stepColor}60` : "none"
                }}>
                {isDone ? <CheckCircle2 className="w-2.5 h-2.5 text-white" /> :
                  isCurrent ? <div className="w-1.5 h-1.5 rounded-full" style={{ background: stepColor }} /> :
                  <div className="w-1 h-1 rounded-full bg-slate-700" />}
              </div>
              <span className="text-[10px] font-mono capitalize" style={{ color: isCurrent ? stepColor : isDone ? "#475569" : "#334155" }}>{step}</span>
            </div>
          );
        })}
      </div>
      {incident.affected_services && <p className="text-[10px] text-slate-600 font-mono truncate">{incident.affected_services}</p>}
    </div>
  );
}

export default function RuntimeMonitor() {
  const qc = useQueryClient();
  const [killTarget, setKillTarget] = useState(null);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const { data: threats = [] } = useQuery({ queryKey: ["runtime-threats"], queryFn: () => base44.entities.RuntimeThreat.list("-last_seen", 50) });
  const { data: incidents = [] } = useQuery({ queryKey: ["incidents"], queryFn: () => base44.entities.IncidentResponse.list("-opened_at", 20) });

  const killSwitch = useMutation({
    mutationFn: (id) => base44.entities.RuntimeThreat.update(id, { kill_switch_triggered: true, status: "contained" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["runtime-threats"] }); setKillTarget(null); },
  });

  const activeCount = threats.filter(t => t.status === "active").length;
  const investigating = threats.filter(t => t.status === "investigating").length;
  const contained = threats.filter(t => t.status === "contained").length;
  const resolved = threats.filter(t => t.status === "resolved").length;
  const avgResolveTime = Math.round(incidents.filter(i => i.resolution_time_minutes).reduce((a, b) => a + b.resolution_time_minutes, 0) / (incidents.filter(i => i.resolution_time_minutes).length || 1));

  return (
    <div className="min-h-screen -m-6 p-6 space-y-5" style={{ background: "#030712" }}>
      {killTarget && (
        <KillSwitchModal
          threat={killTarget}
          onConfirm={() => killSwitch.mutate(killTarget.id)}
          onClose={() => setKillTarget(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Shield className="w-5 h-5 text-red-400" />
            <h1 className="text-xl font-black text-white font-mono tracking-tight">RUNTIME THREAT MONITOR</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-red-400">◉ LIVE</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">Live threat detection & incident response — powered by ShieldAI Runtime Engine</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-mono font-bold text-white">{now.toLocaleTimeString()}</p>
          <p className="text-[10px] text-slate-600 font-mono">{now.toLocaleDateString()}</p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "ACTIVE", val: activeCount, color: "#ef4444", pulse: true },
          { label: "INVESTIGATING", val: investigating, color: "#f97316", pulse: false },
          { label: "CONTAINED", val: contained, color: "#3b82f6", pulse: false },
          { label: "RESOLVED", val: resolved, color: "#10b981", pulse: false },
          { label: "AVG RESPONSE (min)", val: avgResolveTime || "—", color: "#8b5cf6", pulse: false },
        ].map(({ label, val, color, pulse }) => (
          <div key={label} className="rounded-xl p-4 text-center" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              {pulse && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />}
              <p className="text-[9px] font-mono font-semibold tracking-widest text-slate-500">{label}</p>
            </div>
            <p className="text-2xl font-black font-mono" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Main split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Threat cards */}
        <div className="col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Live Threat Feed</h3>
            <span className="text-[10px] text-slate-500 font-mono">{threats.length} threats detected</span>
          </div>
          <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
            {threats.map(t => (
              <ThreatCard key={t.id} threat={t} onKillSwitch={setKillTarget} />
            ))}
            {threats.length === 0 && (
              <div className="rounded-xl p-12 text-center" style={{ background: "#0a0f1e", border: "1px solid rgba(16,185,129,0.2)" }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-sm font-semibold text-emerald-400">All Clear</p>
                <p className="text-xs text-slate-600 mt-1">No active threats detected</p>
              </div>
            )}
          </div>
        </div>

        {/* Incident steppers */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Active Incidents</h3>
            <span className="text-[10px] text-slate-500 font-mono">{incidents.length} total</span>
          </div>
          <div className="max-h-[680px] overflow-y-auto pr-1">
            {incidents.map(i => <IncidentStepper key={i.id} incident={i} />)}
          </div>
        </div>
      </div>
    </div>
  );
}