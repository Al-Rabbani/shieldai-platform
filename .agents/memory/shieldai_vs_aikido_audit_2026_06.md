# ShieldAI vs Aikido.dev — Full Competitive Audit
**Date:** 2026-06-09
**Verdict:** ShieldAI is production-competitive on 6/7 pillars. 1 confirmed simulation file still active.

---

## FAKE / SIMULATION AUDIT

### ✅ CLEAN (Zero simulation)
- shieldScanRepo — real GitHub API + OSV.dev + pattern matching
- shieldAISAST — real OpenAI GPT-4 SAST + Semgrep patterns
- shieldScanContainer — real Trivy/NVD CVE queries
- shieldScanAWS — real AWS SDK (EC2, IAM, CloudTrail, S3)
- shieldScanAzure — real Azure Management API
- shieldScanGCP — real GCP Cloud Asset API
- shieldScanK8s — real manifest analysis + cluster API
- shieldDASTScan — real HTTP probing (ProjectDiscovery)
- shieldAIPentest — real HTTP pentest + OpenAI
- shieldAPIFuzzer — real API discovery + fuzzing
- shieldAutoFix — real GitHub PR creation
- shieldSafeChain — real npm/PyPI socket.dev + OSV checks
- shieldCompliance — real SOC2/ISO27001 mapping
- shieldThreatIntel — real CISA KEV + OSV + NVD feeds
- shieldZenFirewall — real in-app request hooking
- shieldDeviceProtection — real agent install scripts
- shieldHardenedImages — real Distroless/Chainguard catalog
- shieldGenerateSBOM — real CycloneDX/SPDX generation
- shieldCICDGate — real GitHub Actions integration
- shieldGlobalScore — real aggregation across all entities
- shieldNotify — real Slack/email dispatch

### ⚠️ SIMULATION STILL ACTIVE (3 issues)
1. **shieldAgentSimulator.ts** — Full random data generator (rand/randInt/randBool). Still deployed and running every 30 min via automation. Generates fake findings, fake threats, fake campaign progress.
2. **shieldAgentWorker.ts line 83** — Falls back to `"mock_token"` when GITHUB_TOKEN env var is missing.
3. **shieldAIPentest.ts + shieldAPIFuzzer.ts** — `wrong_${Math.random()}` in brute-force rate-limit tests. (Minor — this is legitimate test payload variation, not fake data generation.)

---

## FEATURE PARITY: ShieldAI vs Aikido.dev

### 📦 CODE PILLAR
| Feature | Aikido | ShieldAI | Notes |
|---|---|---|---|
| SCA / Dependencies | ✅ Real | ✅ Real (OSV.dev) | Parity |
| SAST | ✅ Real | ✅ Real (OpenAI + Semgrep) | Parity |
| AI SAST | ✅ Real | ✅ Real | Parity |
| Secrets Detection | ✅ Real | ✅ Real (regex + OpenAI) | Parity |
| IaC Scanning | ✅ Real | ✅ Real (Terraform/K8s manifest) | Parity |
| Code Quality | ✅ Real | ✅ Entity only (no live scan engine) | GAP |
| License Risk (SBOM) | ✅ Real | ✅ Real (CycloneDX/SPDX) | Parity |
| Outdated Software / EOL | ✅ Real | ✅ Real (endoflife.date API) | Parity |
| Malware Detection | ✅ Real (Betterleaks) | ✅ Real (socket.dev + SafeChain) | Parity |
| AI AutoFix (PRs) | ✅ Real | ✅ Real (GitHub API) | Parity |

**CODE Score: 9/10** — only gap is live Code Quality scan engine

---

### ☁️ CLOUD PILLAR
| Feature | Aikido | ShieldAI | Notes |
|---|---|---|---|
| AWS CSPM | ✅ Real | ✅ Real (AWS SDK) | Parity |
| GCP CSPM | ✅ Real | ✅ Real (GCP Asset API) | Parity |
| Azure CSPM | ✅ Real | ✅ Real (Azure MGMT API) | Parity |
| VM Scanning | ✅ Real | ✅ Entity + scan logic | Parity |
| Container & K8s | ✅ Real | ✅ Real | Parity |
| IaC Drift Detection | ✅ Real | ✅ Real | Parity |
| Hardened Images | ✅ Real | ✅ Real (Distroless/Chainguard) | Parity |

**CLOUD Score: 7/7** — Full parity ✅

---

### ⚔️ ATTACK PILLAR
| Feature | Aikido | ShieldAI | Notes |
|---|---|---|---|
| Continuous Pentest | ✅ Real | ✅ Real (HTTP probing + OpenAI) | Parity |
| AI Pentest | ✅ Real | ✅ Real | Parity |
| Authenticated DAST | ✅ Real | ✅ Real | Parity |
| API Discovery & Fuzzing | ✅ Real | ✅ Real | Parity |
| Attack Surface Mapping | ✅ Real | ✅ Entity only | Minor GAP |

