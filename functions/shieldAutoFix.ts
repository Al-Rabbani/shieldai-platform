// ShieldAI — AutoFix Engine v3
// Creates REAL GitHub Pull Requests with actual code changes
// Supports: dependency upgrades (SCA), SAST code fixes, weak crypto, XSS, SQL injection
// Integrated with TriagedFinding entity — marks autofix_pr_url on success
// GitHub token read from env (GITHUB_TOKEN) — no need to pass in request body

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } });

  const body = await req.json().catch(() => ({}));
  const {
    action,              // create_pr | preview_fix | bulk_fix | list_fixable
    github_token: tokenOverride,
    repo_full_name,
    finding,             // single finding object
    findings,            // array for bulk_fix
    triage_finding_id,   // optional: TriagedFinding id to update on success
    branch_prefix = "shieldai-fix",
  } = body;

  const GITHUB_TOKEN = tokenOverride || Deno.env.get("GITHUB_TOKEN") || "";
  const API_KEY      = Deno.env.get("BASE44_API_KEY") || "";
  const APP_ID       = Deno.env.get("BASE44_APP_ID") || "";
  const BASE         = `https://app.base44.com/api/apps/${APP_ID}`;
  const DB_H         = { "x-api-key": API_KEY, "Content-Type": "application/json" };

  if (!repo_full_name) {
    return Response.json({ error: "repo_full_name required (e.g. 'owner/repo')" }, { status: 400 });
  }
  if (!GITHUB_TOKEN) {
    return Response.json({ error: "GitHub token not configured. Set GITHUB_TOKEN in Builder secrets." }, { status: 400 });
  }

  const GH_H = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };

  const gh = async (path: string, method = "GET", payload?: object) => {
    const r = await fetch(`https://api.github.com${path}`, {
      method, headers: GH_H,
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const text = await r.text();
    try { return { ok: r.ok, status: r.status, data: JSON.parse(text) }; }
    catch { return { ok: r.ok, status: r.status, data: text }; }
  };

  const getDefaultBranch = async () => {
    const { data } = await gh(`/repos/${repo_full_name}`);
    return data.default_branch || "main";
  };

  const getLatestSha = async (branch: string) => {
    const { data } = await gh(`/repos/${repo_full_name}/git/ref/heads/${encodeURIComponent(branch)}`);
    return data?.object?.sha as string | undefined;
  };

  const getFile = async (path: string, branch: string) => {
    const { data } = await gh(`/repos/${repo_full_name}/contents/${encodeURIComponent(path)}?ref=${branch}`);
    return data;
  };

  // ── Mark TriagedFinding with PR URL on success
  const markTriagePR = async (id: string, prUrl: string) => {
    if (!id || !API_KEY || !APP_ID) return;
    await fetch(`${BASE}/entities/TriagedFinding/${id}`, {
      method: "PATCH", headers: DB_H,
      body: JSON.stringify({ autofix_available: true, autofix_pr_url: prUrl, status: "in_progress" }),
    }).catch(() => null);
  };

  // ── Generate actual code patch based on finding type + content
  const generateFix = (f: any, original: string): { newContent: string; description: string } | null => {
    const lines = original.split("\n");

    // ── SCA: package.json version bump
    if (f.type === "sca" && f.file_path?.endsWith("package.json") && f.package_name && f.fix_version) {
      try {
        const pkg = JSON.parse(original);
        let changed = false; const desc: string[] = [];
        for (const sec of ["dependencies", "devDependencies", "peerDependencies"]) {
          if (pkg[sec]?.[f.package_name]) {
            const cur = pkg[sec][f.package_name];
            const prefix = cur.match(/^[\^~>=<]*/)?.[0] || "^";
            pkg[sec][f.package_name] = prefix + f.fix_version;
            desc.push(`Upgraded ${f.package_name} from ${cur} to ${prefix}${f.fix_version} (${f.cve_id || "security fix"})`);
            changed = true;
          }
        }
        if (changed) return { newContent: JSON.stringify(pkg, null, 2) + "\n", description: desc.join("; ") };
      } catch { return null; }
    }

    // ── SCA: requirements.txt pin
    if (f.type === "sca" && f.file_path?.endsWith("requirements.txt") && f.package_name && f.fix_version) {
      const fixed = lines.map((l: string) => {
        const m = l.match(/^([a-zA-Z0-9_\-]+)[=><!\s]+([0-9].*)$/);
        if (m && m[1].toLowerCase() === f.package_name.toLowerCase()) return `${m[1]}==${f.fix_version}`;
        return l;
      }).join("\n");
      if (fixed !== original) return { newContent: fixed, description: `Pinned ${f.package_name} to ${f.fix_version} (${f.cve_id || "security fix"})` };
    }

    // ── SAST: SQL Injection (CWE-89) — parameterised queries
    if (f.type === "sast" && f.rule_id === "CWE-89" && f.line_number) {
      const idx = f.line_number - 1;
      const line = lines[idx]; if (!line) return null;
      const fixed = line
        .replace(/cursor\.execute\(\s*f["'](.+?)\{(\w+)\}(.+?)["']\s*\)/, 'cursor.execute("$1%s$3", ($2,))')
        .replace(/cursor\.execute\(\s*["'](.+?)\s*%\s*(\w+)\s*["']\s*\)/, 'cursor.execute("$1", ($2,))');
      if (fixed !== line) {
        lines[idx] = fixed;
        return { newContent: lines.join("\n"), description: `Fixed SQL injection on line ${f.line_number}: switched to parameterised query (CWE-89)` };
      }
    }

    // ── SAST: Weak Crypto (CWE-327) — MD5/SHA1 → SHA-256
    if (f.type === "sast" && f.rule_id === "CWE-327" && f.line_number) {
      const idx = f.line_number - 1;
      const line = lines[idx]; if (!line) return null;
      const fixed = line
        .replace(/createHash\s*\(\s*['"]md5['"]\s*\)/g, "createHash('sha256')")
        .replace(/createHash\s*\(\s*['"]sha1['"]\s*\)/g, "createHash('sha256')")
        .replace(/\bhashlib\.md5\s*\(/g, "hashlib.sha256(")
        .replace(/\bhashlib\.sha1\s*\(/g, "hashlib.sha256(");
      if (fixed !== line) {
        lines[idx] = fixed;
        return { newContent: lines.join("\n"), description: `Fixed weak crypto on line ${f.line_number}: replaced MD5/SHA1 with SHA-256 (CWE-327)` };
      }
    }

    // ── SAST: XSS (CWE-79) — innerHTML → DOMPurify.sanitize
    if (f.type === "sast" && f.rule_id === "CWE-79" && f.line_number) {
      const idx = f.line_number - 1;
      const line = lines[idx]; if (!line) return null;
      const fixed = line.replace(/(\w+)\.innerHTML\s*=\s*(.+)/, "$1.innerHTML = DOMPurify.sanitize($2)");
      if (fixed !== line) {
        lines[idx] = fixed;
        return { newContent: lines.join("\n"), description: `Fixed XSS on line ${f.line_number}: added DOMPurify.sanitize() to innerHTML assignment (CWE-79)` };
      }
    }

    // ── SAST: Hardcoded secret (CWE-798) — replace with env var
    if (f.type === "sast" && f.rule_id === "CWE-798" && f.line_number) {
      const idx = f.line_number - 1;
      const line = lines[idx]; if (!line) return null;
      const fixed = line
        .replace(/(API_KEY|SECRET|PASSWORD|TOKEN)\s*=\s*["'][^"']{8,}["']/, '$1 = process.env.$1 || ""')
        .replace(/(api_key|secret|password|token)\s*=\s*["'][^"']{8,}["']/, '$1 = os.environ.get("$1", "")');
      if (fixed !== line) {
        lines[idx] = fixed;
        return { newContent: lines.join("\n"), description: `Fixed hardcoded secret on line ${f.line_number}: replaced with environment variable lookup (CWE-798)` };
      }
    }

    return null; // No automated fix available
  };

  // ── Create branch + commit + PR — returns { pr_url, pr_number, branch } or throws
  const createPR = async (filePath: string, newContent: string, fileSha: string, title: string, body: string, branchName: string, baseBranch: string) => {
    const baseSha = await getLatestSha(baseBranch);
    if (!baseSha) throw new Error("Could not resolve base branch SHA");

    const branchRes = await gh(`/repos/${repo_full_name}/git/refs`, "POST", { ref: `refs/heads/${branchName}`, sha: baseSha });
    if (!branchRes.ok) throw new Error(`Branch creation failed: ${JSON.stringify(branchRes.data)}`);

    const commitRes = await gh(`/repos/${repo_full_name}/contents/${encodeURIComponent(filePath)}`, "PUT", {
      message: `fix(security): ${title}\n\nGenerated by ShieldAI AutoFix Engine`,
      content: btoa(unescape(encodeURIComponent(newContent))),
      sha: fileSha,
      branch: branchName,
    });
    if (!commitRes.ok) throw new Error(`Commit failed: ${JSON.stringify(commitRes.data)}`);

    const prRes = await gh(`/repos/${repo_full_name}/pulls`, "POST", {
      title: `[ShieldAI] ${title}`,
      body,
      head: branchName,
      base: baseBranch,
      draft: false,
    });
    if (!prRes.ok) throw new Error(`PR creation failed: ${JSON.stringify(prRes.data)}`);

    return { pr_url: prRes.data.html_url as string, pr_number: prRes.data.number as number, branch: branchName };
  };

  // ══════════════════════════════════════════════════
  // ACTION: list_fixable — scan TriagedFindings for autofix candidates
  // ══════════════════════════════════════════════════
  if (action === "list_fixable") {
    if (!API_KEY || !APP_ID) return Response.json({ error: "BASE44_API_KEY/APP_ID not configured" }, { status: 400 });
    const r = await fetch(`${BASE}/entities/TriagedFinding?limit=200`, { headers: DB_H });
    const records = await r.json().catch(() => []);
    const fixable = (Array.isArray(records) ? records : records.records || []).filter((rec: any) =>
      rec.autofix_available && !rec.autofix_pr_url && rec.status !== "fixed"
    );
    return Response.json({ fixable_count: fixable.length, findings: fixable.map((f: any) => ({ id: f.id, title: f.title, severity: f.normalized_severity, cve_id: f.cve_id, asset_name: f.asset_name })) });
  }

  // ══════════════════════════════════════════════════
  // ACTION: preview_fix
  // ══════════════════════════════════════════════════
  if (action === "preview_fix") {
    if (!finding?.file_path) return Response.json({ error: "finding.file_path required" }, { status: 400 });
    try {
      const base = await getDefaultBranch();
      const fileData = await getFile(finding.file_path, base);
      const original = atob(fileData.content.replace(/\n/g, ""));
      const fix = generateFix(finding, original);
      if (!fix) return Response.json({ fixable: false, reason: "No automated fix pattern matched. Manual remediation required.", guidance: finding.remediation });

      const origLines = original.split("\n"), newLines = fix.newContent.split("\n");
      const diff: string[] = [];
      for (let i = 0; i < Math.max(origLines.length, newLines.length) && diff.length < 30; i++) {
        if (origLines[i] !== newLines[i]) {
          if (origLines[i] !== undefined) diff.push(`- ${origLines[i]}`);
          if (newLines[i] !== undefined) diff.push(`+ ${newLines[i]}`);
        }
      }
      return Response.json({ fixable: true, file_path: finding.file_path, description: fix.description, diff_preview: diff.join("\n"), lines_changed: diff.filter((l: string) => l.startsWith("+")).length });
    } catch (e) {
      return Response.json({ fixable: false, error: String(e) }, { status: 500 });
    }
  }

  // ══════════════════════════════════════════════════
  // ACTION: create_pr — single finding → single PR
  // ══════════════════════════════════════════════════
  if (action === "create_pr") {
    if (!finding?.file_path) return Response.json({ error: "finding.file_path required" }, { status: 400 });
    try {
      const base = await getDefaultBranch();
      const fileData = await getFile(finding.file_path, base);
      const original = atob(fileData.content.replace(/\n/g, ""));
      const fix = generateFix(finding, original);
      if (!fix) return Response.json({ success: false, fixable: false, reason: "No automated fix available", guidance: finding.remediation });

      const slug = (finding.package_name || finding.rule_id || "fix").replace(/[^a-zA-Z0-9\-]/g, "-").toLowerCase();
      const branchName = `${branch_prefix}/${slug}-${Date.now()}`;
      const prTitle = fix.description.slice(0, 72);
      const prBody = `## 🛡️ ShieldAI AutoFix\n\n**Finding:** ${finding.title || fix.description}\n**Severity:** ${finding.severity || "N/A"}\n**File:** \`${finding.file_path}\`\n${finding.cve_id ? `**CVE:** ${finding.cve_id}\n` : ""}${finding.rule_id ? `**Rule:** ${finding.rule_id}\n` : ""}\n**Fix applied:**\n> ${fix.description}\n\n---\n*Generated by [ShieldAI](https://shieldai.dev) AutoFix Engine. Review before merging.*`;

      const result = await createPR(finding.file_path, fix.newContent, fileData.sha, prTitle, prBody, branchName, base);

      // Update TriagedFinding if ID provided
      if (triage_finding_id) await markTriagePR(triage_finding_id, result.pr_url);

      return Response.json({ success: true, ...result, description: fix.description });
    } catch (e) {
      return Response.json({ success: false, error: String(e) }, { status: 500 });
    }
  }

  // ══════════════════════════════════════════════════
  // ACTION: bulk_fix — multiple findings → grouped PRs by file
  // ══════════════════════════════════════════════════
  if (action === "bulk_fix") {
    if (!findings?.length) return Response.json({ error: "findings array required" }, { status: 400 });

    const base = await getDefaultBranch();
    const results: any[] = [];

    // Group by file to batch fixes per file into one PR
    const byFile: Record<string, any[]> = {};
    for (const f of findings) {
      if (!byFile[f.file_path]) byFile[f.file_path] = [];
      byFile[f.file_path].push(f);
    }

    for (const [filePath, fileFindings] of Object.entries(byFile)) {
      try {
        const fileData = await getFile(filePath, base);
        let content = atob(fileData.content.replace(/\n/g, ""));
        const applied: string[] = [];

        for (const f of fileFindings) {
          const fix = generateFix(f, content);
          if (fix) { content = fix.newContent; applied.push(fix.description); }
        }

        if (!applied.length) { results.push({ file: filePath, success: false, reason: "No auto-fixable findings" }); continue; }

        const branchName = `${branch_prefix}/bulk-${filePath.replace(/[^a-zA-Z0-9]/g, "-").slice(-25)}-${Date.now()}`;
        const prTitle = `${applied.length} security fix${applied.length > 1 ? "es" : ""} in ${filePath.split("/").pop()}`;
        const prBody = `## 🛡️ ShieldAI Bulk AutoFix\n\n**File:** \`${filePath}\`\n**Fixes applied:** ${applied.length}\n\n${applied.map((d, i) => `${i + 1}. ${d}`).join("\n")}\n\n---\n*Generated by ShieldAI AutoFix Engine. Review before merging.*`;

        const result = await createPR(filePath, content, fileData.sha, prTitle, prBody, branchName, base);

        // Update each TriagedFinding that had a triage_id
        for (const f of fileFindings) {
          if (f.triage_finding_id) await markTriagePR(f.triage_finding_id, result.pr_url);
        }

        results.push({ file: filePath, success: true, ...result, fixes_applied: applied.length, descriptions: applied });
      } catch (e) {
        results.push({ file: filePath, success: false, error: String(e) });
      }
    }

    return Response.json({
      success: true,
      total_prs: results.filter((r: any) => r.success).length,
      total_fixes: results.reduce((sum: number, r: any) => sum + (r.fixes_applied || 0), 0),
      results,
    });
  }

  return Response.json({ error: "Unknown action. Use: create_pr | preview_fix | bulk_fix | list_fixable" }, { status: 400 });
});
