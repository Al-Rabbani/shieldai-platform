import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Zap, Shield, AlertTriangle, CheckCircle, Clock, Activity, Lock, Star, Crown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// GDS Co-Pilot v8.0 - Global Digital Authority Edition
export const COPILOT_ELECTRIC = "#4F46E5";
export const COPILOT_INDIGO = "#6366F1";
export const COPILOT_BLUE = "#3B82F6";
export const COPILOT_CYAN = "#06B6D4";
export const COPILOT_PURPLE = "#8B5CF6";
export const COPILOT_PINK = "#EC4899";
export const COPILOT_RED = "#EF4444";
export const COPILOT_ORANGE = "#F97316";
export const COPILOT_AMBER = "#F59E0B";
export const COPILOT_GREEN = "#10B981";
export const COPILOT_TEAL = "#14B8A6";
export const COPILOT_GOLD = "#F59E0B";
export const COPILOT_LIME = "#84CC16";
export const COPILOT_INDIGO_DARK = "#4F46E5";

export const COPILOT_GRADIENT = `linear-gradient(135deg,${COPILOT_ELECTRIC},${COPILOT_INDIGO})`;
export const COPILOT_PAGE_BG = { minHeight: "100vh", background: "#0a0f1c", padding: "24px" };
export const COPILOT_CARD = { background: "#111827", border: "1px solid #1f2937" };
export const BORDER = "#1f2937";
export const MUTED = "#64748b";
export const TEXT = "#e2e8f0";

// 32 Command Types - v8.0 Global Digital Authority
export const COMMAND_TYPES = [
  { value: "soc_summary", label: "🔍 SOC Summary", category: "security_ops" },
  { value: "investigate_incident", label: "🚨 Investigate Incident", category: "security_ops" },
  { value: "threat_hunt", label: "🛡️ Threat Hunt", category: "threat_intel" },
  { value: "cloud_review", label: "☁️ Cloud Review", category: "cloud" },
  { value: "board_report", label: "📋 Board Report", category: "executive" },
  { value: "identity_analysis", label: "🔒 Identity Analysis", category: "identity" },
  { value: "remediation_plan", label: "⚡ Remediation Plan", category: "remediation" },
  { value: "risk_assessment", label: "📊 Risk Assessment", category: "risk" },
  { value: "vulnerability_scan", label: "🔬 Vulnerability Scan", category: "vulnerability" },
  { value: "pentest_authorized", label: "🎯 Authorized Pentest", category: "red_team" },
  { value: "compliance_check", label: "✅ Compliance Check", category: "compliance" },
  { value: "agent_orchestration", label: "🤖 Agent Orchestration", category: "orchestration" },
  { value: "workflow_automation", label: "⚙️ Workflow Automation", category: "orchestration" },
  { value: "executive_brief", label: "📈 Executive Brief", category: "executive" },
  { value: "incident_response", label: "🚑 Incident Response", category: "security_ops" },
  { value: "security_audit", label: "🔍 Security Audit", category: "compliance" },
  { value: "aws_scan", label: "☁️ AWS Scan", category: "cloud" },
  { value: "dark_web_scan", label: "🦠 Dark Web Scan", category: "threat_intel" },
  { value: "zero_day_watch", label: "🔮 Zero Day Watch", category: "threat_intel" },
  { value: "supply_chain_audit", label: "🤝 Supply Chain Audit", category: "devsecops" },
  { value: "ai_security_scan", label: "🤖 AI Security Scan", category: "ai_security" },
  { value: "zero_trust_assess", label: "🌐 Zero Trust Assess", category: "identity" },
  { value: "regulatory_brief", label: "📡 Regulatory Brief", category: "compliance" },
  { value: "purple_team", label: "⚔️ Purple Team", category: "red_team" },
  { value: "code_audit", label: "💻 Code Audit", category: "devsecops" },
  { value: "container_review", label: "📦 Container Review", category: "cloud" },
  { value: "k8s_security", label: "☸️ Kubernetes Security", category: "cloud" },
  { value: "api_security", label: "🔌 API Security", category: "cloud" },
  { value: "data_security", label: "🗄️ Data Security", category: "cloud" },
  { value: "mssp_report", label: "🏢 MSSP Report", category: "mssp" },
  { value: "tenant_analysis", label: "👥 Tenant Analysis", category: "mssp" },
  { value: "sla_compliance", label: "⏱️ SLA Compliance", category: "mssp" },
];

