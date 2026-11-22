// Pre-generated agent data for seeding - used by the app at runtime
// This generates deterministic agent data client-side to avoid 1000 DB write calls

const WEB_SPEC = ["SQL Injection","XSS","CSRF","SSRF","XXE","Path Traversal","File Upload Bypass","Clickjacking","Open Redirect","Business Logic Flaws","Authentication Bypass","Session Hijacking","Template Injection","HTTP Request Smuggling","Prototype Pollution"];
const API_SPEC = ["GraphQL Injection","REST Fuzzing","gRPC Attacks","JWT Manipulation","OAuth Bypass","API Key Leakage","Mass Assignment","BOLA/IDOR","Rate Limit Bypass","Broken Function Level Auth","Schema Validation Bypass","WebSocket Attacks","Mutation Testing"];
const LLM_SPEC = ["Prompt Injection","Jailbreaking","System Prompt Extraction","Training Data Poisoning","Model Inversion","Adversarial Inputs","RAG Poisoning","Tool Call Hijacking","Agent Manipulation","Context Window Overflow","Indirect Prompt Injection","LLM Supply Chain Attack","Model Exfiltration"];
const NET_SPEC = ["Port Scanning","Service Fingerprinting","SSL/TLS Analysis","DNS Attacks","SMB Exploits","VPN Vulnerabilities","Firewall Bypass","VLAN Hopping","ARP Spoofing","BGP Hijacking","Zero-Day Network Exploits"];
const CLD_SPEC = ["AWS Privilege Escalation","GCP Service Account Abuse","Azure AD Attacks","IMDS Exploitation","S3 Bucket Takeover","Lambda Abuse","K8s Escape","Container Breakout","Serverless Attacks","Cloud Metadata Exfiltration","Cross-Account Pivoting"];
const RCN_SPEC = ["Subdomain Enumeration","Certificate Transparency","Wayback Crawling","GitHub Secret Hunting","LinkedIn OSINT","Shodan Scanning","Technology Fingerprinting","Email Harvesting","Passive DNS","Threat Intelligence Correlation"];
const STL_SPEC = ["WAF Bypass","Rate Limit Evasion","Header Manipulation","IP Rotation","Tor Routing","Timing Attacks","Anti-forensics","Log Tampering Detection","Canary Token Avoidance","Polymorphic Payload Generation"];
const CRY_SPEC = ["Weak Cipher Detection","TLS Downgrade","Certificate Pinning Bypass","Key Length Analysis","Padding Oracle","Bleichenbacher Attack","Hash Length Extension","JWT Cracking","Timing Side Channels","Entropy Analysis"];
const RED_SPEC = ["Full Kill Chain Simulation","APT Emulation","Ransomware Simulation","Data Exfiltration Simulation","Lateral Movement","Persistence Mechanisms","Supply Chain Attack Simulation","Insider Threat Simulation"];
const MOB_SPEC = ["Android APK Analysis","iOS IPA Analysis","Mobile API Attacks","Bluetooth Attacks","IoT Firmware Analysis","Default Credential Testing"];

const TARGETS = ["app.acme.corp","api.acme.corp","graphql.acme.corp","payments.acme.corp","staging.acme.corp","admin.acme.corp","auth.acme.corp","dashboard.acme.corp","chat.acme.corp","rag-api.acme.corp","legacy.acme.corp","dev.acme.corp","10.0.1.42","grpc.internal.acme.corp","jenkins.internal.acme.corp"];
const CAMPAIGNS = ["Operation Nightfall","API Siege v3","LLM Adversarial Challenge","Red Team Alpha"];

