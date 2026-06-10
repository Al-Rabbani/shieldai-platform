// shieldDarkWebMonitor.ts — Dark Web & Credential Leak Intelligence Engine
// Real sources: HaveIBeenPwned, Ransomware.live, abuse.ch (Feodo/URLhaus), MITRE ATT&CK

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action, domain, email, org_name } = body;

    if (!action) {
      return new Response(JSON.stringify({
        error: "action required",
        actions: ["domain_breach", "ransomware_check", "c2_check", "stealer_logs", "threat_actors", "full_scan"]
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result: any = { scanned_at: new Date().toISOString() };

    if (action === "domain_breach" || action === "full_scan") {
      if (domain) result.domain_breaches = await checkDomainBreaches(domain);
    }
    if (action === "ransomware_check" || action === "full_scan") {
      const target = org_name || domain;
      if (target) result.ransomware_intel = await checkRansomwareIntel(target);
    }
    if (action === "c2_check" || action === "full_scan") {
      result.c2_intel = await fetchC2ThreatFeeds();
    }
    if (action === "stealer_logs" || action === "full_scan") {
      if (domain || email) result.stealer_exposure = await checkStealerExposure(domain || "", email || "");
    }
    if (action === "threat_actors" || action === "full_scan") {
      result.threat_actors = await fetchActiveThreatActors();
    }

    result.risk_summary = calculateDarkWebRisk(result);

    // Persist critical findings to DB
    if (result.risk_summary.risk_level === "CRITICAL" || result.risk_summary.risk_level === "HIGH") {
      await persistFindings(base44, result, domain || org_name || "unknown");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[DarkWeb Monitor] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

// ─── HAVEIBEENPWNED ───────────────────────────────────────────────
async function checkDomainBreaches(domain: string): Promise<any> {
  const headers: Record<string, string> = {
    "User-Agent": "ShieldAI-Security-Platform",
    "Accept": "application/json",
  };
  const hibpKey = Deno.env.get("HIBP_API_KEY");
  if (hibpKey) headers["hibp-api-key"] = hibpKey;

  const [breachRes, pasteRes] = await Promise.allSettled([
    fetch(`https://haveibeenpwned.com/api/v3/breaches?domain=${encodeURIComponent(domain)}`, { headers }),
    fetch(`https://haveibeenpwned.com/api/v3/pasteaccount/${encodeURIComponent(`@${domain}`)}`, { headers }),
  ]);

  const breaches: any[] = [];
  if (breachRes.status === "fulfilled" && breachRes.value.ok) {
    const data = await breachRes.value.json().catch(() => []);
    if (Array.isArray(data)) {
      breaches.push(...data.map((b: any) => ({
        name: b.Name, breach_date: b.BreachDate, added_date: b.AddedDate,
        pwn_count: b.PwnCount, data_classes: b.DataClasses,
        is_verified: b.IsVerified, is_sensitive: b.IsSensitive,
        description: b.Description?.replace(/<[^>]*>/g, "").substring(0, 300),
      })));
    }
  }

  const pastes: any[] = [];
  if (pasteRes.status === "fulfilled" && pasteRes.value.ok) {
    const data = await pasteRes.value.json().catch(() => []);
    if (Array.isArray(data)) {
      pastes.push(...data.slice(0, 10).map((p: any) => ({
        source: p.Source, id: p.Id, title: p.Title, date: p.Date, email_count: p.EmailCount,
      })));
    }
  }

  const totalRecords = breaches.reduce((sum, b) => sum + (b.pwn_count || 0), 0);
  const sortedBreaches = breaches.sort((a, b) => new Date(b.breach_date).getTime() - new Date(a.breach_date).getTime());

  return {
    domain, total_breaches: breaches.length, total_exposed_records: totalRecords,
    total_pastes: pastes.length, breaches: sortedBreaches.slice(0, 20), pastes: pastes.slice(0, 5),
    most_recent_breach: sortedBreaches[0]?.breach_date || null,
    data_types_exposed: [...new Set(breaches.flatMap((b) => b.data_classes || []))],
    source: "haveibeenpwned",
    requires_key: !hibpKey,
    note: !hibpKey ? "Add HIBP_API_KEY for email-level lookups" : null,
  };
}

// ─── RANSOMWARE.LIVE ──────────────────────────────────────────────
async function checkRansomwareIntel(orgName: string): Promise<any> {
  const [victimsRes, groupsRes] = await Promise.allSettled([
    fetch("https://api.ransomware.live/recentvictims", {
      headers: { "Accept": "application/json", "User-Agent": "ShieldAI-Security-Platform" }
    }),
    fetch("https://api.ransomware.live/groups", {
      headers: { "Accept": "application/json", "User-Agent": "ShieldAI-Security-Platform" }
    }),
  ]);

  const victims: any[] = [];
  if (victimsRes.status === "fulfilled" && victimsRes.value.ok) {
    const data = await victimsRes.value.json().catch(() => []);
    if (Array.isArray(data)) victims.push(...data.slice(0, 300));
  }

  const groups: any[] = [];
  if (groupsRes.status === "fulfilled" && groupsRes.value.ok) {
    const data = await groupsRes.value.json().catch(() => []);
    if (Array.isArray(data)) groups.push(...data);
  }

  const orgLower = orgName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const matches = victims.filter((v: any) => {
    const name = (v.victim || v.post_title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const site = (v.website || v.url || "").toLowerCase();
    return name.includes(orgLower.substring(0, Math.min(orgLower.length, 6))) || site.includes(orgName.toLowerCase());
  });

  const activeGroups = groups
    .filter((g: any) => g.name && (g.recentvictims || 0) > 0)
    .sort((a: any, b: any) => (b.recentvictims || 0) - (a.recentvictims || 0))
    .slice(0, 10)
    .map((g: any) => ({
      name: g.name,
      recent_victims: g.recentvictims || 0,
      total_victims: g.totalvictims || 0,
      description: g.description?.substring(0, 200),
    }));

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentVictims = victims
    .filter((v: any) => {
      const d = new Date(v.published || v.date || "");
      return !isNaN(d.getTime()) && d.getTime() > thirtyDaysAgo;
    })
    .slice(0, 20)
    .map((v: any) => ({
      name: v.victim || v.post_title, group: v.group_name || v.group,
      date: v.published || v.date, country: v.country, sector: v.activity || v.sector,
    }));

  return {
    org_searched: orgName, direct_matches: matches.length,
    matched_victims: matches.slice(0, 5).map((v: any) => ({
      name: v.victim || v.post_title, group: v.group_name || v.group, date: v.published || v.date,
    })),
    active_ransomware_groups: activeGroups,
    recent_global_victims: recentVictims,
    total_groups_tracked: groups.length,
    total_victims_tracked: victims.length,
    source: "ransomware.live",
  };
}

// ─── ABUSE.CH C2 FEEDS ────────────────────────────────────────────
async function fetchC2ThreatFeeds(): Promise<any> {
  const [feodoRes, urlhausRes] = await Promise.allSettled([
    fetch("https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.json", {
      headers: { "User-Agent": "ShieldAI-Security-Platform" }
    }),
    fetch("https://urlhaus-api.abuse.ch/v1/urls/recent/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "limit=20"
    }),
  ]);

  const c2IPs: any[] = [];
  if (feodoRes.status === "fulfilled" && feodoRes.value.ok) {
    const data = await feodoRes.value.json().catch(() => ({ blocklist: [] }));
    c2IPs.push(...(data.blocklist || []).slice(0, 30).map((e: any) => ({
      ip: e.ip_address, port: e.port, malware: e.malware,
      first_seen: e.first_seen, country: e.country,
    })));
  }

  const maliciousURLs: any[] = [];
  if (urlhausRes.status === "fulfilled" && urlhausRes.value.ok) {
    const data = await urlhausRes.value.json().catch(() => ({ urls: [] }));
    maliciousURLs.push(...(data.urls || []).slice(0, 20).map((u: any) => ({
      url: u.url, status: u.url_status, threat: u.threat, tags: u.tags, date_added: u.date_added,
    })));
  }

  return {
    active_c2_ips: c2IPs.length,
    c2_ips_sample: c2IPs.slice(0, 10),
    recent_malicious_urls: maliciousURLs,
    malware_families_active: [...new Set(c2IPs.map((ip) => ip.malware).filter(Boolean))],
    sources: ["feodotracker.abuse.ch", "urlhaus.abuse.ch"],
    last_updated: new Date().toISOString(),
  };
}

// ─── STEALER LOG CHECK ────────────────────────────────────────────
async function checkStealerExposure(domain: string, email: string): Promise<any> {
  const hibpKey = Deno.env.get("HIBP_API_KEY");
  const leakCheckKey = Deno.env.get("LEAKCHECK_API_KEY");

  if (leakCheckKey) {
    const target = email || domain;
    const checkType = email ? "email" : "domain";
    const res = await fetch(`https://leakcheck.io/api/v2/query/${encodeURIComponent(target)}?type=${checkType}`, {
      headers: { "X-API-Key": leakCheckKey, "Accept": "application/json" }
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        found: data.found || false, count: data.count || 0,
        sources: data.sources?.slice(0, 10) || [],
        has_passwords: data.sources?.some((s: any) => s.password || s.password_hash) || false,
        has_cookies: data.sources?.some((s: any) => s.cookie || s.session_token) || false,
        source: "leakcheck.io",
      };
    }
  }

  if (hibpKey && email) {
    const res = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`, {
      headers: { "User-Agent": "ShieldAI-Security-Platform", "Accept": "application/json", "hibp-api-key": hibpKey }
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json().catch(() => []);
      return {
        email_compromised: Array.isArray(data) && data.length > 0,
        breach_count: Array.isArray(data) ? data.length : 0,
        breaches: Array.isArray(data) ? data.slice(0, 5).map((b: any) => ({ name: b.Name, date: b.BreachDate, data_classes: b.DataClasses })) : [],
        source: "haveibeenpwned",
      };
    }
  }

  return {
    note: "Add HIBP_API_KEY or LEAKCHECK_API_KEY for credential exposure data",
    limited: true,
  };
}

// ─── MITRE ATT&CK THREAT ACTORS ──────────────────────────────────
async function fetchActiveThreatActors(): Promise<any[]> {
  const res = await fetch("https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json", {
    headers: { "User-Agent": "ShieldAI-Security-Platform" }
  }).catch(() => null);
  if (!res?.ok) return [];
  const data = await res.json().catch(() => ({ objects: [] }));
  const groups = data.objects?.filter((o: any) => o.type === "intrusion-set") || [];
  return groups.slice(0, 20).map((g: any) => ({
    name: g.name,
    aliases: g.aliases?.slice(0, 3) || [],
    description: g.description?.substring(0, 200),
    mitre_id: g.external_references?.find((r: any) => r.source_name === "mitre-attack")?.external_id,
    modified: g.modified,
  }));
}

// ─── RISK SCORE ───────────────────────────────────────────────────
function calculateDarkWebRisk(result: any): any {
  let score = 0;
  const findings: string[] = [];
  if (result.domain_breaches) {
    const db = result.domain_breaches;
    if (db.total_breaches > 10) { score += 30; findings.push(`${db.total_breaches} breaches exposing ${db.total_exposed_records?.toLocaleString()} records`); }
    else if (db.total_breaches > 3) { score += 20; findings.push(`${db.total_breaches} data breaches detected`); }
    else if (db.total_breaches > 0) { score += 10; findings.push(`${db.total_breaches} historical breach(es)`); }
    if (db.total_pastes > 0) { score += 5; findings.push(`${db.total_pastes} paste(s) containing domain addresses`); }
  }
  if (result.ransomware_intel?.direct_matches > 0) {
    score += 40;
    findings.push(`RANSOMWARE: Org found in ${result.ransomware_intel.direct_matches} victim record(s)`);
  }
  if (result.stealer_exposure?.found) {
    score += 25;
    findings.push(`Credentials in ${result.stealer_exposure.count} stealer log source(s)`);
    if (result.stealer_exposure.has_passwords) findings.push("Plaintext passwords detected");
    if (result.stealer_exposure.has_cookies) findings.push("Session cookies/tokens detected");
  }
  const risk_level = score >= 60 ? "CRITICAL" : score >= 40 ? "HIGH" : score >= 20 ? "MEDIUM" : score >= 5 ? "LOW" : "CLEAN";
  return {
    risk_level, risk_score: Math.min(score, 100), key_findings: findings,
    recommended_actions: score >= 40
      ? ["URGENT: Force password reset for all breached accounts", "Invalidate all active sessions", "Engage incident response team", "Rotate all API keys and credentials"]
      : ["Enroll in continuous breach monitoring", "Enforce MFA across all accounts", "Implement HIBP-backed password policy"],
  };
}

// ─── PERSIST TO DB ────────────────────────────────────────────────
async function persistFindings(base44: any, result: any, target: string): Promise<void> {
  try {
    const svc = base44.asServiceRole;
    const now = new Date().toISOString();
    if (result.domain_breaches?.total_breaches > 0) {
      await svc.entities.ThreatIntelFeed.create({
        title: `Dark Web: ${result.domain_breaches.total_breaches} Credential Breaches for ${target}`,
        feed_type: "credential_leak", severity: result.domain_breaches.total_breaches > 10 ? "critical" : "high",
        description: `${result.domain_breaches.total_breaches} breaches exposing ${result.domain_breaches.total_exposed_records?.toLocaleString()} records. Data: ${result.domain_breaches.data_types_exposed?.join(", ")}.`,
        source: "haveibeenpwned", affects_you: true, affected_asset: target,
        action_required: "Force password reset and audit all accounts for this domain",
        published_at: result.domain_breaches.most_recent_breach || now, detected_at: now,
      });
    }
    if (result.ransomware_intel?.direct_matches > 0) {
      await svc.entities.ThreatIntelFeed.create({
        title: `RANSOMWARE ALERT: ${target} appears in victim database`,
        feed_type: "ransomware", severity: "critical",
        description: `Org found in ransomware.live victim records. Matches: ${result.ransomware_intel.direct_matches}`,
        source: "ransomware.live", affects_you: true, affected_asset: target,
        action_required: "Immediately engage IR team. Review for data exfiltration indicators.",
        published_at: now, detected_at: now,
      });
    }
    console.log(`[DarkWeb Monitor] Persisted findings for ${target}`);
  } catch (err) {
    console.error("[DarkWeb Monitor] Failed to persist:", err);
  }
}
