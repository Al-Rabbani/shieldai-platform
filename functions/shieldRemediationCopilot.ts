// ShieldAI — AI Remediation Copilot v1
// Stage 18: AI-powered contextual remediation advice per finding
// - Generates step-by-step fix instructions per vulnerability type
// - Context-aware: reads finding + asset + tech stack
// - Produces: fix plan, code snippets, verification steps, effort estimate
// - Integrates with AutoFix for one-click PR creation
// - No external LLM API needed — deterministic knowledge base + pattern engine

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" };

// ── REMEDIATION KNOWLEDGE BASE
// Deep remediation playbooks per vulnerability class
const REMEDIATION_PLAYBOOKS: Record<string, any> = {
  // ── SCA / Dependency vulnerabilities
  "cve_dependency": {
    effort: "low", time_estimate: "15-30 minutes",
    category: "Software Composition Analysis",
    steps: (f: any) => [
      { step: 1, action: "Identify the vulnerable package", command: f.package ? `# Check current version\nnpm list ${f.package}\n# or\npip show ${f.package}` : "npm audit --json | jq '.vulnerabilities'", explanation: "Confirm the package is actually installed and in use" },
      { step: 2, action: `Upgrade to fixed version ${f.fixed_version || "latest"}`, command: f.package ? (f.ecosystem?.includes("PyPI") ? `pip install "${f.package}>=${f.fixed_version || "latest"}"` : `npm install ${f.package}@${f.fixed_version || "latest"}`) : "npm audit fix", explanation: `Version ${f.fixed_version || "latest"} contains the security patch` },
      { step: 3, action: "Run tests to verify nothing broke", command: "npm test\n# or\npytest\n# or\ngo test ./...", explanation: "Ensure the upgrade doesn't introduce breaking changes" },
      { step: 4, action: "Verify the vulnerability is resolved", command: `npm audit\n# Should show 0 vulnerabilities for ${f.package || "this package"}`, explanation: "Confirm the CVE is no longer flagged" },
      { step: 5, action: "Commit and push", command: `git add package.json package-lock.json\ngit commit -m "fix(deps): upgrade ${f.package || "dependency"} to fix ${f.cve_id || "security vulnerability"}"\ngit push`, explanation: "Deploy the fix through your normal CI/CD pipeline" },
    ],
    code_snippet: (f: any) => f.package ? `// package.json — change this:\n"${f.package}": "^${(f.version || "old-version")}"\n\n// To this:\n"${f.package}": "^${f.fixed_version || "latest"}"` : null,
    verification: (f: any) => `After deploying, re-scan with: POST /api/shieldScanRepo — the finding for ${f.cve_id || "this CVE"} should no longer appear.`,
    autofix_available: true,
  },

  // ── Container / Docker misconfigs
  "container_root": {
    effort: "low", time_estimate: "10-20 minutes",
    category: "Container Security",
    steps: (_f: any) => [
      { step: 1, action: "Open your Dockerfile", command: "cat Dockerfile", explanation: "Identify the base image and current USER directive" },
      { step: 2, action: "Add a non-root user", command: `# Add after your FROM statement:\nRUN groupadd -r appuser && useradd -r -g appuser appuser\n# Or for Alpine:\nRUN addgroup -S appgroup && adduser -S appuser -G appgroup`, explanation: "Create a dedicated non-root user for the application" },
      { step: 3, action: "Set file ownership", command: `# Before the USER directive:\nRUN chown -R appuser:appuser /app`, explanation: "Ensure the app directory is owned by the new user" },
      { step: 4, action: "Switch to non-root user", command: `# At the end of your Dockerfile:\nUSER appuser`, explanation: "All subsequent commands and the container runtime will use this user" },
      { step: 5, action: "Rebuild and test", command: `docker build -t myapp .\ndocker run --rm myapp whoami\n# Should output: appuser`, explanation: "Verify the container runs as non-root" },
    ],
    code_snippet: (_f: any) => `# Dockerfile — Add these lines:\nFROM node:18-alpine\n\n# Create non-root user\nRUN addgroup -S appgroup && adduser -S appuser -G appgroup\n\nWORKDIR /app\nCOPY --chown=appuser:appgroup . .\nRUN npm ci --production\n\n# Switch to non-root\nUSER appuser\n\nCMD ["node", "server.js"]`,
    verification: "Re-scan the container image with POST /api/shieldScanContainer — 'Running as root' finding should be resolved.",
    autofix_available: true,
  },

  // ── Cloud misconfigurations
  "s3_public_access": {
    effort: "low", time_estimate: "5-10 minutes",
    category: "Cloud Security",
    steps: (_f: any) => [
      { step: 1, action: "Open S3 Bucket settings", command: `aws s3api get-bucket-acl --bucket YOUR_BUCKET_NAME\naws s3api get-bucket-policy-status --bucket YOUR_BUCKET_NAME`, explanation: "Check current ACL and public access settings" },
      { step: 2, action: "Block all public access", command: `aws s3api put-public-access-block \\\n  --bucket YOUR_BUCKET_NAME \\\n  --public-access-block-configuration \\\n  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"`, explanation: "Enable all 4 public access block settings" },
      { step: 3, action: "Remove any public bucket policy", command: `aws s3api delete-bucket-policy --bucket YOUR_BUCKET_NAME\n# Only if the policy grants public access`, explanation: "Ensure no bucket policy grants s3:GetObject to '*'" },
      { step: 4, action: "Verify access is blocked", command: `aws s3api get-public-access-block --bucket YOUR_BUCKET_NAME`, explanation: "All 4 settings should show true" },
    ],
    code_snippet: (_f: any) => `# Terraform — Add to your aws_s3_bucket resource:\nresource "aws_s3_bucket_public_access_block" "example" {\n  bucket = aws_s3_bucket.example.id\n  block_public_acls       = true\n  block_public_policy     = true\n  ignore_public_acls      = true\n  restrict_public_buckets = true\n}`,
    verification: "Re-scan with POST /api/shieldScanAWS — public S3 finding should be resolved.",
    autofix_available: false,
  },

  // ── IAM misconfigs
  "iam_mfa_not_enforced": {
    effort: "low", time_estimate: "10-15 minutes",
    category: "Identity & Access Management",
    steps: (_f: any) => [
      { step: 1, action: "List IAM users without MFA", command: `aws iam list-users --query 'Users[*].UserName' --output text | \\\nxargs -I {} sh -c 'echo -n "{}: "; aws iam list-mfa-devices --user-name {} --query length(MFADevices)'`, explanation: "Find which users have MFA disabled" },
      { step: 2, action: "Enforce MFA via IAM policy", command: `# Attach this policy to all users/groups:\n{\n  "Effect": "Deny",\n  "NotAction": ["iam:CreateVirtualMFADevice","iam:EnableMFADevice","sts:GetSessionToken"],\n  "Resource": "*",\n  "Condition": {"BoolIfExists": {"aws:MultiFactorAuthPresent": "false"}}\n}`, explanation: "This policy blocks all actions if MFA is not active" },
      { step: 3, action: "Notify users to enroll MFA", command: "# Direct users to: AWS Console → My Security Credentials → MFA", explanation: "Give users 24-48 hours to enroll before enforcing" },
    ],
    code_snippet: (_f: any) => `# Terraform — IAM Policy to enforce MFA:\nresource "aws_iam_policy" "enforce_mfa" {\n  name = "EnforceMFA"\n  policy = jsonencode({\n    Version = "2012-10-17"\n    Statement = [{\n      Sid    = "DenyWithoutMFA"\n      Effect = "Deny"\n      NotAction = ["iam:CreateVirtualMFADevice", "iam:EnableMFADevice", "sts:GetSessionToken"]\n      Resource = "*"\n      Condition = { BoolIfExists = { "aws:MultiFactorAuthPresent" = "false" } }\n    }]\n  })\n}`,
    verification: "Re-scan CIEM with POST /api/shieldCIEM — MFA finding should resolve once all users have enrolled.",
    autofix_available: false,
  },

  // ── K8s misconfigs
  "k8s_rbac_cluster_admin": {
    effort: "medium", time_estimate: "30-60 minutes",
    category: "Kubernetes Security",
    steps: (_f: any) => [
      { step: 1, action: "List cluster-admin bindings", command: `kubectl get clusterrolebindings -o json | \\\njq '.items[] | select(.roleRef.name=="cluster-admin") | .subjects'`, explanation: "Identify all subjects with cluster-admin access" },
      { step: 2, action: "Create a least-privilege role", command: `# Create a minimal role for your use case:\nkubectl create role app-role \\\n  --verb=get,list,watch \\\n  --resource=pods,services \\\n  --namespace=default`, explanation: "Define only the permissions actually needed" },
      { step: 3, action: "Create a RoleBinding instead", command: `kubectl create rolebinding app-binding \\\n  --role=app-role \\\n  --serviceaccount=default:my-serviceaccount \\\n  --namespace=default`, explanation: "Bind the minimal role to the service account" },
      { step: 4, action: "Remove the cluster-admin binding", command: `kubectl delete clusterrolebinding BINDING_NAME`, explanation: "Remove the overprivileged binding after the new one is in place" },
    ],
    code_snippet: (_f: any) => `# k8s manifest — Least privilege role:\napiVersion: rbac.authorization.k8s.io/v1\nkind: Role\nmetadata:\n  name: app-minimal-role\n  namespace: default\nrules:\n- apiGroups: [""]\n  resources: ["pods", "services"]\n  verbs: ["get", "list", "watch"]\n---\napiVersion: rbac.authorization.k8s.io/v1\nkind: RoleBinding\nmetadata:\n  name: app-minimal-binding\n  namespace: default\nroleRef:\n  apiGroup: rbac.authorization.k8s.io\n  kind: Role\n  name: app-minimal-role\nsubjects:\n- kind: ServiceAccount\n  name: my-serviceaccount\n  namespace: default`,
    verification: "Re-scan K8s with POST /api/shieldScanK8s — cluster-admin finding should be resolved.",
    autofix_available: false,
  },

  // ── XSS
  "xss": {
    effort: "medium", time_estimate: "1-2 hours",
    category: "Web Application Security",
    steps: (f: any) => [
      { step: 1, action: "Locate the vulnerable endpoint", command: `# Endpoint: ${f.endpoint || "see finding details"}\n# Parameter: ${f.parameter || "see finding details"}`, explanation: "Identify where user input is being rendered without sanitisation" },
      { step: 2, action: "Implement output encoding", command: `// JavaScript — use DOMPurify:\nimport DOMPurify from 'dompurify';\nconst clean = DOMPurify.sanitize(userInput);\ndocument.getElementById('output').innerHTML = clean;\n\n// Or better — avoid innerHTML entirely:\ndocument.getElementById('output').textContent = userInput;`, explanation: "Encode all user-controlled data before rendering in HTML" },
      { step: 3, action: "Add Content Security Policy header", command: `# Add to your web server config:\nContent-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none';`, explanation: "CSP prevents execution of injected scripts even if encoding is missed" },
      { step: 4, action: "Validate input server-side", command: `// Node.js — strip HTML tags server-side:\nconst { JSDOM } = require('jsdom');\nconst dom = new JSDOM('');\nconst clean = dom.window.DOMParser ? input.replace(/<[^>]*>/g, '') : input;`, explanation: "Never trust client-side validation alone" },
    ],
    code_snippet: (_f: any) => `// React — Safe rendering (never use dangerouslySetInnerHTML with user input):\n// ❌ VULNERABLE:\n<div dangerouslySetInnerHTML={{ __html: userInput }} />\n\n// ✅ SAFE:\n<div>{userInput}</div>\n\n// If you need HTML rendering:\nimport DOMPurify from 'dompurify';\n<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />`,
    verification: "Re-run DAST scan with POST /api/shieldDASTScan — XSS finding should not appear after fix.",
    autofix_available: false,
  },

  // ── SQL Injection
  "sqli": {
    effort: "medium", time_estimate: "1-3 hours",
    category: "Web Application Security",
    steps: (f: any) => [
      { step: 1, action: "Locate the vulnerable query", command: `# Endpoint: ${f.endpoint || "see finding details"}\n# Parameter: ${f.parameter || "see finding details"}`, explanation: "Find where SQL queries are constructed using string concatenation with user input" },
      { step: 2, action: "Replace with parameterised queries", command: `// Node.js (pg/mysql2):\n// ❌ VULNERABLE:\ndb.query('SELECT * FROM users WHERE id = ' + userId);\n\n// ✅ SAFE — Parameterised:\ndb.query('SELECT * FROM users WHERE id = $1', [userId]);\n\n// Python (psycopg2):\n# ❌ VULNERABLE:\ncursor.execute(f"SELECT * FROM users WHERE id = {user_id}")\n\n# ✅ SAFE:\ncursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))`, explanation: "Parameterised queries prevent the database from treating user input as SQL code" },
      { step: 3, action: "Use an ORM if available", command: `// Prisma (Node.js):\nconst user = await prisma.user.findUnique({ where: { id: userId } });\n// SQLAlchemy (Python):\nuser = session.query(User).filter(User.id == user_id).first()`, explanation: "ORMs use parameterised queries automatically" },
    ],
    code_snippet: (_f: any) => `// Before (VULNERABLE):\nasync function getUser(id) {\n  return db.query('SELECT * FROM users WHERE id = ' + id);\n}\n\n// After (SAFE — parameterised):\nasync function getUser(id) {\n  return db.query('SELECT * FROM users WHERE id = $1', [id]);\n}`,
    verification: "Re-run DAST scan — SQL injection finding should not appear after parameterised queries are in place.",
    autofix_available: false,
  },

  // ── Secrets in code
  "hardcoded_secret": {
    effort: "medium", time_estimate: "30-60 minutes",
    category: "Secrets Management",
    steps: (_f: any) => [
      { step: 1, action: "Rotate the exposed secret IMMEDIATELY", command: `# Do this first — assume the secret is already compromised:\n# AWS: aws iam create-access-key && aws iam delete-access-key --access-key-id OLD_KEY\n# GitHub: Settings → Developer settings → Tokens → Regenerate\n# Stripe: Dashboard → API Keys → Roll key`, explanation: "The secret has been in code history and must be considered compromised" },
      { step: 2, action: "Remove from code and use environment variables", command: `// ❌ NEVER:\nconst apiKey = "sk-abc123def456";\n\n// ✅ SAFE:\nconst apiKey = process.env.API_KEY;\n\n# .env file (add to .gitignore):\nAPI_KEY=sk-abc123def456`, explanation: "Secrets should never be hardcoded — use env vars or a secrets manager" },
      { step: 3, action: "Remove from git history", command: `# Install BFG Repo Cleaner:\nbfg --replace-text secrets.txt my-repo.git\ngit reflog expire --expire=now --all\ngit gc --prune=now --aggressive\ngit push --force`, explanation: "Even after removing the secret from current code, it may still be in git history" },
      { step: 4, action: "Add pre-commit hooks to prevent future leaks", command: `# Install git-secrets or gitleaks:\nnpm install -g @secretlint/secretlint\n# or\nbrew install gitleaks\ngitleaks install`, explanation: "Prevent secrets from being committed in future" },
    ],
    code_snippet: (_f: any) => `# .env (gitignored):\nAPI_KEY=your_actual_secret_here\nDB_PASSWORD=your_db_password\n\n# .gitignore:\n.env\n.env.local\n.env.*.local\n\n# Load in Node.js:\nrequire('dotenv').config();\nconst key = process.env.API_KEY;\n\n# Load in Python:\nimport os\nfrom dotenv import load_dotenv\nload_dotenv()\nkey = os.getenv('API_KEY')`,
    verification: "Re-scan secrets with POST /api/shieldScanRepo — hardcoded secret finding should be resolved after rotation + env var migration.",
    autofix_available: false,
  },

  // ── Default fallback
  "generic": {
    effort: "medium", time_estimate: "1-4 hours",
    category: "Security",
    steps: (f: any) => [
      { step: 1, action: "Review the finding details", command: `# Finding: ${f.title}\n# CVE: ${f.cve_id || "N/A"}\n# CVSS: ${f.cvss_score || "N/A"}`, explanation: "Understand the vulnerability before attempting a fix" },
      { step: 2, action: "Check vendor advisory", command: f.cve_id ? `# Check NVD: https://nvd.nist.gov/vuln/detail/${f.cve_id}\n# Check GitHub Advisory: https://github.com/advisories?query=${f.cve_id}` : "# Search vendor documentation for remediation guidance", explanation: "The vendor advisory contains the official remediation steps" },
      { step: 3, action: "Apply the recommended fix", command: f.remediation || "# See finding remediation field for specific steps", explanation: "Follow vendor-recommended remediation" },
      { step: 4, action: "Verify the fix", command: "# Re-run the relevant scanner after applying the fix", explanation: "Confirm the finding no longer appears after remediation" },
    ],
    code_snippet: (_f: any) => null,
    verification: "Re-scan after applying the fix to confirm resolution.",
    autofix_available: false,
  },
};

