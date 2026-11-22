// Turns the cloud asset inventory plus the live scan findings into the segments
// the bubble heatmap draws. A segment is one provider × asset type, so a team
// can see at a glance which slice of the estate carries the most vulnerabilities.
//
// The cloud scanner records provider + service (rds, s3, lambda…), not asset
// names, so findings are joined onto the inventory through that service → asset
// type mapping. Findings that belong to something outside the cloud inventory
// (repositories, VMs, DAST targets) are counted as unattached and reported back
// rather than silently vanishing from the totals.

export const PROVIDERS = ["AWS", "GCP", "Azure"];
export const PROVIDER_ACCENT = { AWS: "#f97316", GCP: "#3b82f6", Azure: "#0ea5e9" };

export const TYPE_LABEL = {
  compute: "Compute",
  storage: "Storage",
  database: "Database",
  ai_model: "AI model",
  api: "API",
  container: "Container",
  serverless: "Serverless",
  repository: "Repo",
  vm: "VM",
  domain: "Domain",
  account: "Account",
};

// Cloud service → the asset type it belongs to in the inventory.
const SERVICE_TYPE = {
  rds: "database",
  dynamodb: "database",
  aurora: "database",
  sql: "database",
  s3: "storage",
  gcs: "storage",
  blob: "storage",
  ecs: "container",
  eks: "container",
  gke: "container",
  aks: "container",
  lambda: "serverless",
  functions: "serverless",
  "cloud-run": "serverless",
  ec2: "compute",
  compute: "compute",
  vm: "compute",
  "api-gateway": "api",
  apigateway: "api",
  api: "api",
  vertex: "ai_model",
  sagemaker: "ai_model",
  bedrock: "ai_model",
};

// Critical findings weigh heaviest, so a segment with two critical libraries
// outranks one with ten low-severity configuration notes.
const WEIGHT = { critical: 5, high: 3, medium: 2, low: 1 };

export function severityOf(finding) {
  return (finding.severity || finding.normalized_severity || "info").toLowerCase();
}

function providerOf(value) {
  const raw = String(value || "").toUpperCase();
  return PROVIDERS.includes(raw) ? raw : "Other";
}

function blankSegment(provider, type) {
  return {
    key: `${provider}|${type}`,
    provider,
    type,
    assets: 0,
    openVulns: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    weighted: 0,
    riskSum: 0,
    staleAssets: 0,
    neverScanned: 0,
    topAssets: [],
    assetRows: [],
  };
}

function addFinding(segment, severity, resourceName) {
  segment.openVulns += 1;
  if (severity in WEIGHT) {
    segment[severity] += 1;
    segment.weighted += WEIGHT[severity];
  }
  if (resourceName) segment.findingsByResource[resourceName] = (segment.findingsByResource[resourceName] || 0) + 1;
}

export function buildCloudVulnClusters({ assets, findings, cloudFindings }) {
  const segments = new Map();
  const segmentFor = (provider, type) => {
    const key = `${provider}|${type}`;
    if (!segments.has(key)) {
      segments.set(key, { ...blankSegment(provider, type), findingsByResource: {} });
    }
    return segments.get(key);
  };

  const perAsset = new Map();
  const bumpAsset = (name, severity) => {
    const row = perAsset.get(name) || { open: 0, critical: 0, high: 0, medium: 0, low: 0 };
    row.open += 1;
    if (severity in WEIGHT) row[severity] += 1;
    perAsset.set(name, row);
  };

  const inventoryNames = new Set((assets || []).map((asset) => String(asset.name || "").toLowerCase()));
  let unattached = 0;

  // Cloud scanner findings: joined to an inventory segment by provider + service.
  (cloudFindings || []).forEach((finding) => {
    if (finding.status && finding.status !== "open") return;
    const provider = providerOf(finding.provider);
    const type = SERVICE_TYPE[String(finding.service || "").toLowerCase()] || "account";
    const segment = segmentFor(provider, type);
    addFinding(segment, severityOf(finding), finding.resource || null);
  });

  // Triage findings: exactly one of these belongs to an inventory asset by name.
  (findings || []).forEach((finding) => {
    const name = finding.asset_name;
    if (name && inventoryNames.has(String(name).toLowerCase())) bumpAsset(name, severityOf(finding));
    else unattached += 1;
  });

  (assets || []).forEach((asset) => {
    const provider = providerOf(asset.cloud_provider);
    const segment = segmentFor(provider, asset.type || "unmapped");
    const open = perAsset.get(asset.name) || { open: 0, critical: 0, high: 0, medium: 0, low: 0 };

    segment.assets += 1;
    segment.openVulns += open.open;
    segment.critical += open.critical;
    segment.high += open.high;
    segment.medium += open.medium;
    segment.low += open.low;
    segment.weighted +=
      open.critical * WEIGHT.critical +
      open.high * WEIGHT.high +
      open.medium * WEIGHT.medium +
      open.low * WEIGHT.low;
    segment.riskSum += asset.risk_score || 0;

    const scanned = asset.last_scanned ? new Date(asset.last_scanned).getTime() : 0;
    if (!scanned) segment.neverScanned += 1;
    else if (Date.now() - scanned > 7 * 86400000) segment.staleAssets += 1;

    segment.assetRows.push({ name: asset.name, open: open.open, critical: open.critical, high: open.high });
  });

  const clusters = [...segments.values()].map((segment) => ({
    ...segment,
    avgRisk: segment.assets ? Math.round(segment.riskSum / segment.assets) : 0,
    topAssets: segment.assetRows
      .filter((row) => row.open > 0)
      .sort((a, b) => b.critical - a.critical || b.open - a.open)
      .slice(0, 6),
    scannedResources: Object.entries(segment.findingsByResource)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6),
  }));

  const groups = PROVIDERS.concat("Other")
    .map((provider) => ({
      provider,
      rows: clusters.filter((cluster) => cluster.provider === provider).sort((a, b) => b.weighted - a.weighted),
    }))
    .filter((group) => group.rows.length > 0);

  const totals = clusters.reduce(
    (acc, cluster) => ({
      assets: acc.assets + cluster.assets,
      openVulns: acc.openVulns + cluster.openVulns,
      critical: acc.critical + cluster.critical,
      segments: acc.segments + 1,
    }),
    { assets: 0, openVulns: 0, critical: 0, segments: 0 }
  );

  return { clusters, groups, totals: { ...totals, unattached }, unattached };
}