function seededRandom(seed) {
  let x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function pickStatus(seed, statusMix) {
  const r = seededRandom(seed);
  let cum = 0;
  for (const [s, p] of statusMix) { cum += p; if (r < cum) return s; }
  return statusMix[0][0];
}

function genAgent(prefix, idx, category, specs, tier, healthMin, healthMax, statusMix, campaign) {
  const seed = prefix.charCodeAt(0) * 1000 + idx;
  const r = (n) => seededRandom(seed * 7 + n);
  const health = Math.round(healthMin + r(1) * (healthMax - healthMin));
  const isApex = tier === "apex";
  const isElite = tier === "elite";
  const tasks = isApex ? Math.round(500 + r(2) * 4500) : isElite ? Math.round(100 + r(2) * 1400) : Math.round(r(2) * 600);
  const findings = Math.round(tasks * (0.05 + r(3) * 0.25));
  const status = pickStatus(seed, statusMix);
  const specialty = specs[Math.floor(r(4) * specs.length)];
  const target = status === "attacking" ? TARGETS[Math.floor(r(5) * TARGETS.length)] : null;
  const codename = `${prefix}-${String(idx).padStart(3, "0")}`;
  return {
    name: `${codename} — ${specialty}`,
    codename,
    category,
    specialty,
    status,
    health_score: health,
    tasks_completed: tasks,
    current_target: target,
    last_active: new Date(Date.now() - r(6) * 3600000 * 4).toISOString(),
    success_rate: Math.round(60 + r(7) * 39),
    findings_generated: findings,
    assigned_campaign: campaign || CAMPAIGNS[Math.floor(r(8) * CAMPAIGNS.length)],
    tier,
    attack_vector: specialty,
  };
}

const WEB_STATUS = [["attacking",0.4],["online",0.35],["idle",0.15],["cooldown",0.10]];
const API_STATUS = [["attacking",0.38],["online",0.32],["idle",0.18],["cooldown",0.12]];
const LLM_STATUS = [["attacking",0.45],["online",0.30],["idle",0.15],["cooldown",0.10]];
const GEN_STATUS = [["attacking",0.30],["online",0.40],["idle",0.20],["cooldown",0.10]];

export function generateAllAgents() {
  const agents = [];

  // WEB 1-200
  for (let i = 1; i <= 200; i++) {
    const tier = i <= 50 ? "apex" : i <= 150 ? "elite" : "standard";
    const [hMin, hMax] = tier === "apex" ? [95,100] : tier === "elite" ? [88,97] : [75,92];
    agents.push(genAgent("WEB", i, "web", WEB_SPEC, tier, hMin, hMax, WEB_STATUS, "Operation Nightfall"));
  }

  // API 1-200
  for (let i = 1; i <= 200; i++) {
    const tier = i <= 40 ? "apex" : i <= 140 ? "elite" : "standard";
    const [hMin, hMax] = tier === "apex" ? [95,100] : tier === "elite" ? [88,97] : [75,92];
    const cat = i % 5 === 0 ? "fuzzer" : "api";
    agents.push(genAgent("API", i, cat, API_SPEC, tier, hMin, hMax, API_STATUS, "API Siege v3"));
  }

  // LLM 1-150
  for (let i = 1; i <= 150; i++) {
    const tier = i <= 30 ? "apex" : i <= 90 ? "elite" : "standard";
    const [hMin, hMax] = tier === "apex" ? [95,100] : tier === "elite" ? [88,97] : [75,92];
    agents.push(genAgent("LLM", i, "ai_llm", LLM_SPEC, tier, hMin, hMax, LLM_STATUS, "LLM Adversarial Challenge"));
  }

  // NET 1-100
  for (let i = 1; i <= 100; i++) {
    const tier = i <= 20 ? "apex" : i <= 70 ? "elite" : "standard";
    const [hMin, hMax] = tier === "apex" ? [95,100] : tier === "elite" ? [88,97] : [75,92];
    agents.push(genAgent("NET", i, "network", NET_SPEC, tier, hMin, hMax, GEN_STATUS, "Operation Nightfall"));
  }

  // CLD 1-100
  for (let i = 1; i <= 100; i++) {
    const tier = i <= 20 ? "apex" : i <= 70 ? "elite" : "standard";
    const [hMin, hMax] = tier === "apex" ? [95,100] : tier === "elite" ? [88,97] : [75,92];
    agents.push(genAgent("CLD", i, "cloud", CLD_SPEC, tier, hMin, hMax, GEN_STATUS, "Operation Nightfall"));
  }

  // RCN 1-80
  for (let i = 1; i <= 80; i++) {
    const tier = i <= 15 ? "apex" : i <= 50 ? "elite" : "standard";
    const [hMin, hMax] = tier === "apex" ? [95,100] : tier === "elite" ? [88,97] : [75,92];
    agents.push(genAgent("RCN", i, "recon", RCN_SPEC, tier, hMin, hMax, GEN_STATUS, "Operation Nightfall"));
  }

  // STL 1-70
  for (let i = 1; i <= 70; i++) {
    const tier = i <= 12 ? "apex" : i <= 45 ? "elite" : "standard";
    const [hMin, hMax] = tier === "apex" ? [95,100] : tier === "elite" ? [88,97] : [75,92];
    agents.push(genAgent("STL", i, "stealth", STL_SPEC, tier, hMin, hMax, GEN_STATUS, "Operation Nightfall"));
  }

  // CRY 1-50
  for (let i = 1; i <= 50; i++) {
    const tier = i <= 10 ? "apex" : i <= 35 ? "elite" : "standard";
    const [hMin, hMax] = tier === "apex" ? [95,100] : tier === "elite" ? [88,97] : [75,92];
    agents.push(genAgent("CRY", i, "crypto", CRY_SPEC, tier, hMin, hMax, GEN_STATUS, "API Siege v3"));
  }

  // RED 1-30
  for (let i = 1; i <= 30; i++) {
    const tier = i <= 8 ? "apex" : i <= 22 ? "elite" : "standard";
    const [hMin, hMax] = tier === "apex" ? [95,100] : tier === "elite" ? [88,97] : [75,92];
    agents.push(genAgent("RED", i, "red_team", RED_SPEC, tier, hMin, hMax, GEN_STATUS, "Red Team Alpha"));
  }

  // MOB 1-20
  for (let i = 1; i <= 20; i++) {
    const tier = i <= 4 ? "apex" : i <= 14 ? "elite" : "standard";
    const [hMin, hMax] = tier === "apex" ? [95,100] : tier === "elite" ? [88,97] : [75,92];
    const cat = i % 3 === 0 ? "iot" : "mobile";
    agents.push(genAgent("MOB", i, cat, MOB_SPEC, tier, hMin, hMax, GEN_STATUS, "Operation Nightfall"));
  }

  return agents;
}

export const BATTALION_META = [
  { prefix: "WEB", label: "Web Attackers", count: 200, color: "#3b82f6", cat: "web" },
  { prefix: "API", label: "API & Fuzzing", count: 200, color: "#06b6d4", cat: "api" },
  { prefix: "LLM", label: "AI/LLM Attack", count: 150, color: "#C9A84C", cat: "ai_llm" },
  { prefix: "NET", label: "Network", count: 100, color: "#f97316", cat: "network" },
  { prefix: "CLD", label: "Cloud Attack", count: 100, color: "#8b5cf6", cat: "cloud" },
  { prefix: "RCN", label: "Recon & OSINT", count: 80, color: "#22c55e", cat: "recon" },
  { prefix: "STL", label: "Stealth & Evasion", count: 70, color: "#94a3b8", cat: "stealth" },
  { prefix: "CRY", label: "Crypto Attacks", count: 50, color: "#14b8a6", cat: "crypto" },
  { prefix: "RED", label: "Red Team", count: 30, color: "#ef4444", cat: "red_team" },
  { prefix: "MOB", label: "Mobile & IoT", count: 20, color: "#ec4899", cat: "mobile" },
];

export const TIER_COLORS = {
  apex: { bg: "bg-[#C9A84C]/15", text: "text-[#C9A84C]", border: "border-[#C9A84C]/40", label: "APEX" },
  elite: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/40", label: "ELITE" },
  standard: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/40", label: "STD" },
};

export const STATUS_COLORS = {
  attacking: { dot: "bg-amber-400", text: "text-amber-400", label: "ATTACKING" },
  online: { dot: "bg-emerald-400", text: "text-emerald-400", label: "ONLINE" },
  idle: { dot: "bg-blue-400", text: "text-blue-400", label: "IDLE" },
  cooldown: { dot: "bg-slate-500", text: "text-slate-400", label: "COOLDOWN" },
  offline: { dot: "bg-red-500", text: "text-red-400", label: "OFFLINE" },
};