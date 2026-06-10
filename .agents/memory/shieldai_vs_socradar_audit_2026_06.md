# ShieldAI vs SOCRadar — Full Competitive Audit
**Date:** 2026-06-10
**SOCRadar Position:** Extended Threat Intelligence (XTI) platform — EASM + CTI + Dark Web + Brand Protection + Supply Chain

---

## WHAT SOCRADAR IS (vs Aikido)

SOCRadar is an **outside-in threat intelligence platform** — it monitors what's visible about you from the internet, dark web, and threat actor communities.

Aikido is an **inside-out code/cloud security platform** — it scans your code, cloud configs, and runtime environments.

ShieldAI currently covers Aikido's domain (code/cloud/runtime). SOCRadar is a **different category** with significant overlap in: attack surface, vulnerability intel, supply chain, and CSPM.

---

## SOCRADAR — 5 MODULE BREAKDOWN

### Module 1: Advanced Dark Web Monitoring
- Stealer log tracking & dark web credential exposure
- Underground forum / hacker channel monitoring (Telegram, markets, forums)
- PII exposure detection for employees/customers
- VIP / C-level executive protection monitoring
- Dark Web Search Engine (keyword, IP, email, domain, hash, URL)
- Data breach / leak detection
- Dark Web News feed (sector & national intel)
- Fraud protection
- Real-time alerts on credential sales

### Module 2: Cyber Threat Intelligence (CTI)
- Threat Hunting (proactive adversary detection)
- Tactical Intelligence (TTPs, MITRE ATT&CK mapping)
- Operational Intelligence (real-time adversary tracking)
- Vulnerability Intelligence (CVE alerts with context & prioritization)
- Identity & Access Intelligence (risky access patterns, IAM exposure)
- IOC enrichment & threat feeds (APT, malware, phishing)
- Threat actor profiles & ransomware group tracking
- Ransomware intelligence module
- Phishing / campaign intelligence

### Module 3: External Attack Surface Management (EASM)
- Continuous digital footprint discovery (auto, no manual asset input)
- Vulnerable software monitoring on external assets
- Shadow IT discovery (unmanaged/unknown assets)
- Exposed sensitive data detection
- SSL certificate monitoring & expiry alerts
- DNS record monitoring & anomaly detection
- Critical open port detection
- Third-party / external software exposure mapping
- Undiscovered cloud asset mapping
- Attack surface risk scoring

### Module 4: Brand Protection
- Phishing domain detection & monitoring
- Typosquatting / lookalike domain detection
- Visual similarity domain detection
- Compromised credential detection (brand-targeted)
- Mobile app impersonation (rogue apps)
- Social media impersonation monitoring
- Fraudulent site takedown facilitation
- Code repository monitoring (IP/brand data leaks)
- Cloud storage exposure monitoring (brand data)
- Deepfake scam detection (2025 addition)

### Module 5: Supply Chain Intelligence
- Third-party risk scoring (50M+ companies, 249 countries)
- Cyber Exposure Level algorithmic scoring
- Popularity Score per vendor
- Continuous third-party cyber risk monitoring
- Supply chain attack detection
- Global cyberattack trends dashboard
- Analytics / vendor risk reporting dashboard
- Third-party breach notifications

### BONUS: Agentic Security (2025)
- AI agents that auto-evaluate alarms
- Automated alarm suppression / triage
- SOAR-style automated response actions
- Agentic threat intelligence workflows

---

## FEATURE PARITY MATRIX: ShieldAI vs SOCRadar

### 🌑 DARK WEB MONITORING

| Feature | SOCRadar | ShieldAI | Gap? |
|---|---|---|---|
| Stealer log tracking | ✅ | ❌ | **MISSING** |
| Dark web credential leak detection | ✅ | ❌ | **MISSING** |
| Underground forum monitoring | ✅ | ❌ | **MISSING** |
| Telegram / hacker channel monitoring | ✅ | ❌ | **MISSING** |
| PII exposure detection | ✅ | ❌ | **MISSING** |
| VIP / Executive protection | ✅ | ❌ | **MISSING** |
| Dark Web Search Engine | ✅ | ❌ | **MISSING** |
| Dark Web News / threat feed | ✅ | ❌ | **MISSING** |
| Fraud protection | ✅ | ❌ | **MISSING** |