// Which segment a single triage finding belongs to, inferred from the resource name
// it points at (ARNs carry the service, instance/sg prefixes carry the provider).
const ARN_SERVICE_TYPE = {
  s3: "storage",
  rds: "database",
  ec2: "compute",
  ecs: "container",
  eks: "container",
  dynamodb: "database",
  lambda: "serverless",
  iam: "account",
  kms: "account",
  cloudtrail: "account",
  guardduty: "account",
  vpc: "account",
};

const ASSET_TYPE_MAP = { container: "container", vm: "compute", api: "api", cloud: "account", domain: "api" };

export function inferSegment(finding) {
  const name = String(finding.asset_name || "").toLowerCase();

  let provider = null;
  if (name.includes("arn:aws") || /^(i|sg|vol|ami)-/.test(name)) provider = "AWS";
  else if (name.includes("gcp") || name.includes("gcs") || name.includes("google")) provider = "GCP";
  else if (name.includes("azure") || name.includes("blob.core")) provider = "Azure";

  let type = ASSET_TYPE_MAP[finding.asset_type] || null;
  const arnService = name.match(/^arn:[^:]+:([^:]*):/);
  if (arnService && ARN_SERVICE_TYPE[arnService[1]]) type = ARN_SERVICE_TYPE[arnService[1]];
  else if (/^(i|sg|vol|ami)-/.test(name)) type = "compute";
  else if (name.startsWith("container-")) type = "container";

  return { provider, type };
}

// A finding belongs to a heatmap segment when its type agrees and, where the
// finding names a provider, that provider agrees too.
export function findingMatchesSegment(finding, segment) {
  if (!segment) return true;
  const inferred = inferSegment(finding);
  if (inferred.type !== segment.type) return false;
  if (inferred.provider && inferred.provider !== segment.provider) return false;
  return true;
}

// Heat band for a segment: the more severity-weighted vulnerabilities it carries,
// the hotter the bubble. Empty segments stay cool so hotspots stand out.
export function heatBand(cluster) {
  if (cluster.openVulns === 0) return 0;
  if (cluster.weighted >= 30) return 4;
  if (cluster.weighted >= 15) return 3;
  if (cluster.weighted >= 6) return 2;
  return 1;
}

export const HEAT_STYLE = [
  { label: "Clear", color: "rgba(34,197,94,0.20)", ring: "rgba(34,197,94,0.45)", text: "#6ee7b7" },
  { label: "Low", color: "rgba(234,179,8,0.28)", ring: "rgba(234,179,8,0.50)", text: "#facc15" },
  { label: "Elevated", color: "rgba(245,158,11,0.42)", ring: "rgba(245,158,11,0.60)", text: "#fbbf24" },
  { label: "High", color: "rgba(239,68,68,0.44)", ring: "rgba(239,68,68,0.62)", text: "#f87171" },
  { label: "Critical", color: "rgba(220,38,38,0.70)", ring: "rgba(248,113,113,0.90)", text: "#fca5a5" },
];