const SEV_RANK = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };

export const LAYER_OF_TYPE = { api: 1, container: 1, serverless: 2, compute: 2, storage: 3, database: 4, ai_model: 5 };

export const LAYER_LABELS = {
  0: "Attacker entry",
  1: "Exposed APIs & containers",
  2: "Compute & serverless",
  3: "Storage",
  4: "Databases",
  5: "AI infrastructure",
};

export const SEVERITY_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", info: "#64748b" };

const FINDING_CLASSES = {
  api: ["api", "domain"],
  container: ["container", "api"],
  serverless: ["cloud", "api"],
  compute: ["vm", "cloud"],
  storage: ["cloud"],
  database: ["cloud"],
  ai_model: ["api", "container", "cloud"],
};

const AI_PATTERN = /(\bai\b|llm|model|prompt|inference|embedding|genai)/i;

function severityOf(finding) {
  return finding.severity || finding.normalized_severity || "info";
}

function worstSeverity(findings) {
  return findings.reduce((worst, finding) => {
    const current = severityOf(finding);
    return SEV_RANK[current] > SEV_RANK[worst || "info"] || !worst ? current : worst;
  }, null);
}

export function buildAttackGraph({ assets, dependencies, findings }) {
  const openFindings = (findings || []).filter((finding) => ["open", "in_remediation"].includes(finding.status || "open"));

  const findingsByAsset = new Map();
  openFindings.forEach((finding) => {
    const key = (finding.asset_name || "").trim().toLowerCase();
    if (!key) return;
    if (!findingsByAsset.has(key)) findingsByAsset.set(key, []);
    findingsByAsset.get(key).push(finding);
  });

  const entry = { id: "internet", name: "Attacker (internet)", type: "entry", layer: 0, vulns: [], vulnBasis: "none", maxSeverity: null, riskScore: null };
  const nodes = [entry];
  const byName = new Map();

  (assets || [])
    .filter((asset) => asset.status !== "decommissioned")
    .forEach((asset) => {
      const key = (asset.name || "").trim().toLowerCase();
      if (!key || byName.has(key)) return;

      const exact = findingsByAsset.get(key) || [];
      const classes = FINDING_CLASSES[asset.type] || [];
      let vulns = exact;
      let vulnBasis = exact.length ? "exact" : "none";

      if (vulns.length === 0) {
        const byClass = openFindings.filter((finding) => {
          if (asset.type === "ai_model" && AI_PATTERN.test(`${finding.title || ""} ${finding.asset_name || ""} ${finding.description || ""}`)) return true;
          return classes.includes(finding.asset_type);
        });
        if (byClass.length) {
          vulns = byClass;
          vulnBasis = "class";
        }
      }

      const node = {
        id: asset.id,
        name: asset.name,
        type: asset.type,
        cloudProvider: asset.cloud_provider || null,
        layer: LAYER_OF_TYPE[asset.type] ?? 2,
        riskScore: asset.risk_score ?? asset.base_risk_score ?? null,
        vulns,
        vulnBasis,
        exactVulns: exact.length,
        maxSeverity: worstSeverity(vulns),
      };
      nodes.push(node);
      byName.set(key, node);
    });

  const edges = [];
  const seenEdge = new Set();
  const pushEdge = (from, to, label, inferred) => {
    const key = `${from}->${to}`;
    if (seenEdge.has(key)) return;
    seenEdge.add(key);
    edges.push({ from, to, label, inferred: Boolean(inferred) });
  };

  (assets || [])
    .filter((asset) => asset.status !== "decommissioned")
    .filter((asset) => ["api", "container", "serverless"].includes(asset.type))
    .forEach((asset) => {
      const node = byName.get((asset.name || "").trim().toLowerCase());
      if (node) pushEdge("internet", node.id, "Externally reachable", false);
    });

  (dependencies || []).forEach((dependency) => {
    const from = byName.get((dependency.asset_name || "").trim().toLowerCase());
    const to = byName.get((dependency.depends_on_name || "").trim().toLowerCase());
    if (!from || !to || from.id === to.id) return;
    pushEdge(from.id, to.id, dependency.dependency_type || "network", false);
  });

  const recorded = edges.length;
  const assetNodes = nodes.filter((node) => node.id !== "internet");

  // No recorded dependency leaves the node: propose the next reachable layer, preferring the same cloud.
  assetNodes.forEach((node) => {
    const hasRecordedOut = dependencies?.some((dependency) => (dependency.asset_name || "").trim().toLowerCase() === node.name.trim().toLowerCase());
    if (hasRecordedOut) return;
    const candidates = assetNodes
      .filter((candidate) => candidate.layer > node.layer)
      .sort((a, b) => {
        const cloudScore = (candidate) => (candidate.cloudProvider && candidate.cloudProvider === node.cloudProvider ? -1 : 0);
        return cloudScore(a) - cloudScore(b) || a.layer - b.layer;
      })
      .slice(0, 2);
    candidates.forEach((candidate) => pushEdge(node.id, candidate.id, "Inferred pivot", true));
  });

  const targets = assetNodes.filter((node) => node.type === "ai_model").map((node) => node.id);
  const deepestLayer = Math.max(0, ...assetNodes.map((node) => node.layer));
  const fallbackTargets = targets.length ? targets : assetNodes.filter((node) => node.layer === deepestLayer).map((node) => node.id);

  return {
    nodes,
    edges,
    targets: fallbackTargets,
    hasAiTarget: targets.length > 0,
    hasRecordedDependencies: recorded > 0,
    inferredEdges: edges.filter((edge) => edge.inferred).length,
    openFindingCount: openFindings.length,
  };
}

function neighbours(graph, nodeId) {
  return graph.edges.filter((edge) => edge.from === nodeId).map((edge) => edge.to);
}

function scorePath(graph, path) {
  const nodes = path.map((id) => graph.nodes.find((node) => node.id === id)).filter(Boolean);
  const severity = nodes.reduce((sum, node) => sum + (SEV_RANK[node.maxSeverity] || 0), 0);
  return severity * 10 + nodes.reduce((sum, node) => sum + node.vulns.length, 0) - path.length;
}

export function findBestPath(graph, targetId) {
  if (!targetId || targetId === "internet") return ["internet"];
  const paths = [];
  const walk = (current, visited) => {
    if (paths.length > 400) return;
    if (current === targetId) {
      paths.push([...visited]);
      return;
    }
    if (visited.length > 7) return;
    neighbours(graph, current).forEach((next) => {
      if (visited.includes(next)) return;
      walk(next, [...visited, next]);
    });
  };
  walk("internet", ["internet"]);
  if (paths.length === 0) return null;
  return paths.sort((a, b) => scorePath(graph, b) - scorePath(graph, a))[0];
}

export function describeExposure(graph) {
  const assetNodes = graph.nodes.filter((node) => node.id !== "internet");
  const reachable = assetNodes.filter((node) => findBestPath(graph, node.id));
  const aiReachable = graph.hasAiTarget && graph.targets.some((targetId) => findBestPath(graph, targetId));
  return { reachableCount: reachable.length, totalCount: assetNodes.length, aiReachable };
}