// ShieldAI — Safe Chain Proxy v1
// Install-time malicious package blocking — intercepts npm/pip/yarn installs
// Real: Socket.dev API + npm Registry + OSV.dev + typosquatting detection
// Aikido parity: "Aikido Safe Chain" — prevent malware during install

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });

  const body = await req.json().catch(() => ({}));
  const {
    action,             // check | install_hook | setup | audit_lockfile
    package_name,
    version = "latest",
    ecosystem = "npm",
    packages = [],      // batch check
    lockfile_content,   // package-lock.json or requirements.txt content
    lockfile_type,      // "npm" | "yarn" | "pip" | "pipfile"
  } = body;

  const SOCKET_KEY = Deno.env.get("SOCKET_API_KEY") || "";
  const H = { "Content-Type": "application/json" };

  // ── LEVENSHTEIN for typosquatting detection
  const lev = (a: string, b: string): number => {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    return dp[m][n];
  };

  const POPULAR_NPM = ["react","lodash","express","axios","typescript","webpack","vue","angular","next","jquery","moment","chalk","uuid","dotenv","eslint","prettier","jest","babel","rollup","vite","fastify","koa","hapi","socket.io","mongoose","sequelize","pg","mysql2","redis","jsonwebtoken","bcrypt","cors","helmet","morgan","nodemailer","sharp","multer","cheerio","puppeteer","playwright"];
  const POPULAR_PY  = ["requests","numpy","pandas","flask","django","boto3","cryptography","pydantic","fastapi","sqlalchemy","celery","redis","pillow","matplotlib","scipy","sklearn","torch","tensorflow","transformers","aiohttp","httpx","typer","click","pydantic","pytest","black","mypy"];

  // ── CORE PACKAGE SAFETY CHECK
  const checkPackage = async (pkgName: string, pkgVersion: string, eco: string): Promise<any> => {
    const result: any = {
      package: pkgName, version: pkgVersion, ecosystem: eco,
      safe: true, block: false, issues: [], risk_score: 0,
      checked_at: new Date().toISOString(),
    };

    // 1. TYPOSQUATTING CHECK
    const popular = eco === "npm" ? POPULAR_NPM : POPULAR_PY;
    for (const p of popular) {
      const d = lev(pkgName.toLowerCase(), p.toLowerCase());
      if (d === 1 && pkgName.toLowerCase() !== p.toLowerCase()) {
        result.issues.push({ type: "typosquatting", severity: "critical", block: true, description: `Package '${pkgName}' is 1 character away from popular package '${p}'. HIGH probability of typosquatting attack.`, action: `Did you mean '${p}'? Verify the package name carefully.` });
        result.safe = false; result.block = true; result.risk_score = Math.max(result.risk_score, 95);
      } else if (d === 2 && pkgName.length > 4 && pkgName.toLowerCase() !== p.toLowerCase()) {
        result.issues.push({ type: "typosquatting_possible", severity: "high", block: false, description: `Package '${pkgName}' is 2 characters away from '${p}'. Possible typosquatting.`, action: `Verify this is the correct package.` });
        result.safe = false; result.risk_score = Math.max(result.risk_score, 60);
      }
    }

    // 2. SOCKET.DEV CHECK (real malware intelligence)
    if (SOCKET_KEY && eco === "npm") {
      try {
        const r = await fetch(`https://api.socket.dev/v0/npm/${encodeURIComponent(pkgName)}/${encodeURIComponent(pkgVersion)}/score`, {
          headers: { Authorization: `Bearer ${SOCKET_KEY}` }
        });
        if (r.ok) {
          const d = await r.json();
          for (const issue of (d.issues || [])) {
            const isBlocker = ["malware", "obfuscated-code", "install-scripts", "suspicious-string", "shell-access"].includes(issue.type);
            result.issues.push({ type: issue.type, severity: issue.severity || "high", block: isBlocker, description: issue.description || issue.props?.description || `Socket.dev detected: ${issue.type}`, source: "socket.dev" });
            if (isBlocker) { result.safe = false; result.block = true; result.risk_score = Math.max(result.risk_score, issue.type === "malware" ? 100 : 85); }
            else if (issue.severity === "high" || issue.severity === "critical") { result.safe = false; result.risk_score = Math.max(result.risk_score, 65); }
          }
          if (d.score?.supplyChainRisk !== undefined) {
            const scRisk = (1 - d.score.supplyChainRisk) * 100;
            result.supply_chain_risk = Math.round(scRisk);
            if (scRisk > 70) { result.safe = false; result.risk_score = Math.max(result.risk_score, scRisk); }
          }
        }
      } catch (_) {}
    }

    // 3. NPM REGISTRY METADATA CHECK
    if (eco === "npm") {
      try {
        const r = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkgName)}`);
        if (!r.ok) {
          result.issues.push({ type: "not_found", severity: "critical", block: true, description: `Package '${pkgName}' not found in npm registry. This may be a name-squatting or dependency confusion attack.`, action: "Do not install. Verify the package name and registry." });
          result.safe = false; result.block = true; result.risk_score = 100;
        } else {
          const d = await r.json();
          const latest = d["dist-tags"]?.latest;
          const lv = d.versions?.[latest];
          const scripts = lv?.scripts || {};

          // Install scripts = red flag
          if (scripts.postinstall || scripts.preinstall) {
            const scriptContent = scripts.postinstall || scripts.preinstall;
            const isHighRisk = /curl|wget|bash|sh|python|node -e|eval|exec|fetch|download/i.test(scriptContent);
            result.issues.push({
              type: "install_script",
              severity: isHighRisk ? "critical" : "high",
              block: isHighRisk,
              description: `Package has ${scripts.postinstall ? "postinstall" : "preinstall"} script: "${scriptContent?.slice(0, 150)}"`,
              action: isHighRisk ? "BLOCKED: Install script downloads/executes code. This is a common malware vector." : "Review this install script carefully before proceeding.",
              source: "npm-registry",
            });
            if (isHighRisk) { result.safe = false; result.block = true; result.risk_score = Math.max(result.risk_score, 95); }
            else { result.safe = false; result.risk_score = Math.max(result.risk_score, 60); }
          }

          // Freshly published + very few versions = suspicious
          const vc = Object.keys(d.versions || {}).length;
          const created = d.time?.created;
          const hrs = created ? (Date.now() - new Date(created).getTime()) / 3600000 : Infinity;
          if (vc <= 2 && hrs < 48) {
            result.issues.push({ type: "newly_published", severity: "medium", block: false, description: `Package published only ${Math.round(hrs)}h ago with ${vc} version(s). Insufficient community vetting.`, source: "npm-registry" });
            result.risk_score = Math.max(result.risk_score, 40);
          }

          // No source repository = suspicious
          if (!d.homepage && !d.repository && vc < 5) {
            result.issues.push({ type: "no_source_repo", severity: "medium", block: false, description: "Package has no linked source repository. Cannot verify code authenticity.", source: "npm-registry" });
            result.risk_score = Math.max(result.risk_score, 35);
          }

          result.metadata = { latest_version: latest, version_count: vc, author: d.author?.name || d.maintainers?.[0]?.name || "unknown", created, last_published: d.time?.modified };
        }
      } catch (_) {}
    }

    // 4. PyPI CHECK
    if (eco === "PyPI" || eco === "pip") {
      try {
        const r = await fetch(`https://pypi.org/pypi/${encodeURIComponent(pkgName)}/json`);
        if (!r.ok) {
          result.issues.push({ type: "not_found", severity: "critical", block: true, description: `Package '${pkgName}' not found on PyPI.` });
          result.safe = false; result.block = true; result.risk_score = 100;
        } else {
          const d = await r.json();
          const info = d.info || {};
          if (!info.home_page && !info.project_urls?.Source) {
            result.issues.push({ type: "no_source_repo", severity: "medium", block: false, description: "PyPI package has no source repository link." });
            result.risk_score = Math.max(result.risk_score, 30);
          }
          result.metadata = { latest_version: info.version, author: info.author, license: info.license };
        }
      } catch (_) {}
    }

    // 5. OSV.DEV CVE CHECK
    try {
      const r = await fetch("https://api.osv.dev/v1/query", {
        method: "POST", headers: H,
        body: JSON.stringify({ package: { name: pkgName, ecosystem: eco === "pip" ? "PyPI" : eco }, version: pkgVersion === "latest" ? undefined : pkgVersion }),
      });
      if (r.ok) {
        const d = await r.json();
        for (const v of (d.vulns || []).slice(0, 3)) {
          const cve = v.aliases?.find((a: string) => a.startsWith("CVE-")) || v.id;
          const fix = v.affected?.[0]?.ranges?.[0]?.events?.find((e: any) => e.fixed)?.fixed;
          const score = parseFloat(v.severity?.[0]?.score || "5.0");
          const sev = score >= 9 ? "critical" : score >= 7 ? "high" : "medium";
          result.issues.push({ type: "cve", severity: sev, block: false, cve_id: cve, description: `${cve} (CVSS ${score}): ${v.summary?.slice(0, 150)}`, fix_version: fix, source: "osv.dev" });
          if (sev === "critical") { result.safe = false; result.risk_score = Math.max(result.risk_score, 80); }
          else if (sev === "high") { result.safe = false; result.risk_score = Math.max(result.risk_score, 65); }
        }
      }
    } catch (_) {}

    result.verdict = result.block ? "🛑 BLOCKED" : result.safe ? "✅ SAFE" : "⚠️ RISKY";
    return result;
  };

  // ── ACTION: CHECK — single or batch
  if (action === "check") {
    const list = packages.length > 0 ? packages : (package_name ? [{ name: package_name, version, ecosystem }] : []);
    if (!list.length) return Response.json({ error: "package_name or packages[] required" }, { status: 400 });

    const results = await Promise.all(list.map((p: any) => checkPackage(p.name || p, p.version || "latest", p.ecosystem || ecosystem)));
    const blocked = results.filter((r: any) => r.block);
    const risky = results.filter((r: any) => !r.block && !r.safe);

    return Response.json({
      success: true,
      safe_to_install: blocked.length === 0,
      total: results.length,
      blocked: blocked.length,
      risky: risky.length,
      safe: results.filter((r: any) => r.safe).length,
      results,
      data_sources: [SOCKET_KEY ? "Socket.dev" : null, "npm Registry", "PyPI", "OSV.dev", "Typosquatting Detection"].filter(Boolean),
      checked_at: new Date().toISOString(),
    });
  }

  // ── ACTION: AUDIT_LOCKFILE — scan package-lock.json or requirements.txt
  if (action === "audit_lockfile" && lockfile_content) {
    const pkgsToCheck: any[] = [];

    if (lockfile_type === "npm" || lockfile_type === "yarn") {
      try {
        const lock = JSON.parse(lockfile_content);
        const deps = lock.packages || lock.dependencies || {};
        for (const [name, info] of Object.entries(deps as Record<string, any>)) {
          const cleanName = name.replace(/^node_modules\//, "");
          if (!cleanName || cleanName.includes("/") || cleanName.startsWith("@types")) continue;
          pkgsToCheck.push({ name: cleanName, version: info.version || info.resolved?.match(/-(\d+\.\d+\.\d+)\.tgz/)?.[1] || "latest", ecosystem: "npm" });
        }
      } catch (_) {}
    } else if (lockfile_type === "pip" || lockfile_type === "pipfile") {
      const lines = lockfile_content.split("\n").filter((l: string) => l && !l.startsWith("#") && !l.startsWith("["));
      for (const line of lines) {
        const [name, version] = line.split(/[==>=<]+/);
        if (name?.trim()) pkgsToCheck.push({ name: name.trim(), version: version?.trim() || "latest", ecosystem: "PyPI" });
      }
    }

    const sample = pkgsToCheck.slice(0, 30); // Check first 30 packages
    const results = await Promise.all(sample.map((p: any) => checkPackage(p.name, p.version, p.ecosystem)));
    const blocked = results.filter((r: any) => r.block);
    const risky = results.filter((r: any) => !r.block && !r.safe);

    return Response.json({
      success: true,
      total_in_lockfile: pkgsToCheck.length,
      checked: sample.length,
      blocked: blocked.length,
      risky: risky.length,
      safe: results.filter((r: any) => r.safe).length,
      safe_to_deploy: blocked.length === 0,
      blocked_packages: blocked.map((r: any) => ({ package: r.package, version: r.version, reason: r.issues[0]?.description })),
      risky_packages: risky.map((r: any) => ({ package: r.package, version: r.version, issues: r.issues.length })),
      all_results: results,
      data_sources: [SOCKET_KEY ? "Socket.dev" : null, "npm Registry", "PyPI", "OSV.dev"].filter(Boolean),
    });
  }

  // ── ACTION: SETUP — return shell hook instructions
  if (action === "setup") {
    const endpoint = `https://app.base44.com/api/apps/${APP_ID}/functions/shieldSafeChain`;
    return Response.json({
      success: true,
      setup_instructions: {
        npm_hook: {
          description: "Add to .npmrc in project root or ~/.npmrc globally",
          config: `# ShieldAI Safe Chain — pre-install hook
# Add this script to your package.json:
# "preinstall": "npx @shieldai/safe-chain check $npm_package_name"`,
          github_actions: `# Add to .github/workflows:
- name: Safe Chain Audit
  run: |
    curl -s -X POST ${endpoint} \\
      -H "Content-Type: application/json" \\
      -d '{"action":"audit_lockfile","lockfile_type":"npm","lockfile_content":"'$(cat package-lock.json | jq -c .)'"}' | \\
      python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if d['safe_to_deploy'] else 1)"`,
        },
        pip_hook: {
          description: "Add to CI pipeline before pip install",
          command: `# Before pip install, check all requirements:
curl -s -X POST ${endpoint} \\
  -H "Content-Type: application/json" \\
  -d '{"action":"audit_lockfile","lockfile_type":"pip","lockfile_content":"'$(cat requirements.txt)'"}' | \\
  python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if d['safe_to_deploy'] else 1)"`,
        },
        pre_commit_hook: `#!/bin/bash
# .git/hooks/pre-commit — blocks commits if unsafe packages detected
if [ -f package-lock.json ]; then
  RESULT=$(curl -s -X POST ${endpoint} -H "Content-Type: application/json" \\
    -d "{\\"action\\":\\"audit_lockfile\\",\\"lockfile_type\\":\\"npm\\",\\"lockfile_content\\":$(cat package-lock.json | jq -c .)}")
  SAFE=$(echo $RESULT | python3 -c "import json,sys; print(json.load(sys.stdin)['safe_to_deploy'])")
  if [ "$SAFE" != "True" ]; then
    echo "🛑 ShieldAI Safe Chain: Malicious packages detected! Commit blocked."
    echo $RESULT | python3 -c "import json,sys; d=json.load(sys.stdin); [print(f'  BLOCKED: {p[\"package\"]} — {p[\"reason\"]}') for p in d.get('blocked_packages',[])]"
    exit 1
  fi
fi`,
      },
    });
  }

  return Response.json({ error: "Unknown action: check | audit_lockfile | setup" }, { status: 400 });
});