**Score: 0/9 — FULL GAP (entire new pillar)**

---

### 🧠 CYBER THREAT INTELLIGENCE (CTI)

| Feature | SOCRadar | ShieldAI | Gap? |
|---|---|---|---|
| Threat Hunting | ✅ | ⚠️ Partial (shieldAIPentest) | Partial |
| MITRE ATT&CK / TTP mapping | ✅ | ❌ | **MISSING** |
| IOC enrichment & threat feeds | ✅ | ✅ shieldThreatIntel (CISA KEV + NVD) | Partial |
| Vulnerability Intelligence (CVE) | ✅ | ✅ Real (OSV + NVD) | ✅ Parity |
| APT / Threat actor profiles | ✅ | ❌ | **MISSING** |
| Ransomware intelligence | ✅ | ❌ | **MISSING** |
| Phishing / campaign intelligence | ✅ | ❌ | **MISSING** |
| Identity & Access Intelligence | ✅ | ⚠️ Partial (IAM scanner) | Partial |
| Tactical Intelligence module | ✅ | ❌ | **MISSING** |

**Score: 2.5/9 — MAJOR GAP**

---

### 🗺️ EXTERNAL ATTACK SURFACE MANAGEMENT (EASM)

| Feature | SOCRadar | ShieldAI | Gap? |
|---|---|---|---|
| Digital footprint auto-discovery | ✅ | ⚠️ AttackSurface entity only | Partial |
| Vulnerable software on external assets | ✅ | ✅ shieldScanRepo + DAST | ✅ Parity |
| Shadow IT discovery | ✅ | ❌ | **MISSING** |
| Exposed sensitive data detection | ✅ | ✅ Secrets scanner | ✅ Parity |
| SSL certificate monitoring | ✅ | ⚠️ Entity field only | Partial |
| DNS monitoring | ✅ | ❌ | **MISSING** |
| Open port detection | ✅ | ⚠️ AttackSurface entity | Partial |
| Cloud asset discovery | ✅ | ✅ shieldScanAWS/Azure/GCP | ✅ Parity |
| Attack surface risk scoring | ✅ | ✅ shieldGlobalScore | ✅ Parity |
| Third-party software exposure | ✅ | ✅ shieldSafeChain | ✅ Parity |

**Score: 5.5/10 — MODERATE GAP**

---

### 🏷️ BRAND PROTECTION

| Feature | SOCRadar | ShieldAI | Gap? |
|---|---|---|---|
| Phishing domain detection | ✅ | ❌ | **MISSING** |
| Typosquatting / lookalike domains | ✅ | ❌ | **MISSING** |
| Visual similarity detection | ✅ | ❌ | **MISSING** |
| Mobile app impersonation | ✅ | ❌ | **MISSING** |
| Social media impersonation | ✅ | ❌ | **MISSING** |
| Fraudulent site takedown | ✅ | ❌ | **MISSING** |
| Code repo brand leak monitoring | ✅ | ✅ shieldScanRepo (partial) | Partial |
| Cloud storage exposure | ✅ | ✅ shieldScanAWS (S3 public) | Partial |
| Deepfake scam detection | ✅ | ❌ | **MISSING** |
| Compromised credential alerts | ✅ | ❌ | **MISSING** |

**Score: 2/10 — FULL GAP (another new pillar)**

---

### 🔗 SUPPLY CHAIN INTELLIGENCE

| Feature | SOCRadar | ShieldAI | Gap? |
|---|---|---|---|
| Third-party risk scoring | ✅ | ⚠️ shieldSafeChain (npm/PyPI only) | Partial |
| 50M+ vendor coverage | ✅ | ❌ | **MISSING** |
| Continuous vendor monitoring | ✅ | ❌ | **MISSING** |
| Supply chain attack detection | ✅ | ✅ shieldSafeChain (malicious pkg) | ✅ Parity |
| Global attack trends dashboard | ✅ | ⚠️ ThreatIntelFeed entity | Partial |
| Vendor breach notifications | ✅ | ❌ | **MISSING** |
| Cyber Exposure Level scoring | ✅ | ❌ | **MISSING** |

