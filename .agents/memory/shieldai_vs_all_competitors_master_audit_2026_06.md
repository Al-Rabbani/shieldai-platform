# ShieldAI — MASTER GLOBAL COMPETITIVE AUDIT
## Date: June 16, 2026 | Benchmarked Against 7 Major Competitors

---

## TIER 1 GAPS — Critical (Platform is incomplete without these)

### 1. Security Graph / Attack Path Visualization (Wiz's #1 differentiator)
- Wiz: ✅ Full Security Graph — connects every cloud resource, identity, code, data — shows actual attack paths
- Orca: ✅ Attack path analysis with SideScanning
- Prisma: ✅ Code-to-cloud graph
- ShieldAI: ❌ MISSING — No graph, no attack path, no contextual relationships between assets

### 2. DSPM — Data Security Posture Management
- Wiz: ✅ Full DSPM — discovers sensitive data (PII, PCI, PHI) across cloud, classifies, monitors access
- Orca: ✅ Full DSPM
- Prisma: ✅ Full DSPM
- ShieldAI: ❌ MISSING — No data discovery, no sensitive data classification

### 3. CIEM — Cloud Identity Entitlement Management
- Wiz: ✅ Full CIEM — right-sizes IAM permissions, finds over-privileged roles, toxic combinations
- Orca: ✅ Full CIEM
- Prisma: ✅ Full CIEM (named leader in GigaOm 2026 CIEM Radar)
- ShieldAI: ❌ MISSING — No IAM analysis, no entitlement management

### 4. AI-SPM — AI Security Posture Management
- Wiz: ✅ AI-APP platform — secures AI models, agents, training data, inference endpoints, prompt injection
- Orca: ✅ AI-SPM for models and pipelines
- Snyk: ✅ Snyk Studio + Evo AI-SPM (launched RSAC 2026) + Agent Security
- Prisma: ✅ AI-SPM
- ShieldAI: ⚠️ PARTIAL — Has LLM Security monitor but no model inventory, no AI pipeline security, no agentic AI governance

### 5. Workflow Automation / No-Code Orchestration
- Wiz: ✅ Visual no-code workflow canvas — chain triggers, logic, approvals, integrations
- Prisma: ✅ Full SOAR-like orchestration
- ShieldAI: ❌ MISSING — No workflow builder, no automated response orchestration

### 6. Secrets Liveness Detection
- Aikido: ✅ Detects secrets AND confirms if they're still active/valid
- Snyk: ✅ Hardcoded secrets detected + liveness check
- ShieldAI: ⚠️ PARTIAL — Detects secrets but no liveness validation (is the key still working?)

### 7. Pre-CVE / Zero-Day Protection
- Aikido: ✅ Aikido SafeChain — blocks malicious packages BEFORE CVE is published
- Snyk: ✅ Pre-CVE protection via malware detection
- ShieldAI: ⚠️ PARTIAL — Has supply chain monitor but no pre-CVE package blocking

---

## TIER 2 GAPS — Important (Needed for enterprise deals)

### 8. On-Prem / Air-Gapped Scanning
- Aikido: ✅ Broker for internal apps, on-prem scanning (Pro plan+)
- Snyk: ✅ On-prem via Snyk Broker
- ShieldAI: ❌ MISSING — Cloud-only, no broker, no on-prem support

### 9. Code-to-Cloud Correlation
- Wiz: ✅ Traces cloud resource back to the exact code/commit/developer that created it, auto-generates fix PR
- Prisma: ✅ Full code-to-cloud tracing
- ShieldAI: ❌ MISSING — No correlation between cloud findings and source code

### 10. Hardened Container Images
- Aikido: ✅ CVE-free Docker base images built and maintained
- ShieldAI: ❌ MISSING — No hardened image registry or CVE-free image provision

### 11. Extended Library Support (Aikido Patches)
- Aikido: ✅ Extended life for popular libraries — patches EOL libraries that vendors abandoned
- ShieldAI: ❌ MISSING

### 12. CI/CD Pipeline Security
- All competitors: ✅ Full CI/CD security — pipeline poisoning detection, secrets in CI, dependency confusion in pipelines
- ShieldAI: ⚠️ PARTIAL — Has GitHub Actions integration but no pipeline security scanning per se

### 13. Cloud Asset Inventory Graph / Search
- Wiz: ✅ Query all cloud assets across providers with complex relationship queries
- Aikido: ✅ Cloud Search (asset inventory graph)
- ShieldAI: ❌ MISSING — No queryable asset inventory graph

### 14. Risk Quantification / Financial Impact
- Prisma: ✅ Risk quantification showing $ value of risk
- CrowdStrike: ✅ Business risk scoring
- ShieldAI: ❌ MISSING — No financial risk quantification (CISOs need "$X at risk")

