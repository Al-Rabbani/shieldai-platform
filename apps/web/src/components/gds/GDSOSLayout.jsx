import React, { useState, useEffect, useRef } from "react";
import { Outlet, useLocation, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard, Cloud, Code2, Package, Target, Shield, Container,
  Server, Eye, CheckSquare, Zap, Plug, Settings, ChevronLeft, ChevronRight,
  LogOut, Menu, X, Bell, Activity, Key, Layers, Database, GitBranch, Link2,
  ShieldCheck, GitMerge, Cpu, GitPullRequest, ChevronDown, Clock3, Lightbulb,
  Atom, Brain, DollarSign, Building2, TrendingUp, Scale, Trophy, Swords,
  Radar, BarChart2, ClipboardList, Sparkles, Network, ScrollText, Archive,
  Share2, Radio, BarChart, Map, Smartphone, Wrench, AlertOctagon, ShieldAlert,
  Bot, MessageSquare, Store, Handshake, BookOpen, FileText, RotateCcw, GitBranch as GitBranchIcon, Play, Heart, Users, Calendar, Clock, Flame, BarChart3, ArrowRightLeft,
  Webhook, Phone, Plus, CheckCircle, User, Crosshair, BarChart4, AlertTriangle, Globe, Search, History, Lock, Folder, Vote, RefreshCw, HardDrive, PieChart, Wifi, RadioTower, Signal, Factory
} from "lucide-react";
import { cn } from "@/lib/utils";
import GDSNotificationBell from "@/components/gds/GDSNotificationBell";

const BG = "#020817";
const SIDEBAR_BG = "#050e1f";
const BORDER = "#1e3a5f";
const CYAN = "#00d4ff";
const MUTED = "#64748b";

