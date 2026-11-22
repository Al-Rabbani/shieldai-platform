// Utility to understand agent generation logic (not deployed)
// 1000 agents: WEB(200) + API(200) + LLM(150) + NET(100) + CLD(100) + RCN(80) + STL(70) + CRY(50) + RED(30) + MOB(20)

const WEB_SPECIALTIES = ["SQL Injection","XSS","CSRF","SSRF","XXE","Path Traversal","File Upload Bypass","Clickjacking","Open Redirect","Business Logic Flaws","Authentication Bypass","Session Hijacking","Template Injection (SSTI)","HTTP Request Smuggling","Prototype Pollution"];
const API_SPECIALTIES = ["GraphQL Injection","REST Fuzzing","gRPC Attacks","JWT Manipulation","OAuth Bypass","API Key Leakage","Mass Assignment","BOLA/IDOR","Rate Limit Bypass","Broken Function Level Auth","Schema Validation Bypass","WebSocket Attacks","Mutation Testing"];
const LLM_SPECIALTIES = ["Prompt Injection","Jailbreaking","System Prompt Extraction","Training Data Poisoning","Model Inversion","Adversarial Inputs","RAG Poisoning","Tool Call Hijacking","Agent Manipulation","Context Window Overflow","Indirect Prompt Injection","LLM Supply Chain Attack","Model Exfiltration"];
const NET_SPECIALTIES = ["Port Scanning","Service Fingerprinting","SSL/TLS Analysis","DNS Attacks","SMB Exploits","VPN Vulnerabilities","Firewall Bypass","VLAN Hopping","ARP Spoofing","BGP Hijacking","Zero-Day Network Exploits"];
const CLD_SPECIALTIES = ["AWS Privilege Escalation","GCP Service Account Abuse","Azure AD Attacks","IMDS Exploitation","S3 Bucket Takeover","Lambda Abuse","K8s Escape","Container Breakout","Serverless Attacks","Cloud Metadata Exfiltration","Cross-Account Pivoting"];
const RCN_SPECIALTIES = ["Subdomain Enumeration","Certificate Transparency","Wayback Crawling","GitHub Secret Hunting","LinkedIn OSINT","Shodan Scanning","Technology Fingerprinting","Email Harvesting","Passive DNS","Threat Intelligence Correlation"];
const STL_SPECIALTIES = ["WAF Bypass","Rate Limit Evasion","Header Manipulation","IP Rotation","Tor Routing","Timing Attacks","Anti-forensics","Log Tampering Detection","Canary Token Avoidance","Polymorphic Payload Generation"];
const CRY_SPECIALTIES = ["Weak Cipher Detection","TLS Downgrade","Certificate Pinning Bypass","Key Length Analysis","Padding Oracle","Bleichenbacher Attack","Hash Length Extension","JWT Cracking","Timing Side Channels","Entropy Analysis"];
const RED_SPECIALTIES = ["Full Kill Chain Simulation","APT Emulation","Ransomware Simulation","Data Exfiltration Simulation","Lateral Movement","Persistence Mechanisms","Supply Chain Attack Simulation","Insider Threat Simulation"];
const MOB_SPECIALTIES = ["Android APK Analysis","iOS IPA Analysis","Mobile API Attacks","Bluetooth Attacks","IoT Firmware Analysis","Default Credential Testing"];

const TARGETS = ["app.acme.corp","api.acme.corp","graphql.acme.corp","payments.acme.corp","staging.acme.corp","admin.acme.corp","auth.acme.corp","dashboard.acme.corp","chat.acme.corp","rag-api.acme.corp","legacy.acme.corp","dev.acme.corp","jenkins.internal.acme.corp","10.0.1.42","grpc.internal.acme.corp"];
const CAMPAIGNS = ["Operation Nightfall","API Siege v3","LLM Adversarial Challenge","Red Team Alpha"];
const STATUSES = ["online","idle","attacking","cooldown"];

export { WEB_SPECIALTIES, API_SPECIALTIES, LLM_SPECIALTIES };