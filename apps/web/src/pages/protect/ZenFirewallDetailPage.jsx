import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, AlertTriangle, Globe, Lock, Activity, Users, Settings, BarChart3, ArrowLeft, Zap, Server, Eye, ShieldCheck } from "lucide-react";

const TABS = [
  { id: "overview", label: "Overview", icon: Shield },
  { id: "attack-log", label: "Attack Log", icon: AlertTriangle },
  { id: "outbound", label: "Outbound Monitor", icon: Globe },
  { id: "waves", label: "Attack Waves", icon: Activity },
  { id: "users", label: "User Tracking", icon: Users },
  { id: "idor", label: "IDOR Protection", icon: Lock },
  { id: "config", label: "Configuration", icon: Settings },
  { id: "stats", label: "Statistics", icon: BarChart3 },
];

export default function ZenFirewallDetailPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: firewall } = useQuery({
    queryKey: ["zen-firewall", id],
    queryFn: () => base44.entities.ZenFirewall.list().then(fw => fw.find(f => f.id === id)),
    initialData: null,
  });

  if (!firewall) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400">Firewall not found</p>
          <Link to="/protect/zen" className="text-blue-400 hover:underline mt-2 inline-block">Back to Zen Firewalls</Link>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-xl p-4" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mb-1">Status</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-lg font-bold text-emerald-400">Active</p>
                </div>
              </div>
              <div className="rounded-xl p-4" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mb-1">Attacks Blocked (24h)</p>
                <p className="text-2xl font-bold text-white">{firewall.attacks_blocked_today || 0}</p>
              </div>
              <div className="rounded-xl p-4" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mb-1">Total Blocked</p>
                <p className="text-2xl font-bold text-white">{firewall.attacks_blocked_total || 0}</p>
              </div>
              <div className="rounded-xl p-4" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mb-1">Avg Overhead</p>
                <p className="text-2xl font-bold text-white">{firewall.avg_overhead_ms || 0.3}ms</p>
              </div>
            </div>

            <div className="rounded-xl p-6" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
              <h3 className="text-sm font-semibold text-white mb-4">Application Info</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 mb-1">App Name</p>
                  <p className="text-white font-mono">{firewall.app_name}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Language</p>
                  <p className="text-white font-mono">{firewall.language}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Framework</p>
                  <p className="text-white font-mono">{firewall.framework || "—"}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Environment</p>
                  <p className="text-white font-mono capitalize">{firewall.environment}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Version</p>
                  <p className="text-white font-mono">{firewall.version || "latest"}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Uptime</p>
                  <p className="text-white font-mono">{firewall.uptime_percent}%</p>
                </div>
              </div>
            </div>
          </div>
        );

      case "attack-log":
        return (
          <div className="rounded-xl overflow-hidden" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white">Recent Attack Attempts</h3>
            </div>
            <div className="divide-y divide-slate-800">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 flex items-center justify-between hover:bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm text-white font-mono">SQL Injection Attempt</p>
                      <p className="text-[10px] text-slate-500">POST /api/users · 185.220.101.47</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-red-400 font-mono">BLOCKED</p>
                    <p className="text-[10px] text-slate-500">{i * 2 + 5}m ago</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "outbound":
        return (
          <div className="rounded-xl p-6" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
            <h3 className="text-sm font-semibold text-white mb-4">Outbound Traffic Monitor</h3>
            <p className="text-sm text-slate-400">Monitoring egress traffic for data exfiltration attempts...</p>
          </div>
        );

      case "waves":
        return (
          <div className="rounded-xl p-6" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
            <h3 className="text-sm font-semibold text-white mb-4">Attack Wave Analysis</h3>
            <p className="text-sm text-slate-400">Correlating attack patterns across time windows...</p>
          </div>
        );

      case "users":
        return (
          <div className="rounded-xl p-6" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
            <h3 className="text-sm font-semibold text-white mb-4">User Session Tracking</h3>
            <p className="text-sm text-slate-400">Monitoring authenticated user sessions for anomalies...</p>
          </div>
        );

      case "idor":
        return (
          <div className="rounded-xl p-6" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
            <h3 className="text-sm font-semibold text-white mb-4">IDOR Protection</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-white">IDOR Detection Active</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-xs text-slate-500">Monitoring for unauthorized resource access patterns across all endpoints</p>
            </div>
          </div>
        );

      case "config":
        return (
          <div className="rounded-xl p-6" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
            <h3 className="text-sm font-semibold text-white mb-4">Firewall Configuration</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-2">Mode</p>
                <div className="px-3 py-2 rounded-lg text-sm font-mono" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6" }}>
                  {firewall.mode || "dry_run"}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-2">API Key</p>
                <div className="px-3 py-2 rounded-lg text-sm font-mono" style={{ background: "rgba(30,58,95,0.4)", border: "1px solid rgba(30,58,95,0.6)", color: "#64748b" }}>
                  {firewall.api_key ? "••••••••••••" + firewall.api_key.slice(-4) : "Not configured"}
                </div>
              </div>
            </div>
          </div>
        );

      case "stats":
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Protected Endpoints", value: firewall.protected_endpoints || 0, color: "#3b82f6" },
              { label: "OpenAPI Endpoints", value: firewall.openapi_endpoints_discovered || 0, color: "#10b981" },
              { label: "Rate Limit Triggers", value: firewall.rate_limit_triggers || 0, color: "#f97316" },
              { label: "Bots Blocked", value: firewall.bots_blocked || 0, color: "#ef4444" },
              { label: "False Positives", value: firewall.false_positives || 0, color: "#64748b" },
              { label: "Country Blocks", value: firewall.country_blocks_active || 0, color: "#8b5cf6" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl p-4" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mb-1">{label}</p>
                <p className="text-2xl font-bold" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/protect/zen" className="p-2 rounded-lg hover:bg-white/5 transition-all">
          <ArrowLeft className="w-4 h-4 text-slate-400" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{firewall.app_name}</h1>
              <p className="text-xs text-slate-500 font-mono">Zen Firewall Instance</p>
            </div>
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-mono font-semibold">ACTIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id ? "text-white" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
            }`}
            style={activeTab === tab.id ? {
              background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.05))",
              border: "1px solid rgba(59,130,246,0.3)"
            } : {}}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}