// Command Category Colors
export const COMMAND_CATEGORY_COLORS = {
  security_ops: COPILOT_BLUE,
  threat_intel: COPILOT_RED,
  cloud: COPILOT_TEAL,
  identity: COPILOT_PURPLE,
  vulnerability: COPILOT_AMBER,
  remediation: COPILOT_GREEN,
  devsecops: COPILOT_CYAN,
  compliance: COPILOT_LIME,
  executive: COPILOT_GOLD,
  risk: COPILOT_PINK,
  red_team: COPILOT_RED,
  mssp: COPILOT_INDIGO_DARK,
  orchestration: COPILOT_PURPLE,
  ai_security: COPILOT_PURPLE,
};

export const CHANNELS = ["web_ui", "voice", "api", "slack", "whatsapp"];

// Agent Tiers - v8.0 Global Digital Authority
export const AGENT_TIERS = {
  sovereign: { label: "SOVEREIGN", color: COPILOT_GOLD, icon: "👑" },
  command: { label: "COMMAND", color: COPILOT_BLUE, icon: "🛡️" },
  specialist: { label: "SPECIALIST", color: COPILOT_TEAL, icon: "⚡" },
  restricted: { label: "RESTRICTED", color: COPILOT_RED, icon: "🔒" },
};

// 35 AI Super Agents - v8.0 Fleet
export const AGENT_FLEET = [
  { id: "agent-001", name: "AI Sovereign Commander", role: "copilot_command", tier: "sovereign", capabilities: ["Strategic Command", "Multi-Agent"], functions: 86, commands: 32 },
  { id: "agent-002", name: "AI GASCI Orchestrator", role: "threat_hunting", tier: "sovereign", capabilities: ["AI Brain", "Reasoning"], functions: 78, commands: 28 },
  { id: "agent-003", name: "AI CISO Intelligence", role: "executive_intelligence", tier: "sovereign", capabilities: ["Executive", "Risk Intel"], functions: 65, commands: 24 },
  { id: "agent-004", name: "AI National Security Advisor", role: "incident_response", tier: "sovereign", capabilities: ["Sovereign Defense", "Critical Infra"], functions: 72, commands: 26 },
  { id: "agent-005", name: "AI SOC Director", role: "security_operations", tier: "command", capabilities: ["SOC Ops", "Triage"], functions: 58, commands: 22 },
  { id: "agent-006", name: "AI Threat Hunter", role: "threat_hunting", tier: "command", capabilities: ["Proactive Hunting", "IOC"], functions: 52, commands: 20 },
  { id: "agent-007", name: "AI Incident Commander", role: "incident_response", tier: "command", capabilities: ["IR Orchestration", "Containment"], functions: 55, commands: 21 },
  { id: "agent-008", name: "AI Digital Forensics Director", role: "incident_response", tier: "command", capabilities: ["Forensics", "Evidence"], functions: 48, commands: 18 },
  { id: "agent-009", name: "AI Cloud Security Director", role: "cloud_security", tier: "command", capabilities: ["CSPM", "Cloud Threats"], functions: 62, commands: 24 },
  { id: "agent-010", name: "AI Infrastructure Security Agent", role: "cloud_security", tier: "command", capabilities: ["Infrastructure", "ASM"], functions: 56, commands: 22 },
  { id: "agent-011", name: "AI CNAPP Director", role: "cloud_security", tier: "command", capabilities: ["CNAPP", "Cloud Native"], functions: 54, commands: 21 },
  { id: "agent-012", name: "AI Identity Security Director", role: "identity_security", tier: "command", capabilities: ["Identity", "IAM"], functions: 50, commands: 19 },
  { id: "agent-013", name: "AI Zero Trust Architect", role: "identity_security", tier: "command", capabilities: ["Zero Trust", "JIT"], functions: 48, commands: 18 },
  { id: "agent-014", name: "AI CIEM Director", role: "identity_security", tier: "command", capabilities: ["CIEM", "Entitlements"], functions: 46, commands: 17 },
  { id: "agent-015", name: "AI Vulnerability Director", role: "vulnerability_mgmt", tier: "command", capabilities: ["Vuln Mgmt", "Prioritization"], functions: 52, commands: 20 },
  { id: "agent-016", name: "AI Autonomous Remediation Director", role: "vulnerability_mgmt", tier: "command", capabilities: ["Auto-Fix", "Remediation"], functions: 50, commands: 19 },
  { id: "agent-017", name: "AI Attack Surface Director", role: "vulnerability_mgmt", tier: "command", capabilities: ["ASM", "Exposure"], functions: 48, commands: 18 },
  { id: "agent-018", name: "AI DevSecOps Director", role: "devsecops", tier: "command", capabilities: ["DevSecOps", "CI/CD"], functions: 54, commands: 21 },
  { id: "agent-019", name: "AI Application Security Director", role: "devsecops", tier: "command", capabilities: ["AppSec", "SAST/DAST"], functions: 52, commands: 20 },
  { id: "agent-020", name: "AI Threat Intelligence Director", role: "threat_hunting", tier: "command", capabilities: ["Threat Intel", "CTI"], functions: 48, commands: 18 },
  { id: "agent-021", name: "AI Predictive Risk Director", role: "risk_intelligence", tier: "specialist", capabilities: ["Risk Forecasting", "Predictive"], functions: 42, commands: 16 },
  { id: "agent-022", name: "AI Dark Web Monitor", role: "threat_hunting", tier: "specialist", capabilities: ["Dark Web", "Credentials"], functions: 38, commands: 14 },
  { id: "agent-023", name: "AI Red Team Director", role: "authorized_pentesting", tier: "specialist", capabilities: ["Red Team", "Attack Sim"], functions: 45, commands: 17 },
  { id: "agent-024", name: "AI Purple Team Director", role: "authorized_pentesting", tier: "specialist", capabilities: ["Purple Team", "Detection Validation"], functions: 44, commands: 16 },
  { id: "agent-025", name: "AI Compliance Director", role: "compliance_automation", tier: "specialist", capabilities: ["Compliance", "Evidence"], functions: 46, commands: 18 },
  { id: "agent-026", name: "AI Regulatory Intelligence Director", role: "compliance_automation", tier: "specialist", capabilities: ["Regulatory", "Policy"], functions: 42, commands: 16 },
  { id: "agent-027", name: "AI Audit Director", role: "compliance_automation", tier: "specialist", capabilities: ["Audit", "Reporting"], functions: 40, commands: 15 },
  { id: "agent-028", name: "AI Global Risk Director", role: "risk_intelligence", tier: "specialist", capabilities: ["Enterprise Risk", "GRC"], functions: 44, commands: 17 },
  { id: "agent-029", name: "AI Chief CISO Intelligence Agent", role: "executive_intelligence", tier: "specialist", capabilities: ["CISO Advisory", "Strategic"], functions: 48, commands: 18 },
  { id: "agent-030", name: "AI Security Director LLM", role: "knowledge_retrieval", tier: "specialist", capabilities: ["LLM Security", "AI Gov"], functions: 36, commands: 14 },
  { id: "agent-031", name: "AI Identity Director AI Agents", role: "identity_security", tier: "specialist", capabilities: ["Agent Identity", "RBAC"], functions: 38, commands: 15 },
  { id: "agent-032", name: "AI Digital Trust Director", role: "executive_intelligence", tier: "specialist", capabilities: ["Trust & Safety", "Brand"], functions: 40, commands: 16 },
  { id: "agent-033", name: "AI MSSP Operations Director", role: "security_operations", tier: "specialist", capabilities: ["MSSP", "Multi-Tenant"], functions: 52, commands: 20 },
  { id: "agent-034", name: "AI Workflow Orchestration Director", role: "workflow_automation", tier: "restricted", capabilities: ["Workflow", "SOAR"], functions: 68, commands: 24 },
  { id: "agent-035", name: "AI Knowledge Memory Director", role: "knowledge_retrieval", tier: "restricted", capabilities: ["Memory", "RAG", "Graph"], functions: 56, commands: 22 },
];

