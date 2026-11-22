import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Bell, Search, ChevronRight, ArrowLeft, ArrowRight, Shield } from "lucide-react";

const C = "#00d9ff";
const BG = "#0a0e17";
const BORDER = "#1a2a3a";

const LABELS = {
  "/": "Command Center",
  "/code": "Code Security",
  "/code/repositories": "Repositories",
  "/code/sast": "SAST Findings",
  "/code/sca": "Dependencies",
  "/code/secrets": "Secrets & IaC",
  "/code/sbom": "SBOM",
  "/code/licenses": "License Compliance",
  "/code/autofix": "AutoFix PRs",
  "/code/cicd": "CI/CD Gate",
  "/cloud": "Cloud Security",
  "/cloud/findings": "CSPM Findings",
  "/cloud/vms": "Virtual Machines",
  "/cloud/containers": "Containers",
  "/cloud/k8s": "Kubernetes",
  "/cloud/iam": "IAM Risks",
  "/ciem": "CIEM",
  "/dspm": "DSPM",
  "/attack/surface": "Attack Surface Map",
  "/attack/dast": "DAST Scans",
  "/attack/pentest": "Pentest Jobs",
  "/protect/threats": "Runtime Threats",
  "/protect/zen": "Zen Firewall",
  "/protect/bots": "Bot Detection",
  "/protect/supply-chain": "Supply Chain",
  "/protect/llm-monitor": "Prompt Security",
  "/edr": "EDR Agents",
  "/governance/compliance": "Compliance",
  "/governance/violations": "Policy Violations",
  "/governance/reports": "Board Reports",
  "/audit-log": "Audit Log",
  "/settings/access": "Access Control",
  "/ai-spm": "AI-SPM",
  "/llm-security": "Shadow AI",
  "/threat-intel": "Threat Feed",
  "/dark-web": "Dark Web Monitor",
  "/threat-actors": "APT Tracking",
  "/settings": "Org Settings",
  "/mssp": "MSSP Tenants",
  "/findings": "All Findings",
  "/autotriage": "AutoTriage",
  "/executive-dashboard": "Executive Dashboard",
  "/autonomous-soc": "SOC Operations",
  "/risk-score": "Risk Score",
};

const SECTION = {
  "/code": "Code Security",
  "/cloud": "Cloud Security",
  "/ciem": "Cloud Security",
  "/dspm": "Cloud Security",
  "/attack": "Attack Surface",
  "/protect": "Runtime Protection",
  "/edr": "Runtime Protection",
  "/governance": "Governance",
  "/audit-log": "Governance",
  "/ai-spm": "AI Security",
  "/llm-security": "AI Security",
  "/threat-intel": "Threat Intel",
  "/dark-web": "Threat Intel",
  "/threat-actors": "Threat Intel",
  "/settings": "Settings",
  "/mssp": "Settings",
};

function getSection(path) {
  for (const [prefix, label] of Object.entries(SECTION)) {
    if (path.startsWith(prefix)) return label;
  }
  return null;
}

export default function GDSTopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pageLabel = LABELS[location.pathname] || location.pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "GDS";
  const section = getSection(location.pathname);

  const breadcrumbs = [
    { label: "GDS", path: "/" },
    ...(section ? [{ label: section, path: "#" }] : []),
    ...(location.pathname !== "/" ? [{ label: pageLabel, path: location.pathname }] : []),
  ];

  const NOTIFS = [
    { id: 1, icon: "🔴", title: "Critical CVE Detected", desc: "CVE-2024-3094 in core-api · CVSS 9.8", time: "2m ago", link: "/autotriage" },
    { id: 2, icon: "⚡", title: "SLA Breach", desc: "3 findings breached remediation SLA", time: "1h ago", link: "/autotriage" },
    { id: 3, icon: "🌐", title: "Dark Web Alert", desc: "Credentials found on BreachForums", time: "3h ago", link: "/dark-web" },
  ];

  return (
    <header className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0 sticky top-0 z-40"
      style={{ background: "rgba(10,14,23,0.97)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${BORDER}` }}>

      {/* Back / Forward */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button onClick={() => navigate(-1)} title="Back"
          className="p-1.5 rounded-md text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all">
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => navigate(1)} title="Forward"
          className="p-1.5 rounded-md text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all">
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="hidden md:flex items-center gap-1 text-xs text-slate-500 flex-1 min-w-0 overflow-hidden">
        {breadcrumbs.map((b, i) => (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight className="w-3 h-3 flex-shrink-0 text-slate-700" />}
            {b.path === "#" ? (
              <span className="text-slate-500">{b.label}</span>
            ) : (
              <Link to={b.path}
                className="truncate transition-colors hover:text-white"
                style={{ color: i === breadcrumbs.length - 1 ? C : undefined, fontWeight: i === breadcrumbs.length - 1 ? 600 : 400 }}>
                {b.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Mobile title */}
      <div className="flex md:hidden flex-1 text-sm font-bold text-white truncate">{pageLabel}</div>

      {/* Search hint */}
      <button className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-500 border transition-all hover:text-slate-300"
        style={{ background: "#111827", borderColor: BORDER }}
        onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }))}>
        <Search className="w-3.5 h-3.5" />
        <span>Search...</span>
        <kbd className="text-[10px] font-mono px-1.5 rounded" style={{ background: `rgba(0,217,255,0.1)`, color: C }}>⌘K</kbd>
      </button>

      {/* Live dot */}
      <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00ff88" }} />
        <span className="text-[9px] font-bold text-slate-600">LIVE</span>
      </div>

      {/* Notifications */}
      <div className="relative flex-shrink-0" ref={notifRef}>
        <button onClick={() => setShowNotifs(!showNotifs)}
          className="relative p-2 rounded-lg hover:bg-white/5 transition-all">
          <Bell className="w-4 h-4 text-slate-400" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center"
            style={{ background: "#ff3b3b" }}>3</span>
        </button>
        {showNotifs && (
          <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border shadow-2xl z-50 overflow-hidden"
            style={{ background: "#111827", borderColor: BORDER }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
              <h4 className="font-bold text-white text-sm">Security Alerts</h4>
            </div>
            {NOTIFS.map(n => (
              <Link key={n.id} to={n.link} onClick={() => setShowNotifs(false)}
                className="flex items-start gap-3 px-4 py-3 border-b hover:bg-white/5 transition-colors"
                style={{ borderColor: BORDER }}>
                <span className="text-base mt-0.5">{n.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white">{n.title}</p>
                  <p className="text-[10px] text-slate-400">{n.desc}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{n.time}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* User */}
      {user && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
            style={{ background: `linear-gradient(135deg,${C},#0ea5e9)`, color: BG }}>
            {user.full_name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="hidden lg:block">
            <div className="text-xs font-semibold text-white">{user.full_name?.split(" ")[0] || "Operator"}</div>
            <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C }}>{user.role || "ADMIN"}</div>
          </div>
        </div>
      )}
    </header>
  );
}