function classifyFinding(f: any): string {
  const title = (f.title || "").toLowerCase();
  const vulnClass = (f.vulnerability_class || f.owasp_category || "").toLowerCase();
  const scanners = (f.source_scanners || "").toLowerCase();
  if (f.fixed_version || (scanners.includes("sca") && f.cve_id)) return "cve_dependency";
  if (title.includes("root") && (title.includes("container") || title.includes("docker"))) return "container_root";
  if (title.includes("s3") && (title.includes("public") || title.includes("exposed"))) return "s3_public_access";
  if (title.includes("mfa") && title.includes("iam")) return "iam_mfa_not_enforced";
  if (title.includes("cluster-admin") || (title.includes("rbac") && title.includes("admin"))) return "k8s_rbac_cluster_admin";
  if (vulnClass.includes("xss") || title.includes("cross-site scripting") || title.includes("xss")) return "xss";
  if (vulnClass.includes("sqli") || title.includes("sql injection") || title.includes("sqli")) return "sqli";
  if (title.includes("hardcoded") || title.includes("secret") || title.includes("credential") || title.includes("api key")) return "hardcoded_secret";
  if (title.includes("public access") || title.includes("publicly exposed")) return "s3_public_access";
  if (f.cve_id) return "cve_dependency";
  return "generic";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const {
      action = "remediate",   // remediate | bulk_plan | stats | chat
      finding_id,             // TriagedFinding id
      finding,                // inline finding object
      question,               // for chat mode: free-text question about a finding
    } = body;

    // ── STATS: how many findings have playbooks
    if (action === "stats") {
      const findings = await base44.entities.TriagedFinding.list().catch(() => []);
      const open = findings.filter((f: any) => f.status === "open");
      const classified = open.map((f: any) => classifyFinding(f));
      const byClass: Record<string, number> = {};
      for (const c of classified) byClass[c] = (byClass[c] || 0) + 1;
      const withAutofix = open.filter((f: any) => {
        const cls = classifyFinding(f);
        return REMEDIATION_PLAYBOOKS[cls]?.autofix_available;
      });
      return new Response(JSON.stringify({ success: true, total_open: open.length, by_class: byClass, autofix_eligible: withAutofix.length, playbook_coverage: `${Math.round(open.filter(f => classifyFinding(f) !== "generic").length / open.length * 100)}%` }), { headers: CORS });
    }

    // ── BULK PLAN: generate fix plans for top N findings
    if (action === "bulk_plan") {
      const findings = await base44.entities.TriagedFinding.list().catch(() => []);
      const open = findings.filter((f: any) => f.status === "open").sort((a: any, b: any) => {
        const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return (sevOrder[a.normalized_severity] || 2) - (sevOrder[b.normalized_severity] || 2);
      }).slice(0, 10);

      const plans = open.map((f: any) => {
        const cls = classifyFinding(f);
        const pb = REMEDIATION_PLAYBOOKS[cls] || REMEDIATION_PLAYBOOKS["generic"];
        return { id: f.id, title: f.title, severity: f.normalized_severity, cve_id: f.cve_id, class: cls, effort: pb.effort, time_estimate: pb.time_estimate, autofix_available: pb.autofix_available, steps_count: pb.steps(f).length };
      });

      const totalEffort = { low: plans.filter(p => p.effort === "low").length, medium: plans.filter(p => p.effort === "medium").length, high: plans.filter(p => p.effort === "high").length };
      return new Response(JSON.stringify({ success: true, total_planned: plans.length, total_effort_breakdown: totalEffort, autofix_eligible: plans.filter(p => p.autofix_available).length, plans }), { headers: CORS });
    }

    // ── REMEDIATE: full playbook for a single finding
    let f = finding;
    if (!f && finding_id) {
      const all = await base44.entities.TriagedFinding.list().catch(() => []);
      f = all.find((x: any) => x.id === finding_id);
    }
    if (!f) return new Response(JSON.stringify({ error: "finding or finding_id required" }), { status: 400, headers: CORS });

    const cls = classifyFinding(f);
    const pb = REMEDIATION_PLAYBOOKS[cls] || REMEDIATION_PLAYBOOKS["generic"];

    // ── CHAT: contextual question about a finding
    if (action === "chat") {
      const q = (question || "").toLowerCase();
      const steps = pb.steps(f);
      let answer = "";
      if (q.includes("how long") || q.includes("time") || q.includes("effort")) {
        answer = `This fix is estimated to take **${pb.time_estimate}** with **${pb.effort}** effort. It has ${steps.length} steps.`;
      } else if (q.includes("autofix") || q.includes("auto fix") || q.includes("one click") || q.includes("pr")) {
        answer = pb.autofix_available ? `✅ AutoFix is available for this finding. Use POST /api/shieldAutoFix with \`{action:"create_pr", finding_id:"${f.id}", repo_full_name:"owner/repo"}\` to create a GitHub PR automatically.` : `❌ AutoFix is not available for this finding type (${pb.category}). Manual remediation required. See the step-by-step plan below.`;
      } else if (q.includes("why") || q.includes("impact") || q.includes("risk")) {
        answer = `**Why this matters:** ${f.title} ${f.cve_id ? `(${f.cve_id}, CVSS ${f.cvss_score})` : ""} is a ${f.normalized_severity || f.severity} severity ${pb.category} vulnerability. ${f.exploited_in_wild ? "⚠️ This CVE is in the CISA Known Exploited Vulnerabilities catalogue — it is actively being exploited in the wild." : `EPSS score: ${f.epss_score ? `${Math.round(f.epss_score * 100)}% probability of exploitation in next 30 days` : "N/A"}.`} ${f.sla_breached ? "⚠️ SLA deadline has been breached — this needs immediate attention." : ""}`;
      } else if (q.includes("step") || q.includes("fix") || q.includes("how")) {
        answer = `Here are the ${steps.length} steps to fix this:\n\n${steps.map((s: any) => `**Step ${s.step}: ${s.action}**\n${s.explanation}\n\`\`\`\n${s.command}\n\`\`\``).join("\n\n")}`;
      } else {
        answer = `This is a **${pb.category}** finding. Effort: **${pb.effort}** (${pb.time_estimate}). ${pb.autofix_available ? "✅ AutoFix available." : "Manual fix required."} Ask me: "How do I fix this?", "How long will this take?", "Can I autofix this?", or "Why does this matter?"`;
      }
      return new Response(JSON.stringify({ success: true, finding_id: f.id, title: f.title, answer, class: cls, autofix_available: pb.autofix_available }), { headers: CORS });
    }

    // Full remediation plan
    const steps = pb.steps(f);
    const snippet = pb.code_snippet?.(f);
    const verification = pb.verification instanceof Function ? pb.verification(f) : pb.verification;

    return new Response(JSON.stringify({
      success: true,
      finding_id: f.id,
      title: f.title,
      severity: f.normalized_severity || f.severity,
      cve_id: f.cve_id,
      cvss_score: f.cvss_score,
      epss_score: f.epss_score,
      exploited_in_wild: f.exploited_in_wild,
      sla_breached: f.sla_breached,
      vulnerability_class: cls,
      category: pb.category,
      effort: pb.effort,
      time_estimate: pb.time_estimate,
      autofix_available: pb.autofix_available,
      autofix_command: pb.autofix_available ? `POST /api/shieldAutoFix {"action":"create_pr","finding_id":"${f.id}","repo_full_name":"owner/repo"}` : null,
      remediation_plan: { steps, total_steps: steps.length },
      code_snippet: snippet,
      verification,
      references: [
        f.cve_id ? `https://nvd.nist.gov/vuln/detail/${f.cve_id}` : null,
        f.cve_id ? `https://github.com/advisories?query=${f.cve_id}` : null,
      ].filter(Boolean),
    }), { headers: CORS });

  } catch (err: any) { return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS }); }
});