// 86 Platform Functions by 26 Categories
export const PLATFORM_FUNCTIONS = {
  ai_core: { name: "AI Core", icon: "🧠", functions: ["gdsAIRedTeam", "gdsAISAST", "gdsAISPM", "gdsAutoTriage", "gdsMLAnomalyEngine", "gdsPostureMLEngine"] },
  cloud_security: { name: "Cloud Security", icon: "☁️", functions: ["gdsAzureScan", "gdsGCPScan", "gdsCloudNativeScanner", "gdsCloudCostRisk", "gdsRuntimeProtection", "gdsRuntimeProtectionEngine", "gdsSAASSecurityPosture"] },
  compliance: { name: "Compliance", icon: "✅", functions: ["gdsCalculateComplianceScores", "gdsComplianceAlertMonitor", "gdsComplianceAutomation", "gdsComplianceBulkExport", "gdsExportComplianceReport", "gdsMonthlyComplianceAuditLog"] },
  orchestration: { name: "Orchestration", icon: "🎯", functions: ["gdsAgentRuntime", "gdsAutoLinkPlaybook", "gdsConnectorHub", "gdsEventStreamGateway", "gdsRealSOAR", "gdsSOAROrchestrator", "gdsVulnerabilityWorkflow"] },
  threat_intel: { name: "Threat Intelligence", icon: "🔮", functions: ["gdsThreatHunterProactive", "gdsThreatIntelligenceHub", "gdsThreatModelEngine", "shieldDarkWebMonitor", "shieldIOCRadar", "shieldThreatIntel"] },
  vulnerability: { name: "Vulnerability Management", icon: "🔬", functions: ["gdsDailyVulnerabilityDigest", "gdsFindingAssignment", "gdsMapVulnerabilitiesToCompliance", "gdsVulnIntelCorrelator", "shieldAutoFix"] },
  devsecops: { name: "DevSecOps", icon: "🔧", functions: ["gdsDevSecOpsPipeline", "gdsIDEPlugin", "gdsPRReview", "gdsReachability", "shieldScanRepo", "shieldScanGitLab"] },
  identity: { name: "Identity Security", icon: "🔐", functions: ["gdsIdentityPlatform", "gdsRBACEngine", "gdsZeroTrust", "gdsZeroTrustAlerts", "gdsZeroTrustEngine", "gdsZeroTrustPlatform"] },
  executive: { name: "Executive Intelligence", icon: "📊", functions: ["gdsExecutiveIntelligence", "gdsExecutiveReport", "gdsExecutiveRiskDashboard", "gdsExecutiveRiskOverview", "gdsExecutiveSummaryEngine", "gdsWeeklyExecutiveReport"] },
  risk: { name: "Risk Intelligence", icon: "📈", functions: ["gdsFAIRRisk", "gdsPredictiveRisk", "gdsRiskIntelligenceReport", "gdsUnifiedRiskCalculator"] },
  remediation: { name: "Remediation", icon: "⚡", functions: ["gdsAutoApplySLA", "gdsApplySLATemplates", "shieldAutoFix"] },
  audit: { name: "Audit & Assurance", icon: "📋", functions: ["gdsAccessControlMonthlyAudit", "gdsTenantAuditEngine"] },
  mssp: { name: "MSSP Operations", icon: "🏢", functions: ["gdsMSSP", "gdsMSSPEngine", "gdsMSSPMultiTenant", "gdsTenantAlertHandler", "gdsTenantBillingReport", "gdsTenantEngine", "gdsTenantMigration", "gdsTenantProvisioningWorkflow"] },
  pentest: { name: "Penetration Testing", icon: "⚔️", functions: ["gdsAutoPenReport", "shieldAIPentest", "shieldPentestReport", "shieldWeeklyPentestSummary"] },
  supply_chain: { name: "Supply Chain Security", icon: "🔗", functions: ["gdsSBOMIntelligence", "shieldScanContainer"] },
  containers: { name: "Container Security", icon: "📦", functions: ["shieldScanContainer"] },
  kubernetes: { name: "Kubernetes Security", icon: "☸️", functions: ["shieldScanContainer"] },
  api_security: { name: "API Security", icon: "🔌", functions: ["gdsReachability"] },
  data_security: { name: "Data Security", icon: "🗄️", functions: ["gdsSAASSecurityPosture"] },
  regulatory: { name: "Regulatory Intelligence", icon: "📡", functions: ["gdsRegulatoryIntel"] },
  slsa: { name: "SLSA Compliance", icon: "📜", functions: ["gdsSLSA"] },
  quantum: { name: "Quantum-Safe", icon: "🔮", functions: ["gdsQuantumSafe"] },
  autonomous_ir: { name: "Autonomous IR", icon: "🤖", functions: ["gdsAutonomousIR"] },
  platform_health: { name: "Platform Health", icon: "💚", functions: ["gdsPlatformHealthMonitor"] },
  notifications: { name: "Notifications", icon: "🔔", functions: ["gdsNotificationEngine"] },
  evidence: { name: "Evidence Management", icon: "📁", functions: ["gdsEvidenceLocker"] },
};

