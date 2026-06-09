// ShieldAI — CI/CD Gate (Phase 1, Step 1.10)
// Webhook endpoint that receives GitHub Actions events, scans the PR/commit, and returns pass/fail
// Returns: { pass: boolean, block_reason?: string, findings_count: number, findings: [] }
// GitHub Actions integration: call this endpoint in your workflow to gate deployments

Deno.serve(async (req) => {
  const body = await req.json().catch(() => ({}));

  // Support two modes:
  // 1. GitHub Actions webhook: { repo_full_name, github_token, commit_sha, pr_number?, branch, block_on: ["critical","high"] }
  // 2. Direct API call from CI pipeline with same params
  const {
    repo_full_name,
    github_token,
    commit_sha,
    pr_number,
    branch = "main",
    block_on = ["critical"],   // severities that block the pipeline
    fail_on_secrets = true,
    fail_on_high_count,        // optional: block if high findings > N
  } = body;

  if (!repo_full_name || !github_token) {
    return Response.json({ pass: false, error: "repo_full_name and github_token are required" }, { status: 400 });
  }

  const GH = async (path: string, method = "GET", reqBody?: any) => {
    const res = await fetch(`https://api.github.com${path}`, {
      method,
      headers: { Authorization: `Bearer ${github_token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
      ...(reqBody ? { body: JSON.stringify(reqBody) } : {})
    });
    return res.json();
  };

  const scanResult: any = {
    repo: repo_full_name,
    commit_sha,
    branch,
    scanned_at: new Date().toISOString(),
    pass: true,
    block_reasons: [],
    findings: [],
    summary: { critical: 0, high: 0, medium: 0, low: 0, secrets: 0 },
  };

  try {
    // 1. Get changed files for this PR/commit
    let changedFiles: string[] = [];

    if (pr_number) {
      const prFiles = await GH(`/repos/${repo_full_name}/pulls/${pr_number}/files`);
      changedFiles = (prFiles || []).map((f: any) => f.filename);
    } else if (commit_sha) {
      const commitData = await GH(`/repos/${repo_full_name}/commits/${commit_sha}`);
      changedFiles = (commitData.files || []).map((f: any) => f.filename);
    } else {
      // Fall back to scanning the whole repo
      const tree = await GH(`/repos/${repo_full_name}/git/trees/${branch}?recursive=1`);
      changedFiles = (tree.tree || []).filter((f: any) => f.type === "blob").map((f: any) => f.path).slice(0, 30);
    }

    // 2. Run focused SAST + secrets scan on changed files only
    const CODE_EXTS = [".js",".ts",".py",".php",".java",".go",".rb",".cs",".jsx",".tsx"];
    const SAST_RULES = [
      { id:"CWE-89", name:"SQL Injection", severity:"critical", patterns:[/execute\s*\(\s*["'].*\+/,/f["']SELECT.*{/,/query\s*\+\s*\w/] },
      { id:"CWE-78", name:"Command Injection", severity:"critical", patterns:[/os\.system\(.*\+/,/subprocess\.call\(.*shell=True/] },
      { id:"CWE-259", name:"Hardcoded Credential", severity:"critical", patterns:[/password\s*=\s*["'][^"']{4,}["']/i,/db_pass\s*=\s*["'][^"']{4,}["']/i] },
      { id:"CWE-502", name:"Insecure Deserialization", severity:"critical", patterns:[/pickle\.loads\(/,/yaml\.load\([^,)]*\)/] },
      { id:"CWE-79", name:"XSS", severity:"high", patterns:[/innerHTML\s*=(?!.*DOMPurify)/,/dangerouslySetInnerHTML/] },
      { id:"CWE-22", name:"Path Traversal", severity:"high", patterns:[/readFile\(.*\+/,/path\.join\(.*req\./] },
      { id:"CWE-918", name:"SSRF", severity:"high", patterns:[/requests\.get\(.*req\./,/fetch\(.*req\.query/] },
    ];
    const SECRET_PATTERNS = [
      { name:"AWS Access Key", pattern:/AKIA[0-9A-Z]{16}/, severity:"critical" },
      { name:"Stripe Live Key", pattern:/sk_live_[a-zA-Z0-9]{24,}/, severity:"critical" },
      { name:"GitHub Token", pattern:/ghp_[a-zA-Z0-9]{36}/, severity:"critical" },
      { name:"Private Key", pattern:/-----BEGIN.{1,20}PRIVATE KEY-----/, severity:"critical" },
      { name:"Database URL", pattern:/(mysql|postgres|mongodb):\/\/\w+:\w+@/, severity:"critical" },
    ];

    const codeFiles = changedFiles.filter(f => CODE_EXTS.some(ext => f.endsWith(ext)));

    for (const filePath of codeFiles.slice(0, 20)) {
      try {
        const fileData = await GH(`/repos/${repo_full_name}/contents/${filePath}?ref=${commit_sha || branch}`);
        if (!fileData.content) continue;
        const content = atob(fileData.content.replace(/\n/g, ""));
        const lines = content.split("\n");

        for (const rule of SAST_RULES) {
          for (const pattern of rule.patterns) {
            for (let i = 0; i < lines.length; i++) {
              if (pattern.test(lines[i])) {
                scanResult.findings.push({ type:"sast", rule_id:rule.id, title:rule.name, severity:rule.severity, file:filePath, line:i+1, snippet:lines[i].trim().slice(0,150) });
                scanResult.summary[rule.severity as keyof typeof scanResult.summary]++;
                break;
              }
            }
          }
        }

        for (const rule of SECRET_PATTERNS) {
          for (let i = 0; i < lines.length; i++) {
            if (rule.pattern.test(lines[i])) {
              const t = lines[i].trim();
              if (t.startsWith("//") || t.startsWith("#") || t.includes("example")) continue;
              scanResult.findings.push({ type:"secret", title:rule.name, severity:rule.severity, file:filePath, line:i+1 });
              scanResult.summary.secrets++;
              break;
            }
          }
        }
      } catch (_) {}
    }

    // 3. Determine pass/fail
    const criticalFound = scanResult.summary.critical > 0;
    const highFound = scanResult.summary.high > 0;
    const secretsFound = scanResult.summary.secrets > 0;

    if (block_on.includes("critical") && criticalFound) {
      scanResult.pass = false;
      scanResult.block_reasons.push(`${scanResult.summary.critical} CRITICAL severity finding(s) found`);
    }
    if (block_on.includes("high") && highFound) {
      scanResult.pass = false;
      scanResult.block_reasons.push(`${scanResult.summary.high} HIGH severity finding(s) found`);
    }
    if (fail_on_secrets && secretsFound) {
      scanResult.pass = false;
      scanResult.block_reasons.push(`${scanResult.summary.secrets} secret(s) / credential(s) exposed in code`);
    }
    if (fail_on_high_count && scanResult.findings.length > fail_on_high_count) {
      scanResult.pass = false;
      scanResult.block_reasons.push(`Total findings (${scanResult.findings.length}) exceeds threshold (${fail_on_high_count})`);
    }

    // 4. Post status check to GitHub PR if pr_number provided
    if (pr_number && commit_sha) {
      const statusPayload = {
        state: scanResult.pass ? "success" : "failure",
        target_url: `https://shieldai.app/scan/${repo_full_name}`,
        description: scanResult.pass
          ? `✅ ShieldAI scan passed — ${scanResult.findings.length} findings (no blockers)`
          : `❌ ShieldAI blocked — ${scanResult.block_reasons[0]}`,
        context: "ShieldAI Security Scan",
      };
      await GH(`/repos/${repo_full_name}/statuses/${commit_sha}`, "POST", statusPayload).catch(() => {});
    }

    // 5. Return result with GitHub Actions workflow snippet
    const workflowSnippet = `# Add this to .github/workflows/shieldai.yml
name: ShieldAI Security Scan
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - name: ShieldAI Scan
        run: |
          RESULT=$(curl -s -X POST https://api.base44.com/api/apps/6a14246111a4fa5e22999619/functions/shieldCICDGate \\
            -H "Content-Type: application/json" \\
            -d '{"repo_full_name":"${repo_full_name}","github_token":"${{ secrets.GITHUB_TOKEN }}","commit_sha":"${{ github.sha }}","pr_number":"${{ github.event.pull_request.number }}","branch":"${{ github.ref_name }}","block_on":["critical"],"fail_on_secrets":true}')
          echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if d['pass'] else 1)"`;

    return Response.json({
      ...scanResult,
      total_findings: scanResult.findings.length,
      workflow_snippet: workflowSnippet,
    });

  } catch (error: any) {
    return Response.json({ pass: false, error: error.message }, { status: 500 });
  }
});
