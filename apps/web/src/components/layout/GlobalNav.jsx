import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Clock, LayoutDashboard, Zap, Globe, Shield, Brain, Package, GitBranch, ScanSearch, Target, Radio, FlaskConical, FileBarChart, ClipboardCheck, ScrollText, Plug, Lock, Cloud, Search, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/notifications/NotificationBell";

const PILLAR_TABS = {
  code: [
    { label: "Overview", path: "/code", icon: <Shield className="w-3 h-3" /> },
    { label: "Repositories", path: "/code/repositories", icon: <GitBranch className="w-3 h-3" /> },
    { label: "AI Code Audit", path: "/code/code-audit", icon: <Brain className="w-3 h-3" /> },
    { label: "AI SAST", path: "/code/ai-sast", icon: <Brain className="w-3 h-3" /> },
    { label: "SAST", path: "/code/sast", icon: <Shield className="w-3 h-3" /> },
    { label: "SCA", path: "/code/sca", icon: <Package className="w-3 h-3" /> },
    { label: "Secrets", path: "/code/secrets", icon: <Lock className="w-3 h-3" /> },
    { label: "Malware", path: "/code/malware", icon: <Shield className="w-3 h-3" /> },
    { label: "IaC", path: "/code/iac", icon: <GitBranch className="w-3 h-3" /> },
    { label: "SBOM", path: "/code/sbom", icon: <FileBarChart className="w-3 h-3" /> },
    { label: "Package Health", path: "/code/packages", icon: <Package className="w-3 h-3" /> },
    { label: "Gating", path: "/code/gating", icon: <Zap className="w-3 h-3" /> },
  ],
  cloud: [
    { label: "Overview", path: "/cloud", icon: <Cloud className="w-3 h-3" /> },
    { label: "AWS", path: "/cloud/aws", icon: <Cloud className="w-3 h-3" /> },
    { label: "Azure", path: "/cloud/azure", icon: <Cloud className="w-3 h-3" /> },
    { label: "GCP", path: "/cloud/gcp", icon: <Cloud className="w-3 h-3" /> },
    { label: "Containers", path: "/cloud/containers", icon: <Package className="w-3 h-3" /> },
    { label: "K8s", path: "/cloud/k8s", icon: <Globe className="w-3 h-3" /> },
    { label: "VMs", path: "/cloud/vms", icon: <Shield className="w-3 h-3" /> },
    { label: "IaC", path: "/cloud/iac", icon: <GitBranch className="w-3 h-3" /> },
    { label: "Hardened Images", path: "/cloud/hardened-images", icon: <Shield className="w-3 h-3" /> },
  ],
  attack: [
    { label: "Overview", path: "/attack", icon: <Target className="w-3 h-3" /> },
    { label: "AI Pentest", path: "/attack/pentest", icon: <Target className="w-3 h-3" /> },
    { label: "DAST", path: "/attack/dast", icon: <ScanSearch className="w-3 h-3" /> },
    { label: "API Security", path: "/attack/api", icon: <Zap className="w-3 h-3" /> },
    { label: "Attack Surface", path: "/attack/surface", icon: <Globe className="w-3 h-3" /> },
    { label: "Bug Bounty", path: "/attack/bug-bounty", icon: <Target className="w-3 h-3" /> },
  ],
  protect: [
    { label: "Overview", path: "/protect", icon: <Shield className="w-3 h-3" /> },
    { label: "Zen Firewall", path: "/protect/zen", icon: <Zap className="w-3 h-3" /> },
    { label: "LLM Monitor", path: "/protect/llm-monitor", icon: <Brain className="w-3 h-3" /> },
    { label: "Device Protection", path: "/protect/devices", icon: <Shield className="w-3 h-3" /> },
    { label: "Firewall Rules", path: "/protect/firewall", icon: <ClipboardCheck className="w-3 h-3" /> },
    { label: "Threats", path: "/protect/threats", icon: <Shield className="w-3 h-3" /> },
    { label: "Supply Chain", path: "/protect/supply-chain", icon: <Package className="w-3 h-3" /> },
    { label: "Bots", path: "/protect/bots", icon: <Shield className="w-3 h-3" /> },
  ],
  governance: [
    { label: "Overview", path: "/governance", icon: <ClipboardCheck className="w-3 h-3" /> },
    { label: "Compliance", path: "/governance/compliance", icon: <Shield className="w-3 h-3" /> },
    { label: "Reports", path: "/governance/reports", icon: <FileBarChart className="w-3 h-3" /> },
    { label: "Policies", path: "/governance/policies", icon: <ClipboardCheck className="w-3 h-3" /> },
    { label: "Evidence", path: "/governance/evidence", icon: <GitBranch className="w-3 h-3" /> },
    { label: "Audit", path: "/governance/audit", icon: <ScrollText className="w-3 h-3" /> },
  ],
  platform: [
    { label: "Dashboard", path: "/", icon: <LayoutDashboard className="w-3 h-3" /> },
    { label: "AutoTriage", path: "/autotriage", icon: <Zap className="w-3 h-3" /> },
    { label: "ASPM", path: "/aspm", icon: <Globe className="w-3 h-3" /> },
    { label: "Threat Intel", path: "/threat-intel", icon: <Shield className="w-3 h-3" /> },
    { label: "Integrations", path: "/integrations", icon: <Plug className="w-3 h-3" /> },
  ],
};

const PILLAR_COLORS = {
  code: "#3b82f6",
  cloud: "#0ea5e9",
  attack: "#ef4444",
  protect: "#10b981",
  governance: "#8b5cf6",
  platform: "#f59e0b",
};

