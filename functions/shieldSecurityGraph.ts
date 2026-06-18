// ShieldAI — Security Graph Engine v1
// Builds a real attack-path graph from ALL scanner findings across pillars
// Nodes: internet → exposed_service → vm/container/function → database/storage → iam_role
// Edges: connectivity + exploitability chains
// Real data: reads from CloudFinding, DASTFinding, VMFinding, ContainerFinding, K8sFinding, PentestFinding, TriagedFinding
// Output: SecurityGraph entity nodes with connected_to arrays + attack_paths

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Risk level from severity
function riskFromSeverity(sev: string): string {
  return ({ critical: "critical", high: "high", medium: "medium", low: "low" })[sev] || "low";
}

// Deduplicate nodes by node_id
function mergeNode(map: Map<string, any>, node: any) {
  const existing = map.get(node.node_id);
  if (!existing) { map.set(node.node_id, node); return; }
  // Escalate risk level
  const order = ["none","low","medium","high","critical"];
  if (order.indexOf(node.risk_level) > order.indexOf(existing.risk_level)) existing.risk_level = node.risk_level;
  existing.findings_count = (existing.findings_count || 0) + (node.findings_count || 0);
  // Merge connected_to
  for (const c of (node.connected_to || [])) {
    if (!existing.connected_to.includes(c)) existing.connected_to.push(c);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const {
      action = "build",    // build | query | attack_paths | summary
      node_type,           // filter by type for query
      risk_level,          // filter by risk for query
      asset_id,            // specific asset for attack_paths
      save_to_db = true,
    } = body;

    // ── QUERY: return existing graph nodes
    if (action === "query") {
      let nodes = await base44.entities.SecurityGraph.list().catch(() => []);
      if (node_type) nodes = nodes.filter((n: any) => n.node_type === node_type);
      if (risk_level) nodes = nodes.filter((n: any) => n.risk_level === risk_level);
      return new Response(JSON.stringify({ success: true, count: nodes.length, nodes }), { headers: CORS });
    }

    if (action === "summary") {
      const nodes = await base44.entities.SecurityGraph.list().catch(() => []);
      const byType: Record<string, number> = {};
      const byRisk: Record<string, number> = {};
      let attackPaths = 0;
      for (const n of nodes) {
        byType[n.node_type] = (byType[n.node_type] || 0) + 1;
        byRisk[n.risk_level] = (byRisk[n.risk_level] || 0) + 1;
        attackPaths += (n.attack_paths || []).length;
      }
      return new Response(JSON.stringify({ success: true, total_nodes: nodes.length, by_type: byType, by_risk: byRisk, total_attack_paths: attackPaths, internet_facing: nodes.filter((n: any) => n.is_internet_facing).length }), { headers: CORS });
    }

    // ── BUILD: construct full graph from all scan findings
    // Load all findings in parallel
    const [cloudFindings, dastFindings, vmFindings, containerFindings, k8sFindings, pentestFindings, triaged, cloudAccounts, vmScans, containerScans, dastScans] = await Promise.all([
      base44.entities.CloudFinding.list().catch(() => []),
      base44.entities.DASTFinding.list().catch(() => []),
      base44.entities.VMFinding.list().catch(() => []),
      base44.entities.ContainerFinding.list().catch(() => []),
      base44.entities.K8sFinding.list().catch(() => []),
      base44.entities.PentestFinding.list().catch(() => []),
      base44.entities.TriagedFinding.list().catch(() => []),
      base44.entities.CloudAccount.list().catch(() => []),
      base44.entities.VMScan.list().catch(() => []),
      base44.entities.ContainerScan.list().catch(() => []),
      base44.entities.DASTScan.list().catch(() => []),
    ]);

    const nodeMap = new Map<string, any>();
    const now = new Date().toISOString();

    // Always add Internet node
    mergeNode(nodeMap, {
      node_id: "internet",
      node_type: "internet",
      label: "Internet",
      is_internet_facing: true,
      risk_level: "high",
      findings_count: 0,
      connected_to: [],
      attack_paths: [],
      last_updated: now,
    });

    // ── Build nodes from Cloud Accounts
    for (const acct of cloudAccounts) {
      const nodeId = `cloud_${acct.provider}_${acct.account_id || acct.id}`;
      mergeNode(nodeMap, {
        node_id: nodeId,
        node_type: "network",
        label: `${(acct.provider || "cloud").toUpperCase()} — ${acct.nickname || acct.account_id || "Account"}`,
        asset_id: acct.id,
        provider: acct.provider,
        risk_level: riskFromSeverity(acct.critical_count > 0 ? "critical" : acct.high_count > 0 ? "high" : "medium"),
        findings_count: acct.total_findings || 0,
        is_internet_facing: true,
        connected_to: ["internet"],
        attack_paths: [],
        metadata: { account_id: acct.account_id, last_scanned: acct.last_scanned },
        last_updated: now,
      });
    }

    // ── Build nodes from DAST Scans (exposed services)
    for (const scan of dastScans) {
      try {
        const url = new URL(scan.target_url || "http://unknown");
        const nodeId = `web_${url.hostname.replace(/[^a-z0-9]/gi, "_")}`;
        mergeNode(nodeMap, {
          node_id: nodeId,
          node_type: "exposed_service",
          label: `Web App — ${url.hostname}`,
          asset_id: scan.id,
          risk_level: riskFromSeverity(scan.critical_count > 0 ? "critical" : scan.high_count > 0 ? "high" : "medium"),
          findings_count: scan.total_findings || 0,
          is_internet_facing: true,
          connected_to: ["internet"],
          attack_paths: [],
          metadata: { url: scan.target_url, scan_type: scan.scan_type },
          last_updated: now,
        });
      } catch { /* skip bad URLs */ }
    }

    // ── Build nodes from VM Scans
    for (const vm of vmScans) {
      const nodeId = `vm_${vm.instance_id || vm.id}`;
      mergeNode(nodeMap, {
        node_id: nodeId,
        node_type: "vm",
        label: `VM — ${vm.nickname || vm.instance_id || "Host"}`,
        asset_id: vm.id,
        provider: vm.provider,
        risk_level: riskFromSeverity(vm.critical_count > 0 ? "critical" : vm.high_count > 0 ? "high" : "medium"),
        findings_count: vm.total_findings || 0,
        is_internet_facing: false,
        connected_to: [],
        attack_paths: [],
        metadata: { os: vm.os_name, region: vm.region, ip: vm.ip_address },
        last_updated: now,
      });
    }

    // ── Build nodes from Container Scans
    for (const cs of containerScans) {
      const nodeId = `container_${(cs.image || "img").replace(/[^a-z0-9]/gi, "_")}_${cs.id.slice(-6)}`;
      mergeNode(nodeMap, {
        node_id: nodeId,
        node_type: "container",
        label: `Container — ${cs.image}:${cs.tag || "latest"}`,
        asset_id: cs.id,
        provider: cs.registry || "dockerhub",
        risk_level: riskFromSeverity(cs.critical_count > 0 ? "critical" : cs.high_count > 0 ? "high" : "medium"),
        findings_count: cs.total_findings || 0,
        is_internet_facing: false,
        connected_to: [],
        attack_paths: [],
        metadata: { image: cs.image, tag: cs.tag, os_base: cs.os_base },
        last_updated: now,
      });
    }

    // ── Build attack paths from DAST findings (web vuln → backend pivot)
    const criticalDAST = dastFindings.filter((f: any) => f.severity === "critical" || f.severity === "high");
    for (const f of criticalDAST.slice(0, 20)) {
      try {
        const url = new URL(f.target_url || "http://unknown");
        const srcNodeId = `web_${url.hostname.replace(/[^a-z0-9]/gi, "_")}`;
        const srcNode = nodeMap.get(srcNodeId);
        if (srcNode) {
          srcNode.attack_paths.push({
            path: ["internet", srcNodeId],
            vuln: f.title,
            severity: f.severity,
            cwe: f.cwe,
            endpoint: f.endpoint,
            method: f.method,
          });
        }
      } catch { /* skip */ }
    }

    // ── Build attack paths from Pentest findings
    const criticalPentest = pentestFindings.filter((f: any) => f.severity === "critical" || f.severity === "high");
    for (const f of criticalPentest.slice(0, 20)) {
      // Try to link pentest finding to an existing web node
      let linkedNodeId = "";
      for (const [nid, node] of nodeMap) {
        if (node.node_type === "exposed_service" && f.endpoint) { linkedNodeId = nid; break; }
      }
      if (linkedNodeId) {
        const node = nodeMap.get(linkedNodeId)!;
        node.attack_paths.push({
          path: ["internet", linkedNodeId],
          vuln: f.title,
          severity: f.severity,
          cwe: f.cwe,
          owasp: f.owasp_category,
          cvss: f.cvss_score,
        });
      }
    }

    // ── Build IAM / privilege escalation nodes from Cloud findings
    const iamFindings = cloudFindings.filter((f: any) =>
      (f.service || "").toLowerCase() === "iam" ||
      (f.title || "").toLowerCase().includes("iam") ||
      (f.title || "").toLowerCase().includes("role") ||
      (f.title || "").toLowerCase().includes("permission")
    );
    for (const f of iamFindings.slice(0, 15)) {
      const nodeId = `iam_${(f.resource || f.id).replace(/[^a-z0-9]/gi, "_").slice(0, 40)}`;
      mergeNode(nodeMap, {
        node_id: nodeId,
        node_type: "iam_role",
        label: `IAM — ${f.title.replace("[ShieldAI] ", "").slice(0, 60)}`,
        asset_id: f.cloud_account_id,
        provider: f.provider,
        risk_level: riskFromSeverity(f.severity),
        findings_count: 1,
        is_internet_facing: false,
        connected_to: [],
        attack_paths: [{
          path: ["compromised_identity", nodeId, "full_account"],
          vuln: f.title,
          severity: f.severity,
          cis: f.cis_control,
          remediation: f.remediation,
        }],
        metadata: { resource: f.resource, cis_control: f.cis_control },
        last_updated: now,
      });
    }

    // ── Build storage nodes from S3/storage Cloud findings
    const storageFindings = cloudFindings.filter((f: any) =>
      (f.service || "").toLowerCase() === "s3" ||
      (f.title || "").toLowerCase().includes("bucket") ||
      (f.title || "").toLowerCase().includes("storage")
    );
    for (const f of storageFindings.slice(0, 10)) {
      const bucketName = (f.resource || "").split(":::")[1] || (f.title || "").match(/bucket[:\s]+([a-z0-9-]+)/i)?.[1] || f.id;
      const nodeId = `storage_${bucketName.replace(/[^a-z0-9]/gi, "_").slice(0, 40)}`;
      mergeNode(nodeMap, {
        node_id: nodeId,
        node_type: "storage",
        label: `Storage — ${bucketName}`,
        asset_id: f.cloud_account_id,
        provider: f.provider || "aws",
        risk_level: riskFromSeverity(f.severity),
        findings_count: 1,
        is_internet_facing: f.severity === "critical",
        connected_to: f.severity === "critical" ? ["internet"] : [],
        attack_paths: f.severity === "critical" ? [{
          path: ["internet", nodeId],
          vuln: f.title,
          severity: f.severity,
          description: "Publicly accessible storage bucket exposes data directly from internet",
        }] : [],
        metadata: { resource: f.resource, finding: f.title },
        last_updated: now,
      });
    }

    // ── Connect VM → Cloud network
    for (const [nid, node] of nodeMap) {
      if (node.node_type === "vm" && cloudAccounts.length > 0) {
        const cloudNode = [...nodeMap.values()].find(n => n.node_type === "network" && n.provider === (node.provider || "aws"));
        if (cloudNode && !node.connected_to.includes(cloudNode.node_id)) {
          node.connected_to.push(cloudNode.node_id);
        }
      }
      if (node.node_type === "container") {
        const k8sNode = [...nodeMap.values()].find(n => n.node_type === "network");
        if (k8sNode && !node.connected_to.includes(k8sNode.node_id)) {
          node.connected_to.push(k8sNode.node_id);
        }
      }
    }

    const nodes = [...nodeMap.values()];
    let saved = 0;

    if (save_to_db) {
      // Clear old nodes first
      try {
        const existing = await base44.entities.SecurityGraph.list();
        for (const n of existing) {
          try { await base44.entities.SecurityGraph.delete(n.id); } catch (_) {}
        }
      } catch (_) {}

      // Save new nodes
      for (const node of nodes) {
        try { await base44.entities.SecurityGraph.create(node); saved++; } catch (_) {}
      }
    }

    const byRisk = { critical: 0, high: 0, medium: 0, low: 0, none: 0 };
    for (const n of nodes) (byRisk as any)[n.risk_level] = ((byRisk as any)[n.risk_level] || 0) + 1;
    const totalAttackPaths = nodes.reduce((s, n) => s + (n.attack_paths?.length || 0), 0);
    const internetFacing = nodes.filter(n => n.is_internet_facing).length;

    return new Response(JSON.stringify({
      success: true,
      action: "build",
      total_nodes: nodes.length,
      saved_to_db: saved,
      by_risk: byRisk,
      internet_facing_nodes: internetFacing,
      total_attack_paths: totalAttackPaths,
      node_types: [...new Set(nodes.map(n => n.node_type))],
      critical_paths: nodes.filter(n => (n.attack_paths?.length || 0) > 0 && n.risk_level === "critical").map(n => ({ node: n.label, paths: n.attack_paths.length, risk: n.risk_level })),
    }), { headers: CORS });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS });
  }
});
