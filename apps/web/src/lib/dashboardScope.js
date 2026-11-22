export const DASHBOARD_ROLES = [
  { key: "all", label: "All findings", hint: "Whole estate" },
  { key: "admin", label: "Admin", hint: "Full estate, every severity" },
  { key: "engineer", label: "Engineer", hint: "Critical & high remediation" },
  { key: "developer", label: "Developer", hint: "Code, container & API findings" },
];

export const DASHBOARD_SEVERITIES = ["all", "critical", "high", "medium", "low", "info"];

const CODE_ASSET_TYPES = ["repository", "container", "api", "cloud", "code"];

function severityOf(finding) {
  return (finding.severity || finding.normalized_severity || "info").toLowerCase();
}

/**
 * Narrow the dashboard's findings to the responsibilities of the chosen role.
 * Admin sees the whole estate; engineers own critical/high remediation work;
 * developers own code, container and API findings.
 */
export function scopeFindings(findings, role, severity) {
  const rows = findings || [];
  const byRole = rows.filter((finding) => {
    const level = severityOf(finding);
    if (role === "engineer") {
      return ["critical", "high"].includes(level) && finding.status !== "false_positive";
    }
    if (role === "developer") {
      const type = (finding.asset_type || "").toLowerCase();
      return CODE_ASSET_TYPES.includes(type) || Boolean(finding.package_name) || Boolean(finding.cwe_id);
    }
    return true;
  });
  if (!severity || severity === "all") return byRole;
  return byRole.filter((finding) => severityOf(finding) === severity);
}

export function readDashboardScope() {
  try {
    const saved = JSON.parse(localStorage.getItem("gds.dashboard.scope")) || {};
    return {
      role: DASHBOARD_ROLES.some((option) => option.key === saved.role) ? saved.role : "all",
      severity: DASHBOARD_SEVERITIES.includes(saved.severity) ? saved.severity : "all",
    };
  } catch {
    return { role: "all", severity: "all" };
  }
}

export function saveDashboardScope(scope) {
  try {
    localStorage.setItem("gds.dashboard.scope", JSON.stringify(scope));
  } catch {
    // Storage disabled: the filter still works for this session.
  }
}