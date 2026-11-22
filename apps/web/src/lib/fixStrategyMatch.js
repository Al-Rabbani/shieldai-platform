import { base44 } from "@/api/base44Client";

let cache = null;

// One shared fetch of the published library, reused by every fix panel on the page.
export function loadFixStrategies() {
  if (!cache) {
    cache = base44.entities.FixStrategy.list("-times_reused", 200).catch(() => []);
  }
  return cache;
}

export function refreshFixStrategies() {
  cache = null;
  return loadFixStrategies();
}

function haystack(finding) {
  return [
    finding.title,
    finding.cve_id,
    finding.cwe_id,
    finding.package_name,
    finding.description,
    finding.asset_type,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function terms(strategy) {
  return [
    strategy.vulnerability_type,
    ...(strategy.tags || []),
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).toLowerCase().split(/[\s,;/]+/))
    .filter((token) => token.length > 2);
}

export function matchStrategies(finding, strategies) {
  if (!finding || !strategies?.length) return [];
  const text = haystack(finding);
  return strategies
    .filter((s) => s.is_published !== false)
    .map((strategy) => {
      const hits = terms(strategy).filter((token) => text.includes(token));
      return { strategy, score: hits.length };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((row) => row.strategy);
}

export function strategySteps(strategy) {
  return String(strategy?.remediation_steps || "")
    .split("\n")
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean);
}