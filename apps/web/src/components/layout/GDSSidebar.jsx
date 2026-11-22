import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import {
  Shield, Code2, Cloud, Crosshair, Zap, Package, ClipboardList,
  Brain, Globe, Settings, ChevronDown, ChevronRight, ChevronLeft,
  LogOut, LayoutDashboard, FolderGit2, Search, Lock, Database,
  Layers, Map, Target, Sword, Radio, Eye, Skull,
  Scale, FileText, Users, KeyRound, Building2, Bot, ShieldAlert,
  AlertTriangle, GitBranch, Cpu, Flame, DollarSign, Bell
} from "lucide-react";

const GOLD   = "#c9a84c";
const GOLDDIM= "rgba(201,168,76,0.1)";
const BG     = "#0a0e17";
const CARD   = "#0f1623";
const BORDER = "#1a1f2e";
const MUTED  = "#64748b";

const NAV = [
  {
    id: "cmd",
    label: "Command Center",
    icon: Shield,
    path: "/",
    exact: true,
  },
  {
    id: "code",
    label: "Code",
    icon: Code2,
    children: [
      { label: "Overview",       icon: LayoutDashboard, path: "/code" },
      { label: "Repositories",   icon: FolderGit2,      path: "/code/repositories" },
      { label: "SAST Findings",  icon: Search,          path: "/code/sast" },
      { label: "Dependencies",   icon: Package,         path: "/code/dependencies" },
      { label: "Secrets & IaC",  icon: KeyRound,        path: "/code/secrets" },
    ],
  },
  {
    id: "cloud",
    label: "Cloud",
    icon: Cloud,
    children: [
      { label: "Overview",       icon: LayoutDashboard, path: "/cloud" },
      { label: "CSPM Findings",  icon: ShieldAlert,     path: "/cloud/findings" },
      { label: "CIEM",           icon: Lock,            path: "/ciem" },
      { label: "DSPM",           icon: Database,        path: "/dspm" },
      { label: "Kubernetes",     icon: Layers,          path: "/cloud/k8s" },
      { label: "Code-to-Cloud",  icon: GitBranch,       path: "/cloud/code-to-cloud" },
    ],
  },
  {
    id: "attack",
    label: "Attack Surface",
    icon: Crosshair,
    children: [
      { label: "Surface Map",    icon: Map,             path: "/attack" },
      { label: "External Assets",icon: Radio,           path: "/attack/external" },
      { label: "DAST Scans",     icon: Zap,             path: "/attack/dast" },
      { label: "Pentest Jobs",   icon: Sword,           path: "/attack/pentest" },
      { label: "Blast Radius",   icon: Target,          path: "/attack/blast-radius" },
      { label: "Security Graph", icon: Radio,           path: "/security-graph" },
    ],
  },
  {
    id: "runtime",
    label: "Runtime",
    icon: Zap,
    children: [
      { label: "Live Threats",   icon: AlertTriangle,   path: "/protect" },
      { label: "Zen Firewall",   icon: Shield,          path: "/runtime/zen" },
      { label: "Bot Detection",  icon: Bot,             path: "/runtime/bots" },
      { label: "EDR Agents",     icon: Cpu,             path: "/runtime/edr" },
    ],
  },
  {
    id: "supply",
    label: "Supply Chain",
    icon: Package,
    children: [
      { label: "Overview",          icon: LayoutDashboard, path: "/supply-chain" },
      { label: "Events Feed",       icon: AlertTriangle,   path: "/supply/events" },
      { label: "SBOM",              icon: FileText,        path: "/supply-chain/sbom" },
      { label: "License Compliance",icon: Scale,           path: "/supply-chain/licenses" },
    ],
  },
  {
    id: "gov",
    label: "Governance",
    icon: ClipboardList,
    children: [
      { label: "Overview",          icon: LayoutDashboard, path: "/governance" },
      { label: "Compliance",        icon: Scale,           path: "/governance/compliance" },
      { label: "Policy Violations", icon: AlertTriangle,   path: "/governance/policy" },
      { label: "Audit Log",         icon: ClipboardList,   path: "/governance/audit-log" },
      { label: "Access Control",    icon: KeyRound,        path: "/governance/access" },
      { label: "Financial Risk",    icon: DollarSign,      path: "/governance/financial-risk" },
      { label: "Board Reports",     icon: FileText,        path: "/governance/board" },
    ],
  },
  {
    id: "ai",
    label: "AI Security",
    icon: Brain,
    children: [
      { label: "AI-SPM Overview",   icon: LayoutDashboard, path: "/ai-security" },
      { label: "Shadow AI",         icon: Eye,             path: "/ai-security/shadow-ai" },
      { label: "Prompt Security",   icon: Zap,             path: "/ai-security/prompt-security" },
      { label: "LLM Usage Monitor", icon: Brain,           path: "/ai/llm-monitor" },
    ],
  },
  {
    id: "intel",
    label: "Threat Intel",
    icon: Globe,
    children: [
      { label: "Overview",          icon: LayoutDashboard, path: "/threat-intel" },
      { label: "Intel Feed",        icon: Globe,           path: "/threat-intel/feed" },
      { label: "Dark Web",          icon: Eye,             path: "/threat-intel/dark-web" },
      { label: "APT Tracking",      icon: Skull,           path: "/threat-intel/apt" },
      { label: "Ransomware",        icon: Flame,           path: "/ransomware-tracker" },
      { label: "Credential Leaks",  icon: KeyRound,        path: "/credential-leaks" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    children: [
      { label: "Overview",          icon: LayoutDashboard, path: "/settings" },
      { label: "Organization",      icon: Building2,       path: "/settings/org" },
      { label: "MSSP Tenants",      icon: Users,           path: "/settings/mssp" },
      { label: "Notifications",     icon: Bell,            path: "/settings/notifications" },
      { label: "Integrations",      icon: GitBranch,       path: "/settings/integrations" },
    ],
  },
];

export default function GDSSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  const [openMenus, setOpenMenus] = useState(() => {
    const init = {};
    NAV.forEach(n => { if (n.children) init[n.id] = false; });
    return init;
  });

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  // Auto-open active section on route change
  useEffect(() => {
    NAV.forEach(item => {
      if (item.children) {
        const anyActive = item.children.some(c =>
          c.path === location.pathname || location.pathname.startsWith(c.path + "/")
        );
        if (anyActive) setOpenMenus(prev => ({ ...prev, [item.id]: true }));
      }
    });
  }, [location.pathname]);

  const toggle = (id) => setOpenMenus(prev => ({ ...prev, [id]: !prev[id] }));

  const isItemActive = (path, exact = false) =>
    exact ? location.pathname === path : (location.pathname === path || location.pathname.startsWith(path + "/"));

  const isSectionActive = (item) =>
    item.path
      ? isItemActive(item.path, item.exact)
      : item.children?.some(c => isItemActive(c.path));

  return (
    <aside
      className={cn("fixed left-0 top-0 h-screen flex flex-col z-50 overflow-hidden transition-all duration-300", collapsed ? "w-14" : "w-60")}
      style={{ background: BG, borderRight: `1px solid ${BORDER}` }}
    >
      {/* ── Logo ──────────────────────────────────────────────────────── */}
      <div className={cn("flex items-center flex-shrink-0 py-4", collapsed ? "justify-center px-2" : "gap-3 px-4")}
        style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: GOLDDIM, border: `1px solid rgba(201,168,76,0.4)`, boxShadow: `0 0 12px rgba(201,168,76,0.15)` }}>
          <Shield className="w-4 h-4" style={{ color: GOLD }} />
        </div>
        {!collapsed && (
          <div>
            <div className="text-sm font-black tracking-widest" style={{ color: GOLD }}>GDS</div>
            <div className="text-[8px] font-semibold tracking-wider text-slate-500 leading-none">GLOBAL DIGITAL SECURITY</div>
          </div>
        )}
      </div>

      {/* ── Nav ───────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: "none" }}>
        {NAV.map(item => {
          const active = isSectionActive(item);
          const Icon = item.icon;

          // Single link (Command Center)
          if (!item.children) {
            return (
              <Link key={item.id} to={item.path}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-2.5 mx-2 my-0.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all group relative",
                  collapsed && "justify-center px-2"
                )}
                style={{
                  background: active ? GOLDDIM : "transparent",
                  color: active ? GOLD : MUTED,
                  borderLeft: active && !collapsed ? `2px solid ${GOLD}` : "2px solid transparent",
                }}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50"
                    style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                    {item.label}
                  </div>
                )}
              </Link>
            );
          }

          // Dropdown section
          const open = openMenus[item.id];
          return (
            <div key={item.id} className="mx-2 my-0.5">
              <button onClick={() => toggle(item.id)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all",
                  collapsed && "justify-center px-2"
                )}
                style={{
                  background: active && !open ? GOLDDIM : "transparent",
                  color: active ? GOLD : MUTED,
                  borderLeft: active && !open && !collapsed ? `2px solid ${GOLD}` : "2px solid transparent",
                }}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown
                      className={cn("w-3.5 h-3.5 transition-transform flex-shrink-0", open && "rotate-180")}
                      style={{ color: active ? `${GOLD}60` : "rgba(100,116,139,0.5)" }}
                    />
                  </>
                )}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50"
                    style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                    {item.label}
                  </div>
                )}
              </button>

              {!collapsed && open && (
                <div className="mt-0.5 ml-4 pl-3 space-y-0.5" style={{ borderLeft: `1px solid ${BORDER}` }}>
                  {item.children.map(child => {
                    const cActive = isItemActive(child.path);
                    const CIcon = child.icon;
                    return (
                      <Link key={child.path + child.label} to={child.path}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all"
                        style={{
                          color: cActive ? GOLD : "#64748b",
                          background: cActive ? GOLDDIM : "transparent",
                          fontWeight: cActive ? 600 : 400,
                          borderLeft: cActive ? `1px solid ${GOLD}40` : "1px solid transparent",
                        }}>
                        <CIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── User + Collapse ───────────────────────────────────────────── */}
      <div className="flex-shrink-0 p-3 space-y-2" style={{ borderTop: `1px solid ${BORDER}` }}>
        {!collapsed && user && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: CARD }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
              style={{ background: `linear-gradient(135deg,${GOLD},#a07830)`, color: BG }}>
              {user.full_name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{user.full_name || "Operator"}</div>
              <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: GOLD }}>{user.role || "admin"}</div>
            </div>
            <button onClick={() => base44.auth.logout("/login")} className="text-slate-600 hover:text-red-400 transition-colors">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-slate-600 hover:text-slate-300 transition-all"
          style={{ border: `1px solid ${BORDER}` }}>
          {collapsed
            ? <ChevronRight className="w-4 h-4" style={{ color: GOLD }} />
            : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>
          }
        </button>
      </div>
    </aside>
  );
}