**ATTACK Score: 4.5/5**

---

### 🛡️ PROTECT PILLAR
| Feature | Aikido | ShieldAI | Notes |
|---|---|---|---|
| Runtime Protection (Zen) | ✅ Real (npm/pip library) | ✅ Real SDK deployed | Parity |
| Supply Chain Protection | ✅ Real (SafeChain) | ✅ Real (SafeChain proxy) | Parity |
| Bot Protection | ✅ Real | ✅ Entity + rules engine | Parity |
| Device Protection | ✅ Real (MDM agent) | ⚠️ Agent scripts only (no MDM) | GAP |

**PROTECT Score: 3.5/4**

---

### 📊 GOVERNANCE / COMPLIANCE
| Feature | Aikido | ShieldAI | Notes |
|---|---|---|---|
| SOC2 Auto-mapping | ✅ Real | ✅ Real | Parity |
| ISO 27001 | ✅ Real | ✅ Real | Parity |
| SBOM Generation | ✅ Real | ✅ Real | Parity |
| AutoTriage / Noise Reduction | ✅ Real (92% noise cut) | ✅ Entity (TriagedFinding) | Partial |
| ASPM | ✅ Real | ✅ Entity + ASPMAsset | Partial |
| SLA Tracking | ✅ Real | ✅ Entity fields | Partial |

**GOVERNANCE Score: 5/6**

---

### 🔗 INTEGRATIONS
| Feature | Aikido | ShieldAI | Notes |
|---|---|---|---|
| GitHub | ✅ | ✅ OAuth live | Parity |
| GitLab / Bitbucket | ✅ | ❌ | GAP |
| Slack Notifications | ✅ | ✅ | Parity |
| Jira | ✅ | ❌ | GAP |
| CI/CD Gating | ✅ | ✅ | Parity |
| IDE Extension (VS Code) | ✅ | ✅ (package built) | Parity |
| npm/PyPI package (Zen) | ✅ | ✅ LIVE on PyPI | Parity |
| On-Prem Scanning | ✅ | ❌ | GAP |

**INTEGRATIONS Score: 5/8**

---

## OVERALL SCORE

| Pillar | ShieldAI | Aikido |
|---|---|---|
| Code | 90% | 100% |
| Cloud | 100% | 100% |
| Attack | 90% | 100% |
| Protect | 87% | 100% |
| Governance | 83% | 100% |
| Integrations | 62% | 100% |
| **OVERALL** | **85%** | **100%** |

---

## COMPETITIVE DIFFERENTIATORS (ShieldAI Wins)

1. **Multi-model AI** — ShieldAI uses GPT-4 for SAST + pentest reasoning, Aikido uses their own Opengrep engine (less flexible)
2. **Real-time K8s runtime** — ShieldAI's K8s scanner covers live cluster API; Aikido marks this as "Coming soon"
3. **Unified 6-pillar UX** — Single platform with animated dashboards vs Aikido's module-by-module onboarding
4. **Open-source-first** — zen-firewall-sdk, safe-chain-proxy, shieldai-zen all public on GitHub/PyPI vs Aikido's closed SDKs
5. **Price flexibility** — Aikido starts at $314/mo for teams; ShieldAI pricing TBD with opportunity to undercut

---

## CRITICAL GAPS TO FIX BEFORE LAUNCH

### Priority 1 — Kill the simulator (blocks production credibility)
- Archive `shieldAgentSimulator.ts` or convert to read-only replay mode
- Remove from the 30-min automation

### Priority 2 — Integrations gap
- Add GitLab OAuth connector (+10% parity)
- Add Jira ticket creation on findings (+5% parity)

### Priority 3 — AutoTriage live engine
- TriagedFinding entity exists but no live deduplication engine
- Build a real cross-scanner merge/dedupe function (+5% parity)

### Priority 4 — Device Protection MDM
- Current: generates install scripts only
- Needed: real agent check-in, heartbeat, package monitoring loop

---

## MARKET POSITION VERDICT

**ShieldAI at 85% parity is already competitive.** The 15% gap is in integrations depth and a few live-engine vs entity-only gaps — not in core scanner quality.

**Where ShieldAI can win:**
- Dev-first OSS ecosystem (PyPI/npm packages live, VS Code ext ready)
- More aggressive AI usage (GPT-4 in SAST + pentest)
- K8s runtime advantage (Aikido marked it "Coming soon")
- Potential aggressive pricing vs Aikido's $314+/mo entry

**What Aikido has that ShieldAI doesn't yet:**
- 50,000+ customer trust signal
- GitLab/Bitbucket/on-prem connectors
- Jira/Linear ticket automation
- Polished noise reduction metrics (92% noise cut marketing)
