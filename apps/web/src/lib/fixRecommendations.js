export const DEFAULT_SLA_HOURS = { critical: 24, high: 72, medium: 168, low: 336, info: 720 };

const ASSET_PLAYBOOK = {
  repository: "Open a fix branch, run the CI security gate on it, and merge after review.",
  container: "Rebuild the image from a patched base image, redeploy, and retire the old digest.",
  vm: "Snapshot the instance, apply the OS/package update, and reboot in the maintenance window.",
  cloud: "Apply the provider patch or configuration fix to the affected resource and re-run the cloud scan.",
  api: "Deploy the fix behind the gateway, validate the contract with a smoke test, then roll forward.",
  domain: "Update the record or certificate, verify propagation, and re-scan the endpoint.",
};

const CWE_GUIDANCE = {
  "CWE-79": "Escape output and add contextual encoding on the affected parameter.",
  "CWE-89": "Replace string-built queries with parameterised statements or the ORM equivalent.",
  "CWE-352": "Require a per-session CSRF token on the state-changing request.",
  "CWE-798": "Move the credential to the secret store and rotate the exposed value.",
  "CWE-22": "Canonicalise the path and reject anything outside the allowed base directory.",
  "CWE-502": "Stop deserialising untrusted payloads; use a signed, allow-listed format.",
  "CWE-1333": "Replace the backtracking pattern with a linear-time check or an allow-list.",
};

export function recommendationFor(finding) {
  const steps = [];
  const pkg = finding.package_name;
  const assetType = finding.asset_type;

  if (finding.fixed_version) {
    steps.push(`Upgrade ${pkg || "the affected component"} to ${finding.fixed_version} or later, then rebuild.`);
  } else if (pkg) {
    steps.push(`Pin ${pkg} to the latest patched release and re-run the dependency scan to confirm it clears.`);
  } else if (finding.cve_id) {
    steps.push(`Apply the vendor patch for ${finding.cve_id} on ${finding.asset_name || "the affected asset"}.`);
  } else {
    steps.push(`Reproduce the issue on ${finding.asset_name || "the affected asset"} and apply the vendor fix.`);
  }

  if (ASSET_PLAYBOOK[assetType]) steps.push(ASSET_PLAYBOOK[assetType]);

  if (finding.exploitability === "exploited_in_wild") {
    steps.unshift("Treat as actively exploited: isolate or rate-limit the asset first, then patch.");
  } else if (finding.exploitability === "poc_available") {
    steps.push("A public proof of concept exists, so patch within the current SLA window rather than deferring.");
  }

  if (finding.reachability === "not_reachable") {
    steps.push("Confirm the asset is not internet-reachable and record that as compensating evidence.");
  }

  if (finding.cwe_id && CWE_GUIDANCE[finding.cwe_id]) steps.push(CWE_GUIDANCE[finding.cwe_id]);

  if (finding.autofix_pr_url) steps.push("Review and merge the generated fix pull request.");

  steps.push(`Re-scan ${finding.asset_name || "the asset"} and attach the clean result as remediation evidence.`);

  const summary = finding.fixed_version
    ? `Patch ${pkg || finding.cve_id || "the affected component"} to ${finding.fixed_version} on ${finding.asset_name || "the asset"}`
    : `Remediate ${finding.cve_id || finding.cwe_id || "the finding"} on ${finding.asset_name || "the asset"}`;

  return { summary, steps: steps.slice(0, 6), slaHours: DEFAULT_SLA_HOURS[finding.severity] || 168 };
}