### 15. Threat Hunting
- CrowdStrike: ✅ Falcon OverWatch — 24/7 managed threat hunting
- SOCRadar: ✅ Agentic threat investigation
- ShieldAI: ❌ MISSING — No threat hunting console or guided hunt workflows

### 16. Agentic AI Security (MCP / Agent Governance)
- Snyk: ✅ Agent Security — MCP server governance, Agent Guard real-time enforcement
- Wiz: ✅ AI agent runtime protection — rogue agents, malicious AI behavior
- ShieldAI: ❌ MISSING — No MCP server security, no agentic AI governance

---

## TIER 3 GAPS — Differentiators (Makes platform UNBEATABLE)

### 17. Compliance Automation (Full Evidence Collection)
- Aikido: ✅ Syncs to Drata, Vanta, Secureframe — auto-collects SOC2 evidence
- ShieldAI: ⚠️ PARTIAL — Compliance page exists but no automated evidence collection, no Vanta/Drata sync

### 18. Developer IDE Real-Time Feedback
- Aikido: ✅ VS Code + IntelliJ plugins with real-time security feedback as you type
- Snyk: ✅ VS Code, IntelliJ, Eclipse plugins
- ShieldAI: ⚠️ PARTIAL — VS Code extension exists but limited real-time feedback depth

### 19. Breaking Changes Analysis
- Aikido: ✅ Flags dependency upgrades that will break your app (not just security fixes)
- Snyk: ✅ Similar upgrade impact analysis
- ShieldAI: ❌ MISSING

### 20. SBOM Export (Full CycloneDX/SPDX)
- All competitors: ✅ Full CycloneDX + SPDX format SBOM generation
- ShieldAI: ⚠️ PARTIAL — SBOM page exists, format compliance unknown

### 21. Custom Security Rules Engine
- Aikido: ✅ Custom SAST rules, custom cloud rules (unlimited on Advanced)
- Snyk: ✅ Custom rules
- ShieldAI: ❌ MISSING — No custom rule builder

### 22. Pentest on Every Deploy (Continuous)
- Aikido: ✅ Continuous pentesting — triggers on every code deploy
- ShieldAI: ⚠️ PARTIAL — Manual pentest jobs, no deploy-triggered automation

### 23. Champion Center / Security Program Maturity
- Wiz: ✅ Champion Center — tracks adoption, maturity, achievements across the org
- ShieldAI: ❌ MISSING — No program maturity tracking or adoption analytics

### 24. Regulatory Intelligence (NIS2, CRA, DORA, HIPAA)
- SOCRadar: ✅ Geopolitical + regulatory intelligence
- Prisma: ✅ Regulatory compliance packs (NIS2, CRA, DORA)
- ShieldAI: ❌ MISSING — No regulatory change tracking or NIS2/CRA/DORA packs

---

## WHERE SHIELDAI LEADS vs ALL COMPETITORS

| Capability | ShieldAI | All Others |
|---|---|---|
| Full 6-pillar unified platform | ✅ | ❌ (all siloed) |
| Threat Intel + AppSec combined | ✅ | ❌ (split products) |
| Ransomware Tracker | ✅ | ❌ SOCRadar only, partial |
| Geopolitical Threat Map | ✅ | ❌ SOCRadar only |
| Identity Intelligence + AppSec | ✅ | ❌ separate products |
| MSSP Multi-Tenant mode | ✅ | Wiz/Prisma only |
| Sovereign Platform Branding | ✅ | ❌ All US-centric |
| Nation-State APT Profiles | ✅ | SOCRadar only |

---

## HONEST PRIORITY BUILD LIST — What to build to become UNBEATABLE

### PHASE 1 — Close Critical Gaps (Must have)
1. Security Graph + Attack Path Visualization
2. CIEM (Cloud IAM entitlement management)
3. DSPM (Data discovery + classification)
4. Workflow Automation Canvas (no-code)
5. AI-SPM (full AI model + agent governance)

### PHASE 2 — Enterprise Closure (Unlock big deals)
6. Code-to-Cloud Correlation
7. Secrets Liveness Detection
8. Custom Rules Engine (SAST + Cloud)
9. CI/CD Pipeline Security scanning
10. On-Prem Broker support
11. Financial Risk Quantification ($-value of risk)

### PHASE 3 — Become Unbeatable (Differentiation)
12. Agentic AI Security (MCP server governance)
13. Pentest-on-Deploy (continuous trigger)
14. Regulatory Intelligence packs (NIS2, CRA, DORA, HIPAA)
15. Hardened Container Image Registry
16. Breaking Changes Analysis
17. Threat Hunting Console
18. Security Program Maturity / Champion Centre
19. Pre-CVE / Zero-Day Package Blocking (SafeChain equivalent)
20. Compliance Evidence Auto-Collection (Vanta/Drata sync)
