# ShieldAI Security Platform

> AI-Powered Application Security Platform — ASPM for the modern stack

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

ShieldAI is a production-grade Application Security Posture Management (ASPM) platform that unifies security scanning, risk scoring, and AI-driven remediation across your entire stack.

**Pillar Coverage:**
| Pillar | Engine | Data Source |
|---|---|---|
| Code Security | SAST + SCA | Semgrep OSS, OSV.dev, EPSS |
| Cloud Security | Cloud Misconfig | AWS/GCP/Azure Security APIs |
| Attack Surface | DAST + Discovery | Nuclei, Shodan InternetDB, crt.sh |
| Runtime Protection | WAF + EDR | Zen Firewall, DeviceAgent |
| Supply Chain | SafeChain | OSV.dev, deps.dev, abuse.ch |
| Governance | Compliance | SOC2, ISO27001, GDPR, HIPAA, PCI-DSS, NIST CSF |
| Identity (CIEM) | IAM Analysis | AWS IAM, privilege escalation detection |
| Data (DSPM) | Data Classification | PII/PCI/PHI detection across cloud data stores |

## Features

- **AutoTriage v4** — EPSS scoring + CISA KEV cross-reference + SLA breach detection
- **AI Remediation Copilot** — Step-by-step fix plans, code snippets, effort estimates
- **AutoFix** — Real GitHub PRs for fixable vulnerabilities (SCA dep upgrades, Dockerfile hardening)
- **CI/CD Gate** — Block deployments containing critical findings, posts GitHub commit status
- **Dark Web Monitor** — ransomware.live, abuse.ch Feodo, ThreatFox, URLhaus, crt.sh CT logs
- **Global Risk Score** — 8-pillar posture score (0-100) with trend tracking
- **Security Reports** — Executive Summary, CISO Technical Report, Compliance Audit Evidence
- **MSSP Multi-tenancy** — Manage multiple client tenants from one control plane
- **Integrations Hub** — Slack, PagerDuty, Microsoft Teams, Jira, custom webhooks (HMAC-SHA256)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ShieldAI Platform                      │
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │   Code   │  │  Cloud   │  │  Attack  │  │ Runtime │  │
│  │  SAST/   │  │ AWS/GCP/ │  │  DAST/   │  │  WAF/   │  │
│  │  SCA     │  │  Azure   │  │  Pentest │  │  EDR    │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘  │
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │  Supply  │  │Governance│  │ Identity │  │  Data   │  │
│  │  Chain   │  │Compliance│  │  CIEM    │  │  DSPM   │  │
│  │SafeChain │  │SOC2/ISO  │  │ IAM Scan │  │PII/PCI  │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │          AutoTriage v4 + AI Copilot + AutoFix       │  │
│  │         EPSS · CISA KEV · SLA · GitHub PRs          │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Backend Functions (71 deployed)

All functions are deployed as Deno/TypeScript serverless endpoints.

### Scanners
- `shieldScanRepo` — SAST/SCA/Secrets/IaC scanning via Semgrep + OSV.dev
- `shieldScanAWS` / `shieldScanAzure` / `shieldScanGCP` — Cloud misconfiguration scanning
- `shieldScanContainer` — Container image CVE scanning
- `shieldScanK8s` — Kubernetes security scanning (RBAC, Pod Security, Network Policy)
- `shieldScanVM` — Virtual machine package vulnerability scanning
- `shieldDASTScan` — Dynamic application security testing
- `shieldAIPentest` — AI-powered penetration testing

### Intelligence
- `shieldAutoTriage` — v4 cross-scanner deduplication, EPSS, CISA KEV, SLA
- `shieldThreatActorIntelV2` — CISA KEV + NVD + GitHub Advisories + ransomware.live
- `shieldDarkWebMonitor` — ransomware.live + abuse.ch + crt.sh + URLhaus
- `shieldGlobalScore` — 8-pillar risk score calculation
- `shieldSecurityGraph` — Attack path graph construction

### Remediation
- `shieldRemediationCopilot` — AI fix plans, code snippets, effort estimates
- `shieldAutoFix` — Real GitHub PR creation for fixable vulnerabilities
- `shieldCICDGate` — CI/CD pipeline security gate

### Governance
- `shieldCompliance` / `shieldComplianceAudit` — Framework assessment (SOC2, ISO27001, GDPR, HIPAA, PCI-DSS, NIST CSF)
- `shieldReport` — Executive, CISO, Audit Evidence, Trust reports

### Protection
- `shieldZenFirewall` — Runtime WAF (Zen embedded hooks)
- `shieldEDRAgent` — Endpoint detection and response
- `shieldSafeChain` — Supply chain integrity monitoring

### Platform
- `shieldMultiTenant` — MSSP multi-tenancy management
- `shieldIntegrations` — Slack, Teams, PagerDuty, custom webhooks
- `shieldGTM` — Onboarding wizard, demo mode, trial management
- `shieldOnboard` — GitHub connect, first scan, org setup
- `shieldStripeWebhook` — Billing and subscription management

## Entity Schema (46 entities)

Core entities: `TriagedFinding`, `GlobalRiskScore`, `CloudAccount`, `CloudFinding`, `CodeRepository`, `DASTScan`, `DASTFinding`, `ContainerScan`, `ContainerFinding`, `K8sScan`, `K8sFinding`, `VMScan`, `VMFinding`, `PentestJob`, `PentestFinding`, `ComplianceFramework`, `PolicyViolation`, `CIEMFinding`, `DSPMAsset`, `DSPMFinding`, `DarkWebAlert`, `AttackSurface`, `SecurityGraph`, `ThreatIntelFeed`, `RuntimeThreat`, `FirewallRule`, `SupplyChainEvent`, `BotEvent`, `ZenFirewall`, `LLMUsageEvent`, `DeviceAgent`, `OrgSettings`, `AuditLog`, `Notification`, `IntegrationConfig`, `ScanJob`

## Secrets Required

| Secret | Purpose |
|---|---|
| `GITHUB_TOKEN` | AutoFix PRs, CI/CD gate, repo scanning |
| `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` | Cloud scanning (CIEM, DSPM, CloudScan) |
| `SLACK_WEBHOOK_URL` | Security alert notifications |
| `PAGERDUTY_ROUTING_KEY` | Critical alert escalation |
| `JIRA_API_TOKEN` | Auto ticket creation |
| `RESEND_API_KEY` | Email notifications |
| `HIBP_API_KEY` | Email breach lookup (optional, $3.50/mo) |
| `STRIPE_SECRET_KEY` | Billing |

## Live Platform

Built on [Base44](https://base44.com) — deployed at [ShieldAI App](https://app.base44.com/apps/6a22a773bb173a975d8337f9)

## License

MIT — see [LICENSE](LICENSE)
