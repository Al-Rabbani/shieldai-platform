/**
 * ShieldAI Platform-Wide Canonical Metrics
 * Single source of truth for all KPI numbers across the platform
 * Import this file everywhere instead of hardcoding numbers
 */

export const PLATFORM_METRICS = {
  // Asset counts
  totalAssets: 3891,
  totalRepositories: 234,
  totalCloudAccounts: 12,
  totalVMs: 847,
  totalContainers: 156,
  
  // Finding counts by severity
  criticalFindings: 12,
  highFindings: 34,
  mediumFindings: 67,
  lowFindings: 124,
  infoFindings: 89,
  totalFindings: 237,
  
  // Noise reduction metrics
  noiseFiltered: 847,
  exploitable: 26,
  likelyExploitable: 41,
  conditional: 89,
  theoretical: 81,
  
  // Risk scores
  riskScore: 73,
  codeRiskScore: 68,
  cloudRiskScore: 71,
  attackSurfaceRiskScore: 79,
  aiRiskScore: 74,
  
  // Financial
  financialExposure: 4200000,
  potentialSavings: 1800000,
  
  // Threat metrics
  threatsBlocked24h: 2847,
  threatsBlockedTotal: 847293,
  botAttacks24h: 1247,
  
  // SOC automation
  socAutomation: 97.1,
  autoTriageRate: 94.3,
  
  // Compliance
  complianceScore: 84,
  controlsPassing: 147,
  controlsFailing: 18,
  
  // Response times
  mttd: 4.2, // Mean time to detect (minutes)
  mttr: 7.8, // Mean time to remediate (hours)
  
  // Platform health
  uptimePercent: 99.97,
  scansCompleted24h: 47,
  apiLatencyMs: 127,
};

export const SEVERITY_COLORS = {
  critical: { bg: 'bg-red-600', text: 'text-red-600', border: 'border-red-500', hex: '#ef4444' },
  high: { bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-400', hex: '#f97316' },
  medium: { bg: 'bg-yellow-500', text: 'text-yellow-500', border: 'border-yellow-400', hex: '#eab308' },
  low: { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-400', hex: '#3b82f6' },
  info: { bg: 'bg-gray-500', text: 'text-gray-500', border: 'border-gray-400', hex: '#6b7280' },
};

export const REACHABILITY_COLORS = {
  exploitable: { bg: 'bg-red-900/50', text: 'text-red-400', border: 'border-red-700', label: 'EXPLOITABLE' },
  likely: { bg: 'bg-orange-900/50', text: 'text-orange-400', border: 'border-orange-700', label: 'LIKELY' },
  conditional: { bg: 'bg-yellow-900/50', text: 'text-yellow-400', border: 'border-yellow-700', label: 'CONDITIONAL' },
  theoretical: { bg: 'bg-gray-800', text: 'text-gray-500', border: 'border-gray-700', label: 'THEORETICAL' },
};

export const STATUS_COLORS = {
  open: { bg: 'bg-blue-900/50', text: 'text-blue-400', border: 'border-blue-700' },
  inProgress: { bg: 'bg-yellow-900/50', text: 'text-yellow-400', border: 'border-yellow-700' },
  inRemediation: { bg: 'bg-yellow-900/50', text: 'text-yellow-400', border: 'border-yellow-700' },
  fixed: { bg: 'bg-green-900/50', text: 'text-green-400', border: 'border-green-700' },
  resolved: { bg: 'bg-green-900/50', text: 'text-green-400', border: 'border-green-700' },
  acceptedRisk: { bg: 'bg-gray-800', text: 'text-gray-400', border: 'border-gray-700' },
  falsePositive: { bg: 'bg-gray-800', text: 'text-gray-400', border: 'border-gray-700' },
};

export const PROVIDER_COLORS = {
  aws: { bg: 'bg-orange-900/50', text: 'text-orange-400', border: 'border-orange-700', hex: '#FF9900' },
  azure: { bg: 'bg-blue-900/50', text: 'text-blue-400', border: 'border-blue-700', hex: '#0078D4' },
  gcp: { bg: 'bg-red-900/50', text: 'text-red-400', border: 'border-red-700', hex: '#EA4335' },
  github: { bg: 'bg-gray-800', text: 'text-gray-300', border: 'border-gray-600', hex: '#24292e' },
  gitlab: { bg: 'bg-orange-900/50', text: 'text-orange-400', border: 'border-orange-700', hex: '#FC6D26' },
};

export const SLA_DEADLINES = {
  critical: { hours: 24, label: '24h SLA' },
  high: { hours: 72, label: '72h SLA' },
  medium: { hours: 168, label: '7d SLA' },
  low: { hours: 720, label: '30d SLA' },
};

export const SUPPORTED_LANGUAGES = [
  { name: 'JavaScript', ext: 'js', color: '#f7df1e' },
  { name: 'TypeScript', ext: 'ts', color: '#3178c6' },
  { name: 'Python', ext: 'py', color: '#3776ab' },
  { name: 'Java', ext: 'java', color: '#b07219' },
  { name: 'Go', ext: 'go', color: '#00add8' },
  { name: 'Ruby', ext: 'rb', color: '#701516' },
  { name: 'Rust', ext: 'rs', color: '#dea584' },
  { name: 'PHP', ext: 'php', color: '#4f5d95' },
  { name: 'C#', ext: 'cs', color: '#178600' },
  { name: 'Swift', ext: 'swift', color: '#ffac45' },
];

export const COMPLIANCE_FRAMEWORKS = [
  { id: 'soc2', name: 'SOC 2 Type II', status: 'in-progress', expected: 'Q4 2026' },
  { id: 'gdpr', name: 'GDPR', status: 'compliant', dpa: true },
  { id: 'iso27001', name: 'ISO 27001', status: 'in-progress' },
  { id: 'hipaa', name: 'HIPAA', status: 'available', tier: 'Enterprise' },
  { id: 'pci', name: 'PCI-DSS', controls: 147 },
  { id: 'nis2', name: 'NIS2', controls: 89 },
  { id: 'dora', name: 'DORA', controls: 134 },
];