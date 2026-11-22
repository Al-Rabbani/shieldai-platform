import { base44 } from "@/api/base44Client";

export const ASSET_TYPES = [
  { key: "database", label: "Database", weightField: "database_weight", defaultWeight: 1.4 },
  { key: "ai_model", label: "AI model", weightField: "ai_model_weight", defaultWeight: 1.5 },
  { key: "api", label: "API", weightField: "api_weight", defaultWeight: 1.1 },
  { key: "storage", label: "Storage", weightField: "storage_weight", defaultWeight: 1 },
  { key: "container", label: "Container", weightField: "container_weight", defaultWeight: 0.9 },
  { key: "serverless", label: "Serverless", weightField: "serverless_weight", defaultWeight: 0.9 },
  { key: "compute", label: "Cloud compute", weightField: "compute_weight", defaultWeight: 0.8 },
];

export const DEFAULT_SCORING_CONFIG = {
  name: "Default scoring model",
  database_weight: 1.4,
  ai_model_weight: 1.5,
  api_weight: 1.1,
  storage_weight: 1,
  container_weight: 0.9,
  serverless_weight: 0.9,
  compute_weight: 0.8,
  critical_threshold: 85,
  high_threshold: 70,
  medium_threshold: 40,
};

export const RISK_BANDS = [
  { key: "critical", label: "Critical", color: "#ef4444" },
  { key: "high", label: "High", color: "#f97316" },
  { key: "medium", label: "Medium", color: "#eab308" },
  { key: "low", label: "Low", color: "#22c55e" },
];

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Merges a stored config record over the defaults so every weight always resolves. */
export function resolveScoringConfig(record) {
  const config = { ...DEFAULT_SCORING_CONFIG };
  if (!record) return config;
  Object.keys(DEFAULT_SCORING_CONFIG).forEach((field) => {
    if (field === "name") {
      if (record.name) config.name = record.name;
      return;
    }
    config[field] = toNumber(record[field], DEFAULT_SCORING_CONFIG[field]);
  });
  return config;
}

export async function loadScoringConfig() {
  const rows = await base44.entities.RiskScoringConfig.list("-updated_date", 5).catch(() => []);
  const active = (rows || []).find((row) => row.is_active !== false) || (rows || [])[0] || null;
  return { record: active, config: resolveScoringConfig(active) };
}

export function weightForType(config, type) {
  const field = `${type}_weight`;
  return toNumber(config?.[field], 1);
}

/** Weighted score is always derived from the stored base score, so re-applying never compounds. */
export function weightedScore(asset, config) {
  const base = toNumber(asset?.base_risk_score ?? asset?.risk_score, 0);
  const weighted = Math.round(base * weightForType(config, asset?.type));
  return Math.max(0, Math.min(100, weighted));
}

export function baseScoreOf(asset) {
  return toNumber(asset?.base_risk_score ?? asset?.risk_score, 0);
}

export function bandForScore(score, config) {
  const critical = toNumber(config?.critical_threshold, DEFAULT_SCORING_CONFIG.critical_threshold);
  const high = toNumber(config?.high_threshold, DEFAULT_SCORING_CONFIG.high_threshold);
  const medium = toNumber(config?.medium_threshold, DEFAULT_SCORING_CONFIG.medium_threshold);
  if (score >= critical) return "critical";
  if (score >= high) return "high";
  if (score >= medium) return "medium";
  return "low";
}

export function bandStyle(band) {
  return RISK_BANDS.find((entry) => entry.key === band) || RISK_BANDS[3];
}

export function bandDistribution(assets, config) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  (assets || []).forEach((asset) => {
    counts[bandForScore(weightedScore(asset, config), config)] += 1;
  });
  return counts;
}