// Grouped nav structure
const NAV_GROUPS = [
  {
    label: "⚡ AGENTIC PLATFORM",
    items: [
      { icon: Zap,  label: "Command Center",  path: "/agent-command-center" },
      { icon: Bot,  label: "AI Agent Fleet",  path: "/agents-fleet" },
    ],
  },
  {
    label: "⚡ CO-PILOT",
    items: [
      { icon: Zap,            label: "Command Center",  path: "/copilot" },
      { icon: Activity,       label: "Commands",        path: "/copilot/command" },
      { icon: Clock,          label: "Executions",      path: "/copilot/executions" },
      { icon: Shield,         label: "Approvals",       path: "/copilot/approvals" },
      { icon: Bot,            label: "Agents",          path: "/copilot/agents" },
      { icon: Folder,         label: "Evidence",        path: "/copilot/evidence" },
      { icon: FileText,       label: "Reports",         path: "/copilot/reports" },
      { icon: Network,        label: "Memory Impact",   path: "/copilot/memory" },
      { icon: Database,       label: "Platform Map",    path: "/copilot/platform" },
      { icon: Network,        label: "Dependency Map",  path: "/copilot/dependency-map" },
      { icon: AlertTriangle,  label: "Safety",          path: "/copilot/safety" },
      { icon: Clock3,         label: "Audit Trail",     path: "/copilot/audit" },
    ],
  },
  {
    label: "GASCI AI BRAIN",
    items: [
      { icon: Brain,          label: "Global Command",  path: "/gasci" },
      { icon: Activity,       label: "Orchestration",   path: "/gasci/orchestration" },
      { icon: Lightbulb,      label: "Reasoning",       path: "/gasci/reasoning" },
      { icon: Vote,           label: "Consensus",       path: "/gasci/consensus" },
      { icon: Cpu,            label: "Multi-LLM",       path: "/gasci/models" },
      { icon: Zap,            label: "Workflows",       path: "/gasci/workflows" },
      { icon: Database,       label: "Prompts",         path: "/gasci/prompts" },
      { icon: Shield,         label: "Governance",      path: "/gasci/governance" },
      { icon: Database,       label: "Memory",          path: "/gasci/memory" },
      { icon: TrendingUp,     label: "Learning",        path: "/gasci/learning" },
      { icon: Network,        label: "Knowledge Graph", path: "/gasci/graph" },
    ],
  },
  {
    label: "NATIONAL COMMAND",
    items: [
      { icon: Shield,         label: "Command Center",  path: "/national-command" },
      { icon: Building2,      label: "Agencies",        path: "/national-command/agencies" },
      { icon: Lock,           label: "Infrastructure",  path: "/national-command/infrastructure" },
      { icon: AlertTriangle,  label: "Threats",         path: "/national-command/threats" },
      { icon: Activity,       label: "Incidents",       path: "/national-command/incidents" },
      { icon: Layers,         label: "Sectors",         path: "/national-command/sectors" },
      { icon: FileText,       label: "Directives",      path: "/national-command/directives" },
      { icon: Radar,          label: "SOC Network",     path: "/national-command/socs" },
    ],
  },
  {
    label: "MSSP COMMAND",
    items: [
      { icon: TrendingUp,     label: "Global Ops",      path: "/mssp" },
      { icon: Users,          label: "Customers",       path: "/mssp/customers" },
      { icon: Activity,       label: "SOC Operations",  path: "/mssp/soc" },
      { icon: Package,        label: "Services",        path: "/mssp/services" },
      { icon: Heart,          label: "Health & Success", path: "/mssp/health" },
      { icon: Clock,          label: "SLA Management",  path: "/mssp/sla" },
      { icon: DollarSign,     label: "Revenue & Billing", path: "/mssp/revenue" },
      { icon: Handshake,      label: "Partners",        path: "/mssp/partners" },
    ],
  },
  {
    label: "FINANCIAL SECURITY",
    items: [
      { icon: DollarSign,     label: "FinSOC Command",  path: "/financial" },
      { icon: AlertTriangle,  label: "Fraud Ops",       path: "/financial/fraud" },
      { icon: Lock,           label: "AML Intelligence", path: "/financial/aml" },
      { icon: Shield,         label: "KYC & CDD",       path: "/financial/kyc" },
      { icon: Globe,          label: "Sanctions",       path: "/financial/sanctions" },
      { icon: Activity,       label: "Transactions",    path: "/financial/transactions" },
      { icon: TrendingUp,     label: "Risk Register",   path: "/financial/risk" },
      { icon: Building2,      label: "Institutions",    path: "/financial/institutions" },
    ],
  },
  {
    label: "HEALTHCARE SECURITY",
    items: [
      { icon: Heart,          label: "HealthSOC",       path: "/healthcare" },
      { icon: Cpu,            label: "Medical Devices", path: "/healthcare/devices" },
      { icon: Activity,       label: "Incidents",       path: "/healthcare/incidents" },
      { icon: Database,       label: "PHI Protection",  path: "/healthcare/phi" },
      { icon: CheckSquare,    label: "HIPAA Compliance", path: "/healthcare/compliance" },
      { icon: Wifi,           label: "Clinical Networks", path: "/healthcare/networks" },
      { icon: AlertTriangle,  label: "Threat Intel",    path: "/healthcare/threats" },
      { icon: Building2,      label: "Hospitals",       path: "/healthcare/hospitals" },
    ],
  },
  {
    label: "CRITICAL INFRASTRUCTURE",
    items: [
      { icon: Zap,            label: "Command Center",  path: "/critical-infrastructure" },
      { icon: Cpu,            label: "OT Assets",       path: "/critical-infrastructure/ot-assets" },
      { icon: Shield,         label: "ICS & PLC",       path: "/critical-infrastructure/ics" },
      { icon: Database,       label: "SCADA",           path: "/critical-infrastructure/scada" },
      { icon: Activity,       label: "Incidents",       path: "/critical-infrastructure/incidents" },
      { icon: AlertTriangle,  label: "Threats",         path: "/critical-infrastructure/threats" },
      { icon: TrendingUp,     label: "Resilience",      path: "/critical-infrastructure/resilience" },
      { icon: CheckSquare,    label: "Compliance",      path: "/critical-infrastructure/compliance" },
    ],
  },
  {
    label: "DATA INTELLIGENCE",
    items: [
      { icon: Activity,       label: "Command Center",  path: "/data-intelligence" },
      { icon: Database,       label: "Data Catalog",    path: "/data-intelligence/catalog" },
      { icon: Zap,            label: "Data Streams",    path: "/data-intelligence/streams" },
      { icon: HardDrive,      label: "Data Lakes",      path: "/data-intelligence/lakes" },
      { icon: Brain,          label: "Insights",        path: "/data-intelligence/insights" },
      { icon: TrendingUp,     label: "KPI Dashboard",   path: "/data-intelligence/kpis" },
      { icon: PieChart,       label: "Analytics Studio", path: "/data-intelligence/analytics" },
      { icon: Search,         label: "Semantic Search", path: "/data-intelligence/semantic" },
      { icon: CheckCircle,    label: "Data Quality",    path: "/data-intelligence/quality" },
      { icon: BarChart3,      label: "Operational Metrics", path: "/data-intelligence/metrics" },
    ],
  },
  {
    label: "INTEGRATION HUB",
    items: [
      { icon: Plug,           label: "Universal Hub",   path: "/integration-hub" },
      { icon: TrendingUp,     label: "Marketplace",     path: "/integration-hub/marketplace" },
      { icon: Layers,         label: "Connectors",      path: "/integration-hub/connectors" },
      { icon: Cpu,            label: "SDK Studio",      path: "/integration-hub/sdk" },
      { icon: Zap,            label: "Integrations",    path: "/integration-hub/integrations" },
      { icon: Activity,       label: "API Federation",  path: "/integration-hub/api-federation" },
      { icon: Bot,            label: "MCP Hub",         path: "/integration-hub/mcp" },
      { icon: Share2,         label: "A2A Network",     path: "/integration-hub/a2a" },
      { icon: Shield,         label: "Governance",      path: "/integration-hub/policies" },
      { icon: BarChart3,      label: "Analytics",       path: "/integration-hub/analytics" },
    ],
  },
  {
    label: "AI-SOC",
    items: [
      { icon: Activity,       label: "Command Center",  path: "/" },
      { icon: Activity,       label: "SOC Operations",  path: "/soc" },
      { icon: Target,         label: "Incidents",       path: "/soc/incidents" },
      { icon: Clock,          label: "Queue",           path: "/soc/queue" },
      { icon: Brain,          label: "Investigations",  path: "/soc/investigations" },
      { icon: Network,        label: "Correlation",     path: "/soc/correlation" },
      { icon: BookOpen,       label: "Playbooks",       path: "/soc/playbooks" },
      { icon: TrendingUp,     label: "Metrics",         path: "/soc/metrics" },
      { icon: TrendingUp,     label: "Executive",       path: "/soc/executive" },
    ],
  },
  {
    label: "INCIDENT RESPONSE",
    items: [
      { icon: Target,         label: "Command Center",  path: "/dfir" },
      { icon: Activity,       label: "Incidents",       path: "/dfir/incidents" },
      { icon: Shield,         label: "Containment",     path: "/dfir/containment" },
      { icon: CheckCircle,    label: "Eradication",     path: "/dfir/eradication" },
      { icon: CheckCircle,    label: "Recovery",        path: "/dfir/recovery" },
      { icon: Search,         label: "Root Cause",      path: "/dfir/rca" },
      { icon: CheckSquare,    label: "Corrective",      path: "/dfir/corrective" },
      { icon: Scale,          label: "Regulatory",      path: "/dfir/regulatory" },
      { icon: FileText,       label: "PIR Reviews",     path: "/dfir/pir" },
      { icon: Folder,         label: "Forensics",       path: "/dfir/forensics" },
    ],
  },
  {
    label: "Security",
    items: [
      { icon: Activity,      label: "Command Center",  path: "/" },
      { icon: Activity,      label: "SOC Operations",  path: "/soc" },
      { icon: Target,        label: "Incidents",       path: "/soc/incidents" },
      { icon: Clock,         label: "Queue",           path: "/soc/queue" },
      { icon: Brain,         label: "Investigations",  path: "/soc/investigations" },
      { icon: Network,       label: "Correlation",     path: "/soc/correlation" },
      { icon: BookOpen,      label: "Playbooks",       path: "/soc/playbooks" },
      { icon: TrendingUp,    label: "Metrics",         path: "/soc/metrics" },
      { icon: BarChart,      label: "Executive",       path: "/soc/executive" },
    ],
  },
  {
    label: "Security",
    items: [
      { icon: Cloud,          label: "Cloud",         path: "/cloud" },
      { icon: Code2,          label: "Code",          path: "/code" },
      { icon: Zap,            label: "Runtime",       path: "/runtime" },
      { icon: Shield,         label: "Identity",      path: "/identity" },
      { icon: Wrench,         label: "AutoFix",       path: "/remediation" },
      { icon: User,           label: "Assignments",   path: "/vulnerabilities/assign" },
      { icon: Clock,          label: "SLA Templates", path: "/sla-templates" },
      { icon: BookOpen,       label: "Fix Templates", path: "/remediation-templates" },
      { icon: BookOpen,       label: "Playbook Library", path: "/remediation/playbooks" },
      { icon: BarChart4,      label: "Team Performance", path: "/team/performance" },
      { icon: TrendingUp,     label: "Security Velocity", path: "/security-velocity" },
      { icon: Zap,            label: "AI Triage",     path: "/triage" },
      { icon: GitBranch,      label: "SBOM Intel",    path: "/sbom-intel" },
      { icon: Brain,          label: "SaaS Security", path: "/saas-security" },
      { icon: Cpu,            label: "AI Red Team",   path: "/ai-red-team" },
      { icon: GitMerge,       label: "DevSecOps",     path: "/devsecops" },
    ],
  },
  {
    label: "ATTACK SURFACE",
    items: [
      { icon: Radar,          label: "Dashboard",     path: "/asm" },
      { icon: Shield,         label: "Assets",        path: "/asm/assets" },
      { icon: AlertTriangle,  label: "Exposure",      path: "/asm/exposure" },
      { icon: Globe,          label: "Domains",       path: "/asm/domains" },
      { icon: Layers,         label: "Subdomains",    path: "/asm/subdomains" },
      { icon: Cloud,          label: "Cloud",         path: "/asm/cloud" },
      { icon: Zap,            label: "APIs",          path: "/asm/apis" },
      { icon: Shield,         label: "Certificates",  path: "/asm/certificates" },
      { icon: Database,       label: "DNS",           path: "/asm/dns" },
      { icon: Target,         label: "Critical",      path: "/asm/critical" },
      { icon: AlertOctagon,   label: "Shadow IT",     path: "/asm/shadow-it" },
      { icon: Search,         label: "Discovery Jobs", path: "/asm/jobs" },
    ],
  },
  {
    label: "IDENTITY SECURITY",
    items: [
      { icon: Shield, label: "Identity Center", path: "/identity" },
      { icon: Database, label: "AD Explorer", path: "/identity/ad" },
      { icon: Users, label: "User Explorer", path: "/identity/users" },
      { icon: Users, label: "Privileged Groups", path: "/identity/groups" },
      { icon: Crosshair, label: "Attack Paths", path: "/identity/attack-paths" },
      { icon: AlertTriangle, label: "Findings", path: "/identity/findings" },
      { icon: Key, label: "Credential Exposure", path: "/identity/credentials" },
      { icon: Wrench, label: "Remediation", path: "/identity/remediation" },
      { icon: ClipboardList, label: "Assessments", path: "/identity/assessments" },
      { icon: Server, label: "Service Accounts", path: "/identity/services" },
    ],
  },
  {
    label: "DEVSECOPS",
    items: [
      { icon: Shield, label: "DevSecOps Center", path: "/devsecops" },
      { icon: Database, label: "Kubernetes Explorer", path: "/devsecops/kubernetes" },
      { icon: Server, label: "Pod Security", path: "/devsecops/pods" },
      { icon: Container, label: "Container Images", path: "/devsecops/containers" },
      { icon: GitBranch, label: "CI/CD Security", path: "/devsecops/pipelines" },
      { icon: FileText, label: "SBOM Explorer", path: "/devsecops/sbom" },
      { icon: Package, label: "Dependencies", path: "/devsecops/dependencies" },
      { icon: FileText, label: "IaC Security", path: "/devsecops/iac" },
      { icon: Activity, label: "Runtime Protection", path: "/devsecops/runtime" },
      { icon: Lock, label: "K8s RBAC & Admission", path: "/devsecops/rbac" },
    ],
  },
  {
    label: "CLOUD SECURITY",
    items: [
      { icon: Cloud,          label: "Cloud Center",    path: "/cloud" },
      { icon: Database,       label: "Inventory",       path: "/cloud/inventory" },
      { icon: Shield,         label: "CSPM",            path: "/cloud/cspm" },
      { icon: Users,          label: "CIEM",            path: "/cloud/ciem" },
      { icon: Activity,       label: "Threats",         path: "/cloud/threats" },
      { icon: AlertTriangle,  label: "Risks",           path: "/cloud/risks" },
      { icon: CheckSquare,    label: "Compliance",      path: "/cloud/compliance" },
      { icon: Wrench,         label: "Remediation",     path: "/cloud/remediation" },
      { icon: Search,         label: "Assessments",     path: "/cloud/assessments" },
      { icon: TrendingUp,     label: "Executive",       path: "/cloud/exec" },
    ],
  },
  {
    label: "THREAT INTEL",
    items: [
      { icon: Brain,          label: "Cyber Fusion Center", path: "/threat-intel" },
      { icon: Database,       label: "IOC Explorer",        path: "/threat-intel/iocs" },
      { icon: Crosshair,      label: "Threat Actors",       path: "/threat-intel/actors" },
      { icon: Globe,          label: "Campaigns",           path: "/threat-intel/campaigns" },
      { icon: Shield,         label: "Malware Intel",       path: "/threat-intel/malware" },
      { icon: TrendingUp,     label: "Predictions",         path: "/threat-intel/predictions" },
      { icon: Radio,          label: "Intelligence Feeds",  path: "/threat-intel/feeds" },
      { icon: FileText,       label: "Reports",             path: "/threat-intel/reports" },
      { icon: AlertTriangle,  label: "Dark Web",            path: "/threat-intel/dark-web" },
      { icon: Network,        label: "Threat Graph",        path: "/threat-intel/graph" },
    ],
  },
  {
    label: "PURPLE TEAM",
    items: [
      { icon: Target,         label: "Command Center",      path: "/purple" },
      { icon: Activity,       label: "Simulations",         path: "/purple/simulations" },
      { icon: BookOpen,       label: "Scenarios",           path: "/purple/scenarios" },
      { icon: Target,         label: "ATT&CK Coverage",     path: "/purple/coverage" },
      { icon: Network,        label: "Attack Graphs",       path: "/purple/attack-graphs" },
      { icon: AlertTriangle,  label: "Detection Gaps",      path: "/purple/detection-gaps" },
      { icon: Shield,         label: "Detections",          path: "/purple/detections" },
      { icon: Shield,         label: "Controls",            path: "/purple/controls" },
      { icon: FileText,       label: "Findings",            path: "/purple/findings" },
      { icon: FileText,       label: "Reports",             path: "/purple/reports" },
    ],
  },
  {
    label: "CYBER RANGE",
    items: [
      { icon: Target,         label: "Command Center",      path: "/cyber-range" },
      { icon: Database,       label: "Digital Twins",       path: "/cyber-range/twins" },
      { icon: Lock,           label: "Environments",        path: "/cyber-range/environments" },
      { icon: Activity,       label: "Exercises",           path: "/cyber-range/exercises" },
      { icon: Zap,            label: "Chaos Engineering",   path: "/cyber-range/chaos" },
      { icon: TrendingUp,     label: "Risk Forecasts",      path: "/cyber-range/forecasts" },
      { icon: Layers,         label: "Models",              path: "/cyber-range/models" },
      { icon: Swords,         label: "Missions",            path: "/cyber-range/missions" },
      { icon: RefreshCw,      label: "Sync & Versions",     path: "/cyber-range/sync" },
    ],
  },
  {
    label: "CYBER RANGE",
    items: [
      { icon: Target,         label: "Command Center",      path: "/cyber-range" },
      { icon: Database,       label: "Digital Twins",       path: "/cyber-range/twins" },
      { icon: Lock,           label: "Environments",        path: "/cyber-range/environments" },
      { icon: Activity,       label: "Exercises",           path: "/cyber-range/exercises" },
      { icon: Zap,            label: "Chaos Engineering",   path: "/cyber-range/chaos" },
      { icon: TrendingUp,     label: "Risk Forecasts",      path: "/cyber-range/forecasts" },
      { icon: Layers,         label: "Models",              path: "/cyber-range/models" },
      { icon: Swords,         label: "Missions",            path: "/cyber-range/missions" },
      { icon: RefreshCw,      label: "Sync & Versions",     path: "/cyber-range/sync" },
    ],
  },
  {
    label: "CYBER RANGE",
    items: [
      { icon: Target,         label: "Command Center",      path: "/cyber-range" },
      { icon: Database,       label: "Digital Twins",       path: "/cyber-range/twins" },
      { icon: Lock,           label: "Environments",        path: "/cyber-range/environments" },
      { icon: Activity,       label: "Exercises",           path: "/cyber-range/exercises" },
      { icon: Zap,            label: "Chaos Engineering",   path: "/cyber-range/chaos" },
      { icon: TrendingUp,     label: "Risk Forecasts",      path: "/cyber-range/forecasts" },
      { icon: Layers,         label: "Models",              path: "/cyber-range/models" },
      { icon: Swords,         label: "Missions",            path: "/cyber-range/missions" },
      { icon: RefreshCw,      label: "Sync & Versions",     path: "/cyber-range/sync" },
    ],
  },
  {
    label: "Threat Operations",
    items: [
      { icon: Radar,          label: "Intelligence",  path: "/intelligence" },
      { icon: Swords,         label: "Threat Sim",    path: "/threat-sim" },
      { icon: Crosshair,      label: "Red Team OS",   path: "/redteam" },
      { icon: Share2,         label: "Attack Graph",  path: "/attack-graph" },
      { icon: Target,         label: "Threat Hunt",   path: "/threat-hunting" },
    ],
  },
  {
    label: "Compliance",
    items: [
      { icon: CheckSquare,    label: "Compliance",    path: "/compliance" },
      { icon: CheckSquare,    label: "Task Management", path: "/compliance/tasks" },
      { icon: Shield,         label: "Unified Dashboard", path: "/compliance/unified" },
      { icon: Link,           label: "Vulnerability Mapping", path: "/compliance/mapping" },
      { icon: TrendingUp,     label: "Compliance Scores", path: "/compliance/scores" },
      { icon: Archive,        label: "Evidence Library", path: "/compliance/evidence" },
      { icon: History,        label: "Endpoint History", path: "/web/endpoints/history" },
      { icon: Activity,       label: "Auth Visualization", path: "/web/auth-visualization" },
      { icon: Calendar,       label: "Report Scheduling", path: "/compliance/scheduling" },
      { icon: Bell,           label: "Compliance Alerts", path: "/compliance/alerts" },
      { icon: Target,         label: "Risk Intelligence", path: "/risk-intelligence" },
      { icon: Scale,          label: "Governance",    path: "/governance" },
      { icon: ScrollText,     label: "Policies",      path: "/policy-builder" },
      { icon: Archive,        label: "Evidence",      path: "/evidence" },
      { icon: Archive,        label: "Evidence Locker", path: "/evidence/locker" },
      { icon: FileText,       label: "Compliance Reporting", path: "/compliance/reporting" },
      { icon: Folder,         label: "Evidence Map",    path: "/compliance/evidence-map" },
      { icon: Scale,          label: "Regulatory",    path: "/regulatory" },
      { icon: Shield,         label: "Audit Trail",   path: "/audit-trail" },
      { icon: ShieldCheck,    label: "Zero Trust",    path: "/zero-trust" },
      { icon: CheckSquare,    label: "Auto-Compliance", path: "/compliance-auto" },
      { icon: Target,         label: "Threat Model",  path: "/threat-model" },
    ],
  },
  {
    label: "Operations",
    items: [
      { icon: GitPullRequest, label: "CI/CD",         path: "/cicd" },
      { icon: Building2,      label: "MSSP",          path: "/mssp" },
      { icon: AlertOctagon,   label: "Alert Rules",   path: "/alert-rules" },
      { icon: ScrollText,     label: "Pen Report",    path: "/pen-report" },
      { icon: Zap,            label: "SOAR",          path: "/soar" },
      { icon: Radio,          label: "Live Feed",     path: "/live-feed" },
      { icon: Zap,            label: "Chaos Lab",     path: "/chaos" },
      { icon: BarChart,       label: "Scorecard",     path: "/scorecard" },
      { icon: Map,            label: "Heatmap",       path: "/heatmap" },
    ],
  },
  {
    label: "AI Kernel",
    items: [
      { icon: Cpu,          label: "AI Kernel",       path: "/kernel" },
      { icon: BarChart2,    label: "Metrics",         path: "/kernel-metrics" },
      { icon: Wrench,       label: "Tool Registry",   path: "/kernel-tools" },
      { icon: ShieldAlert,  label: "Approval Queue",  path: "/kernel-approvals" },
    ],
  },
  {
    label: "AGENT RUNTIME",
    items: [
      { icon: Bot,          label: "Agent Runtime",   path: "/agents" },
      { icon: Layers,       label: "Registry",        path: "/agents/registry" },
      { icon: Activity,     label: "Health Monitor",  path: "/agents/health" },
      { icon: Clock3,       label: "Sessions",        path: "/agents/sessions" },
      { icon: MessageSquare,label: "Comms",           path: "/agents/comms" },
    ],
  },
  {
    label: "SUPER AGENTS",
    items: [
      { icon: Cpu,          label: "Super Agents",    path: "/super-agents" },
      { icon: Store,        label: "Marketplace",     path: "/super-agents/marketplace" },
      { icon: Handshake,    label: "Collaboration",   path: "/super-agents/collaborate" },
      { icon: Shield,       label: "Governance",      path: "/super-agents/governance" },
      { icon: Activity,     label: "Telemetry",       path: "/super-agents/telemetry" },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { icon: Brain,        label: "Memory",          path: "/memory" },
      { icon: BookOpen,     label: "Knowledge Base",  path: "/memory/knowledge" },
      { icon: Network,      label: "Knowledge Graph", path: "/memory/graph" },
      { icon: Sparkles,     label: "RAG Console",     path: "/memory/rag" },
      { icon: Scale,        label: "Governance",      path: "/memory/governance" },
    ],
  },
  {
    label: "PLANNING",
    items: [
      { icon: Brain,        label: "Planning",        path: "/planning" },
      { icon: Target,       label: "Goal Analyzer",   path: "/planning/goals" },
      { icon: Lightbulb,    label: "Reasoning",       path: "/planning/reasoning" },
      { icon: TrendingUp,   label: "Confidence",      path: "/planning/confidence" },
      { icon: Clock3,       label: "Audit Timeline",  path: "/planning/audit" },
      { icon: TrendingUp,   label: "Risk Forecast",   path: "/planning/forecast" },
    ],
  },
  {
    label: "WORKFLOWS",
    items: [
      { icon: Activity,     label: "Workflows",       path: "/workflows" },
      { icon: FileText,     label: "Workflow Builder", path: "/workflows/builder" },
      { icon: Clock3,       label: "Run Dashboard",   path: "/workflows/runs" },
      { icon: BookOpen,     label: "Playbook Library", path: "/workflows/playbooks" },
      { icon: Shield,       label: "Audit & Operations", path: "/workflows/audit" },
      { icon: RotateCcw,    label: "Workflow Recovery", path: "/workflows/recovery" },
      { icon: GitBranchIcon,    label: "Execution History", path: "/workflows/history" },
      { icon: TrendingUp,   label: "Pipeline Comparison", path: "/workflows/compare" },
      { icon: Target,       label: "Executive Summary", path: "/workflows/executive" },
      { icon: TrendingUp,     label: "Risk Trends", path: "/risk-trends" },
      { icon: BarChart,     label: "Risk Dashboard", path: "/risk-trends-dashboard" },
      { icon: Target,       label: "Risk Correlation", path: "/risk-correlation" },
    ],
  },
  {
    label: "TOOLS",
    items: [
      { icon: Wrench,       label: "Tools",           path: "/tools" },
      { icon: Layers,       label: "Tool Registry",   path: "/tools/registry" },
      { icon: Play,         label: "Tool Executor",   path: "/tools/execute" },
      { icon: Shield,       label: "Risk Profiles",   path: "/tools/risk" },
      { icon: Clock3,       label: "Audit Log",       path: "/tools/audit" },
      { icon: Activity,     label: "Live Execution",  path: "/tools/live" },
      { icon: Heart,        label: "Tool Health",     path: "/tools/health" },
      { icon: TrendingUp,   label: "Performance",     path: "/tools/performance" },
    ],
  },
  {
    label: "APPROVALS",
    items: [
      { icon: Shield,       label: "Approvals",       path: "/approvals" },
      { icon: Clock3,       label: "Approval Queue",  path: "/approvals/queue" },
      { icon: FileText,     label: "Evidence Viewer", path: "/approvals/evidence" },
      { icon: FileText,     label: "Policy Manager",  path: "/approvals/policies" },
      { icon: Clock3,       label: "Audit Log",       path: "/approvals/audit" },
    ],
  },
  {
    label: "IDENTITY",
    items: [
      { icon: Shield,       label: "Identity",              path: "/identity" },
      { icon: Users,        label: "User Management",       path: "/identity/users" },
      { icon: Key,          label: "Roles & Permissions",   path: "/identity/roles" },
      { icon: Activity,     label: "Session Monitor",       path: "/identity/sessions" },
      { icon: Settings,     label: "Identity Governance",   path: "/identity/providers" },
    ],
  },
  {
    label: "ZERO TRUST",
    items: [
      { icon: Shield,       label: "Zero Trust",            path: "/zero-trust" },
      { icon: Activity,     label: "Evaluator",             path: "/zero-trust/evaluate" },
      { icon: Key,          label: "JIT & JEA",             path: "/zero-trust/jit" },
      { icon: Smartphone,   label: "Device & Service",      path: "/zero-trust/devices" },
      { icon: FileText,     label: "Policies & Audit",      path: "/zero-trust/policies" },
    ],
  },
  {
    label: "ACCESS CONTROL",
    items: [
      { icon: Shield,       label: "Access Control",        path: "/access-control" },
      { icon: Activity,     label: "Evaluator",             path: "/access-control/evaluate" },
      { icon: Key,          label: "Roles & Permissions",   path: "/access-control/roles" },
      { icon: Database,     label: "Entitlements",          path: "/access-control/entitlements" },
      { icon: Clock,        label: "Audit Log",             path: "/access-control/audit" },
    ],
  },
  {
    label: "TENANTS",
    items: [
      { icon: Building2,    label: "Tenants",               path: "/tenants" },
      { icon: Layers,       label: "Workspaces",            path: "/tenants/workspaces" },
      { icon: Settings,     label: "Configuration",         path: "/tenants/configure" },
      { icon: Shield,       label: "Isolation Monitor",     path: "/tenants/isolation" },
      { icon: DollarSign,   label: "Subscriptions",         path: "/tenants/subscriptions" },
    ],
  },
  {
    label: "IDENTITY",
    items: [
      { icon: Shield,       label: "Identity",              path: "/identity" },
      { icon: Users,        label: "User Management",       path: "/identity/users" },
      { icon: Key,          label: "Roles & Permissions",   path: "/identity/roles" },
      { icon: Activity,     label: "Session Monitor",       path: "/identity/sessions" },
      { icon: Settings,     label: "Identity Governance",   path: "/identity/providers" },
      { icon: TrendingUp,   label: "Identity Insights",     path: "/identity/insights" },
    ],
  },
  {
    label: "ZERO TRUST",
    items: [
      { icon: Shield,       label: "Zero Trust",            path: "/zero-trust" },
      { icon: Activity,     label: "Evaluator",             path: "/zero-trust/evaluate" },
      { icon: Key,          label: "JIT & JEA",             path: "/zero-trust/jit" },
      { icon: Smartphone,   label: "Device & Service",      path: "/zero-trust/devices" },
      { icon: FileText,     label: "Policies & Audit",      path: "/zero-trust/policies" },
      { icon: AlertOctagon, label: "Alerts",                path: "/zero-trust/alerts" },
    ],
  },
  {
    label: "ACCESS CONTROL",
    items: [
      { icon: Shield,       label: "Access Control",        path: "/access-control" },
      { icon: Activity,     label: "Evaluator",             path: "/access-control/evaluate" },
      { icon: Key,          label: "Roles & Permissions",   path: "/access-control/roles" },
      { icon: Database,     label: "Entitlements",          path: "/access-control/entitlements" },
      { icon: Clock,        label: "Audit Log",             path: "/access-control/audit" },
    ],
  },
  {
    label: "TENANTS",
    items: [
      { icon: Building2,    label: "Tenants",               path: "/tenants" },
      { icon: Layers,       label: "Workspaces",            path: "/tenants/workspaces" },
      { icon: Settings,     label: "Configuration",         path: "/tenants/configure" },
      { icon: Shield,       label: "Isolation Monitor",     path: "/tenants/isolation" },
      { icon: DollarSign,   label: "Subscriptions",         path: "/tenants/subscriptions" },
      { icon: Activity,     label: "Resource Heatmap",      path: "/tenants/heatmap" },
      { icon: ScrollText,   label: "Audit Log",             path: "/tenants/audit" },
      { icon: BarChart3,    label: "Resource Dashboard",    path: "/tenants/resource-dashboard" },
      { icon: Target,       label: "Risk Heatmap",          path: "/tenants/risk-heatmap" },
      { icon: BarChart,     label: "Executive Report",      path: "/tenants/executive-report" },
      { icon: ArrowRightLeft, label: "Migration Tool",      path: "/tenants/migration" },
      { icon: TrendingUp,   label: "Predictive Growth",   path: "/tenants/predictive-growth" },
      { icon: BarChart,     label: "Executive Report",      path: "/tenants/executive-report" },
      { icon: BarChart,     label: "Executive Report",      path: "/tenants/executive-report" },
    ],
  },
  {
    label: "Insights",
    items: [
      { icon: Sparkles,       label: "AI Copilot",    path: "/copilot" },
      { icon: ClipboardList,  label: "Board",         path: "/board" },
      { icon: BarChart2,      label: "Data Lake",     path: "/data-lake" },
      { icon: Network,        label: "Asset Graph",   path: "/asset-graph" },
      { icon: TrendingUp,     label: "Risk Intelligence", path: "/risk-intelligence" },
      { icon: Target,         label: "Risk Overview",     path: "/executive/risk-overview" },
      { icon: FileText,       label: "Weekly Report",     path: "/executive/weekly-report" },
      { icon: TrendingUp,     label: "ML Analytics",  path: "/posture-ml" },
      { icon: DollarSign,     label: "Cost-Risk",     path: "/cloud-cost" },
      { icon: Trophy,         label: "Maturity",      path: "/maturity" },
      { icon: Database,       label: "Data Mesh",     path: "/data-mesh" },
    ],
  },
  {
    label: "CONNECTORS & INTEGRATIONS",
    items: [
      { icon: Plug,           label: "Integration Hub",     path: "/connectors" },
      { icon: Plus,           label: "Register Connector",  path: "/connectors/register" },
      { icon: Webhook,        label: "Webhook Manager",     path: "/connectors/webhooks" },
      { icon: Activity,       label: "Execution Log",       path: "/connectors/executions" },
    ],
  },
  {
    label: "NOTIFICATIONS",
    items: [
      { icon: Bell,           label: "Alert Rules",         path: "/notifications/rules" },
      { icon: Activity,       label: "Dispatch Log",        path: "/notifications/dispatch" },
      { icon: TrendingUp,     label: "Escalations",         path: "/notifications/escalations" },
      { icon: Settings,       label: "Preferences",         path: "/notifications/preferences" },
    ],
  },
  {
    label: "EXECUTIVE INTELLIGENCE",
    items: [
      { icon: TrendingUp,     label: "Executive Dashboard", path: "/executive" },
      { icon: BarChart3,      label: "Executive Reporting", path: "/executive/reporting" },
      { icon: FileText,       label: "Board Report",        path: "/executive/board" },
      { icon: Lightbulb,      label: "Executive Insights",  path: "/executive/insights" },
      { icon: CheckCircle,    label: "EDP Status",          path: "/executive/edp-status" },
    ],
  },
  {
    label: "TELECOM SECURITY",
    items: [
      { icon: RadioTower,    label: "TelecomSOC",      path: "/telecom" },
      { icon: Network,       label: "Network Ops",     path: "/telecom/network" },
      { icon: Signal,        label: "5G/6G Center",    path: "/telecom/5g" },
      { icon: Globe,         label: "BGP & DNS",       path: "/telecom/bgp-dns" },
      { icon: AlertTriangle, label: "Fraud Intel",     path: "/telecom/fraud" },
      { icon: Users,         label: "Subscribers",     path: "/telecom/subscribers" },
      { icon: Activity,       label: "Incidents",       path: "/telecom/incidents" },
      { icon: TrendingUp,    label: "Risk & Resilience", path: "/telecom/risks" },
      { icon: BarChart3,     label: "Visual Analytics", path: "/telecom/analytics" },
    ],
  },
  {
    label: "INDUSTRIAL SECURITY",
    items: [
      { icon: Factory,       label: "IndustrialSOC",   path: "/industrial" },
      { icon: Cpu,           label: "OT Assets",       path: "/industrial/ot-assets" },
      { icon: Shield,        label: "ICS & PLC",       path: "/industrial/ics" },
      { icon: Database,      label: "SCADA",           path: "/industrial/scada" },
      { icon: Activity,      label: "Incidents",       path: "/industrial/incidents" },
      { icon: AlertTriangle, label: "Threats",         path: "/industrial/threats" },
      { icon: TrendingUp,    label: "Resilience",      path: "/industrial/resilience" },
      { icon: CheckSquare,   label: "Compliance",      path: "/industrial/compliance" },
      { icon: BarChart3,     label: "Analytics",       path: "/industrial/analytics" },
    ],
  },
];

