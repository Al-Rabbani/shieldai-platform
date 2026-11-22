const SEV_RANK = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };

export const VECTOR_DEFS = [
  {
    key: "prompt_injection",
    label: "Prompt injection",
    summary: "Untrusted text sent to a model to override its instructions.",
    checks: [
      {
        label: "Active AI input filter",
        detail: (d) => `${d.aiPolicies.filter((p) => p.is_active !== false && p.policy_type === "input_filter").length} active input filter policy(ies)`,
        met: (d) => d.aiPolicies.some((p) => p.is_active !== false && p.policy_type === "input_filter"),
      },
      {
        label: "Enforcing action on violation",
        detail: (d) => {
          const enforcing = d.aiPolicies.filter((p) => p.is_active !== false && ["block", "quarantine"].includes(p.action_on_violation));
          return `${enforcing.length} policy(ies) block or quarantine`;
        },
        met: (d) => d.aiPolicies.some((p) => p.is_active !== false && ["block", "quarantine"].includes(p.action_on_violation)),
      },
      {
        label: "Output filtering after the model responds",
        detail: (d) => `${d.aiPolicies.filter((p) => p.is_active !== false && p.policy_type === "output_filter").length} active output filter policy(ies)`,
        met: (d) => d.aiPolicies.some((p) => p.is_active !== false && p.policy_type === "output_filter"),
      },
    ],
    history: (d) => {
      const rows = d.promptAttacks;
      const blocked = rows.filter((a) => a.status === "blocked" || a.succeeded === false).length;
      return { label: "Historical prompt attacks", total: rows.length, contained: blocked };
    },
  },
  {
    key: "jailbreak",
    label: "Jailbreak",
    summary: "Model persuaded to bypass its safety behaviour through role-play or encoding.",
    checks: [
      {
        label: "Active content policy",
        detail: (d) => `${d.aiPolicies.filter((p) => p.is_active !== false && p.policy_type === "content_policy").length} active content policy(ies)`,
        met: (d) => d.aiPolicies.some((p) => p.is_active !== false && p.policy_type === "content_policy"),
      },
      {
        label: "Rate limiting on model calls",
        detail: (d) => `${d.aiPolicies.filter((p) => p.is_active !== false && p.policy_type === "rate_limit").length} active rate-limit policy(ies)`,
        met: (d) => d.aiPolicies.some((p) => p.is_active !== false && p.policy_type === "rate_limit"),
      },
      {
        label: "Escalation path on violation",
        detail: (d) => `${d.aiPolicies.filter((p) => p.is_active !== false && ["escalate", "log"].includes(p.action_on_violation)).length} policy(ies) log or escalate`,
        met: (d) => d.aiPolicies.some((p) => p.is_active !== false && ["escalate", "log"].includes(p.action_on_violation)),
      },
    ],
    history: (d) => {
      const rows = d.jailbreakAttempts;
      const contained = rows.filter((a) => a.status === "blocked" || a.succeeded === false).length;
      return { label: "Historical jailbreak attempts", total: rows.length, contained };
    },
  },
  {
    key: "unauthorized_api_access",
    label: "Unauthorized API access",
    summary: "A caller reaching an object or action it is not entitled to.",
    checks: [
      {
        label: "Authorization model defined",
        detail: (d) => {
          const defined = d.authorizationPolicies.filter((p) => p.model && p.model !== "none").length;
          return `${defined} of ${d.authorizationPolicies.length} audited app(s) define a model`;
        },
        met: (d) => d.authorizationPolicies.length > 0 && d.authorizationPolicies.every((p) => p.model && p.model !== "none"),
      },
      {
        label: "No IDOR exposure in the last audit",
        detail: (d) => `${d.authorizationPolicies.filter((p) => p.idor_vulnerable).length} app(s) flagged IDOR-vulnerable`,
        met: (d) => d.authorizationPolicies.length > 0 && !d.authorizationPolicies.some((p) => p.idor_vulnerable),
      },
      {
        label: "No broken access control or escalation",
        detail: (d) => `${d.authorizationPolicies.filter((p) => p.bac_vulnerable || p.vertical_escalation || p.horizontal_escalation).length} app(s) flagged BAC or escalation`,
        met: (d) => d.authorizationPolicies.length > 0 && !d.authorizationPolicies.some((p) => p.bac_vulnerable || p.vertical_escalation || p.horizontal_escalation),
      },
      {
        label: "Enforcement point configured",
        detail: (d) => `${d.authorizationPolicies.filter((p) => p.policy_enforcement_point && p.policy_enforcement_point !== "none").length} audited app(s) enforce at a known point`,
        met: (d) => d.authorizationPolicies.length > 0 && d.authorizationPolicies.every((p) => p.policy_enforcement_point && p.policy_enforcement_point !== "none"),
      },
    ],
    history: (d) => {
      const rows = d.findings.filter((f) => /api|auth|authoriz|access|idor|privilege/i.test(`${f.title} ${f.cwe_id || ""}`));
      return { label: "Access-related findings on record", total: rows.length, contained: rows.filter((f) => f.status === "fixed").length };
    },
  },
  {
    key: "data_exfiltration",
    label: "Data exfiltration",
    summary: "Sensitive data leaving the environment through a model, export or secret leak.",
    checks: [
      {
        label: "Data classification policy active",
        detail: (d) => `${d.aiPolicies.filter((p) => p.is_active !== false && p.policy_type === "data_classification").length} active data-classification policy(ies)`,
        met: (d) => d.aiPolicies.some((p) => p.is_active !== false && p.policy_type === "data_classification"),
      },
      {
        label: "Outbound content filtering active",
        detail: (d) => `${d.aiPolicies.filter((p) => p.is_active !== false && p.policy_type === "output_filter").length} active output filter policy(ies)`,
        met: (d) => d.aiPolicies.some((p) => p.is_active !== false && p.policy_type === "output_filter"),
      },
      {
        label: "No open critical leakage findings",
        detail: (d) => {
          const open = d.findings.filter((f) => f.status !== "fixed" && /secret|leak|exfiltrat|credential/i.test(f.title || "") && SEV_RANK[f.severity || f.normalized_severity] >= 3);
          return `${open.length} open critical/high leakage finding(s)`;
        },
        met: (d) => !d.findings.some((f) => f.status !== "fixed" && /secret|leak|exfiltrat|credential/i.test(f.title || "") && SEV_RANK[f.severity || f.normalized_severity] >= 3),
      },
    ],
    history: (d) => {
      const rows = d.findings.filter((f) => /secret|leak|exfiltrat|credential/i.test(f.title || ""));
      return { label: "Leakage findings on record", total: rows.length, contained: rows.filter((f) => f.status === "fixed").length };
    },
  },
];