**Score: 2/7 — MAJOR GAP**

---

### 🤖 AGENTIC / AI AUTOMATION

| Feature | SOCRadar | ShieldAI | Gap? |
|---|---|---|---|
| AI alarm auto-evaluation | ✅ | ✅ AutoTriage (GPT-4o-mini) | ✅ Parity |
| Automated alarm suppression | ✅ | ✅ noise_reduction flag | ✅ Parity |
| SOAR-style automated response | ✅ | ⚠️ AutoFix PR only | Partial |
| Agentic threat intelligence | ✅ | ⚠️ Partial (AutoTriage) | Partial |

**Score: 3/4 — Close, but SOCRadar broader**

---

## OVERALL PARITY SCORE

| Module | SOCRadar Features | ShieldAI Coverage | Score |
|---|---|---|---|
| Dark Web Monitoring | 9 | 0 | **0%** |
| Cyber Threat Intelligence | 9 | 2.5 | **28%** |
| EASM | 10 | 5.5 | **55%** |
| Brand Protection | 10 | 2 | **20%** |
| Supply Chain Intelligence | 7 | 2 | **29%** |
| Agentic AI | 4 | 3 | **75%** |
| **TOTAL** | **49** | **15** | **31%** |

> **ShieldAI vs SOCRadar = ~31% parity** — SOCRadar is fundamentally a different category (outside-in threat intel) vs ShieldAI (inside-out code/cloud security). They partially overlap on EASM and supply chain, but SOCRadar's core value (dark web + brand + CTI) is entirely absent from ShieldAI.

---

## STRATEGIC CONCLUSION

### Where ShieldAI WINS vs SOCRadar
- Code security (SAST, SCA, IaC, secrets) — SOCRadar has NONE of this
- Cloud CSPM (AWS/Azure/GCP native) — SOCRadar EASM is surface-level only
- Container + K8s scanning — SOCRadar doesn't do this
- Runtime protection (Zen firewall, WAF) — SOCRadar doesn't do this
- AI AutoFix PRs — SOCRadar has no code remediation
- Developer-first (VS Code extension, npm/PyPI SDKs) — SOCRadar is SOC-team focused

### Where SOCRadar WINS vs ShieldAI
- Dark web monitoring (stealer logs, underground forums) — ShieldAI: 0%
- Brand protection (phishing domains, typosquatting) — ShieldAI: 20%
- Threat actor / APT intelligence — ShieldAI: 0%
- Ransomware group tracking — ShieldAI: 0%
- Supply chain vendor risk (50M companies) — ShieldAI: 29%
- MITRE ATT&CK tactical intelligence — ShieldAI: 0%
- Executive / VIP protection — ShieldAI: 0%

### The 3 Features to Close the Gap Most Efficiently

**Priority 1 — ThreatIntelFeed Enhancement (HIGH ROI)**
- Add IOC feed ingestion (MITRE ATT&CK, PhishTank, abuse.ch)
- Add CVE → threat actor correlation
- This directly addresses CTI gap

**Priority 2 — Brand Protection Module (NEW PILLAR)**
- Phishing/typosquatting domain monitoring via URLScan.io API
- Lookalike domain detection (Levenshtein distance algorithm)
- This is an entirely new pillar — high differentiation

**Priority 3 — Dark Web / Leak Detection (NEW PILLAR)**
- Integrate HaveIBeenPwned API for credential leak detection
- Integrate LeakCheck / breach data APIs
- This is ShieldAI's biggest gap vs SOCRadar

---

## POSITIONING ADVICE

Don't compete HEAD-ON with SOCRadar. ShieldAI's sweet spot is developers and DevSecOps teams. SOCRadar targets SOC analysts and CISOs.

**Best go-to-market:** Position ShieldAI as **"Aikido for developers"** (which you already are), and **add SOCRadar-style features as a bonus tier** for teams that want dark web + brand protection without a second vendor.

The winning pitch: *"Everything Aikido does, plus the threat intel visibility of SOCRadar — all in one platform for dev and security teams."*
