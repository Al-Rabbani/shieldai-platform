import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Shield, Bug, Crosshair, Server,
  ClipboardCheck, Plug, Settings, ChevronLeft, ChevronRight,
  Zap, CreditCard, Cpu, GitBranch, Lock, Package, ScrollText,
  Code2, Search, Key, FileJson, FolderGit2, GitPullRequest, ShieldAlert,
  Cloud, Monitor, HardDrive, Route, Target, Activity, Globe,
  Swords, Flame, ScanSearch, Users, Radio, Telescope, Bot,
  FlaskConical, FileBarChart, ClipboardList, FolderOpen,
  UserCheck, Clock, Scale, Brain, Building2, Bell, AlertTriangle,
  BookOpen, Laptop, Webhook
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const navGroups = [
  {
    label: "Command Center",
    accent: "#3b82f6",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/" },
      { label: "Feed", icon: Radio, path: "/feed", badge: true },
      { label: "Agent Orchestration", icon: Cpu, path: "/agents" },
      { label: "Workflow Engine", icon: GitBranch, path: "/workflows" },
      { label: "Tool Gateway", icon: Lock, path: "/tool-gateway" },
      { label: "Artifacts & Evidence", icon: Package, path: "/artifacts" },
      { label: "Audit Logs", icon: ScrollText, path: "/audit-logs" },
    ]
  },
  {
    label: "PLATFORM",
    accent: "#10b981",
    isPlatform: true,
    items: [
      { label: "AutoTriage", icon: Zap, path: "/autotriage", itemAccent: "#10b981" },
      { label: "AGI Readiness", icon: Brain, path: "/agi-readiness", itemAccent: "#8b5cf6" },
      { label: "ASPM", icon: Globe, path: "/aspm", itemAccent: "#8b5cf6" },
      { label: "Threat Intel", icon: Telescope, path: "/threat-intel", itemAccent: "#ef4444" },
      { label: "Integrations Hub", icon: Plug, path: "/integrations", itemAccent: "#6b7280" },
    ]
  },
  {
    label: "CODE",
    accent: "#3b82f6",
    items: [
      { label: "Overview", icon: Code2, path: "/code" },
      { label: "Repositories", icon: FolderGit2, path: "/code/repositories" },
      { label: "AI SAST", icon: Brain, path: "/code/ai-sast", itemAccent: "#3b82f6" },
      { label: "AI Code Audit", icon: Brain, path: "/code/code-audit", itemAccent: "#7c3aed" },
      { label: "AI-Generated Code", icon: Brain, path: "/code/ai-generated", itemAccent: "#8b5cf6" },
      { label: "Reachability", icon: Search, path: "/code/reachability", itemAccent: "#3b82f6" },
      { label: "SAST Findings", icon: ShieldAlert, path: "/code/sast" },
      { label: "SCA / Dependencies", icon: Package, path: "/code/sca" },
      { label: "Secrets", icon: Key, path: "/code/secrets" },
      { label: "Malware Detection", icon: Bug, path: "/code/malware" },
      { label: "IaC Security", icon: GitBranch, path: "/code/iac", itemAccent: "#f97316" },
      { label: "License & EOL", icon: Scale, path: "/code/licenses" },
      { label: "SBOM", icon: FileJson, path: "/code/sbom" },
      { label: "Package Health", icon: Package, path: "/code/packages", itemAccent: "#10b981" },
      { label: "Reachability", icon: Search, path: "/code/reachability", itemAccent: "#3b82f6" },
      { label: "AutoFix PRs", icon: GitPullRequest, path: "/code/autofix" },
      { label: "CI/CD Gate", icon: GitBranch, path: "/code/cicd" },
      { label: "Release Gating", icon: Zap, path: "/code/gating", itemAccent: "#10b981" },
    ]
  },
  {
    label: "CLOUD",
    accent: "#f97316",
    items: [
      { label: "Overview", icon: Cloud, path: "/cloud" },
      { label: "AWS", icon: Cloud, path: "/cloud/aws", itemAccent: "#f97316" },
      { label: "Azure", icon: Cloud, path: "/cloud/azure", itemAccent: "#0078d4" },
      { label: "GCP", icon: Cloud, path: "/cloud/gcp", itemAccent: "#4285f4" },
      { label: "Asset Search", icon: Search, path: "/cloud/search", itemAccent: "#3b82f6" },
      { label: "Cloud Findings", icon: Shield, path: "/cloud/findings" },
      { label: "Security Posture", icon: Activity, path: "/cloud/posture" },
      { label: "Virtual Machines", icon: Monitor, path: "/cloud/vms" },
      { label: "Kubernetes", icon: HardDrive, path: "/cloud/k8s", itemAccent: "#06b6d4" },
      { label: "IaC Drift", icon: GitBranch, path: "/cloud/drift", itemAccent: "#8b5cf6" },
      { label: "IAM Risk", icon: Key, path: "/cloud/iam" },
      { label: "Containers", icon: HardDrive, path: "/cloud/containers" },
      { label: "Hardened Images", icon: Shield, path: "/cloud/hardened-images", itemAccent: "#0d9488" },
      { label: "IaC Security", icon: GitBranch, path: "/cloud/iac", itemAccent: "#f97316" },
    ]
  },
  {
    label: "ATTACK",
    accent: "#ef4444",
    items: [
      { label: "Overview", icon: Crosshair, path: "/attack" },
      { label: "Attack Surface", icon: Globe, path: "/attack/surface", itemAccent: "#ef4444" },
      { label: "AI Pentest", icon: Target, path: "/attack/pentest" },
      { label: "Bug Bounty", icon: Target, path: "/attack/bug-bounty", itemAccent: "#f59e0b" },
      { label: "DAST Scanner", icon: ScanSearch, path: "/attack/dast" },
      { label: "API Security", icon: Zap, path: "/attack/api" },
    ]
  },
  {
    label: "PROTECT",
    accent: "#f43f5e",
    items: [
      { label: "Runtime Overview", icon: Shield, path: "/protect" },
      { label: "Zen Firewall", icon: Zap, path: "/protect/zen", itemAccent: "#10b981" },
      { label: "AI/LLM Monitor", icon: Brain, path: "/protect/llm-monitor", itemAccent: "#7c3aed" },
      { label: "Firewall Rules", icon: AlertTriangle, path: "/protect/firewall" },
      { label: "Threat Log", icon: AlertTriangle, path: "/protect/threats" },
      { label: "Supply Chain", icon: Package, path: "/protect/supply-chain" },
      { label: "Bot Protection", icon: Bot, path: "/protect/bots" },
      { label: "Device Protection", icon: Monitor, path: "/protect/devices", itemAccent: "#06b6d4" },
    ]
  },
  {
    label: "RUNTIME — Threats",
    accent: "#06b6d4",
    items: [
      { label: "Runtime Monitor", icon: Radio, path: "/runtime" },
      { label: "Simulations", icon: FlaskConical, path: "/simulations" },
      { label: "Risk Reports", icon: FileBarChart, path: "/risk-reports" },
    ]
  },
  {
    label: "GOVERNANCE",
    accent: "#6366f1",
    items: [
      { label: "Overview", icon: Scale, path: "/governance" },
      { label: "Compliance", icon: Shield, path: "/governance/compliance" },
      { label: "Policy Violations", icon: AlertTriangle, path: "/governance/violations" },
      { label: "Evidence Vault", icon: FolderOpen, path: "/governance/evidence" },
      { label: "Reports", icon: FileBarChart, path: "/governance/reports" },
      { label: "Audit", icon: ClipboardCheck, path: "/governance/audit", itemAccent: "#6366f1" },
      { label: "Trends", icon: Activity, path: "/governance/trends", itemAccent: "#3b82f6" },
      { label: "Audit", icon: ScrollText, path: "/governance/audit", itemAccent: "#6366f1" },
    ]
  },
  {
    label: "Platform",
    accent: "#3b82f6",
    items: [
      { label: "Integrations Hub", icon: Plug, path: "/integrations", itemAccent: "#6b7280" },
      { label: "AI Engine", icon: Brain, path: "/ai-engine" },
      { label: "Notifications", icon: Bell, path: "/notifications", badge: true },
      { label: "Guides", icon: BookOpen, path: "/guides", itemAccent: "#10b981" },
      { label: "Credits", icon: CreditCard, path: "/settings/credits", itemAccent: "#10b981" },
      { label: "Webhooks", icon: Webhook, path: "/settings/webhooks", itemAccent: "#3b82f6" },
      { label: "Teams", icon: Users, path: "/settings/teams", itemAccent: "#8b5cf6" },
      { label: "Team", icon: Users, path: "/settings/team" },
      { label: "Organization", icon: Building2, path: "/settings/organization" },
      { label: "Pricing", icon: CreditCard, path: "/pricing" },
      { label: "Settings", icon: Settings, path: "/settings" },
    ]
  }
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notif-unread-count"],
    queryFn: () => base44.entities.Notification.filter({ read: false }).catch(() => []),
    refetchInterval: 30000,
    initialData: [],
  });
  const unreadCount = notifications.length;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen flex flex-col z-50 transition-all duration-300",
        collapsed ? "w-[64px]" : "w-[240px]"
      )}
      style={{
        background: "#0a0a0f",
        borderRight: "1px solid #2a2a3a",
        boxShadow: "4px 0 24px rgba(0,0,0,0.4)"
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 flex-shrink-0" style={{ borderBottom: "1px solid #2a2a3a" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 relative"
          style={{ background: "linear-gradient(135deg, #1e3a5f, #1e293b)", border: "1px solid rgba(59,130,246,0.3)" }}>
          <Shield className="w-5 h-5 text-blue-400" style={{ animation: "pulse 8s infinite" }} />
          <div className="absolute inset-0 rounded-xl" style={{ boxShadow: "0 0 12px rgba(59,130,246,0.2)" }} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="flex items-baseline gap-0.5">
              <span className="font-black text-base text-white tracking-tight leading-none">Shield</span>
              <span className="font-black text-base text-blue-400 tracking-tight leading-none">AI</span>
            </div>
            <p className="text-[9px] text-slate-600 tracking-widest uppercase mt-0.5 font-mono">Autonomous Security</p>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="ml-auto p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {navGroups.map((group) => (
          <div key={group.label} className="mb-1">
            {!collapsed && group.isPlatform ? (
              <div className="px-4 py-1.5 flex items-center gap-2">
                <div className="flex-1 h-px" style={{ background: "rgba(16,185,129,0.2)" }} />
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] font-mono" style={{ color: "#10b981" }}>PLATFORM</p>
                <div className="flex-1 h-px" style={{ background: "rgba(16,185,129,0.2)" }} />
              </div>
            ) : !collapsed && (
              <p className="px-4 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-600 font-mono">
                {group.label}
              </p>
            )}
            {collapsed && <div className="h-px mx-3 my-2 bg-slate-800/60" />}
            <div className="px-2 space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.path === "/" ? location.pathname === "/" : location.pathname === item.path || location.pathname.startsWith(item.path + "/");
                const showBadge = item.badge && unreadCount > 0;
                const accent = item.itemAccent || group.accent || "#3b82f6";
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 relative group",
                      isActive
                        ? "text-white"
                        : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
                    )}
                    style={isActive ? {
                      background: `linear-gradient(135deg, ${accent}25, ${accent}08)`,
                      borderLeft: `3px solid ${accent}`,
                      paddingLeft: "9px",
                      boxShadow: `inset 0 0 12px ${accent}12`
                    } : {}}
                  >
                    <item.icon className={cn("w-4 h-4 flex-shrink-0 transition-colors")} style={isActive ? { color: accent } : {}} />
                    {!collapsed && (
                      <span className="truncate text-[13px] font-medium">
                        {item.label}
                      </span>
                    )}
                    {showBadge && !collapsed && (
                      <span className="ml-auto min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1"
                        style={{ background: "#ef4444", color: "#fff" }}>
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                    {showBadge && collapsed && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                    )}
                  </Link>
                );
              })}
            </div>
            {group.isPlatform && !collapsed && (
              <div className="px-4 mt-1.5">
                <div className="h-px" style={{ background: "rgba(30,58,95,0.4)" }} />
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom bar */}
      <div style={{ borderTop: "1px solid #2a2a3a" }}>
        {!collapsed && (
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #1e3a5f, #3b82f6)" }}>
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">Admin</p>
              <p className="text-[10px] text-slate-600 truncate font-mono">Platform Engineer</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] text-emerald-500 font-mono font-semibold">LIVE</span>
            </div>
          </div>
        )}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full flex items-center justify-center h-12 text-slate-600 hover:text-slate-300 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}