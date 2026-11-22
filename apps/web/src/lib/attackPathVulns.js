// Links an attack path to the stored vulnerabilities that sit on it.
// A path names the resources and techniques it walks through; findings name the
// asset, package or CVE they concern. Shared distinctive terms are the evidence
// shown in the UI, so generic prose words are filtered out.
const STOP = new Set([
  "the", "and", "for", "with", "from", "into", "all", "any", "via", "using",
  "service", "services", "prod", "production", "app", "apps", "data", "user",
  "users", "access", "role", "roles", "aws", "cloud", "http", "https", "api",
  "read", "write", "call", "made", "have", "that", "this", "then", "when",
  "code", "page", "pages", "test", "root", "admin", "public", "private", "open",
  "host", "hosts", "file", "files", "list", "running", "version", "versions",
  "default", "used", "allow", "allowed", "policy", "config", "instance",
  "security", "group", "groups", "credentials", "hardcoded", "unauthenticated",
  "publicly", "which", "over", "must", "your", "their", "they", "would",
]);

function tokens(text) {
  return new Set(
    String(text || "")
      .toLowerCase()
      .split(/[^a-z0-9.+#-]+/)
      .filter((token) => token.length >= 4 && !STOP.has(token))
  );
}

export function matchVulnsToPath(path, findings) {
  if (!path || !findings?.length) return [];
  const pathTokens = tokens(
    [
      path.title,
      path.description,
      path.entry_point,
      path.blast_radius,
      (path.attack_steps || []).join(" "),
      (path.affected_resources || []).join(" "),
    ].join(" ")
  );

  const matches = [];
  findings.forEach((finding) => {
    const findingTokens = tokens(
      [finding.title, finding.cve_id, finding.package_name, finding.asset_name, finding.owner_team].join(" ")
    );
    const shared = [...findingTokens].filter((token) => pathTokens.has(token));
    if (!shared.length) return;
    matches.push({ finding, via: shared.slice(0, 2).join(", "), score: shared.length });
  });

  return matches
    .sort(
      (a, b) =>
        (b.finding.exploited_in_wild ? 1 : 0) - (a.finding.exploited_in_wild ? 1 : 0) ||
        b.score - a.score
    )
    .slice(0, 8);
}