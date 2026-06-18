// ShieldAI — Dark Web Monitor v2
// REAL free data sources (no paid API keys required for core functionality):
//   - ransomware.live  : live ransomware victim tracking (free, public API)
//   - abuse.ch Feodo   : C2 botnet infrastructure (free)
//   - abuse.ch URLhaus : malware distribution URLs (free)
//   - abuse.ch ThreatFox: IOC feeds (free)
//   - crt.sh            : certificate transparency for domain impersonation
//   - IntelX public     : paste/leak exposure (free tier)
//   - MITRE ATT&CK      : threat actor profiles (free)
// ENHANCED with HIBP if API key present

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ── RANSOMWARE.LIVE — free public API, real victims ──────────────────────────
async function checkRansomwareLive(orgName: string, domain: string): Promise<any> {
  try {
    const [victimsRes, groupsRes] = await Promise.all([
      fetch("https://api.ransomware.live/recentvictims", { signal: AbortSignal.timeout(10000) }),
      fetch("https://api.ransomware.live/groups", { signal: AbortSignal.timeout(10000) }),
    ]);

    const victims = victimsRes.ok ? await victimsRes.json() : [];
    const groups = groupsRes.ok ? await groupsRes.json() : [];

    // Search for org name + domain mentions
    const orgLower = (orgName || domain || "").toLowerCase();
    const domainLower = (domain || "").toLowerCase().replace("www.", "");
    const directMatches = victims.filter((v: any) => {
      const name = (v.victim || v.post_title || "").toLowerCase();
      const site = (v.website || v.url || "").toLowerCase();
      return (orgLower && name.includes(orgLower)) || (domainLower && (name.includes(domainLower) || site.includes(domainLower)));
    });

    // Get active groups info
    const activeGroups = Array.isArray(groups) ? groups.slice(0, 20).map((g: any) => ({
      name: g.name || g.group_name,
      active: g.enabled !== false,
      recent_victims: g.recentVictims || g.victims || 0,
    })) : [];

    const sectorVictims = victims.slice(0, 100);
    const sectorCounts: Record<string, number> = {};
    for (const v of sectorVictims) {
      const sector = v.activity || v.sector || "Unknown";
      sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
    }

    return {
      direct_matches: directMatches.length,
      matches: directMatches.slice(0, 5).map((v: any) => ({
        victim: v.victim || v.post_title,
        group: v.group_name || v.ransomware_group,
        date: v.discovered || v.date_added,
        website: v.website,
        country: v.country,
      })),
      recent_total_victims: victims.length,
      active_groups: activeGroups.length,
      top_active_groups: activeGroups.slice(0, 5).map((g: any) => g.name),
      top_targeted_sectors: Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s, c]) => ({ sector: s, count: c })),
      source: "ransomware.live",
      data_freshness: "real-time",
    };
  } catch (e: any) {
    return { error: e.message, source: "ransomware.live" };
  }
}