export const RISK_COLORS = {
  safe: COPILOT_GREEN,
  low: COPILOT_BLUE,
  medium: COPILOT_AMBER,
  high: COPILOT_ORANGE,
  critical: COPILOT_RED,
};

export function CopilotBreadcrumb({ items }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-6">
      <Link to="/" className="hover:text-white transition-colors" style={{ color: MUTED }}>GDS OS</Link>
      <ChevronRight className="w-3 h-3" style={{ color: MUTED }} />
      <Link to="/copilot" className="hover:text-white transition-colors flex items-center gap-1" style={{ color: COPILOT_ELECTRIC }}>
        <Zap className="w-3 h-3" /> Co-Pilot
      </Link>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <ChevronRight className="w-3 h-3" style={{ color: MUTED }} />
          {item.path
            ? <Link to={item.path} className="hover:text-white transition-colors" style={{ color: i === items.length - 1 ? COPILOT_ELECTRIC : MUTED }}>{item.label}</Link>
            : <span style={{ color: i === items.length - 1 ? COPILOT_ELECTRIC : MUTED }}>{item.label}</span>
          }
        </React.Fragment>
      ))}
    </div>
  );
}

export function CoPilotBanner() {
  return (
    <div className="w-full p-6 mb-6 rounded-2xl" style={{ background: COPILOT_GRADIENT }}>
      <div className="flex items-center gap-3 mb-2">
        <Zap className="w-6 h-6 text-white" />
        <h1 className="text-2xl font-black text-white">GDS Super Agentic AI Co-Pilot</h1>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">v8.0</span>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/30 text-amber-200 border border-amber-500/50">GLOBAL DIGITAL AUTHORITY</span>
      </div>
      <p className="text-sm text-white/90">Sovereign AI Command Intelligence — 35 Agents | 32 Commands | 86 Functions | Zero Trust Governed</p>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-white/20 text-white">HEART OF THE GDS OS</span>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 border border-purple-500/50">SOVEREIGN COMMAND</span>
      </div>
    </div>
  );
}