function getPillar(pathname) {
  if (pathname.startsWith("/code")) return "code";
  if (pathname.startsWith("/cloud")) return "cloud";
  if (pathname.startsWith("/attack")) return "attack";
  if (pathname.startsWith("/protect")) return "protect";
  if (pathname.startsWith("/governance")) return "governance";
  if (["/", "/autotriage", "/aspm", "/threat-intel", "/integrations"].some(p => pathname.startsWith(p))) return "platform";
  return null;
}

function getBreadcrumb(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return [{ label: "Dashboard", path: "/" }];
  
  const crumbs = [{ label: "ShieldAI", path: "/" }];
  if (parts[0]) {
    const pillarPath = `/${parts[0]}`;
    const pillarName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    crumbs.push({ label: pillarName, path: pillarPath });
  }
  if (parts.length > 1) {
    const pagePath = `/${parts[0]}/${parts[1]}`;
    const pageName = parts[1].split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    crumbs.push({ label: pageName, path: pagePath });
  }
  return crumbs;
}

export default function GlobalNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [historyIndex, setHistoryIndex] = useState(0);
  const [recentPages, setRecentPages] = useState([]);
  const [showRecent, setShowRecent] = useState(false);
  const pillar = getPillar(location.pathname);

  useEffect(() => {
    const saved = localStorage.getItem("shieldai_nav_history");
    const history = saved ? JSON.parse(saved) : [];
    const currentIndex = history.findIndex(h => h.path === location.pathname);
    
    if (currentIndex === -1) {
      const newHistory = [...history.slice(0, historyIndex + 1), { path: location.pathname, title: document.title, time: Date.now() }];
      localStorage.setItem("shieldai_nav_history", JSON.stringify(newHistory.slice(-20)));
      setHistoryIndex(newHistory.length - 1);
      
      const recent = newHistory.filter(h => h.path !== location.pathname).slice(-8).reverse();
      setRecentPages(recent);
    } else {
      setHistoryIndex(currentIndex);
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key === "ArrowLeft" && historyIndex > 0) {
        e.preventDefault();
        navigate(-1);
      }
      if (e.altKey && e.key === "ArrowRight" && historyIndex < 19) {
        e.preventDefault();
        navigate(1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [historyIndex, navigate]);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < 19;
  const breadcrumb = getBreadcrumb(location.pathname);
  const tabs = pillar ? PILLAR_TABS[pillar] : [];
  const pillarColor = pillar ? PILLAR_COLORS[pillar] : "#3b82f6";

  return (
    <>
      {/* Top Navigation Bar */}
      <div className="h-14 flex items-center justify-between px-4 border-b" style={{ background: "#0a0f1e", borderColor: "rgba(30,58,95,0.4)" }}>
        {/* Back/Forward */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => canGoBack && navigate(-1)}
            disabled={!canGoBack}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5"
            style={{ background: "#161b22" }}
            title={canGoBack ? "Go back (Alt+←)" : "No history"}
          >
            <ChevronLeft className="w-5 h-5 text-slate-300" />
          </button>
          <button
            onClick={() => canGoForward && navigate(1)}
            disabled={!canGoForward}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5"
            style={{ background: "#161b22" }}
            title={canGoForward ? "Go forward (Alt+→)" : "No forward history"}
          >
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 flex-1 justify-center">
          {breadcrumb.map((crumb, i) => (
            <React.Fragment key={crumb.path}>
              {i > 0 && <span className="text-slate-600">›</span>}
              <Link
                to={crumb.path}
                className={cn(
                  "text-sm transition-colors",
                  i === breadcrumb.length - 1 ? "font-bold text-white" : "text-slate-500 hover:text-slate-300"
                )}
              >
                {crumb.label}
              </Link>
            </React.Fragment>
          ))}
        </div>

        {/* Search & Notifications */}
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:bg-white/5"
            style={{ background: "#161b22" }}
            title="Search (Cmd+K)"
          >
            <Search className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400 hidden lg:inline">Search</span>
            <kbd className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] bg-slate-800 rounded border border-slate-700 text-slate-500">⌘K</kbd>
          </button>
          
          <NotificationBell />
          
          <button
            onClick={() => setShowRecent(!showRecent)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:bg-white/5"
            style={{ background: "#161b22" }}
          >
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400 hidden lg:inline">Recent</span>
          </button>
          {showRecent && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowRecent(false)} />
              <div className="absolute right-0 top-full mt-2 w-72 rounded-xl shadow-2xl z-50 overflow-hidden" style={{ background: "#0f172a", border: "1px solid rgba(30,58,95,0.4)" }}>
                <div className="p-3 border-b" style={{ borderColor: "rgba(30,58,95,0.4)" }}>
                  <p className="text-xs font-semibold text-white">Recent Pages</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {recentPages.map((page, i) => (
                    <Link
                      key={i}
                      to={page.path}
                      onClick={() => setShowRecent(false)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors border-b last:border-0"
                      style={{ borderColor: "rgba(30,58,95,0.2)" }}
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-300 truncate">{page.path}</p>
                        <p className="text-[10px] text-slate-600">{Math.floor((Date.now() - page.time) / 60000)}m ago</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      {tabs.length > 0 && (
        <div className="h-11 flex items-center gap-1 px-4 border-b overflow-x-auto" style={{ background: "#030712", borderColor: "rgba(30,58,95,0.4)" }}>
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path || (tab.path !== "/" && location.pathname.startsWith(tab.path));
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-xs whitespace-nowrap transition-colors border-b-2",
                  isActive
                    ? "text-white font-semibold"
                    : "text-slate-500 hover:text-slate-300 border-transparent hover:border-slate-700"
                )}
                style={isActive ? { borderBottomColor: pillarColor } : {}}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}