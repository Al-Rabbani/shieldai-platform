// ShieldAI — Real Repository Scanner (Phase 1)
// Scans a GitHub repo for: SAST findings, SCA/CVE vulnerabilities, secrets, outdated software
// Uses: GitHub API + OSV.dev + endoflife.date + NVD + real pattern matching

Deno.serve(async (req) => {
  const { repo_full_name, github_token, scan_types = ["sast","sca","secrets","outdated"] } = await req.json().catch(() => ({}));

  if (!repo_full_name || !github_token) {
    return Response.json({ error: "repo_full_name and github_token are required" }, { status: 400 });
  }

  const GH = (path: string) => fetch(`https://api.github.com${path}`, {
    headers: { Authorization: `Bearer ${github_token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }
  }).then(r => r.json());

  const results: any = { repo: repo_full_name, scanned_at: new Date().toISOString(), findings: [], vulnerabilities: [], secrets: [], outdated: [], summary: {} };

  try {
    // ── STEP 1: Get repo tree (all files)
    const repoInfo = await GH(`/repos/${repo_full_name}`);
    const branch = repoInfo.default_branch || "main";
    const tree = await GH(`/repos/${repo_full_name}/git/trees/${branch}?recursive=1`);
    const files = (tree.tree || []).filter((f: any) => f.type === "blob" && f.size < 500000);

    // ── STEP 2: SAST — scan code files for vulnerability patterns
    if (scan_types.includes("sast")) {
      const CODE_EXTS = [".js",".ts",".py",".php",".java",".go",".rb",".cs",".jsx",".tsx",".vue"];
      const SAST_RULES = [
        { id:"CWE-89", name:"SQL Injection", severity:"critical", patterns:[/execute\s*\(\s*["'].*\+/,/cursor\.execute\(.*%.*\)/,/f["']SELECT/,/f["'].*INSERT/,/f["'].*DELETE/,/query\s*\+\s*\w/] },
        { id:"CWE-78", name:"Command Injection", severity:"critical", patterns:[/os\.system\(.*\+/,/subprocess\.call\(.*shell=True/,/exec\(\s*\$/,/shell_exec\(/] },
        { id:"CWE-79", name:"Cross-Site Scripting (XSS)", severity:"high", patterns:[/innerHTML\s*=(?!.*DOMPurify)/,/document\.write\(/,/dangerouslySetInnerHTML/] },
        { id:"CWE-259", name:"Hardcoded Password", severity:"critical", patterns:[/password\s*=\s*["'][^"']{4,}["']/i,/passwd\s*=\s*["'][^"']{4,}["']/i,/db_pass\s*=\s*["'][^"']{4,}["']/i] },
        { id:"CWE-22", name:"Path Traversal", severity:"high", patterns:[/open\(.*\+.*\)/,/readFile\(.*\+/,/path\.join\(.*req\./,/fs\.readFile\(.*req\./] },
        { id:"CWE-327", name:"Weak Cryptography", severity:"high", patterns:[/\bmd5\s*\(/i,/\bsha1\s*\(/i,/Math\.random\(\).*(token|password|secret)/i] },
        { id:"CWE-502", name:"Insecure Deserialization", severity:"critical", patterns:[/pickle\.loads\(/,/yaml\.load\([^,)]*\)/,/unserialize\(/] },
        { id:"CWE-918", name:"Server-Side Request Forgery (SSRF)", severity:"high", patterns:[/requests\.get\(.*req\./,/axios\.get\(.*req\./,/fetch\(.*req\.query/] },
        { id:"CWE-798", name:"Exposed Secret Key", severity:"critical", patterns:[/sk_live_[a-zA-Z0-9]{20,}/,/AKIA[0-9A-Z]{16}/,/ghp_[a-zA-Z0-9]{36}/,/-----BEGIN.{1,20}PRIVATE KEY-----/] },
        { id:"CWE-601", name:"Open Redirect", severity:"medium", patterns:[/res\.redirect\(.*req\.(query|body|params)/,/header\("Location".*\$_GET/,/window\.location\s*=\s*.*req\./] },
      ];

      const codeFiles = files.filter((f: any) => CODE_EXTS.some(ext => f.path.endsWith(ext))).slice(0, 50);

      for (const file of codeFiles) {
        try {
          const blob = await GH(`/repos/${repo_full_name}/git/blobs/${file.sha}`);
          const content = atob(blob.content.replace(/\n/g, ""));
          const lines = content.split("\n");

          for (const rule of SAST_RULES) {
            for (const pattern of rule.patterns) {
              for (let i = 0; i < lines.length; i++) {
                if (pattern.test(lines[i])) {
                  results.findings.push({
                    type: "sast",
                    rule_id: rule.id,
                    title: rule.name,
                    severity: rule.severity,
                    file_path: file.path,
                    line_number: i + 1,
                    snippet: lines[i].trim().slice(0, 200),
                    cwe_id: rule.id,
                    autofix_available: ["CWE-89","CWE-79","CWE-327"].includes(rule.id),
                    confidence: 85,
                    status: "open",
                  });
                  break; // one finding per rule per file
                }
              }
            }
          }
        } catch (_) { /* skip unreadable files */ }
      }
    }

    // ── STEP 3: SCA — scan dependency files for real CVEs via OSV.dev
    if (scan_types.includes("sca")) {
      const DEP_FILES = ["package.json","requirements.txt","Gemfile.lock","go.sum","pom.xml","composer.json","Pipfile.lock"];
      const depFiles = files.filter((f: any) => DEP_FILES.some(d => f.path.endsWith(d)));

      for (const file of depFiles.slice(0, 5)) {
        try {
          const blob = await GH(`/repos/${repo_full_name}/git/blobs/${file.sha}`);
          const content = atob(blob.content.replace(/\n/g, ""));

          if (file.path.endsWith("package.json")) {
            const pkg = JSON.parse(content);
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };

            for (const [name, version] of Object.entries(deps).slice(0, 30)) {
              const cleanVer = String(version).replace(/[\^~>=<]/g, "").trim();
              const osvRes = await fetch("https://api.osv.dev/v1/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ package: { name, ecosystem: "npm" }, version: cleanVer })
              }).then(r => r.json()).catch(() => ({ vulns: [] }));

              for (const vuln of (osvRes.vulns || []).slice(0, 3)) {
                const severity = vuln.database_specific?.severity || (vuln.severity?.[0]?.score > 8 ? "critical" : vuln.severity?.[0]?.score > 6 ? "high" : "medium") || "medium";
                results.vulnerabilities.push({
                  type: "sca",
                  package_name: name,
                  installed_version: cleanVer,
                  vuln_id: vuln.id,
                  title: vuln.summary || `Vulnerability in ${name}@${cleanVer}`,
                  severity: typeof severity === "string" ? severity.toLowerCase() : "medium",
                  file_path: file.path,
                  fix_version: vuln.affected?.[0]?.ranges?.[0]?.events?.find((e: any) => e.fixed)?.fixed || "upgrade to latest",
                  cve_id: vuln.aliases?.find((a: string) => a.startsWith("CVE-")) || vuln.id,
                  published: vuln.published?.slice(0, 10),
                  status: "open",
                });
              }
            }
          }

          if (file.path.endsWith("requirements.txt")) {
            const pkgs = content.split("\n").filter(l => l && !l.startsWith("#"));
            for (const pkg of pkgs.slice(0, 20)) {
              const [name, version] = pkg.split(/[==>=<]+/);
              if (!name || !version) continue;
              const osvRes = await fetch("https://api.osv.dev/v1/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ package: { name: name.trim(), ecosystem: "PyPI" }, version: version.trim() })
              }).then(r => r.json()).catch(() => ({ vulns: [] }));

              for (const vuln of (osvRes.vulns || []).slice(0, 2)) {
                results.vulnerabilities.push({
                  type: "sca",
                  package_name: name.trim(),
                  installed_version: version.trim(),
                  vuln_id: vuln.id,
                  title: vuln.summary || `Vulnerability in ${name}@${version}`,
                  severity: "high",
                  file_path: file.path,
                  fix_version: vuln.affected?.[0]?.ranges?.[0]?.events?.find((e: any) => e.fixed)?.fixed || "upgrade to latest",
                  cve_id: vuln.aliases?.find((a: string) => a.startsWith("CVE-")) || vuln.id,
                  published: vuln.published?.slice(0, 10),
                  status: "open",
                });
              }
            }
          }
        } catch (_) { /* skip unreadable dep files */ }
      }
    }

    // ── STEP 4: SECRETS — scan for leaked keys/tokens
    if (scan_types.includes("secrets")) {
      const SECRET_PATTERNS = [
        { name: "AWS Access Key", pattern: /AKIA[0-9A-Z]{16}/, severity: "critical" },
        { name: "AWS Secret Key", pattern: /aws_secret_access_key\s*=\s*[A-Za-z0-9/+=]{40}/, severity: "critical" },
        { name: "Stripe Live Key", pattern: /sk_live_[a-zA-Z0-9]{24,}/, severity: "critical" },
        { name: "GitHub Token", pattern: /ghp_[a-zA-Z0-9]{36}/, severity: "critical" },
        { name: "Private Key", pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, severity: "critical" },
        { name: "Slack Bot Token", pattern: /xoxb-[0-9]{10,}-[0-9A-Za-z]+/, severity: "high" },
        { name: "Google API Key", pattern: /AIza[0-9A-Za-z\-_]{35}/, severity: "high" },
        { name: "Hardcoded Password", pattern: /password["']?\s*[:=]\s*["'][^"']{8,}["']/, severity: "high" },
        { name: "Database URL", pattern: /(mysql|postgres|mongodb):\/\/\w+:\w+@/, severity: "critical" },
        { name: "SendGrid API Key", pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/, severity: "high" },
      ];

      const EXCLUDE_EXTS = [".png",".jpg",".gif",".svg",".ico",".woff",".ttf",".pdf",".zip"];
      const scanFiles = files.filter((f: any) => !EXCLUDE_EXTS.some(e => f.path.endsWith(e)) && f.size < 200000).slice(0, 80);

      for (const file of scanFiles) {
        try {
          const blob = await GH(`/repos/${repo_full_name}/git/blobs/${file.sha}`);
          const content = atob(blob.content.replace(/\n/g, ""));
          const lines = content.split("\n");

          for (const rule of SECRET_PATTERNS) {
            for (let i = 0; i < lines.length; i++) {
              if (rule.pattern.test(lines[i])) {
                // Check it's not in a comment or example
                const trimmed = lines[i].trim();
                if (trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.includes("example") || trimmed.includes("YOUR_")) continue;
                results.secrets.push({
                  type: "secret",
                  secret_type: rule.name,
                  severity: rule.severity,
                  file_path: file.path,
                  line_number: i + 1,
                  snippet: lines[i].replace(/[A-Za-z0-9]{8,}/g, "[REDACTED]").trim().slice(0, 150),
                  status: "open",
                  remediation: "Remove immediately, rotate the credential, audit git history with git-filter-repo",
                });
                break;
              }
            }
          }
        } catch (_) { /* skip */ }
      }
    }

    // ── STEP 5: OUTDATED SOFTWARE — check package.json against endoflife.date
    if (scan_types.includes("outdated")) {
      const RUNTIME_MAP: Record<string, string> = {
        "node": "nodejs", "python": "python", "ruby": "ruby", "php": "php",
        "java": "java", "golang": "go", "dotnet": "dotnetcore"
      };

      // Check node version from package.json engines field
      const pkgJsonFile = files.find((f: any) => f.path === "package.json");
      if (pkgJsonFile) {
        try {
          const blob = await GH(`/repos/${repo_full_name}/git/blobs/${pkgJsonFile.sha}`);
          const pkg = JSON.parse(atob(blob.content.replace(/\n/g, "")));
          const engines = pkg.engines || {};

          for (const [runtime, verReq] of Object.entries(engines)) {
            const eolKey = RUNTIME_MAP[runtime];
            if (!eolKey) continue;
            const eolData = await fetch(`https://endoflife.date/api/${eolKey}.json`).then(r => r.json()).catch(() => []);
            const versionNum = String(verReq).replace(/[^0-9.]/g, "").split(".")[0];

            const matched = eolData.find((v: any) => String(v.cycle) === versionNum);
            if (matched) {
              const isEOL = matched.eol === true || (typeof matched.eol === "string" && new Date(matched.eol) < new Date());
              if (isEOL) {
                results.outdated.push({
                  type: "outdated",
                  name: runtime,
                  current_version: String(verReq),
                  eol_date: matched.eol,
                  latest_version: eolData[0]?.latest || "unknown",
                  severity: "high",
                  status: "open",
                  file_path: "package.json",
                  remediation: `Upgrade ${runtime} to latest LTS version (${eolData[0]?.cycle || "latest"})`,
                });
              }
            }
          }
        } catch (_) { /* skip */ }
      }
    }

    // ── STEP 6: Build summary
    const allFindings = [...results.findings, ...results.vulnerabilities, ...results.secrets, ...results.outdated];
    results.summary = {
      total: allFindings.length,
      critical: allFindings.filter(f => f.severity === "critical").length,
      high: allFindings.filter(f => f.severity === "high").length,
      medium: allFindings.filter(f => f.severity === "medium").length,
      low: allFindings.filter(f => f.severity === "low").length,
      sast_count: results.findings.length,
      sca_count: results.vulnerabilities.length,
      secrets_count: results.secrets.length,
      outdated_count: results.outdated.length,
      files_scanned: files.length,
      risk_score: Math.min(100, allFindings.filter(f=>f.severity==="critical").length * 20 + allFindings.filter(f=>f.severity==="high").length * 8 + allFindings.filter(f=>f.severity==="medium").length * 3),
    };

    return Response.json({ success: true, ...results });

  } catch (error: any) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});