// Alias for consistent import naming
export const CopilotBanner = CoPilotBanner;

export function RiskBadge({ level }) {
  const color = RISK_COLORS[level] || MUTED;
  return (
    <span className="text-[10px] font-bold px-2.5 py-1 rounded uppercase" style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {level}
    </span>
  );
}

export function CoPilotStat({ label, value, sub, color, pulse }) {
  return (
    <div className={`p-4 rounded-2xl text-center ${pulse ? 'animate-pulse' : ''}`} style={{ background: "#111827", border: `2px solid ${color}30` }}>
      <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>{label}</p>
      <p className="text-3xl font-black" style={{ color }}>{value ?? "—"}</p>
      {sub && <p className="text-[10px] mt-1" style={{ color: MUTED }}>{sub}</p>}
    </div>
  );
}

export function CoPilotBadge({ color, children }) {
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide" style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {children}
    </span>
  );
}

// Alias for consistent import naming
export const CopilotBadge = CoPilotBadge;
export const CopilotStat = CoPilotStat;

export function PipelineStage({ stage, status, label }) {
  const colors = {
    pending: { bg: "rgba(255,255,255,0.05)", border: BORDER, text: MUTED, icon: MUTED },
    current: { bg: `${COPILOT_BLUE}15`, border: COPILOT_BLUE, text: COPILOT_BLUE, icon: COPILOT_BLUE },
    complete: { bg: `${COPILOT_GREEN}15`, border: COPILOT_GREEN, text: COPILOT_GREEN, icon: COPILOT_GREEN },
  };
  const c = colors[status] || colors.pending;
  
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      {status === "complete" ? <CheckCircle className="w-3.5 h-3.5" style={{ color: c.icon }} /> :
       status === "current" ? <Activity className="w-3.5 h-3.5 animate-pulse" style={{ color: c.icon }} /> :
       <Clock className="w-3.5 h-3.5" style={{ color: c.icon }} />}
      <span className="text-[10px] font-bold" style={{ color: c.text }}>{label}</span>
    </div>
  );
}

export function timeAgo(date) {
  if (!date) return "—";
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }); } catch { return "—"; }
}