// Flat list for all other pages (still reachable, just not in grouped nav)
const EXTRA_NAV = [
  { icon: Swords,       label: "Attack Paths",     path: "/attack-paths",    section: "Tools" },
  { icon: GitBranch,    label: "SBOM",             path: "/sbom",            section: "Tools" },
  { icon: Package,      label: "Supply Chain",     path: "/supply-chain",    section: "Tools" },
  { icon: Eye,          label: "Dark Web",         path: "/darkweb",         section: "Tools" },
  { icon: Link2,        label: "Cloud Connect",    path: "/cloud-connect",   section: "Tools" },
  { icon: Key,          label: "Secrets",          path: "/secrets",         section: "Tools" },
  { icon: Layers,       label: "Kubernetes",       path: "/kubernetes",      section: "Tools" },
  { icon: Target,       label: "Attack Surface",   path: "/attack",          section: "Tools" },
  { icon: Zap,          label: "API Security",     path: "/api-security",    section: "Tools" },
  { icon: Container,    label: "Containers",       path: "/containers",      section: "Tools" },
  { icon: Server,       label: "VM Vulns",         path: "/vms",             section: "Tools" },
  { icon: Database,     label: "DSPM",             path: "/dspm",            section: "Tools" },
  { icon: Target,       label: "Risk Heatmap",     path: "/risk-heatmap",    section: "Tools" },
  { icon: Plug,         label: "Integrations",     path: "/integrations",    section: "Tools" },
  { icon: ShieldCheck,  label: "Runtime WAF",        path: "/runtime-protection", section: "Scanners" },
  { icon: Cloud,        label: "Azure Security",     path: "/azure",               section: "Scanners" },
  { icon: Cloud,        label: "GCP Security",       path: "/gcp",                 section: "Scanners" },
  { icon: GitMerge,     label: "Reachability",       path: "/reachability",        section: "Scanners" },
  { icon: Cpu,          label: "AI Code Security",   path: "/ai-security",         section: "Scanners" },
  { icon: GitPullRequest, label: "PR Review",        path: "/pr-review",           section: "Scanners" },
  { icon: Code2,        label: "IDE Plugin",         path: "/ide-plugin",          section: "Scanners" },
  { icon: Atom,         label: "Quantum-Safe",       path: "/quantum-safe",        section: "🚀 Next-Gen" },
  { icon: Brain,        label: "AI SPM",             path: "/ai-spm",              section: "🚀 Next-Gen" },
  { icon: DollarSign,   label: "FAIR Risk",          path: "/fair-risk",           section: "🚀 Next-Gen" },
  { icon: ShieldCheck,  label: "Zero Trust",         path: "/zero-trust",          section: "🚀 Next-Gen" },
  { icon: Zap,          label: "Autonomous IR",      path: "/autonomous-ir",       section: "🚀 Next-Gen" },
  { icon: Link2,        label: "SLSA",               path: "/slsa",                section: "🚀 Next-Gen" },
  { icon: CheckSquare,  label: "Remediation Tracking", path: "/remediation-tracking", section: "🚀 Next-Gen" },
  { icon: Trophy,       label: "Leaderboard",        path: "/leaderboard",         section: "🚀 Next-Gen" },
  { icon: TrendingUp,   label: "Predictive Risk",    path: "/predictive-risk",     section: "🚀 Next-Gen" },
  { icon: Scale,        label: "Regulatory Intel",   path: "/regulatory-intel",    section: "🚀 Next-Gen" },
];

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono text-xs" style={{ color: CYAN }}>
      {time.toUTCString().slice(17, 25)} UTC
    </span>
  );
}

