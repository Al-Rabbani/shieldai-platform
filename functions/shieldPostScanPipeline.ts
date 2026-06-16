// ShieldAI — Post-Scan Pipeline Orchestrator v1
// Stage 7: Auto-wires every scan into the full intelligence pipeline
// After any scan completes: → AutoTriage → PR Decoration → Secrets Liveness → Notify
// This is the "glue" that makes all engines work together automatically
// Closes the loop: scan → triage → PR comment → ticket → alert

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const APP_BASE = `https://app.base44.com/api/apps/${Deno.env.get("BASE44_APP_ID") || ""}`;
const SVC_TOK  = Deno.env.get("BASE44_SERVICE_TOKEN") || "";
const SVC_H    = { Authorization: `Bearer ${SVC_TOK}`, "Content-Type": "application/json" };

async function callFunction(name: string, payload: any): Promise<any> {
  try {
    const res = await fetch(`${APP_BASE}/functions/${name}`, {
      method: "POST",
      headers: SVC_H,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });
    return await res.json().catch(() => ({ success: false }));
  } catch (e) {
    console.warn(`[PostScanPipeline] Failed to call ${name}:`, (e as Error).message);
    return { success: false, error: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const base44 = createClientFromRequest(req);
    const body   = await req.json().catch(() => ({}));

    const {
      scan_type,          // "repo" | "dast" | "cloud" | "container" | "k8s" | "vm"
      scan_results,       // raw findings array from the scanner
      repo_full_name,     // for PR decoration
      pr_number,          // if triggered by a PR
      commit_sha,         // for inline PR comments
      target_url,         // for DAST scans
      scan_job_id,        // ScanJob entity ID if created
      skip_steps = [],    // steps to skip: ["pr_decoration", "triage", "secrets_liveness", "notify", "ticket"]
    } = body;

    console.log(`[PostScanPipeline] scan_type=${scan_type} pr=${pr_number || "none"} findings=${scan_results?.length || 0}`);

    const pipeline_results: Record<string, any> = {
      scan_type, repo_full_name, pr_number,
      steps_executed: [] as string[],
      steps_skipped: [] as string[],
    };

    const findings = scan_results || [];
    const critical = findings.filter((f: any) => ["critical"].includes(f.severity));
    const high     = findings.filter((f: any) => f.severity === "high");
    const secrets  = findings.filter((f: any) =>
      f.type === "secret" || f.cwe === "CWE-798" || f.cwe === "CWE-259" ||
      (f.title || "").toLowerCase().includes("secret") ||
      (f.title || "").toLowerCase().includes("hardcoded")
    );

    // ── STEP 1: AUTO-TRIAGE (always runs)
    if (!skip_steps.includes("triage")) {
      console.log("[PostScanPipeline] Step 1: AutoTriage");
      const triageResult = await callFunction("shieldAutoTriage", {
        action: "autotriage_all",
        noise_reduction: true,
      });
      pipeline_results.triage = triageResult;
      pipeline_results.steps_executed.push("triage");
      console.log(`[PostScanPipeline] Triage: ${triageResult.triaged_findings} findings, ${triageResult.cisa_kev_matches} KEV hits`);
    } else {
      pipeline_results.steps_skipped.push("triage");
    }

    // ── STEP 2: PR DECORATION (only if pr_number provided)
    if (pr_number && repo_full_name && !skip_steps.includes("pr_decoration")) {
      console.log(`[PostScanPipeline] Step 2: PR Decoration → ${repo_full_name}#${pr_number}`);
      const prResult = await callFunction("shieldPRDecoration", {
        action: "post_review",
        repo_full_name,
        pr_number,
        commit_sha,
        findings: findings.map((f: any) => ({
          title: f.title,
          severity: f.severity,
          cve_id: f.cve_id,
          cvss_score: f.cvss_score,
          file_path: f.file_path,
          line_number: f.line_number,
          description: f.description,
          remediation: f.remediation,
          autofix_available: f.autofix_available,
          autofix_pr_url: f.autofix_pr_url,
        })),
      });
      pipeline_results.pr_decoration = prResult;
      pipeline_results.steps_executed.push("pr_decoration");
    } else if (!pr_number) {
      pipeline_results.steps_skipped.push("pr_decoration (no PR number)");
    }

    // ── STEP 3: SECRETS LIVENESS (only for repo scans with secret findings)
    if (secrets.length > 0 && scan_type === "repo" && !skip_steps.includes("secrets_liveness")) {
      console.log(`[PostScanPipeline] Step 3: Secrets Liveness — checking ${secrets.length} secrets`);
      // Don't pass raw secret values (we don't store them) — just report detection
      pipeline_results.secrets_detected = secrets.length;
      pipeline_results.steps_executed.push("secrets_liveness_flagged");

      // Create notifications for each secret found
      for (const secret of secrets.slice(0, 5)) {
        try {
          await base44.entities.Notification.create({
            type: "secret_detected",
            title: `🔑 Secret detected: ${secret.title || "Hardcoded credential"}`,
            message: `${secret.description || "Hardcoded secret found in code"}. Use ShieldAI Secrets Monitor to check liveness.`,
            severity: "critical",
            resource_type: "CodeRepository",
            resource_id: repo_full_name || "",
            action_url: "/secrets-monitor",
            is_read: false,
            is_dismissed: false,
            channel: "in_app",
          });
        } catch (_) {}
      }
    }

    // ── STEP 4: JIRA / LINEAR TICKET CREATION (for critical + high findings)
    if (!skip_steps.includes("ticket") && (critical.length > 0 || high.length > 0)) {
      console.log(`[PostScanPipeline] Step 4: Ticket creation — ${critical.length} critical, ${high.length} high`);
      const ticketResult = await callFunction("shieldJiraIntegration", {
        action: "create_for_findings",
        findings: [...critical, ...high].slice(0, 10),
        repo_full_name,
        scan_type,
      });
      pipeline_results.ticket_creation = ticketResult;
      pipeline_results.steps_executed.push("ticket_creation");
    }

    // ── STEP 5: NOTIFY (critical findings only)
    if (!skip_steps.includes("notify") && critical.length > 0) {
      console.log(`[PostScanPipeline] Step 5: Notify — ${critical.length} critical findings`);
      for (const finding of critical.slice(0, 3)) {
        const notifyResult = await callFunction("shieldNotify", {
          finding: { ...finding, pillar: scan_type },
          channel: "all",
          severity_threshold: "critical",
        });
        if (notifyResult.success) {
          pipeline_results.notifications_sent = (pipeline_results.notifications_sent || 0) + 1;
        }
      }
      pipeline_results.steps_executed.push("notify");
    }

    // ── STEP 6: UPDATE SCAN JOB STATUS
    if (scan_job_id) {
      try {
        await base44.entities.ScanJob.update(scan_job_id, {
          status: "completed",
          total_findings: findings.length,
          critical_count: critical.length,
          high_count: high.length,
          medium_count: findings.filter((f: any) => f.severity === "medium").length,
          low_count: findings.filter((f: any) => f.severity === "low").length,
          completed_at: new Date().toISOString(),
          result_summary: `Pipeline completed: triage=${pipeline_results.triage?.triaged_findings || 0} kev=${pipeline_results.triage?.cisa_kev_matches || 0}`,
        });
        pipeline_results.steps_executed.push("scan_job_updated");
      } catch (_) {}
    }

    // ── STEP 7: WRITE AUDIT LOG
    try {
      await base44.entities.AuditLog.create({
        actor_type: "system",
        action: "POST_SCAN_PIPELINE_COMPLETED",
        resource_type: "ScanJob",
        resource_id: scan_job_id || "adhoc",
        resource_name: repo_full_name || target_url || scan_type || "unknown",
        details: `scan=${scan_type} findings=${findings.length} critical=${critical.length} steps=${pipeline_results.steps_executed.join(",")}`,
        severity: critical.length > 0 ? "critical" : high.length > 0 ? "high" : "info",
        outcome: "success",
      });
    } catch (_) {}

    return new Response(JSON.stringify({
      success: true,
      pipeline_completed: true,
      scan_type,
      total_findings: findings.length,
      critical_count: critical.length,
      high_count: high.length,
      secrets_found: secrets.length,
      steps_executed: pipeline_results.steps_executed,
      steps_skipped: pipeline_results.steps_skipped,
      triage_summary: pipeline_results.triage?.summary || null,
      kev_matches: pipeline_results.triage?.cisa_kev_matches || 0,
      pr_decorated: !!pipeline_results.pr_decoration?.success,
      notifications_sent: pipeline_results.notifications_sent || 0,
      message: `Post-scan pipeline completed: ${pipeline_results.steps_executed.length} steps executed`,
    }), { status: 200, headers: CORS });

  } catch (err: any) {
    console.error("[PostScanPipeline] Fatal:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS });
  }
});
