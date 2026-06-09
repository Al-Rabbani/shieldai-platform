import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

interface TriageRequest {
  action: "autotriage_all" | "autotriage_asset" | "autotriage_single";
  dedupe_enabled?: boolean;
  noise_reduction?: boolean;
  ai_scoring?: boolean;
  asset_name?: string;
  finding_id?: string;
}

function buildDedupeKey(finding: any): string {
  if (finding.cve_id) return `CVE-${finding.cve_id}`;
  if (finding.cwe) {
    const titleHash = hashString(finding.title || "");
    return `CWE-${finding.cwe}::${titleHash}`;
  }
  if (finding.policy_name) {
    return `POLICY-${finding.policy_name}::${finding.control_id || ""}`;
  }
  const source = finding.source || "unknown";
  const title = hashString(finding.title || "");
  const resource = hashString(finding.resource || finding.endpoint || "");
  return `${source}::${title}::${resource}`;
}

function hashString(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function normalizeSeverity(
  sev: string | undefined
): "critical" | "high" | "medium" | "low" | "info" {
  if (!sev) return "medium";
  const s = sev.toLowerCase();
  if (s.includes("critical") || s.includes("crit")) return "critical";
  if (s.includes("high")) return "high";
  if (s.includes("medium") || s.includes("mid")) return "medium";
  if (s.includes("low")) return "low";
  return "info";
}

function assessReachability(
  finding: any
): "confirmed" | "theoretical" | "server_rendered" {
  if (finding.source === "pentest") return "confirmed";
  if (finding.source === "dast") return "confirmed";
  if (finding.source === "cloud" || finding.source === "vm")
    return "theoretical";
  return "theoretical";
}

function assessExploitability(
  finding: any
): "public_exploit" | "proof_of_concept" | "theoretical" {
  if (finding.exploited_in_wild) return "public_exploit";
  if (finding.source === "pentest") return "proof_of_concept";
  if (finding.cve_id && finding.cvss_score > 8) return "public_exploit";
  return "theoretical";
}

function isNoise(finding: any): boolean {
  if (finding.source === "sast" && finding.title?.includes("document.write"))
    return true;
  if ((finding.cvss_score || 0) < 3.9 && finding.exploitability === "theoretical")
    return true;
  if (finding.status === "fixed" || finding.status === "ignored") return true;
  return false;
}

function assessCriticality(finding: any): string {
  if (finding.asset_name?.includes("critical")) return "critical";
  if (finding.asset_name?.includes("production")) return "high";
  return "medium";
}

function findingTypeToAssetType(source: string): string {
  const map: Record<string, string> = {
    pentest: "repository",
    sast: "repository",
    sca: "repository",
    dast: "web_application",
    cloud: "cloud_account",
    vm: "virtual_machine",
    container: "container_image",
    k8s: "kubernetes_cluster",
    policy: "asset",
  };
  return map[source] || "asset";
}

function calculateSLADeadline(severity: string): string {
  const now = new Date();
  const deadlines: Record<string, number> = {
    critical: 24 * 60,
    high: 7 * 24 * 60,
    medium: 30 * 24 * 60,
    low: 90 * 24 * 60,
  };
  const minutes = deadlines[severity] || 30 * 24 * 60;
  now.setMinutes(now.getMinutes() + minutes);
  return now.toISOString();
}

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json() as TriageRequest;
    const base44 = createClientFromRequest(req);

    const {
      action = "autotriage_all",
      dedupe_enabled = true,
      noise_reduction = true,
      asset_name,
      finding_id,
    } = payload;

    console.log(
      `[AutoTriage] Starting ${action} with dedupe=${dedupe_enabled}, noise=${noise_reduction}`
    );

    const pentestFindings = await base44.entities.PentestFinding.list();
    const dastFindings = await base44.entities.DASTFinding.list();
    const cloudFindings = await base44.entities.CloudFinding.list();
    const vmFindings = await base44.entities.VMFinding.list();
    const containerFindings = await base44.entities.ContainerFinding.list();
    const k8sFindings = await base44.entities.K8sFinding.list();
    const policyViolations = await base44.entities.PolicyViolation.list();

    const allFindings = [
      ...pentestFindings.map((f) => ({ ...f, source: "pentest" })),
      ...dastFindings.map((f) => ({ ...f, source: "dast" })),
      ...cloudFindings.map((f) => ({ ...f, source: "cloud" })),
      ...vmFindings.map((f) => ({ ...f, source: "vm" })),
      ...containerFindings.map((f) => ({ ...f, source: "container" })),
      ...k8sFindings.map((f) => ({ ...f, source: "k8s" })),
      ...policyViolations.map((f) => ({ ...f, source: "policy" })),
    ];

    console.log(`[AutoTriage] Loaded ${allFindings.length} raw findings`);

    const dedupMap = new Map<string, any>();

    for (const finding of allFindings) {
      if (
        action === "autotriage_asset" &&
        asset_name &&
        finding.asset_name !== asset_name
      )
        continue;
      if (
        action === "autotriage_single" &&
        finding_id &&
        finding.id !== finding_id
      )
        continue;

      const key = buildDedupeKey(finding);

      if (!dedupMap.has(key)) {
        const triaged = {
          title:
            finding.title ||
            finding.vulnerability_type ||
            finding.policy_name ||
            "Unknown Finding",
          normalized_severity: normalizeSeverity(finding.severity),
          status: finding.status || "open",
          source_scanners: [finding.source],
          source_count: 1,
          deduplication_key: key,
          reachability: assessReachability(finding),
          exploitability: assessExploitability(finding),
          noise_reduced: noise_reduction && isNoise(finding),
          business_criticality: assessCriticality(finding),
          asset_name:
            finding.asset_name || finding.resource || finding.endpoint || "unknown",
          asset_type: findingTypeToAssetType(finding.source),
          owner_email: finding.owner_email || "unassigned",
          autofix_available: finding.autofix_available || false,
          autofix_pr_url: finding.autofix_pr_url || null,
          cve_id: finding.cve_id || null,
          cwe: finding.cwe || null,
          cvss_score: finding.cvss_score || 0,
          epss_score: finding.epss_score || null,
          first_detected: finding.detected_at || new Date().toISOString(),
          last_seen: finding.detected_at || new Date().toISOString(),
          sla_deadline: calculateSLADeadline(
            normalizeSeverity(finding.severity)
          ),
          sla_breached: false,
          notes: `AutoTriaged: ${finding.source}`,
        };
        dedupMap.set(key, triaged);
      } else {
        const existing = dedupMap.get(key)!;
        existing.source_count += 1;
        if (!existing.source_scanners.includes(finding.source)) {
          existing.source_scanners.push(finding.source);
        }
        existing.last_seen = new Date().toISOString();
      }
    }

    const triaged = Array.from(dedupMap.values()).filter((f) => !f.noise_reduced);
    console.log(`[AutoTriage] Deduplicated to ${triaged.length} triage records`);

    let created = 0;
    for (const record of triaged) {
      try {
        const existing = await base44.entities.TriagedFinding.filter({
          deduplication_key: record.deduplication_key,
        });
        if (existing.length === 0) {
          await base44.entities.TriagedFinding.create(record);
          created++;
        } else {
          await base44.entities.TriagedFinding.update(existing[0].id, {
            last_seen: record.last_seen,
            source_count: record.source_count,
            source_scanners: record.source_scanners,
          });
        }
      } catch (e) {
        console.error(`[AutoTriage] Failed to write ${record.title}:`, e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        total_raw_findings: allFindings.length,
        triaged_findings: triaged.length,
        created_new_records: created,
        noise_reduced_count: dedupMap.size - triaged.length,
        summary: {
          critical: triaged.filter((f) => f.normalized_severity === "critical")
            .length,
          high: triaged.filter((f) => f.normalized_severity === "high").length,
          medium: triaged.filter((f) => f.normalized_severity === "medium")
            .length,
          low: triaged.filter((f) => f.normalized_severity === "low").length,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("[AutoTriage] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
});
