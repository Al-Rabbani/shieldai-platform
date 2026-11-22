// Fallback Co-Pilot agent fleet roster (used until gdsAgentOS list_agents responds).
export const TIER_COLORS = {
  sovereign: "#8B5CF6",
  command: "#3b82f6",
  specialist: "#10b981",
  restricted: "#ef4444",
};

export const AGENT_FLEET = [
  { key: "gasci", icon: "🔮", name: "AI GASCI Orchestrator", tier: "sovereign", subtitle: "Master Orchestrator" },
  { key: "ciso", icon: "🛡️", name: "AI Chief CISO", tier: "sovereign", subtitle: "Strategic Command" },
  { key: "soc", icon: "🚨", name: "AI SOC Director", tier: "command", subtitle: "Monitoring & Triage" },
  { key: "cloud", icon: "☁️", name: "AI Cloud Security Director", tier: "command", subtitle: "CSPM & CIEM" },
  { key: "threat", icon: "🔍", name: "AI Threat Hunter", tier: "command", subtitle: "IOC Hunting" },
  { key: "incident", icon: "🚑", name: "AI Incident Commander", tier: "command", subtitle: "IR & Forensics" },
  { key: "vuln", icon: "⚠️", name: "AI Vulnerability Director", tier: "command", subtitle: "CVE Triage" },
  { key: "remediation", icon: "🔧", name: "AI Remediation Director", tier: "command", subtitle: "Patch Planning" },
  { key: "compliance", icon: "📋", name: "AI Compliance Director", tier: "command", subtitle: "Control Mapping" },
  { key: "risk", icon: "💰", name: "AI Risk Director", tier: "command", subtitle: "FAIR Quantification" },
  { key: "identity", icon: "👤", name: "AI Identity Director", tier: "command", subtitle: "IAM & CIEM" },
  { key: "darkweb", icon: "🕵️", name: "AI Dark Web Monitor", tier: "specialist", subtitle: "Leak Detection" },
  { key: "codex", icon: "💻", name: "AI Codex Engineer", tier: "specialist", subtitle: "Code Generation" },
  { key: "devsecops", icon: "🔗", name: "AI DevSecOps Director", tier: "command", subtitle: "CI/CD Gating" },
  { key: "executive", icon: "🎯", name: "AI Executive Advisor", tier: "command", subtitle: "Board Translation" },
  { key: "mssp", icon: "🌐", name: "AI MSSP Director", tier: "command", subtitle: "Customer Health" },
  { key: "zerotrust", icon: "🔐", name: "AI Zero Trust Gatekeeper", tier: "specialist", subtitle: "Access Gating" },
  { key: "aisecurity", icon: "🤖", name: "AI Security Sentinel", tier: "specialist", subtitle: "LLM Defense" },
  { key: "redteam", icon: "🔴", name: "AI Red Team Director", tier: "restricted", subtitle: "🔒 Auth Required", locked: true },
];

export const MCP_TOOLS_FALLBACK = [
  { name: "aws_cli_executor", risk: "high", approval_required: true },
  { name: "jira_ticket_creator", risk: "low", approval_required: false },
  { name: "slack_notifier", risk: "low", approval_required: false },
  { name: "cve_lookup", risk: "low", approval_required: false },
  { name: "patch_deployer", risk: "high", approval_required: true },
  { name: "compliance_scanner", risk: "medium", approval_required: false },
  { name: "dark_web_scraper", risk: "medium", approval_required: false },
];

export const DEFAULT_ACTIVE_AGENTS = ["AI GASCI Orchestrator", "AI SOC Director", "AI Risk Director"];

export const TICKER_AGENTS = [
  "🔮 GASCI", "🚨 SOC", "☁️ Cloud", "🔍 Threat", "⚠️ Vuln", "🔧 Remediation",
  "📋 Compliance", "💰 Risk", "👤 Identity", "🕵️ Dark Web", "💻 Codex",
  "🔗 DevSecOps", "🎯 Exec", "🌐 MSSP", "🔐 Zero Trust", "🤖 AI Sec",
];

export const QUICK_ACTIONS = [
  { label: "☁️ Cloud", command_type: "cloud_review", input: "Run full cloud security review of AWS account 696616821372 — all misconfigs, CIEM risks, attack paths" },
  { label: "🚨 SOC", command_type: "soc_summary", input: "SOC morning briefing — current threat posture, active incidents, top 3 immediate actions required" },
  { label: "📊 Board", command_type: "board_report", input: "Generate complete Q3 2026 board security report for Global Digital Security" },
  { label: "🔍 Hunt", command_type: "threat_hunt", input: "Full threat hunt — APT activity, IOCs, dark web intelligence, LockBit and Scattered Spider indicators" },
  { label: "⚠️ Vulns", command_type: "vulnerability_scan", input: "Critical vulnerability briefing — all exploited CVEs with EPSS scores and remediation commands" },
  { label: "🔒 Compliance", command_type: "compliance_check", input: "Full compliance gap analysis — SOC2 Type II, ISO27001, PCI-DSS, GDPR current status and remediation roadmap" },
  { label: "💰 MSSP", command_type: "mssp_review", input: "MSSP performance report — all customers, health scores, SLA compliance, churn risk, upsell opportunities" },
  { label: "💻 Code", command_type: "code_generation", input: "Generate AWS CLI and bash remediation scripts for all critical cloud misconfigurations in account 696616821372" },
];

export const QUICK_START_CHIPS = [
  { icon: "☁️", label: "Cloud Review", command_type: "cloud_review" },
  { icon: "🚨", label: "Active Incident", command_type: "investigate_incident" },
  { icon: "⚠️", label: "Critical CVEs", command_type: "vulnerability_scan" },
  { icon: "📊", label: "Board Report", command_type: "board_report" },
  { icon: "🔍", label: "Threat Hunt", command_type: "threat_hunt" },
  { icon: "🔒", label: "Compliance Gap", command_type: "compliance_check" },
  { icon: "💰", label: "MSSP Status", command_type: "mssp_review" },
  { icon: "💻", label: "Generate Code", command_type: "code_generation" },
];