export function evaluateVector(vectorKey, data) {
  const def = VECTOR_DEFS.find((v) => v.key === vectorKey);
  if (!def) return null;
  const checks = def.checks.map((c) => ({ label: c.label, detail: c.detail(data), met: Boolean(c.met(data)) }));
  const met = checks.filter((c) => c.met).length;
  const verdict = met === checks.length ? "Contained" : met > 0 ? "Partially contained" : "Exposed";
  return { def, checks, met, total: checks.length, verdict, history: def.history(data) };
}

export function observeVectors(data) {
  const counts = new Map();
  const bump = (label, source) => {
    if (!label) return;
    const key = `${source}::${label}`;
    const existing = counts.get(key) || { label, source, count: 0 };
    existing.count += 1;
    counts.set(key, existing);
  };

  data.findings.forEach((f) => { if (f.cwe_id) bump(f.cwe_id, "Weakness class (CWE)"); });
  data.incidents.forEach((i) => (i.mitre_techniques || []).forEach((t) => bump(t, "MITRE technique")));
  data.promptAttacks.forEach((a) => bump(a.attack_type, "AI prompt attack"));
  data.jailbreakAttempts.forEach((a) => bump(a.technique, "AI jailbreak technique"));

  const total = [...counts.values()].reduce((sum, r) => sum + r.count, 0);
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((row) => ({ ...row, share: total ? Math.round((row.count / total) * 100) : 0 }));
}