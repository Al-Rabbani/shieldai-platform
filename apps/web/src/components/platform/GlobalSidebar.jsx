import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import MagneticCard from "@/components/home/MagneticCard";
import {
  Home, ShieldAlert, Search, Eye, AlertTriangle, Monitor, Package, Cloud,
  UserCheck, ClipboardList, Bot, BarChart3, Cpu, Bell, Settings, Swords,
  Map, Skull, Zap, Shield, KeyRound, Dna, Radio, Briefcase, Biohazard, Network,
  LayoutDashboard, ShieldCheck, Building2, Plug, Fingerprint, Database, Target, Radar, Wrench, SlidersHorizontal,
  Inbox, FolderDown, BellRing, CalendarDays, Gauge, BookOpen, BookMarked, Workflow, Timer, History, TrendingUp, Brain,
  Activity,
} from "lucide-react";

const SECTIONS = [
  { label: null, items: [
    { icon: Home, label: "🏠 Home", path: "/" },
    { icon: LayoutDashboard, label: "My Dashboard", path: "/my-dashboard" },
    { icon: Bot, label: "AI Co-Pilot", path: "/copilot" },
    { icon: Brain, label: "Co-Pilot Memory", path: "/copilot/memory" },
    { icon: Timer, label: "Co-Pilot Scheduler", path: "/copilot/scheduler" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
  ]},
  { label: "OFFENSIVE", color: "#ef4444", items: [
    { icon: Swords, label: "Red Team", path: "/red-team" },
    { icon: Zap, label: "Continuous Pentest", path: "/red-team/pentest" },
    { icon: Target, label: "Pentest Results", path: "/pentest-results" },
    { icon: Map, label: "Attack Paths", path: "/red-team/attack-paths" },
    { icon: Network, label: "Attack Chain Map", path: "/attack-chains" },
    { icon: Skull, label: "Adversary Sim", path: "/red-team/adversary-sim" },
    { icon: Zap, label: "Kill Chain", path: "/red-team/kill-chain" },
  ]},
  { label: "DEFENSIVE", color: "#3b82f6", items: [
    { icon: Shield, label: "Blue Team", path: "/blue-team" },
    { icon: ShieldAlert, label: "Incident Command", path: "/incidents" },
    { icon: KeyRound, label: "Zero Trust", path: "/blue-team/zero-trust" },
    { icon: AlertTriangle, label: "Configuration Drift", path: "/configuration-drift" },
    { icon: BellRing, label: "Drift Alert Settings", path: "/settings/drift-alerts" },
    { icon: Cpu, label: "Runtime Protection", path: "/blue-team/runtime" },
  ]},
  { label: "INTELLIGENCE", color: "#8b5cf6", items: [
    { icon: Search, label: "Threat Intel", path: "/threat-intelligence" },
    { icon: Eye, label: "Dark Web", path: "/threat-intelligence/dark-web" },
    { icon: Dna, label: "APT Tracker", path: "/threat-intelligence/apt" },
    { icon: Radar, label: "CVE Exploit Tracker", path: "/cve-tracker" },
    { icon: Biohazard, label: "Ransomware Tracker", path: "/threat-intelligence/ransomware" },
  ]},
  { label: "OPERATIONS", items: [
    { icon: Radio, label: "SOC", path: "/soc" },
    { icon: Inbox, label: "Triage Queue", path: "/triage" },
    { icon: Timer, label: "SLA Breach Radar", path: "/sla-radar" },
    { icon: AlertTriangle, label: "Vulnerabilities", path: "/vulnerabilities" },
    { icon: Monitor, label: "VM Security", path: "/vm-security" },
    { icon: Package, label: "Container Security", path: "/container-security" },
    { icon: Cloud, label: "Cloud Security", path: "/cloud" },
    { icon: KeyRound, label: "CIEM", path: "/cloud/ciem" },
    { icon: Briefcase, label: "Code Security", path: "/code" },
    { icon: Package, label: "SBOM & Supply Chain", path: "/code/sbom" },
    { icon: UserCheck, label: "Identity & CIEM", path: "/identity" },
    { icon: ClipboardList, label: "Compliance", path: "/compliance" },
  ]},
  { label: "BUSINESS", items: [
    { icon: Briefcase, label: "Billing", path: "/settings/billing" },
    { icon: BarChart3, label: "MSSP", path: "/mssp" },
  ]},
  { label: "DASHBOARDS", color: "#10b981", items: [
    { icon: LayoutDashboard, label: "Executive Dashboard", path: "/executive-dashboard" },
    { icon: TrendingUp, label: "Executive Overview", path: "/executive-overview" },
    { icon: Briefcase, label: "Leadership Briefing", path: "/briefing" },
    { icon: Target, label: "Risk Fix Planner", path: "/risk-planner" },
    { icon: Radar, label: "Attack Vector Simulator", path: "/attack-simulator" },
    { icon: Wrench, label: "Vulnerability Fixes", path: "/vulnerability-fixes" },
    { icon: BookOpen, label: "Fix Strategy Library", path: "/fix-library" },
    { icon: BookMarked, label: "Remediation Templates", path: "/fix-templates" },
    { icon: Target, label: "Fix Planning Board", path: "/fix-planner" },
    { icon: CalendarDays, label: "Fix Calendar", path: "/fix-calendar" },
    { icon: ShieldCheck, label: "Agent Risk Reduction", path: "/reports/agent-risk" },
    { icon: Gauge, label: "Agent SLA Performance", path: "/reports/agent-performance" },
    { icon: ClipboardList, label: "Custom Reports", path: "/reports/custom" },
    { icon: FolderDown, label: "Drive Reports", path: "/reports/drive" },
    { icon: Cloud, label: "Cloud Asset Risk", path: "/reports/cloud-asset-risk" },
    { icon: AlertTriangle, label: "Top 10 Vulnerabilities", path: "/vulnerabilities/top10" },
    { icon: ShieldCheck, label: "Audit & Compliance", path: "/compliance" },
    { icon: ClipboardList, label: "SOC 2 / ISO 27001", path: "/compliance/frameworks" },
    { icon: FolderDown, label: "Compliance Evidence Vault", path: "/compliance/evidence-vault" },
    { icon: History, label: "Compliance Audit Log", path: "/compliance/audit-log" },
    { icon: Bot, label: "AI Model Security", path: "/ai-security" },
    { icon: Building2, label: "Organization", path: "/organization" },
    { icon: KeyRound, label: "Secrets & Keys", path: "/secrets" },
    { icon: Plug, label: "Connectors", path: "/connectors" },
    { icon: Bell, label: "Alerts & Notifications", path: "/alerts" },
  ]},
  { label: "SECURITY", color: "#06b6d4", items: [
    { icon: Fingerprint, label: "Forensic Evidence Vault", path: "/forensics" },
    { icon: ClipboardList, label: "Auditor Report Builder", path: "/forensics/auditor-report" },
  ]},
  { label: "PLATFORM", items: [
    { icon: Cpu, label: "Agent Fleet", path: "/settings/agents" },
    { icon: Activity, label: "Service Levels", path: "/operations/slo" },
    { icon: Gauge, label: "Fleet Autoscaling", path: "/settings/fleet-scaling" },
    { icon: Zap, label: "Auto-Remediation", path: "/settings/auto-remediation" },
    { icon: BellRing, label: "Escalation Rules", path: "/settings/escalation" },
    { icon: UserCheck, label: "Finding Assignment", path: "/settings/assignment" },
    { icon: Workflow, label: "Linear Ticketing", path: "/settings/linear" },
    { icon: Timer, label: "SLA Deadlines", path: "/settings/sla-targets" },
    { icon: Target, label: "Risk Thresholds", path: "/settings/risk-thresholds" },
    { icon: KeyRound, label: "Two-Factor Auth", path: "/settings/mfa" },
    { icon: KeyRound, label: "API Keys", path: "/settings/api-keys" },
    { icon: SlidersHorizontal, label: "Asset Risk Scoring", path: "/settings/risk-scoring" },
    { icon: Radio, label: "Integrations", path: "/settings/integrations" },
    { icon: Database, label: "Data Fabric", path: "/data-fabric" },
  ]},
];

const SEV_COLOR = { critical: "text-red-400", high: "text-orange-400", medium: "text-yellow-400", low: "text-blue-400", info: "text-slate-400" };

function gradeColor(grade) {
  if (grade === "A") return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
  if (grade === "B") return "text-blue-400 border-blue-500/40 bg-blue-500/10";
  if (grade === "C") return "text-amber-400 border-amber-500/40 bg-amber-500/10";
  return "text-red-400 border-red-500/40 bg-red-500/10";
}

export default function GlobalSidebar() {
  /* The release badge used to be the literal "GDS OS v9.0": a number that looked like a version and was typed in. The
   * deployed commit is published at GET /health/version, so it is read once here. */
  const [release, setRelease] = useState(null);
  useEffect(() => {
    let alive = true;
    base44.platform.version()
      .then((v) => { if (alive) setRelease(v || null); })
      .catch(() => { if (alive) setRelease(null); });
    return () => { alive = false; };
  }, []);
  const releaseLabel = release?.sha ? `GDS OS ${release.sha.slice(0, 7)}` : "GDS OS release unknown";

  const location = useLocation();
  const [risk, setRisk] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);

  useEffect(() => {
    const refreshRisk = () => base44.entities.GlobalRiskScore.list("-calculated_at", 1).then(r => setRisk(r[0] || null)).catch(() => {});
    refreshRisk();
    const riskInterval = setInterval(refreshRisk, 5 * 60 * 1000);
    return () => clearInterval(riskInterval);
  }, []);

  useEffect(() => {
    const refreshNotifs = () => base44.entities.Notification.list("-created_date", 100).then(setNotifications).catch(() => {});
    refreshNotifs();
    const notifInterval = setInterval(refreshNotifs, 60 * 1000);
    return () => clearInterval(notifInterval);
  }, []);

  useEffect(() => {
    base44.entities.Notification.list("-created_date", 100).then(setNotifications).catch(() => {});
  }, [location.pathname]);

  // The tenant's own identity, read after sign-in; falls back to the platform's.
  const { appPublicSettings } = useAuth();
  const brand = appPublicSettings?.public_settings || {};
  const brandName = brand.display_name || "GDSA Radar";
  const brandOrg = brand.name || "Global Digital Security";
  const brandAccent = brand.secondary_color || "#3b82f6";

  const unreadCount = notifications.filter(n => !n.is_read && !n.is_dismissed).length;
  const latest5 = notifications.filter(n => !n.is_dismissed).slice(0, 5);

  async function markRead(n) {
    await base44.entities.Notification.update(n.id, { is_read: true }).catch(() => {});
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
  }

  return (
    <aside className="w-[220px] fixed left-0 top-0 h-screen flex flex-col z-40" style={{ background: "#0a0f1e", borderRight: "1px solid #1e3a5f" }}>
      <div className="p-4" style={{ borderBottom: "1px solid #1e3a5f" }}>
        <div className="flex items-center gap-2">
          <span className="text-xl">🛡️</span>
          <span className="text-lg font-bold truncate" style={{ color: brandAccent }}>{brandName}</span>
        </div>
        <p className="text-[10px] text-slate-500 mt-0.5 truncate">{brandOrg}</p>
        <span className="inline-block mt-1.5 text-[9px] font-bold text-blue-400 px-1.5 py-0.5 rounded" style={{ textShadow: "0 0 8px rgba(59,130,246,0.8)" }}>{releaseLabel}</span>

        <span className={`inline-flex items-center mt-3 text-[11px] font-semibold rounded-full border px-2.5 py-0.5 ${gradeColor(risk?.grade)}`}>
          {risk?.overall_score ?? "—"} {risk?.grade ?? "—"} {risk?.trend === "improving" ? "↗" : risk?.trend === "degrading" ? "↘" : "→"}
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {SECTIONS.map((section, si) => (
          <div key={si}>
            {section.label && <p className="text-[10px] font-bold uppercase tracking-widest px-2 mb-1" style={{ color: section.color || "#475569" }}>{section.label}</p>}
            <div className="space-y-0.5">
              {section.items.map(item => {
                const active = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <MagneticCard key={item.path} as={Link} to={item.path} strength={2}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition border-l-2 ${
                      active ? "text-blue-400" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                    style={{ borderLeftColor: active ? "#3b82f6" : "transparent", background: active ? "#1e3a5f" : "transparent" }}>
                    <Icon size={14} />{item.label}
                  </MagneticCard>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 flex items-center gap-2" style={{ borderTop: "1px solid #1e3a5f" }}>
        <div className="relative">
          <button onClick={() => setBellOpen(o => !o)} className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/5 transition text-slate-400 hover:text-slate-200">
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute bottom-10 left-0 w-72 rounded-xl p-2 z-50 shadow-xl" style={{ background: "#111827", border: "1px solid #1F2937" }}>
              {latest5.length === 0 ? (
                <p className="text-[11px] text-slate-500 p-2">No notifications.</p>
              ) : (
                latest5.map(n => (
                  <div key={n.id} className="px-2 py-1.5 rounded-lg hover:bg-white/5 flex items-start gap-2">
                    <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${SEV_COLOR[n.severity]?.replace("text-", "bg-") || "bg-slate-500"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-slate-200 truncate">{n.title}</p>
                      <p className="text-[10px] text-slate-500 truncate">{n.message}</p>
                    </div>
                    {!n.is_read && (
                      <button onClick={() => markRead(n)} className="text-[9px] text-blue-400 hover:text-blue-300 flex-shrink-0">Mark read</button>
                    )}
                  </div>
                ))
              )}
              <Link to="/alerts" onClick={() => setBellOpen(false)} className="block text-center text-[11px] font-medium text-blue-400 hover:text-blue-300 mt-1 py-1.5 border-t border-white/5">
                View All
              </Link>
            </div>
          )}
        </div>

        <Link to="/settings" className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/5 transition text-slate-400 hover:text-slate-200">
          <Settings size={16} />
        </Link>

        <span className="ml-auto flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </span>
      </div>
    </aside>
  );
}