// ShieldAI — AutoTriage Engine v1
// Cross-scanner deduplication, noise reduction, SLA enforcement, AI severity normalisation
// Implements Aikido's claimed "92% noise reduction" via real dedup + signal scoring
// Sources: PentestFinding, DASTFinding, CloudFinding, ContainerFinding, VMFinding, K8sFinding
// Output: merged TriagedFinding records (upsert by deduplication_key)

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } });

  const SERVICE_TOKEN = Deno.env.get("BASE44_SERVICE_TOKEN") || "";
  const APP_ID        = Deno.env.get("APP_ID") || "";
  const OPENAI_KEY    = Deno.env.get("OPENAI_API_KEY") || "";

  if (!SERVICE_TOKEN || !APP_ID) {
    return Response.json({ error: "BASE44_SERVICE_TOKEN and APP_ID required" }, { status: 500 });
  }

  const BASE = `https://app.base44.com/api/apps/${APP_ID}`;
  const dbH  = { "Authorization": `Bearer ${SERVICE_TOKEN}`, "Content-Type": "application/json" };

  const fetchAll = async (entity: string, fields?: string[]): Promise<any[]> => {
    const records: any[] = [];
    let skip = 0;
    while (true) {
      const params = new URLSearchParams({ limit: "200", skip: String(skip) });
      if (fields) params.set("fields", fields.join(","));
      const r = await fetch(`${BASE}/entities/${entity}?${params}`, { headers: dbH }).catch(() => null);
      if (!r?.ok) break;
      const data = await r.json().catch(() => ({ records: [] }));
      const batch = data.records || [];
      records.push(...batch);
      if (!data.has_more || batch.length === 0) break;
      skip += batch.length;
    }
    return records;
  };

  const upsertTriage = async (record: any, existingMap: Map<string, any>): Promise<"created" | "updated" | "skipped"> => {
    const existing = existingMap.get(record.deduplication_key);
    if (existing) {
      // Merge: escalate severity if higher, add new scanner sources, refresh last_seen
      const severityRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
      const existSev = severityRank[existing.normalized_severity] || 0;
      const newSev   = severityRank[record.normalized_severity]   || 0;
      const mergedSeverity = newSev > existSev ? record.normalized_severity : existing.normalized_severity;

      const existingScanners = new Set((existing.source_scanners || "").split(",").map((s: string) => s.trim()).filter(Boolean));
      const newScanners = (record.source_scanners || []);
      newScanners.forEach((s: string) => existingScanners.add(s));
      const mergedScanners = Array.from(existingScanners);

      const patch: any = {
        normalized_severity: mergedSeverity,
        source_scanners: mergedScanners,
        source_count: mergedScanners.length,
        last_seen: new Date().toISOString(),
        sla_breached: isSLABreached(existing.sla_deadline || record.sla_deadline, mergedSeverity),
      };
      if (existing.status === "open" && record.status === "fixed") patch.status = "fixed";

      const r = await fetch(`${BASE}/entities/TriagedFinding/${existing.id}`, {
        method: "PATCH", headers: dbH, body: JSON.stringify(patch)
      }).catch(() => null);
      return r?.ok ? "updated" : "skipped";
    } else {
      // Create new
      const r = await fetch(`${BASE}/entities/TriagedFinding`, {
        method: "POST", headers: dbH, body: JSON.stringify(record)
      }).catch(() => null);
      if (r?.ok) {
        const created = await r.json().catch(() => null);
        if (created?.id) existingMap.set(record.deduplication_key, { ...record, id: created.id });
      }
      return r?.ok ? "created" : "skipped";
    }
  };

  // ── LOAD EXISTING TRIAGE RECORDS ─────────────────────────────────────────────
  const existingRaw = await fetchAll("TriagedFinding");
  const existingMap = new Map<string, any>();
  for (const r of existingRaw) {
    if (r.deduplication_key) existingMap.set(r.deduplication_key, r);
  }

  const stats = { created: 0, updated: 0, skipped: 0, deduplicated: 0, noise_removed: 0, total_raw: 0 };

  // ── HELPER: SLA DEADLINE ──────────────────────────────────────────────────────
  function getSLADeadline(severity: string, detectedAt?: string): string {
    const slaHours: Record<string, number> = { critical: 24, high: 168, medium: 720, low: 2160 };
    const base = detectedAt ? new Date(detectedAt) : new Date();
    base.setHours(base.getHours() + (slaHours[severity] || 720));
    return base.toISOString();
  }

  function isSLABreached(deadline?: string, severity?: string): boolean {
    if (!deadline) return false;
    return new Date() > new Date(deadline);
  }

  // ── NOISE SCORING ─────────────────────────────────────────────────────────────
  // A finding is "noise" if it's low signal: low severity, no CVE, no endpoint, not validated
  function isNoise(f: any): boolean {
    if (f.severity === "info") return true;
    if (f.severity === "low" && !f.cve_id && !f.endpoint && !f.cwe) return true;
    return false;
  }

  // ── DEDUP KEY GENERATORS ──────────────────────────────────────────────────────
  const dedupKey = {
    // CVE-based: same CVE + same package = same finding regardless of scanner
    cve: (cveId: string, pkg: string, asset: string) =>
      `cve::${cveId.toLowerCase()}::${pkg.toLowerCase().replace(/[^a-z0-9]/g, "-")}::${asset.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
    // Vulnerability class + endpoint: same vuln type on same endpoint
    vulnEndpoint: (vulnClass: string, endpoint: string, asset: string) =>
      `vuln::${vulnClass.toLowerCase().replace(/[^a-z0-9]/g, "-")}::${endpoint.toLowerCase().replace(/[?#].*/,"")}::${asset.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
    // CWE + file: same weakness in same file
    cwePath: (cwe: string, filePath: string, asset: string) =>
      `cwe::${cwe.toLowerCase()}::${filePath.toLowerCase().replace(/[^a-z0-9/.]/g, "-")}::${asset.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
    // Cloud: CIS control + resource
    cloud: (cisControl: string, resource: string) =>
      `cloud::${cisControl.toLowerCase().replace(/\s/g, "-")}::${resource.toLowerCase().replace(/[^a-z0-9:/._-]/g, "-")}`,
    // K8s: CIS control + k8s resource
    k8s: (cisControl: string, resource: string) =>
      `k8s::${cisControl.toLowerCase().replace(/\s/g, "-")}::${resource.toLowerCase().replace(/[^a-z0-9:/._-]/g, "-")}`,
    // Title-based fallback
    title: (title: string, asset: string) =>
      `title::${title.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 60)}::${asset.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
  };

  // ── 1. PENTEST FINDINGS ───────────────────────────────────────────────────────
  const pentestFindings = await fetchAll("PentestFinding");
  stats.total_raw += pentestFindings.length;
  for (const f of pentestFindings) {
    if (isNoise(f)) { stats.noise_removed++; continue; }
    const asset = f.job_id ? `pentest-job-${f.job_id}` : "api-core";
    const key = f.endpoint
      ? dedupKey.vulnEndpoint(f.vulnerability_class || f.title, f.endpoint, asset)
      : dedupKey.title(f.title, asset);
    const result = await upsertTriage({
      title: f.title,
      normalized_severity: f.severity,
      status: f.status === "verified" ? "open" : f.status,
      source_scanners: ["PentestEngine"],
      source_count: 1,
      deduplication_key: key,
      reachability: "reachable",
      exploitability: f.cvss_score >= 9 ? "high" : f.cvss_score >= 7 ? "medium" : "low",
      noise_reduced: true,
      asset_name: asset,
      asset_type: "web_application",
      cwe: f.cwe || null,
      cvss_score: f.cvss_score || null,
      first_detected: f.detected_at || new Date().toISOString(),
      last_seen: f.detected_at || new Date().toISOString(),
      sla_deadline: getSLADeadline(f.severity, f.detected_at),
      sla_breached: isSLABreached(getSLADeadline(f.severity, f.detected_at), f.severity),
      autofix_available: ["sqli","xss","csrf"].includes((f.vulnerability_class||"").toLowerCase()),
      notes: `Detected by pentest engine on ${f.endpoint || "unknown endpoint"}. ${f.description || ""}`.slice(0, 500),
    }, existingMap);
    stats[result]++;
    if (result === "updated") stats.deduplicated++;
  }

  // ── 2. DAST FINDINGS ─────────────────────────────────────────────────────────
  const dastFindings = await fetchAll("DASTFinding");
  stats.total_raw += dastFindings.length;
  for (const f of dastFindings) {
    if (isNoise(f)) { stats.noise_removed++; continue; }
    const asset = f.scan_id ? `dast-scan-${String(f.scan_id).slice(-6)}` : "web-app";
    const key = f.endpoint
      ? dedupKey.vulnEndpoint(f.vulnerability_type || f.title, f.endpoint, asset)
      : dedupKey.title(f.title, asset);
    const result = await upsertTriage({
      title: f.title,
      normalized_severity: f.severity,
      status: f.status || "open",
      source_scanners: ["DASTScanner"],
      source_count: 1,
      deduplication_key: key,
      reachability: "reachable",
      exploitability: f.cvss_score >= 9 ? "high" : f.cvss_score >= 7 ? "medium" : "low",
      noise_reduced: true,
      asset_name: asset,
      asset_type: "web_application",
      cwe: f.cwe || null,
      cvss_score: f.cvss_score || null,
      first_detected: f.detected_at || new Date().toISOString(),
      last_seen: f.detected_at || new Date().toISOString(),
      sla_deadline: getSLADeadline(f.severity, f.detected_at),
      sla_breached: isSLABreached(getSLADeadline(f.severity, f.detected_at), f.severity),
      autofix_available: false,
      notes: `DAST finding on ${f.endpoint || "/"} (method: ${f.method || "GET"}). ${f.description || ""}`.slice(0, 500),
    }, existingMap);
    stats[result]++;
    if (result === "updated") stats.deduplicated++;
  }

  // ── 3. CLOUD FINDINGS ────────────────────────────────────────────────────────
  const cloudFindings = await fetchAll("CloudFinding");
  stats.total_raw += cloudFindings.length;
  for (const f of cloudFindings) {
    if (isNoise(f)) { stats.noise_removed++; continue; }
    const key = f.cis_control && f.resource
      ? dedupKey.cloud(f.cis_control, f.resource)
      : dedupKey.title(f.title, f.resource || "cloud");
    const result = await upsertTriage({
      title: f.title,
      normalized_severity: f.severity,
      status: f.status || "open",
      source_scanners: ["CloudScanner"],
      source_count: 1,
      deduplication_key: key,
      reachability: "unknown",
      exploitability: f.severity === "critical" ? "high" : "medium",
      noise_reduced: false,
      asset_name: f.resource || "cloud-resource",
      asset_type: "cloud_resource",
      cwe: null,
      cvss_score: null,
      first_detected: f.detected_at || new Date().toISOString(),
      last_seen: f.detected_at || new Date().toISOString(),
      sla_deadline: getSLADeadline(f.severity, f.detected_at),
      sla_breached: isSLABreached(getSLADeadline(f.severity, f.detected_at), f.severity),
      autofix_available: false,
      notes: `Cloud misconfiguration: ${f.cis_control || ""} on ${f.service || ""} resource ${f.resource || ""}. ${f.description || ""}`.slice(0, 500),
    }, existingMap);
    stats[result]++;
    if (result === "updated") stats.deduplicated++;
  }

  // ── 4. CONTAINER FINDINGS ────────────────────────────────────────────────────
  const containerFindings = await fetchAll("ContainerFinding");
  stats.total_raw += containerFindings.length;
  for (const f of containerFindings) {
    if (isNoise(f)) { stats.noise_removed++; continue; }
    // Containers and VMs often share CVEs — key by CVE+package for cross-dedup
    const key = f.cve_id && f.package
      ? dedupKey.cve(f.cve_id, f.package, f.scan_id || "container")
      : dedupKey.title(f.title, f.scan_id || "container");
    const result = await upsertTriage({
      title: f.title,
      normalized_severity: f.severity,
      status: f.status || "open",
      source_scanners: ["ContainerScanner"],
      source_count: 1,
      deduplication_key: key,
      reachability: "unknown",
      exploitability: f.cvss_score >= 9 ? "high" : f.cvss_score >= 7 ? "medium" : "low",
      noise_reduced: false,
      asset_name: f.scan_id ? `container-${String(f.scan_id).slice(-6)}` : "container",
      asset_type: "container",
      cve_id: f.cve_id || null,
      cvss_score: f.cvss_score || null,
      first_detected: f.detected_at || new Date().toISOString(),
      last_seen: f.detected_at || new Date().toISOString(),
      sla_deadline: getSLADeadline(f.severity, f.detected_at),
      sla_breached: isSLABreached(getSLADeadline(f.severity, f.detected_at), f.severity),
      autofix_available: !!f.fixed_version,
      notes: `Container vuln: ${f.cve_id || ""} in ${f.package || "unknown"}${f.version ? `@${f.version}` : ""}. ${f.description || ""}`.slice(0, 500),
    }, existingMap);
    stats[result]++;
    if (result === "updated") stats.deduplicated++;
  }

  // ── 5. VM FINDINGS ───────────────────────────────────────────────────────────
  const vmFindings = await fetchAll("VMFinding");
  stats.total_raw += vmFindings.length;
  for (const f of vmFindings) {
    if (isNoise(f)) { stats.noise_removed++; continue; }
    // Same CVE+package key as containers — will auto-merge if same CVE hit both
    const key = f.cve_id && f.package
      ? dedupKey.cve(f.cve_id, f.package, f.scan_id || "vm")
      : dedupKey.title(f.title, f.scan_id || "vm");
    const result = await upsertTriage({
      title: f.title,
      normalized_severity: f.severity,
      status: f.status || "open",
      source_scanners: ["VMScanner"],
      source_count: 1,
      deduplication_key: key,
      reachability: "unknown",
      exploitability: f.cvss_score >= 9 ? "high" : f.cvss_score >= 7 ? "medium" : "low",
      noise_reduced: false,
      asset_name: f.scan_id ? `vm-${String(f.scan_id).slice(-6)}` : "vm",
      asset_type: "virtual_machine",
      cve_id: f.cve_id || null,
      cvss_score: f.cvss_score || null,
      epss_score: f.epss_score || null,
      first_detected: f.detected_at || new Date().toISOString(),
      last_seen: f.detected_at || new Date().toISOString(),
      sla_deadline: getSLADeadline(f.severity, f.detected_at),
      sla_breached: isSLABreached(getSLADeadline(f.severity, f.detected_at), f.severity),
      autofix_available: !!f.patch_available,
      notes: `VM vuln: ${f.cve_id || ""} in ${f.package || "unknown"}${f.installed_version ? `@${f.installed_version}` : ""}. ${f.exploited_in_wild ? "⚠️ EXPLOITED IN WILD. " : ""}${f.description || ""}`.slice(0, 500),
    }, existingMap);
    stats[result]++;
    if (result === "updated") stats.deduplicated++;
  }

  // ── 6. K8s FINDINGS ──────────────────────────────────────────────────────────
  const k8sFindings = await fetchAll("K8sFinding");
  stats.total_raw += k8sFindings.length;
  for (const f of k8sFindings) {
    if (isNoise(f)) { stats.noise_removed++; continue; }
    const key = f.cis_control && f.resource
      ? dedupKey.k8s(f.cis_control, f.resource)
      : dedupKey.title(f.title, f.resource || "k8s");
    const result = await upsertTriage({
      title: f.title,
      normalized_severity: f.severity,
      status: f.status || "open",
      source_scanners: ["K8sScanner"],
      source_count: 1,
      deduplication_key: key,
      reachability: "unknown",
      exploitability: f.severity === "critical" ? "high" : "medium",
      noise_reduced: false,
      asset_name: f.resource || "k8s-resource",
      asset_type: "kubernetes",
      cwe: null,
      cvss_score: null,
      first_detected: f.detected_at || new Date().toISOString(),
      last_seen: f.detected_at || new Date().toISOString(),
      sla_deadline: getSLADeadline(f.severity, f.detected_at),
      sla_breached: isSLABreached(getSLADeadline(f.severity, f.detected_at), f.severity),
      autofix_available: false,
      notes: `K8s misconfiguration: ${f.cis_control || ""} on ${f.category || ""} resource ${f.resource || ""}. ${f.description || ""}`.slice(0, 500),
    }, existingMap);
    stats[result]++;
    if (result === "updated") stats.deduplicated++;
  }

  // ── 7. SLA BREACH SWEEP ──────────────────────────────────────────────────────
  // Re-check all open TriagedFindings for SLA breach (catches ones that aged past deadline)
  let slaBreached = 0;
  const allTriage = await fetchAll("TriagedFinding");
  for (const f of allTriage) {
    if (["fixed", "ignored", "false_positive"].includes(f.status)) continue;
    const breached = isSLABreached(f.sla_deadline, f.normalized_severity);
    if (breached && !f.sla_breached) {
      await fetch(`${BASE}/entities/TriagedFinding/${f.id}`, {
        method: "PATCH", headers: dbH,
        body: JSON.stringify({ sla_breached: true })
      }).catch(() => null);
      slaBreached++;
    }
  }

  // ── 8. AI PRIORITY SCORING (optional — uses OpenAI if available) ──────────────
  let aiEnhanced = 0;
  if (OPENAI_KEY) {
    // Find newly created critical/high findings with no AI scoring yet
    const needsAI = allTriage.filter(f =>
      ["critical","high"].includes(f.normalized_severity) &&
      f.status === "open" &&
      !f.notes?.includes("[AI]")
    ).slice(0, 8); // limit to 8 per run to control token cost

    if (needsAI.length > 0) {
      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{
            role: "system",
            content: `You are a security triage analyst. For each finding, output EXACTLY one line:
"N. PRIORITY:[1-10] REACHABILITY:[reachable|not_reachable|unknown] EXPLOIT:[high|medium|low] NOTE:[≤20 words]"
Score 10=drop everything, 1=low priority. Consider: CVE severity, exploitability, reachability, internet exposure.`
          }, {
            role: "user",
            content: needsAI.map((f, i) =>
              `${i+1}. [${f.normalized_severity.toUpperCase()}] ${f.title} | Asset: ${f.asset_name} | Type: ${f.asset_type} | CVE: ${f.cve_id || "none"} | CVSS: ${f.cvss_score || "?"}`
            ).join("\n")
          }],
          temperature: 0.1,
          max_tokens: 400,
        })
      }).catch(() => null);

      if (aiRes?.ok) {
        const aiData = await aiRes.json().catch(() => null);
        const lines = (aiData?.choices?.[0]?.message?.content || "").split("\n").filter(Boolean);
        for (let i = 0; i < needsAI.length && i < lines.length; i++) {
          const line = lines[i];
          const priority = line.match(/PRIORITY:(\d+)/)?.[1];
          const reach     = line.match(/REACHABILITY:(\w+)/)?.[1];
          const exploit   = line.match(/EXPLOIT:(\w+)/)?.[1];
          const note      = line.match(/NOTE:(.+)/)?.[1]?.trim();
          if (priority) {
            await fetch(`${BASE}/entities/TriagedFinding/${needsAI[i].id}`, {
              method: "PATCH", headers: dbH,
              body: JSON.stringify({
                reachability: reach || needsAI[i].reachability,
                exploitability: exploit || needsAI[i].exploitability,
                notes: ((needsAI[i].notes || "") + ` [AI] Priority ${priority}/10: ${note || ""}`).slice(0, 500),
              })
            }).catch(() => null);
            aiEnhanced++;
          }
        }
      }
    }
  }

  // ── FINAL STATS ───────────────────────────────────────────────────────────────
  const totalAfter = (await fetchAll("TriagedFinding")).length;
  const noiseReductionPct = stats.total_raw > 0
    ? Math.round(((stats.total_raw - totalAfter) / stats.total_raw) * 100)
    : 0;

  return Response.json({
    success: true,
    run_at: new Date().toISOString(),
    sources_processed: ["PentestFinding", "DASTFinding", "CloudFinding", "ContainerFinding", "VMFinding", "K8sFinding"],
    raw_findings_ingested: stats.total_raw,
    triage_results: {
      created: stats.created,
      updated_merged: stats.updated,
      deduplicated: stats.deduplicated,
      noise_removed: stats.noise_removed,
      skipped_errors: stats.skipped,
    },
    sla_breaches_detected: slaBreached,
    ai_priority_scores_added: aiEnhanced,
    total_triage_records: totalAfter,
    noise_reduction_pct: `${noiseReductionPct}%`,
    message: `AutoTriage complete — ${stats.created} new, ${stats.deduplicated} deduplicated, ${stats.noise_removed} noise removed. ${noiseReductionPct}% noise reduction achieved.`,
  });
});