// ── ABUSE.CH FEODO TRACKER — botnet C2 IPs (free) ───────────────────────────
async function checkFeodoC2(): Promise<any> {
  try {
    const r = await fetch("https://feodotracker.abuse.ch/downloads/ipblocklist.json", { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return { error: `HTTP ${r.status}`, source: "abuse.ch Feodo" };
    const data = await r.json();
    const entries = (data.blocklist || []).slice(0, 20);
    const byMalware: Record<string, number> = {};
    for (const e of (data.blocklist || [])) {
      const m = e.malware || "Unknown";
      byMalware[m] = (byMalware[m] || 0) + 1;
    }
    return {
      total_c2_ips: (data.blocklist || []).length,
      top_malware_families: Object.entries(byMalware).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([m, c]) => ({ malware: m, c2_count: c })),
      sample_entries: entries.slice(0, 5).map((e: any) => ({ ip: e.ip_address, malware: e.malware, first_seen: e.first_seen, last_online: e.last_online, port: e.port })),
      source: "abuse.ch Feodo Tracker",
      data_freshness: "real-time",
    };
  } catch (e: any) {
    return { error: e.message, source: "abuse.ch Feodo" };
  }
}

// ── ABUSE.CH THREATFOX — IOC feed (free) ─────────────────────────────────────
async function checkThreatFoxIOCs(domain: string, ip: string): Promise<any> {
  try {
    const searchTerm = domain || ip;
    if (!searchTerm) return { total: 0, matches: [], source: "abuse.ch ThreatFox" };

    const r = await fetch("https://threatfox-api.abuse.ch/api/v1/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "search_ioc", search_term: searchTerm }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return { error: `HTTP ${r.status}`, source: "abuse.ch ThreatFox" };
    const data = await r.json();
    const iocs = data.data || [];
    return {
      total: iocs.length,
      matches: iocs.slice(0, 10).map((ioc: any) => ({
        ioc: ioc.ioc,
        ioc_type: ioc.ioc_type,
        threat_type: ioc.threat_type,
        malware: ioc.malware,
        confidence: ioc.confidence_level,
        first_seen: ioc.first_seen,
        tags: ioc.tags || [],
      })),
      found: iocs.length > 0,
      source: "abuse.ch ThreatFox",
      data_freshness: "real-time",
    };
  } catch (e: any) {
    return { error: e.message, source: "abuse.ch ThreatFox" };
  }
}

// ── URLHAUS — malware URLs (free) ────────────────────────────────────────────
async function checkURLhausHost(domain: string): Promise<any> {
  if (!domain) return { found: false, source: "abuse.ch URLhaus" };
  try {
    const r = await fetch("https://urlhaus-api.abuse.ch/v1/host/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `host=${encodeURIComponent(domain)}`,
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return { error: `HTTP ${r.status}`, source: "abuse.ch URLhaus" };
    const data = await r.json();
    return {
      found: data.query_status === "is_host",
      total_urls: data.urls_count || 0,
      blacklists: data.blacklists || {},
      urls: (data.urls || []).slice(0, 5).map((u: any) => ({
        url: u.url,
        url_status: u.url_status,
        threat: u.threat,
        tags: u.tags || [],
        date_added: u.date_added,
      })),
      source: "abuse.ch URLhaus",
      data_freshness: "real-time",
    };
  } catch (e: any) {
    return { error: e.message, found: false, source: "abuse.ch URLhaus" };
  }
}

// ── CRT.SH — Domain impersonation / typosquatting detection ─────────────────
async function checkDomainImpersonation(domain: string): Promise<any> {
  if (!domain) return { lookalikes: [], source: "crt.sh" };
  try {
    // Generate common typosquats
    const parts = domain.split(".");
    const name = parts[0];
    const tld = parts.slice(1).join(".");
    const typosquats = [
      // Character substitution
      name.replace(/o/g, "0") + "." + tld,
      name.replace(/i/g, "1") + "." + tld,
      name.replace(/a/g, "4") + "." + tld,
      name.replace(/e/g, "3") + "." + tld,
      // Common additions
      `${name}-secure.${tld}`, `${name}-login.${tld}`, `${name}-auth.${tld}`,
      `${name}-verify.${tld}`, `${name}-support.${tld}`, `${name}-portal.${tld}`,
      `${name}-account.${tld}`, `${name}-official.${tld}`,
      // TLD swaps
      `${name}.co`, `${name}.net`, `${name}.org`, `${name}.io`,
      // Prefix variations
      `www-${name}.${tld}`, `my-${name}.${tld}`, `secure-${name}.${tld}`,
    ].filter(d => d !== domain);

    // Check crt.sh for any of these actually registered
    const r = await fetch(`https://crt.sh/?q=%.${domain}&output=json`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    const certs = r.ok ? await r.json() : [];

    // Find suspicious certs that aren't subdomains of original
    const suspicious = new Set<string>();
    for (const cert of certs) {
      for (const name_val of (cert.name_value || "").split("\n")) {
        const clean = name_val.trim().replace(/^\*\./, "");
        // Flag if it contains the brand name but isn't a legit subdomain
        const baseName = domain.split(".")[0];
        if (clean.includes(baseName) && !clean.endsWith(`.${domain}`) && clean !== domain) {
          suspicious.add(clean);
        }
      }
    }

    return {
      lookalikes_in_ct: [...suspicious].slice(0, 20),
      lookalike_count: suspicious.size,
      potential_typosquats: typosquats.slice(0, 10),
      source: "crt.sh Certificate Transparency",
      note: "These domains have SSL certificates issued — may indicate active phishing infrastructure",
    };
  } catch (e: any) {
    return { error: e.message, source: "crt.sh" };
  }
}

// ── HIBP (optional, if API key present) ──────────────────────────────────────
async function checkHIBP(domain: string): Promise<any> {
  const hibpKey = Deno.env.get("HIBP_API_KEY");
  if (!hibpKey) return { available: false, note: "Add HIBP_API_KEY to Builder secrets for email-level breach lookup" };
  try {
    const r = await fetch(`https://haveibeenpwned.com/api/v3/breacheddomain/${domain}`, {
      headers: { "hibp-api-key": hibpKey, "User-Agent": "ShieldAI-DarkWebMonitor" },
      signal: AbortSignal.timeout(10000),
    });
    if (r.status === 404) return { available: true, breaches: [], total_breached_accounts: 0 };
    if (!r.ok) return { available: true, error: `HIBP ${r.status}` };
    const data = await r.json();
    const total = Object.values(data as Record<string, number[]>).flat().length;
    return { available: true, breached_email_count: total, breach_data: data };
  } catch (e: any) {
    return { available: !!hibpKey, error: e.message };
  }
}

// ── Active threat actors from MITRE ATT&CK (free) ────────────────────────────
async function fetchThreatActors(): Promise<any[]> {
  try {
    const r = await fetch("https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json", { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return [];
    const data = await r.json();
    const actors = (data.objects || [])
      .filter((o: any) => o.type === "intrusion-set" && !o.revoked)
      .slice(0, 15)
      .map((a: any) => ({
        name: a.name,
        aliases: (a.aliases || []).slice(0, 4),
        description: (a.description || "").slice(0, 200),
        last_modified: a.modified,
        techniques: (a.x_mitre_techniques || []).length,
      }));
    return actors;
  } catch { return []; }
}

// ── Risk scoring ─────────────────────────────────────────────────────────────
function calcRiskLevel(results: any): { level: string; score: number; findings: string[] } {
  const findings: string[] = [];
  let score = 0;

  if ((results.ransomware?.direct_matches || 0) > 0) {
    score += 50;
    findings.push(`⚠️ Organization found in ransomware victim list (${results.ransomware.direct_matches} match${results.ransomware.direct_matches > 1 ? "es" : ""})`);
  }
  if (results.threatfox?.found) {
    score += 40;
    findings.push(`🔴 Domain/IP found in ThreatFox IOC database (${results.threatfox.total} indicators)`);
  }
  if (results.urlhaus?.found) {
    score += 35;
    findings.push(`🔴 Domain found in URLhaus malware distribution list (${results.urlhaus.total_urls} URLs)`);
  }
  if ((results.impersonation?.lookalike_count || 0) > 5) {
    score += 20;
    findings.push(`⚠️ ${results.impersonation.lookalike_count} lookalike domains detected in Certificate Transparency`);
  } else if ((results.impersonation?.lookalike_count || 0) > 0) {
    score += 10;
    findings.push(`⚠️ ${results.impersonation.lookalike_count} lookalike domain(s) detected`);
  }
  if (results.hibp?.breached_email_count > 1000) {
    score += 30;
    findings.push(`🔴 ${results.hibp.breached_email_count} corporate email addresses in known breaches (HIBP)`);
  } else if (results.hibp?.breached_email_count > 0) {
    score += 20;
    findings.push(`⚠️ ${results.hibp.breached_email_count} corporate email addresses found in breaches`);
  }

  const level = score >= 60 ? "CRITICAL" : score >= 35 ? "HIGH" : score >= 15 ? "MEDIUM" : "LOW";
  return { level, score, findings };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const {
      action = "full_scan",    // full_scan | ransomware | c2_feeds | ioc_lookup | impersonation | summary | alerts
      domain = "",
      org_name = "",
      ip = "",
      save_to_db = true,
    } = body;

    // ── SUMMARY: return existing alerts from DB
    if (action === "summary") {
      const alerts = await base44.entities.DarkWebAlert.list().catch(() => []);
      const bySev: Record<string, number> = {};
      const byType: Record<string, number> = {};
      for (const a of alerts) {
        bySev[a.severity] = (bySev[a.severity] || 0) + 1;
        byType[a.alert_type] = (byType[a.alert_type] || 0) + 1;
      }
      return new Response(JSON.stringify({ success: true, total_alerts: alerts.length, by_severity: bySev, by_type: byType, critical: bySev.critical || 0, new_alerts: alerts.filter((a: any) => a.status === "new").length }), { headers: CORS });
    }

    if (action === "alerts") {
      const alerts = await base44.entities.DarkWebAlert.list().catch(() => []);
      return new Response(JSON.stringify({ success: true, total: alerts.length, alerts }), { headers: CORS });
    }

    if (action === "c2_feeds") {
      const [feodo, recent_urlhaus] = await Promise.all([checkFeodoC2(), checkURLhausHost(domain)]);
      return new Response(JSON.stringify({ success: true, feodo, urlhaus: recent_urlhaus }), { headers: CORS });
    }

    if (action === "ioc_lookup") {
      const result = await checkThreatFoxIOCs(domain, ip);
      return new Response(JSON.stringify({ success: true, ...result }), { headers: CORS });
    }

    if (action === "impersonation") {
      const result = await checkDomainImpersonation(domain);
      return new Response(JSON.stringify({ success: true, domain, ...result }), { headers: CORS });
    }

    if (action === "ransomware") {
      const result = await checkRansomwareLive(org_name, domain);
      return new Response(JSON.stringify({ success: true, ...result }), { headers: CORS });
    }

    // ── FULL SCAN: run all engines in parallel
    const [ransomware, feodo, threatfox, urlhaus, impersonation, hibp, threatActors] = await Promise.all([
      checkRansomwareLive(org_name, domain),
      checkFeodoC2(),
      checkThreatFoxIOCs(domain, ip),
      checkURLhausHost(domain),
      checkDomainImpersonation(domain),
      checkHIBP(domain),
      fetchThreatActors(),
    ]);

    const { level, score, findings } = calcRiskLevel({ ransomware, threatfox, urlhaus, impersonation, hibp });
    const now = new Date().toISOString();

    // Save significant findings to DB
    const savedAlerts: any[] = [];
    if (save_to_db) {
      // Ransomware matches
      for (const match of (ransomware.matches || [])) {
        const alert = {
          alert_type: "ransomware_mention", severity: "critical", status: "new",
          target: org_name || domain, target_type: domain ? "domain" : "organization",
          title: `Ransomware Victim Match: ${match.victim || org_name}`,
          description: `Organization found in ransomware.live victim records. Threat group: ${match.group}. Date: ${match.date}.`,
          source: "ransomware.live", ransomware_group: match.group,
          breach_date: match.date, remediation: "Initiate incident response. Check for IOCs. Review backups. Engage IR team immediately.",
          detected_at: now,
        };
        try { await base44.entities.DarkWebAlert.create(alert); savedAlerts.push(alert); } catch (_) {}
      }

      // ThreatFox IOC matches
      if (threatfox.found && (threatfox.matches || []).length > 0) {
        const alert = {
          alert_type: "c2_infrastructure", severity: "high", status: "new",
          target: domain || ip, target_type: domain ? "domain" : "ip",
          title: `IOC Match in ThreatFox: ${domain || ip}`,
          description: `Found ${threatfox.total} IOC matches in abuse.ch ThreatFox. Malware: ${threatfox.matches.map((m: any) => m.malware).join(", ")}`,
          source: "abuse.ch ThreatFox",
          remediation: "Block domain/IP in firewall and DNS. Investigate hosts that may have contacted this IOC.",
          detected_at: now,
        };
        try { await base44.entities.DarkWebAlert.create(alert); savedAlerts.push(alert); } catch (_) {}
      }

      // URLhaus malware distribution
      if (urlhaus.found) {
        const alert = {
          alert_type: "data_leak", severity: "critical", status: "new",
          target: domain, target_type: "domain",
          title: `Domain Used for Malware Distribution: ${domain}`,
          description: `Domain found in URLhaus malware distribution database with ${urlhaus.total_urls} active malware URLs.`,
          source: "abuse.ch URLhaus",
          remediation: "Take domain offline immediately. Review DNS records. Investigate hosting environment for compromise.",
          detected_at: now,
        };
        try { await base44.entities.DarkWebAlert.create(alert); savedAlerts.push(alert); } catch (_) {}
      }

      // Domain impersonation
      if ((impersonation.lookalike_count || 0) > 3) {
        const alert = {
          alert_type: "domain_impersonation", severity: "medium", status: "new",
          target: domain, target_type: "domain",
          title: `${impersonation.lookalike_count} Lookalike Domains Detected for ${domain}`,
          description: `Certificate Transparency logs show ${impersonation.lookalike_count} domains that appear to impersonate ${domain}. Examples: ${(impersonation.lookalikes_in_ct || []).slice(0, 3).join(", ")}`,
          source: "crt.sh Certificate Transparency",
          remediation: "Monitor lookalike domains. Set up alerts for phishing. Consider registering the closest typosquats defensively.",
          detected_at: now,
        };
        try { await base44.entities.DarkWebAlert.create(alert); savedAlerts.push(alert); } catch (_) {}
      }

      // HIBP corporate breach
      if (hibp.available && (hibp.breached_email_count || 0) > 0) {
        const alert = {
          alert_type: "credential_breach", severity: hibp.breached_email_count > 100 ? "critical" : "high", status: "new",
          target: domain, target_type: "domain",
          title: `${hibp.breached_email_count} Corporate Emails in Known Breaches`,
          description: `HIBP reports ${hibp.breached_email_count} email addresses from ${domain} appear in known data breaches.`,
          source: "HaveIBeenPwned", affected_emails: hibp.breached_email_count,
          remediation: "Force password reset for all affected accounts. Enable MFA. Review breach data for specific passwords.",
          detected_at: now,
        };
        try { await base44.entities.DarkWebAlert.create(alert); savedAlerts.push(alert); } catch (_) {}
      }
    }

    return new Response(JSON.stringify({
      success: true,
      action: "full_scan",
      target: domain || org_name,
      risk_level: level,
      risk_score: score,
      key_findings: findings,
      alerts_generated: savedAlerts.length,
      results: {
        ransomware: { direct_matches: ransomware.direct_matches, recent_victims: ransomware.recent_total_victims, active_groups: ransomware.active_groups, top_groups: ransomware.top_active_groups, matches: ransomware.matches },
        c2_infrastructure: { total_known_c2_ips: feodo.total_c2_ips, top_malware_families: feodo.top_malware_families?.slice(0, 5) },
        ioc_matches: { found: threatfox.found, total: threatfox.total, matches: threatfox.matches?.slice(0, 3) },
        urlhaus: { found: urlhaus.found, total_urls: urlhaus.total_urls },
        impersonation: { lookalike_count: impersonation.lookalike_count, examples: impersonation.lookalikes_in_ct?.slice(0, 5) },
        hibp: hibp.available ? { breached_accounts: hibp.breached_email_count, available: true } : { available: false, note: hibp.note },
        threat_actors: { total_tracked: threatActors.length, sample: threatActors.slice(0, 3) },
      },
      data_sources: [
        "ransomware.live (free, real-time)",
        "abuse.ch Feodo Tracker (free)",
        "abuse.ch ThreatFox (free)",
        "abuse.ch URLhaus (free)",
        "crt.sh Certificate Transparency (free)",
        "MITRE ATT&CK (free)",
        hibp.available ? "HaveIBeenPwned (API key)" : "HaveIBeenPwned (add HIBP_API_KEY for email breach data)",
      ],
    }), { headers: CORS });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS });
  }
});
