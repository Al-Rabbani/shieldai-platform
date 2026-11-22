import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard, BarChart3, Package, Search, Bot, Key, FileText, Sliders, FolderOpen,
  Cloud, Server, Container, Layers, Sword, Target, Globe, Plug,
  Radio, Eye, User, Fish, Bug, Skull, Map,
  Shield, Link2, ShieldAlert, Monitor, Brain, Laptop,
  ClipboardCheck, Scale, GitMerge, TrendingUp,
  Cpu, Wrench, Settings, BookOpen, ChevronLeft, ChevronRight,
  LogOut, Zap, Newspaper, Users, Lock, Building2, Sparkles, Bell,
  Network, UserCheck, Database, Workflow, Play, Home,
  DollarSign, Trophy, Activity, Clock, Award, Code2, GitBranch, FileJson
} from "lucide-react";
import WhatsNew from "@/components/global/WhatsNew";

const GOLD = "#C9A84C";

const NAV = [
  // ──────────────────────────────────────────────────────────────
  // GETTING STARTED
  // ──────────────────────────────────────────────────────────────
  {
    title: "GETTING STARTED",
    items: [
      { label: "Welcome & Setup", icon: Sparkles, path: "/welcome" },
      { label: "Executive Dashboard", icon: LayoutDashboard, path: "/executive-dashboard" },
      { label: "GDS Analyst", icon: Brain, path: "/shield-ai-analyst", isNew: true },
    ]
  },
  // ──────────────────────────────────────────────────────────────
  // DASHBOARDS & INTELLIGENCE
  // ──────────────────────────────────────────────────────────────
  {
    title: "DASHBOARDS",
    items: [
      { label: "Security Trends", icon: TrendingUp, path: "/trends", isNew: true },
      { label: "Risk Forecast", icon: TrendingUp, path: "/risk-forecast" },
      { label: "ROI Dashboard", icon: DollarSign, path: "/roi" },
      { label: "Breach Timeline", icon: Activity, path: "/breach-timeline" },
      { label: "Autonomous SOC", icon: Brain, path: "/autonomous-soc" },
    ]
  },
  // ──────────────────────────────────────────────────────────────
  // CODE SECURITY (Shift-Left)
  // ──────────────────────────────────────────────────────────────
  {
    title: "CODE SECURITY",
    badge: { value: "4", color: "#ef4444", tooltip: "4 critical code findings" },
    items: [
      { label: "Overview", icon: Code2, path: "/code" },
      { label: "SAST", icon: Search, path: "/code/sast" },
      { label: "AI SAST", icon: Bot, path: "/code/ai-sast" },
      { label: "SCA / Dependencies", icon: Package, path: "/code/sca" },
      { label: "Secrets", icon: Key, path: "/code/secrets" },
      { label: "SBOM & Licenses", icon: FileText, path: "/code/sbom" },
      { label: "AutoFix PRs", icon: Wrench, path: "/code/autofix" },
      { label: "CI/CD Gate", icon: GitBranch, path: "/code/cicd" },
    ]
  },
  // ──────────────────────────────────────────────────────────────
  // CLOUD SECURITY (Infrastructure)
  // ──────────────────────────────────────────────────────────────
  {
    title: "CLOUD SECURITY",
    badge: { value: "3", color: "#ef4444", tooltip: "3 critical cloud findings" },
    items: [
      { label: "Cloud Accounts", icon: Cloud, path: "/cloud" },
      { label: "Cloud Findings", icon: ShieldAlert, path: "/cloud/findings" },
      { label: "Virtual Machines", icon: Server, path: "/cloud/vms" },
      { label: "Containers", icon: Container, path: "/cloud/containers" },
      { label: "Kubernetes", icon: Layers, path: "/cloud/k8s" },
      { label: "Hardened Images", icon: Package, path: "/hardened-images", isNew: true },
      { label: "IaC Drift", icon: GitBranch, path: "/cloud/drift" },
      { label: "IAM Risks", icon: UserCheck, path: "/cloud/iam" },
    ]
  },
  // ──────────────────────────────────────────────────────────────
  // ATTACK SURFACE & PENTESTING
  // ──────────────────────────────────────────────────────────────
  {
    title: "ATTACK & PENTEST",
    badge: { value: "2", color: "#f97316", tooltip: "2 critical attack surface findings" },
    items: [
      { label: "Attack Surface", icon: Target, path: "/attack/surface" },
      { label: "Continuous Pentest", icon: Sword, path: "/attack/pentest" },
      { label: "Pentest on Deploy", icon: Play, path: "/pentest-on-deploy", isNew: true },
      { label: "DAST Scanner", icon: Zap, path: "/attack/dast" },
      { label: "API Security", icon: Plug, path: "/attack/api" },
      { label: "API Fuzzer", icon: Zap, path: "/attack/api-fuzzer" },
      { label: "Red Team", icon: Sword, path: "/attack/red-team" },
    ]
  },
  // ──────────────────────────────────────────────────────────────
  // THREAT INTELLIGENCE
  // ──────────────────────────────────────────────────────────────
  {
    title: "THREAT INTELLIGENCE",
    items: [
      { label: "Threat Intel Map", icon: Globe, path: "/threat-intel" },
      { label: "Threat Hunting", icon: Target, path: "/threat-hunting", isNew: true },
      { label: "IOC Radar", icon: Radio, path: "/ioc-radar" },
      { label: "Dark Web Monitor", icon: Eye, path: "/dark-web" },
      { label: "Phishing Monitor", icon: Shield, path: "/phishing-monitor" },
      { label: "Ransomware Tracker", icon: Skull, path: "/ransomware-tracker" },
      { label: "Threat Actors", icon: User, path: "/threat-actors" },
    ]
  },
  // ──────────────────────────────────────────────────────────────
  // RUNTIME PROTECTION
  // ──────────────────────────────────────────────────────────────
  {
    title: "RUNTIME & PROTECT",
    badge: { value: "✓", color: "#22c55e", tooltip: "All threats blocked" },
    items: [
      { label: "Zen Firewall", icon: Shield, path: "/protect/zen" },
      { label: "EDR / Endpoint", icon: Laptop, path: "/edr" },
      { label: "Device Agents", icon: Monitor, path: "/device-agents" },
      { label: "Bot Protection", icon: ShieldAlert, path: "/protect/bots" },
      { label: "Supply Chain", icon: Link2, path: "/protect/supply-chain" },
      { label: "LLM Security", icon: Brain, path: "/llm-security" },
      { label: "AI Protection", icon: Brain, path: "/ai-protection", isNew: true },
      { label: "Hardware / IoT", icon: Cpu, path: "/hardware-security", isNew: true },
    ]
  },
  // ──────────────────────────────────────────────────────────────
  // IDENTITY & ACCESS (CIEM/DSPM)
  // ──────────────────────────────────────────────────────────────
  {
    title: "IDENTITY & DATA",
    items: [
      { label: "Security Graph", icon: Network, path: "/security-graph", isNew: true },
      { label: "CIEM", icon: UserCheck, path: "/ciem", isNew: true },
      { label: "DSPM", icon: Database, path: "/dspm", isNew: true },
      { label: "ASPM", icon: TrendingUp, path: "/aspm" },
    ]
  },
  // ──────────────────────────────────────────────────────────────
  // INTELLIGENCE
  // ──────────────────────────────────────────────────────────────
  {
    title: "INTELLIGENCE",
    items: [
      { label: "Dark Web Monitor", icon: Eye, path: "/dark-web", isNew: true },
      { label: "Risk Score", icon: BarChart3, path: "/risk-score", isNew: true },
    ]
  },
  // ──────────────────────────────────────────────────────────────
  // PROACTIVE SECURITY
  // ──────────────────────────────────────────────────────────────
  {
    title: "PROACTIVE SECURITY",
    items: [
      { label: "LLM Security", icon: Bot, path: "/llm-security", isNew: true },
      { label: "SBOM", icon: FileText, path: "/code/sbom", isNew: true },
      { label: "Attack Surface", icon: Target, path: "/attack-surface", isNew: true },
    ]
  },
  // ──────────────────────────────────────────────────────────────
  // GOVERNANCE & COMPLIANCE
  // ──────────────────────────────────────────────────────────────
  {
    title: "GOVERNANCE",
    badge: { value: "18", color: "#eab308", tooltip: "18 policy violations" },
    items: [
      { label: "Compliance Dashboard", icon: BarChart3, path: "/compliance-dashboard", isNew: true },
      { label: "Compliance Controls", icon: ClipboardCheck, path: "/governance/compliance" },
      { label: "Policy Violations", icon: Scale, path: "/governance/violations" },
      { label: "Evidence Vault", icon: FolderOpen, path: "/evidence" },
      { label: "Compliance Library", icon: BookOpen, path: "/compliance-library", isNew: true },
      { label: "Weekly Reports", icon: FileText, path: "/governance/weekly-reports", isNew: true },
      { label: "Report Templates", icon: FileText, path: "/report-templates", isNew: true },
      { label: "Notification Rules", icon: Bell, path: "/notification-rules", isNew: true },
      { label: "AutoTriage", icon: GitMerge, path: "/autotriage" },
      { label: "Auto-Assign", icon: Users, path: "/auto-assign", isNew: true },
      { label: "Regulatory Intel", icon: Globe, path: "/regulatory-intelligence", isNew: true },
      { label: "Security Maturity", icon: TrendingUp, path: "/security-maturity", isNew: true },
      { label: "Quantum Readiness", icon: Shield, path: "/quantum-readiness", isNew: true },
    ]
  },
  // ──────────────────────────────────────────────────────────────
  // AI & AUTOMATION
  // ──────────────────────────────────────────────────────────────
  {
    title: "AI & AUTOMATION",
    badge: { value: "5", color: "#f97316", tooltip: "5 AI-SPM findings" },
    items: [
      { label: "AI-SPM", icon: Brain, path: "/ai-spm" },
      { label: "Workflow Canvas", icon: Workflow, path: "/workflows" },
      { label: "AI Agent Console", icon: Cpu, path: "/ai-agents" },
      { label: "Autonomous SOC", icon: Brain, path: "/autonomous-soc" },
      { label: "Alert Center", icon: Bell, path: "/alerts" },
    ]
  },
  // ──────────────────────────────────────────────────────────────
  // ECOSYSTEMS (GDS Platforms)
  // ──────────────────────────────────────────────────────────────
  {
    title: "ECOSYSTEMS",
    items: [
      { label: "GDS Home", icon: Home, path: "/shield-home", isNew: true },
      { label: "GDS Gov", icon: Scale, path: "/shield-gov", isNew: true },
      { label: "GDS Edge", icon: Cpu, path: "/shield-edge", isNew: true },
      { label: "GDS Infinite", icon: Zap, path: "/infinite", isNew: true },
    ]
  },
  // ──────────────────────────────────────────────────────────────
  // PLATFORM & RESOURCES
  // ──────────────────────────────────────────────────────────────
  {
    title: "PLATFORM",
    items: [
      { label: "Marketplace", icon: Zap, path: "/marketplace", isNew: true },
      { label: "Security Academy", icon: BookOpen, path: "/academy" },
      { label: "Cyber Range", icon: Target, path: "/cyber-range" },
      { label: "MSSP Portal", icon: Users, path: "/mssp-portal", isNew: true },
      { label: "PQC Scanner", icon: Shield, path: "/pqc-scanner", isNew: true },
      { label: "Cyber Insurance", icon: DollarSign, path: "/cyber-insurance", isNew: true },
    ]
  },
  // ──────────────────────────────────────────────────────────────
  // SETTINGS & ADMIN
  // ──────────────────────────────────────────────────────────────
  {
    title: "SETTINGS",
    items: [
      { label: "General Settings", icon: Settings, path: "/settings" },
      { label: "Integrations", icon: Plug, path: "/settings/integrations" },
      { label: "Billing & Plan", icon: DollarSign, path: "/settings/billing" },
      { label: "API Keys", icon: Key, path: "/settings/api-keys" },
      { label: "Teams & Users", icon: Users, path: "/settings/teams" },
      { label: "Webhooks", icon: Link2, path: "/settings/webhooks" },
      { label: "Public Landing", icon: Globe, path: "/landing" },
    ]
  },
  // ──────────────────────────────────────────────────────────────
  // LEGAL & SUPPORT
  // ──────────────────────────────────────────────────────────────
  {
    title: "LEGAL & SUPPORT",
    items: [
      { label: "Documentation", icon: BookOpen, path: "/docs" },
      { label: "Status Page", icon: Activity, path: "/status" },
      { label: "Support", icon: Newspaper, path: "/support" },
      { label: "Changelog", icon: Newspaper, path: "/changelog" },
      { label: "Privacy Policy", icon: Lock, path: "/legal/privacy" },
      { label: "Terms of Service", icon: FileText, path: "/legal/terms" },
      { label: "DPA", icon: FileText, path: "/legal/dpa" },
    ]
  },
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  const [riskScore] = useState(68);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const handleLogout = () => base44.auth.logout("/login");
  const riskColor = riskScore >= 70 ? "#ef4444" : riskScore >= 50 ? "#eab308" : "#22c55e";

  const { data: globalScoreHistory = [] } = useQuery({
    queryKey: ["sidebar-risk-score"],
    queryFn: () => base44.entities.GlobalRiskScore.list("-calculated_at", 1).catch(() => []),
    initialData: [],
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  });
  const latestScore = globalScoreHistory[0]?.overall_score ?? null;
  // The tenant's own identity, read after sign-in. Falls back to the platform's, so GDSA Radar is unchanged.
  const { appPublicSettings } = useAuth();
  const brand = appPublicSettings?.public_settings || {};
  const brandName = brand.display_name || 'GDS';
  const brandOrg = String(brand.name || 'GLOBAL DIGITAL SECURITY').toUpperCase();

  const scoreGrade = latestScore == null ? null : latestScore >= 90 ? "A" : latestScore >= 80 ? "B" : latestScore >= 65 ? "C" : latestScore >= 50 ? "D" : "F";
  const scoreColor = latestScore == null ? "#64748b" : latestScore >= 80 ? "#22c55e" : latestScore >= 50 ? "#eab308" : "#ef4444";

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen flex flex-col border-r transition-all duration-300 z-50 overflow-hidden",
      collapsed ? "w-[64px]" : "w-[240px]"
    )} style={{ background: "#070B14", borderColor: "#1a2235" }}>
      {/* Logo */}
      <div className={cn("flex items-center border-b px-4 py-4 flex-shrink-0", collapsed ? "justify-center px-2" : "gap-3")}
        style={{ borderColor: "#1a2235" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 relative"
          style={{ background: "linear-gradient(135deg, var(--brand-primary, #0B1220), var(--brand-secondary, #C9A84C))" }}>
          <Shield className="w-4 h-4 text-black" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="font-black text-white text-sm tracking-wide truncate">{brandName}</div>
              <div className="text-xs font-black px-1.5 py-0.5 rounded-md" style={{ background: riskColor + "20", color: riskColor }}>{riskScore}</div>
            </div>
            <div className="text-[9px] font-semibold tracking-widest truncate" style={{ color: "var(--brand-secondary, #C9A84C)" }}>{brandOrg}</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV.map(section => (
          <div key={section.title}>
            {!collapsed && (
              <div className="text-[10px] font-bold tracking-widest px-2 mb-1.5" style={{ color: "#C9A84C4D" }}>
                {section.title}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => {
                const isActive = location.pathname === item.path ||
                  (item.path !== "/" && location.pathname.startsWith(item.path));
                return (
                  <Link key={item.path} to={item.path}
                    className={cn(
                      "flex items-center rounded-lg text-sm transition-all duration-150 group relative",
                      collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2",
                      isActive ? "text-white" : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
                    )}
                    style={isActive ? {
                      background: "rgba(201,168,76,0.1)",
                      borderLeft: collapsed ? "none" : "2px solid #C9A84C",
                      color: "#C9A84C",
                    } : {}}>
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="font-medium text-xs flex-1">{item.label}</span>
                        {item.isNew && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full" style={{ background: GOLD, color: "#0A0E1A" }}>NEW</span>
                        )}
                      </>
                    )}
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 rounded-md text-xs font-medium text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity"
                        style={{ background: "#1F2937", border: "1px solid #374151" }}>
                        {item.label}{item.isNew ? " 🆕" : ""}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
            {section.badge && !collapsed && (
              <div className="mt-1 mb-2">
                <div className="flex items-center justify-end px-2">
                  <span 
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ 
                      background: `${section.badge.color}20`, 
                      color: section.badge.color,
                      border: `1px solid ${section.badge.color}40`
                    }}
                    title={section.badge.tooltip}
                  >
                    {section.badge.value}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Risk Score Footer */}
      {!collapsed && latestScore != null && (
        <div className="flex-shrink-0 px-3 pb-1">
          <Link to="/risk-score" className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
            style={{ background: `${scoreColor}10`, border: `1px solid ${scoreColor}30` }}>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider">Risk Score</span>
              <span className="text-sm font-black font-mono" style={{ color: scoreColor }}>{latestScore}</span>
            </div>
            <span className="text-xs font-black px-1.5 py-0.5 rounded" style={{ color: scoreColor, background: `${scoreColor}20` }}>{scoreGrade}</span>
          </Link>
        </div>
      )}

      {/* Free Plan / Upgrade - Fixed at bottom above user section */}
      {!collapsed && (
        <div className="flex-shrink-0 px-3 pb-3 border-t" style={{ borderColor: "#1a2235" }}>
          <div 
            className="rounded-lg p-2.5 cursor-pointer hover:bg-white/5 transition-colors border border-amber-500/30" 
            style={{ background: "rgba(245,158,11,0.05)" }} 
            onClick={() => window.location.href = "/settings/billing"}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-amber-400">Free Plan</span>
              <span className="text-[9px] text-slate-500 font-mono">3/5 repos</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden mb-1.5">
              <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full" style={{ width: "60%" }} />
            </div>
            <div className="text-[9px] text-amber-400 font-semibold flex items-center gap-1">
              <span>Upgrade →</span>
            </div>
          </div>
        </div>
      )}

      {/* User + Collapse */}
      <div className="flex-shrink-0 border-t p-3 space-y-2" style={{ borderColor: "#1a2235" }}>
        {!collapsed && user && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "#111827" }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0"
              style={{ background: "linear-gradient(135deg, var(--brand-primary, #0B1220), var(--brand-secondary, #C9A84C))" }}>
              {user.full_name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{user.full_name || "User"}</div>
              <div className="text-[10px]" style={{ color: "#C9A84C" }}>{user.role || "admin"}</div>
            </div>
            <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {!collapsed && (
          <Link to="/onboarding" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-white/5"
            style={{ color: GOLD }}>
            <Shield className="w-3.5 h-3.5" /> Setup Guide
          </Link>
        )}
        {!collapsed && (
          <button onClick={() => setShowWhatsNew(true)}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-white/5 text-left"
            style={{ color: "#8b5cf6" }}>
            <Sparkles className="w-3.5 h-3.5" /> What's New
            <span className="ml-auto text-[8px] font-black px-1.5 py-0.5 rounded-full text-black" style={{ background: "#8b5cf6" }}>5</span>
          </button>
        )}
        {showWhatsNew && <WhatsNew onClose={() => setShowWhatsNew(false)} />}
        <button onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs text-slate-500 hover:text-white hover:bg-white/5 transition-all">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}