# ShieldAI — Honest Deep Gap Audit vs Competitors
## Date: June 17, 2026 | Source: Live code inspection + live competitor research

## WHAT WE CONFIRMED EXISTS (Real Engines):
1. shieldScanRepo — GitHub API + SAST patterns + OSV.dev SCA + NVD + CISA KEV ✅ REAL
2. shieldAutoTriage — dedup + normalize + EPSS field (stored but NOT fetched from EPSS API) ⚠️ PARTIAL
3. shieldAutoFix — GitHub PR creation with real code changes ✅ REAL
4. shieldContinuousPentest — schedules + compares results ✅ REAL but delegates to shieldAIPentest
5. shieldAIPentest — ProjectDiscovery Nuclei API + fallback HTTP pentest engine ✅ REAL
6. shieldScanAWS — AWS SigV4 + real API calls to IAM/S3/EC2/RDS/CloudTrail/VPC ✅ REAL
7. shieldCompliance — full SOC2/ISO27001/GDPR/PCI-DSS/HIPAA/NIST mapping ✅ REAL
8. shieldGlobalScore — exists but needs audit of logic
9. shieldNotify — exists, Slack webhook from env (needs SLACK_WEBHOOK_URL configured)
10. shieldEDRAgent — enrollment + telemetry + install scripts ✅ REAL

## CONFIRMED GAPS (Real Technical Gaps Found in Code Inspection)