function NavGroup({ group, collapsed, isActive, closeMobile }) {
  const anyActive = group.items.some(i => isActive(i.path));
  const [open, setOpen] = useState(anyActive);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all",
          collapsed ? "justify-center" : "justify-between",
          anyActive ? "" : "hover:bg-white/5"
        )}
        style={{ color: anyActive ? CYAN : MUTED }}
        title={collapsed ? group.label : undefined}
      >
        {!collapsed && <span className="uppercase tracking-[0.1em] text-[10px]">{group.label}</span>}
        {!collapsed && <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />}
        {collapsed && <span className="text-[9px] font-black">{group.label.slice(0, 1)}</span>}
      </button>
      {(open || collapsed) && (
        <div className={collapsed ? "space-y-0.5" : "ml-2 space-y-0.5"}>
          {group.items.map(item => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path}
                onClick={closeMobile}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all group relative",
                  collapsed && "justify-center px-2"
                )}
                style={{
                  background: active ? "rgba(0,212,255,0.1)" : "transparent",
                  color: active ? CYAN : MUTED,
                  borderLeft: active && !collapsed ? `2px solid ${CYAN}` : "2px solid transparent",
                }}>
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity"
                    style={{ background: "#0a1628", border: `1px solid ${BORDER}` }}>
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function GDSOSLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const isActive = (path) => path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={cn("flex items-center flex-shrink-0 py-5 border-b", collapsed ? "justify-center px-3" : "px-5 gap-3")}
        style={{ borderColor: BORDER }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(0,212,255,0.15)", border: `1px solid rgba(0,212,255,0.4)`, boxShadow: "0 0 20px rgba(0,212,255,0.2)" }}>
          <Activity className="w-5 h-5" style={{ color: CYAN }} />
        </div>
        {!collapsed && (
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black" style={{ background: "linear-gradient(90deg,#3b82f6,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>GDS</span>
              <span className="text-lg font-black text-white">OS</span>
              <span className="text-[10px] font-semibold ml-1" style={{ color: MUTED }}>v3.0.0</span>
            </div>
            <div className="text-[9px] font-semibold tracking-widest" style={{ color: MUTED }}>GLOBAL DIGITAL SECURITY OPERATING SYSTEM</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1" style={{ scrollbarWidth: "none" }}>
        {/* Command Center */}
        <Link to="/" onClick={() => setMobileOpen(false)}
          className={cn("flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all mb-1", collapsed && "justify-center px-2")}
          style={{ background: isActive("/") ? "rgba(0,212,255,0.12)" : "transparent", color: isActive("/") ? CYAN : MUTED, borderLeft: isActive("/") && !collapsed ? `2px solid ${CYAN}` : "2px solid transparent" }}
          title={collapsed ? "Command Center" : undefined}>
          <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Command Center</span>}
        </Link>

        {/* Grouped nav */}
        {NAV_GROUPS.map(group => (
          <NavGroup key={group.label} group={group} collapsed={collapsed} isActive={isActive} closeMobile={() => setMobileOpen(false)} />
        ))}

        {/* Extra tools divider */}
        <div className="my-2 mx-1 border-t" style={{ borderColor: BORDER }} />
        {!collapsed && <p className="px-3 py-1 text-[9px] font-black uppercase tracking-[0.15em]" style={{ color: "#2a4a7f" }}>More Tools</p>}

        {EXTRA_NAV.map((item, idx) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          const prev = EXTRA_NAV[idx - 1];
          const showSection = item.section && (!prev || prev.section !== item.section);
          return (
            <React.Fragment key={`${item.path}-${idx}`}>
              {showSection && !collapsed && (
                <p className="px-3 pt-2 pb-0.5 text-[9px] font-black uppercase tracking-[0.12em]"
                  style={{ color: item.section.startsWith("🚀") ? CYAN : "#2a4a7f" }}>{item.section}</p>
              )}
              {showSection && collapsed && <div className="my-1 mx-1 border-t" style={{ borderColor: BORDER }} />}
              <Link to={item.path} onClick={() => setMobileOpen(false)} title={collapsed ? item.label : undefined}
                className={cn("flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all group relative", collapsed && "justify-center px-2")}
                style={{ background: active ? "rgba(0,212,255,0.08)" : "transparent", color: active ? CYAN : MUTED, borderLeft: active && !collapsed ? `2px solid ${CYAN}` : "2px solid transparent" }}>
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity"
                    style={{ background: "#0a1628", border: `1px solid ${BORDER}` }}>
                    {item.label}
                  </div>
                )}
              </Link>
            </React.Fragment>
          );
        })}

        {/* Settings */}
        <div className="my-2 mx-1 border-t" style={{ borderColor: BORDER }} />
        <Link to="/settings" onClick={() => setMobileOpen(false)}
          className={cn("flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all", collapsed && "justify-center px-2")}
          style={{ color: isActive("/settings") ? CYAN : MUTED }}
          title={collapsed ? "Settings" : undefined}>
          <Settings className="w-3.5 h-3.5 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
        <Link to="/settings/roles" onClick={() => setMobileOpen(false)}
          className={cn("flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all", collapsed && "justify-center px-2")}
          style={{ color: isActive("/settings/roles") ? CYAN : MUTED }}
          title={collapsed ? "User Roles" : undefined}>
          <Users className="w-3.5 h-3.5 flex-shrink-0" />
          {!collapsed && <span>User Roles</span>}
        </Link>
      </nav>

      {/* User + Collapse */}
      <div className="flex-shrink-0 p-3 space-y-2 border-t" style={{ borderColor: BORDER }}>
        {!collapsed && user && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(0,212,255,0.05)", border: `1px solid ${BORDER}` }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
              style={{ background: `linear-gradient(135deg,${CYAN},#0ea5e9)`, color: BG }}>
              {user.full_name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{user.full_name || "Operator"}</div>
              <div className="text-[9px] uppercase tracking-wider" style={{ color: CYAN }}>{user.role || "admin"}</div>
            </div>
            <button onClick={() => base44.auth.logout("/login")} className="text-slate-600 hover:text-red-400 transition-colors">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs transition-all hover:bg-white/5"
          style={{ color: MUTED, border: `1px solid ${BORDER}` }}>
          {collapsed
            ? <ChevronRight className="w-4 h-4" style={{ color: CYAN }} />
            : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>
          }
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen" style={{ background: BG }}>
      {/* Desktop sidebar */}
      <aside className={cn("fixed left-0 top-0 h-screen flex flex-col z-50 transition-all duration-300 hidden md:flex", collapsed ? "w-16" : "w-60")}
        style={{ background: SIDEBAR_BG, borderRight: `1px solid ${BORDER}` }}>
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 flex flex-col" style={{ background: SIDEBAR_BG, borderRight: `1px solid ${BORDER}` }}>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className={cn("flex-1 flex flex-col min-w-0 transition-all duration-300", collapsed ? "md:ml-16" : "md:ml-60")}>
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex items-center gap-4 px-4 py-3 flex-shrink-0"
          style={{ background: "rgba(2,8,23,0.95)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${BORDER}` }}>
          <button className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-all" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
          </button>
          <div className="flex-1">
            <span className="text-sm font-bold text-white">GDS OS — Global Digital Security Operating System</span>
          </div>
          <div className="flex items-center gap-3">
            <LiveClock />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.3)" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00ff88" }} />
              <span className="text-[10px] font-bold" style={{ color: "#00ff88" }}>LIVE</span>
            </div>
            <GDSNotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}