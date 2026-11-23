import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Key, Cookie, AlertTriangle, Shield, RefreshCw, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const GOLD = "#C9A84C";

function Shimmer({ className }) {
  return <div className={`rounded animate-pulse ${className}`} style={{ background: "linear-gradient(90deg,#1F2937,#2d3748,#1F2937)", backgroundSize: "400%" }} />;
}

function maskEmail(email = "") {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local[0]}***@${domain}`;
}

const CRED_TYPES = [
  { value: "credentials_leaked", label: "Password", icon: Key, color: "#ef4444" },
  { value: "api_keys", label: "API Key", icon: Key, color: "#8b5cf6" },
  { value: "email_exposed", label: "Email", icon: User, color: "#f97316" },
  { value: "payment_data", label: "Session Token", icon: Cookie, color: "#ef4444" },
];

const MALWARE_FAMILIES = [
  { name: "RedLine Stealer", hits: 8, color: "#ef4444" },
  { name: "Raccoon Stealer", hits: 3, color: "#f97316" },
  { name: "Vidar Stealer", hits: 2, color: "#eab308" },
  { name: "Lumma Stealer", hits: 5, color: "#8b5cf6" },
];

const TG_CHANNELS = [
  { name: "t.me/corpleaks2024", posts: 12, status: "active" },
  { name: "t.me/databreach_feed", posts: 4, status: "active" },
  { name: "t.me/hacktivists_hub", posts: 1, status: "quiet" },
];

export default function IdentityIntelligencePage() {
  const [scanning, setScanning] = useState(false);
  const qc = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["identity-events"],
    queryFn: () => base44.entities.DarkWebEvent.list("-discovered_at", 50).catch(() => []),
  });

  const active = events.filter(e => e.status === "active");
  const totalExposed = events.reduce((s, e) => s + (e.exposed_count || 0), 0);
  const sessionLeaks = events.filter(e => e.event_type === "payment_data").length;

  const handleScan = async () => {
    setScanning(true);
    try {
      await base44.functions.invoke("shieldDarkWebMonitor", {});
      qc.invalidateQueries(["identity-events"]);
      toast.success("Identity scan complete");
    } catch { toast.error("Scan failed"); }
    finally { setScanning(false); }
  };

  const sevStyle = {
    critical: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)" },
    high: { color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)" },
    medium: { color: "#eab308", bg: "rgba(234,179,8,0.1)", border: "rgba(234,179,8,0.3)" },
  };

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fadeUp 0.4s ease both}@keyframes bpulse{0%,100%{border-color:rgba(239,68,68,0.3)}50%{border-color:rgba(239,68,68,0.7)}}.bpulse{animation:bpulse 2s infinite}`}</style>

      <div className="fu">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <Shield className="w-3.5 h-3.5" /><span>Threat Intelligence</span><span>/</span>
          <span style={{ color: GOLD }}>Identity Intelligence</span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-3"><User className="w-6 h-6" style={{ color: GOLD }} /> Identity Intelligence</h1>
            <p className="text-slate-400 text-sm mt-0.5">Monitor leaked credentials, stealer logs, and identity-based threats</p>
          </div>
          <button onClick={handleScan} disabled={scanning}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 disabled:opacity-50 text-black"
            style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Run Scan
          </button>
        </div>
      </div>

      {active.length > 0 && (
        <div className="fu bpulse rounded-xl p-4 border flex items-center justify-between" style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.4)", animationDelay: "60ms" }}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
            <span className="font-bold text-red-400">{active.reduce((s, e) => s + (e.exposed_count || 0), 0)} employee credentials found on dark web marketplaces</span>
          </div>
          <a href="#timeline" className="text-xs text-red-400 underline">View Details →</a>
        </div>
      )}

      {/* Stats */}
      <div className="fu grid grid-cols-2 lg:grid-cols-5 gap-4" style={{ animationDelay: "80ms" }}>
        {[
          { label: "Exposed Accounts", value: events.length, color: "#ef4444" },
          { label: "Leaked Passwords", value: events.filter(e => e.event_type === "credentials_leaked").reduce((s,e)=>s+(e.exposed_count||0),0), color: "#f97316" },
          { label: "Stealer Log Hits", value: MALWARE_FAMILIES.reduce((s,m)=>s+m.hits,0), color: "#eab308" },
          { label: "Session Tokens", value: sessionLeaks, color: "#8b5cf6" },
          { label: "Identity Risk", value: active.length > 0 ? "HIGH" : "LOW", color: active.length > 0 ? "#ef4444" : "#22c55e" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 border transition-all hover:scale-[1.02]" style={{ background: "#111827", borderColor: s.color + "33" }}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">{s.label}</div>
            <div className="text-2xl font-black" style={{ color: s.color }}>{isLoading ? "—" : s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4" id="timeline">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Exposure Timeline</h3>
          {isLoading ? [1,2,3].map(i => <Shimmer key={i} className="h-28 w-full" />) :
          events.length === 0 ? (
            <div className="rounded-xl border p-12 text-center" style={{ background: "#111827", borderColor: "#1F2937" }}>
              <Shield className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-400">No identity exposures detected</p>
              <button onClick={handleScan} className="mt-4 px-5 py-2 rounded-xl text-sm font-bold text-black" style={{ background: GOLD }}>Run Identity Scan</button>
            </div>
          ) : events.map((event, i) => {
            const isActive = event.status === "active";
            const s = sevStyle[event.severity] || sevStyle.medium;
            const ct = CRED_TYPES.find(c => c.value === event.event_type) || CRED_TYPES[0];
            const dataTypes = event.data_types ? event.data_types.split(",").map(d => d.trim()) : [];
            return (
              <div key={event.id}
                className={`rounded-xl border p-4 transition-all ${isActive ? "bpulse" : ""}`}
                style={{ background: isActive ? "rgba(239,68,68,0.04)" : "#111827", borderColor: isActive ? "rgba(239,68,68,0.4)" : "#1F2937", animationDelay: `${i * 40}ms` }}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: ct.color + "1A", border: `1px solid ${ct.color}33` }}>
                    <ct.icon className="w-4 h-4" style={{ color: ct.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-bold text-white">{event.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold capitalize"
                        style={{ color: s.color, background: s.bg, borderColor: s.border }}>{event.severity}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold capitalize"
                        style={{ color: isActive ? "#ef4444" : "#10b981", background: isActive ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", borderColor: isActive ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)" }}>
                        {event.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mb-2">Source: <span className="text-slate-300">{event.source || "Unknown"}</span> · {event.exposed_count || 0} records</div>
                    {dataTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {dataTypes.map(dt => <span key={dt} className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: "#1F2937", color: "#9CA3AF", border: "1px solid #374151" }}>{dt}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button className="px-3 py-1 rounded-lg text-[10px] font-bold" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>Force Reset</button>
                    <button onClick={() => base44.entities.DarkWebEvent.update(event.id, { status: "contained" }).then(() => qc.invalidateQueries(["identity-events"])).catch(()=>{})}
                      className="px-3 py-1 rounded-lg text-[10px] font-bold" style={{ background: "rgba(16,185,129,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>Resolve</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          {/* Stealer Malware */}
          <div className="rounded-xl border p-4" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <h3 className="text-sm font-bold text-white mb-3">Stealer Malware Coverage</h3>
            <div className="space-y-2.5">
              {MALWARE_FAMILIES.map(m => (
                <div key={m.name} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                  <span className="text-xs text-slate-300 flex-1">{m.name}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: m.color + "20", color: m.color }}>{m.hits} hits</span>
                </div>
              ))}
            </div>
          </div>

          {/* Telegram Monitor */}
          <div className="rounded-xl border p-4" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <h3 className="text-sm font-bold text-white mb-3">Telegram Channel Monitor</h3>
            <div className="space-y-2">
              {TG_CHANNELS.map(c => (
                <div key={c.name} className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: "#1F2937" }}>
                  <div className={`w-2 h-2 rounded-full ${c.status === "active" ? "animate-pulse" : ""}`}
                    style={{ background: c.status === "active" ? "#ef4444" : "#6B7280" }} />
                  <span className="text-xs text-slate-300 flex-1 font-mono truncate">{c.name}</span>
                  <span className="text-[10px] text-slate-500">{c.posts} posts</span>
                </div>
              ))}
            </div>
          </div>

          {/* Protected Emails */}
          <div className="rounded-xl border p-4" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <h3 className="text-sm font-bold text-white mb-3">Monitored Domains</h3>
            {["@al-rabbani.io", "@shieldai.io"].map(d => (
              <div key={d} className="flex items-center gap-2 p-2.5 rounded-lg mb-2" style={{ background: "#1F2937" }}>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-slate-300 flex-1 font-mono">{d}</span>
                <span className="text-[10px] text-emerald-400">Active</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}