### GAP 1: EPSS Score Not Actually Fetched (CRITICAL)
- shieldAutoTriage stores epss_score field but sets it to `finding.epss_score || null`
- It NEVER calls the EPSS API (https://api.first.org/data/v1/epss?cve=CVE-XXXX)
- Aikido, Snyk, Wiz ALL fetch real EPSS scores to show "X% probability of exploitation in 30 days"
- FIX: In shieldAutoTriage, for every finding with a cve_id, call EPSS API and populate epss_score
- EPSS API: GET https://api.first.org/data/v1/epss?cve=CVE-2021-44228 → returns probability 0-1 + percentile
- No API key required — completely free and open

### GAP 2: Reachability Analysis is Placeholder (CRITICAL)
- shieldAutoTriage assessReachability() function returns "confirmed" for pentest/dast, "theoretical" for everything else
- It NEVER does actual call graph analysis to determine if vulnerable code is actually called
- Real reachability = build a call graph of the repo, trace imports from entry point to vulnerable function
- Snyk, Aikido, Semgrep Supply Chain all do this with real call graph construction
- FIX: In shieldScanRepo, for each SCA finding, trace whether the vulnerable function is actually imported AND called
  via static analysis of import/require/use statements + function call patterns
- Simpler approach: check if the vulnerable package is directly imported (not just transitive) = "LIKELY"
  vs transitive-only = "THEORETICAL"

### GAP 3: No PR Decoration (Posting Comments on GitHub PRs) (HIGH)
- shieldAutoFix creates PRs but never posts comments ON EXISTING PRs with scan results
- Aikido posts a comment on every PR: "⚠️ ShieldAI found 3 vulnerabilities in this PR"
- FIX: In shieldScanRepo, if triggered by a PR event (pr_number in payload), post a PR review comment via:
  POST /repos/{owner}/{repo}/pulls/{pr_number}/reviews with findings summary

### GAP 4: shieldAutoTriage Does Not Fetch CISA KEV Match (HIGH)
- We check CISA KEV in shieldScanRepo but shieldAutoTriage receives pre-scanned findings
- When a CVE is in CISA KEV, exploitability should automatically be "EXPLOITED_IN_WILD" (highest priority)
- FIX: In shieldAutoTriage, for each finding with cve_id, check against CISA KEV list
  (https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json)

### GAP 5: No Real Call Graph / Dependency Graph Construction (HIGH)
- Package.json/requirements.txt parsed but no real dependency tree built
- Aikido builds a full dependency graph to show transitive vs direct dependencies
- FIX: In shieldScanRepo SCA step, when package.json found: build full dep tree via npm's package-lock.json or yarn.lock parsing
  When requirements.txt found: trace imports in Python files
  Mark each finding: "direct" vs "transitive" dependency → affects risk scoring

### GAP 6: shieldScanAWS Requires Long-Term Credentials (HIGH)
- shieldScanAWS requires aws_access_key_id + aws_secret_access_key directly
- No support for temporary credentials, cross-account role assumption, or OIDC
- FIX: Add STS AssumeRole support — customer creates a role, we assume it → no long-term keys stored

### GAP 7: No SBOM Output from Scanner (MEDIUM)
- shieldGenerateSBOM.ts exists but not called by shieldScanRepo
- After every repo scan, an SBOM should be auto-generated in CycloneDX JSON format
- FIX: After SCA step completes in shieldScanRepo, call shieldGenerateSBOM and link to ScanJob

### GAP 8: No Real-Time Secrets Liveness Check (MEDIUM)
- Secrets are detected in code but never validated as live/rotated
- FIX: For each detected secret, based on its pattern, call the appropriate validation API:
  - AKIA (AWS): STS GetCallerIdentity
  - ghp_ (GitHub): GET /user
  - sk_live_ (Stripe): GET /v1/account
  - SG. (SendGrid): GET /v3/user/profile
  - xoxb- (Slack): POST /auth.test

### GAP 9: shieldNotify Not Wired to Notification Entity (MEDIUM)
- shieldNotify reads SLACK_WEBHOOK_URL from env — good
- But Notification entity is not read/written by any scanner consistently
- FIX: Every scanner should write to Notification entity; shieldNotify should read Notification entity
  and dispatch to configured channels (Slack/email/webhook) in batch

### GAP 10: No Jira/Linear Ticket Creation (MEDIUM)
- Findings accumulate in TriagedFinding but no workflow integration to create tickets
- Aikido, Snyk both auto-create Jira/Linear issues for critical findings
- FIX: After AutoTriage, for critical/high findings without a jira_ticket, call Jira API or Linear API
  to create a ticket and write back the ticket URL to TriagedFinding.jira_ticket

## COMPETITOR FEATURE MATRIX (What We Still Need for 10/10)

| Feature | Aikido | Wiz | Snyk | CS | Us | Gap |
|---|---|---|---|---|---|---|
| Real EPSS scores | ✅ | ✅ | ✅ | ✅ | ❌ | Need EPSS API call |
| Call graph reachability | ✅ | ✅ | ✅ | N/A | ❌ | Need static analysis |
| PR decoration (comments) | ✅ | N/A | ✅ | N/A | ❌ | Need PR review API |
| CISA KEV auto-flag | ✅ | ✅ | ✅ | ✅ | ⚠️ | Partial in scanner only |
| Dep tree (direct vs transitive) | ✅ | N/A | ✅ | N/A | ❌ | Need lock file parsing |
| Secrets liveness validation | ✅ | N/A | ✅ | N/A | ❌ | Need per-provider API calls |
| Jira/Linear ticket creation | ✅ | ✅ | ✅ | ✅ | ❌ | Need Jira/Linear API |
| AI Code Review (PR comments) | ✅ | N/A | ✅ | N/A | ❌ | Need GPT-4 PR comment |
| Agentless cloud (role assume) | N/A | ✅ | N/A | N/A | ❌ | Need STS AssumeRole |
| SBOM auto-generated per scan | ✅ | ✅ | ✅ | N/A | ⚠️ | Engine exists, not wired |
| Breaking changes analysis | ✅ | N/A | ✅ | N/A | ❌ | Need semver analysis |
| AI Infinite (continuous pentest) | ✅ | N/A | N/A | N/A | ⚠️ | UI only, not fully automated |

## WHAT TO BUILD TO GET EVERY ENGINE TO 10/10:
1. Update shieldAutoTriage to call EPSS API for every CVE (free, no key needed)
2. Update shieldAutoTriage to call CISA KEV for every CVE
3. Update shieldScanRepo to parse lock files (package-lock.json, yarn.lock, Pipfile.lock)
4. Update shieldScanRepo to post PR decoration comments via GitHub API
5. Update shieldAutoFix to add AI code review comments (GPT-4 explaining fix)
6. Add shieldSecretsLiveness function that validates detected secrets
7. Add shieldJiraIntegration function for ticket auto-creation
8. Add STS AssumeRole support to shieldScanAWS
9. Wire shieldGenerateSBOM into shieldScanRepo pipeline
10. Add breaking changes analysis to SCA engine (semver major version change detection)
