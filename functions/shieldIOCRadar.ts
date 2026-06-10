// shieldIOCRadar.ts — Real-time IOC Lookup & Enrichment Engine
// Aggregates: AbuseIPDB, URLScan.io, MalwareBazaar, OTX AlienVault, VirusTotal
// Supports: IPv4, IPv6, Domain, URL, MD5/SHA1/SHA256 hash

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { indicator, type } = body;

    if (!indicator) {
      return new Response(JSON.stringify({ error: "indicator is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const detectedType = type || detectIndicatorType(indicator);
    console.log(`[IOC Radar] Analyzing ${detectedType}: ${indicator}`);

    const results = await Promise.allSettled([
      enrichWithAbuseIPDB(indicator, detectedType),
      enrichWithURLScan(indicator, detectedType),
      enrichWithMalwareBazaar(indicator, detectedType),
      enrichWithOTX(indicator, detectedType),
      enrichWithVirusTotal(indicator, detectedType),
    ]);

    const sources: Record<string, any> = {};
    const sourceNames = ["abuseipdb", "urlscan", "malwarebazaar", "otx", "virustotal"];

    let totalMalicious = 0;
    let totalSources = 0;
    let maxConfidence = 0;
    const tags: string[] = [];
    const relatedIndicators: string[] = [];

    results.forEach((result, i) => {
      const name = sourceNames[i];
      if (result.status === "fulfilled" && result.value) {
        sources[name] = result.value;
        if (result.value.malicious) totalMalicious++;
        if (result.value.confidence) maxConfidence = Math.max(maxConfidence, result.value.confidence);
        if (result.value.tags) tags.push(...result.value.tags);
        if (result.value.related) relatedIndicators.push(...result.value.related);
        totalSources++;
      } else {
        sources[name] = { error: result.status === "rejected" ? result.reason?.message : "no data" };
      }
    });

    const uniqueTags = [...new Set(tags)];
    const uniqueRelated = [...new Set(relatedIndicators)].slice(0, 10);

    const threatScore = calculateThreatScore(totalMalicious, totalSources, maxConfidence, uniqueTags);
    const verdict = getVerdict(threatScore);
    const signalStrength = getSignalStrength(totalSources, totalMalicious);

    const response = {
      indicator,
      type: detectedType,
      analyzed_at: new Date().toISOString(),
      verdict,
      threat_score: threatScore,
      signal_strength: signalStrength,
      malicious_sources: totalMalicious,
      total_sources_checked: totalSources,
      confidence: maxConfidence,
      tags: uniqueTags,
      related_indicators: uniqueRelated,
      sources,
      recommended_action: getRecommendedAction(verdict, detectedType),
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[IOC Radar] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

function detectIndicatorType(indicator: string): string {
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(indicator)) return "ip";
  if (/^[a-fA-F0-9]{64}$/.test(indicator)) return "sha256";
  if (/^[a-fA-F0-9]{40}$/.test(indicator)) return "sha1";
  if (/^[a-fA-F0-9]{32}$/.test(indicator)) return "md5";
  if (/^https?:\/\//.test(indicator)) return "url";
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(indicator)) return "domain";
  return "unknown";
}

async function enrichWithAbuseIPDB(indicator: string, type: string): Promise<any> {
  if (type !== "ip") return null;
  const apiKey = Deno.env.get("ABUSEIPDB_API_KEY");
  if (!apiKey) return { note: "Add ABUSEIPDB_API_KEY for full IP abuse data", limited: true };
  const res = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(indicator)}&maxAgeInDays=90&verbose`, {
    headers: { "Key": apiKey, "Accept": "application/json" }
  });
  if (!res.ok) return { error: `AbuseIPDB HTTP ${res.status}` };
  const data = await res.json();
  const d = data.data || {};
  return {
    malicious: d.abuseConfidenceScore > 25,
    confidence: d.abuseConfidenceScore || 0,
    total_reports: d.totalReports || 0,
    country: d.countryCode,
    isp: d.isp,
    usage_type: d.usageType,
    domain: d.domain,
    is_tor: d.isTor,
    is_proxy: d.isProxy,
    last_reported: d.lastReportedAt,
    tags: d.abuseConfidenceScore > 75 ? ["high-abuse", "malicious-ip"] : d.abuseConfidenceScore > 25 ? ["suspicious-ip"] : [],
    source: "abuseipdb",
  };
}

async function enrichWithURLScan(indicator: string, type: string): Promise<any> {
  if (!["domain", "url", "ip"].includes(type)) return null;
  const query = type === "url" ? `page.url:"${indicator}"` : type === "ip" ? `page.ip:${indicator}` : `domain:${indicator}`;
  const res = await fetch(`https://urlscan.io/api/v1/search/?q=${encodeURIComponent(query)}&size=5`, { headers: { "Accept": "application/json" } });
  if (!res.ok) return { error: `URLScan HTTP ${res.status}` };
  const data = await res.json();
  const results = data.results || [];
  const maliciousResults = results.filter((r: any) => r.verdicts?.overall?.malicious || r.verdicts?.urlscan?.score > 50);
  const tags: string[] = [];
  const related: string[] = [];
  results.forEach((r: any) => {
    if (r.page?.domain && r.page.domain !== indicator) related.push(r.page.domain);
    if (r.verdicts?.urlscan?.categories) tags.push(...r.verdicts.urlscan.categories);
  });
  return {
    malicious: maliciousResults.length > 0,
    confidence: maliciousResults.length > 0 ? 70 : 10,
    total_scans: results.length,
    malicious_scans: maliciousResults.length,
    most_recent_scan: results[0]?.task?.time || null,
    screenshot_url: results[0]?.screenshot || null,
    tags: [...new Set(tags)].slice(0, 5),
    related: [...new Set(related)].slice(0, 5),
    source: "urlscan.io",
  };
}

async function enrichWithMalwareBazaar(indicator: string, type: string): Promise<any> {
  if (!["md5", "sha1", "sha256"].includes(type)) return null;
  const res = await fetch("https://mb-api.abuse.ch/api/v1/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `query=get_info&hash=${indicator}`
  });
  if (!res.ok) return { error: `MalwareBazaar HTTP ${res.status}` };
  const data = await res.json();
  if (data.query_status !== "ok" || !data.data?.[0]) return { malicious: false, found: false, source: "malwarebazaar" };
  const sample = data.data[0];
  return {
    malicious: true, found: true, confidence: 95,
    file_name: sample.file_name, file_type: sample.file_type,
    signature: sample.signature, malware_family: sample.tags?.join(", "),
    first_seen: sample.first_seen, tags: sample.tags || [],
    source: "malwarebazaar",
  };
}

async function enrichWithOTX(indicator: string, type: string): Promise<any> {
  const typeMap: Record<string, string> = { ip: "IPv4", domain: "domain", url: "url", md5: "file", sha1: "file", sha256: "file" };
  const otxType = typeMap[type];
  if (!otxType) return null;
  const endpoint = type === "url"
    ? `https://otx.alienvault.com/api/v1/indicators/url/${encodeURIComponent(indicator)}/general`
    : `https://otx.alienvault.com/api/v1/indicators/${otxType}/${encodeURIComponent(indicator)}/general`;
  const headers: Record<string, string> = { "Accept": "application/json" };
  const apiKey = Deno.env.get("OTX_API_KEY");
  if (apiKey) headers["X-OTX-API-KEY"] = apiKey;
  const res = await fetch(endpoint, { headers });
  if (!res.ok) return { error: `OTX HTTP ${res.status}` };
  const data = await res.json();
  const pulseCount = data.pulse_info?.count || 0;
  const pulses = data.pulse_info?.pulses || [];
  const tags: string[] = [];
  pulses.slice(0, 5).forEach((p: any) => {
    if (p.tags) tags.push(...p.tags);
    if (p.malware_families) tags.push(...p.malware_families.map((m: any) => m.display_name));
  });
  return {
    malicious: pulseCount > 0,
    confidence: Math.min(pulseCount * 15, 95),
    pulse_count: pulseCount,
    country: data.country_name,
    asn: data.asn,
    adversary: pulses[0]?.adversary || null,
    malware_families: [...new Set(pulses.flatMap((p: any) => p.malware_families?.map((m: any) => m.display_name) || []))].slice(0, 5),
    tags: [...new Set(tags)].slice(0, 8),
    source: "alienvault-otx",
  };
}

async function enrichWithVirusTotal(indicator: string, type: string): Promise<any> {
  const apiKey = Deno.env.get("VIRUSTOTAL_API_KEY");
  if (!apiKey) return { note: "Add VIRUSTOTAL_API_KEY for VirusTotal enrichment", limited: true };
  const typeMap: Record<string, string> = { ip: "ip_addresses", domain: "domains", url: "urls", md5: "files", sha1: "files", sha256: "files" };
  const vtType = typeMap[type];
  if (!vtType) return null;
  const endpoint = type === "url"
    ? `https://www.virustotal.com/api/v3/urls/${btoa(indicator).replace(/=/g, "")}`
    : `https://www.virustotal.com/api/v3/${vtType}/${indicator}`;
  const res = await fetch(endpoint, { headers: { "x-apikey": apiKey, "Accept": "application/json" } });
  if (!res.ok) return { error: `VirusTotal HTTP ${res.status}` };
  const data = await res.json();
  const stats = data.data?.attributes?.last_analysis_stats || {};
  const maliciousCount = stats.malicious || 0;
  const totalEngines = Object.values(stats).reduce((a: any, b: any) => a + b, 0) as number;
  return {
    malicious: maliciousCount > 3,
    confidence: totalEngines > 0 ? Math.round((maliciousCount / totalEngines) * 100) : 0,
    malicious_engines: maliciousCount,
    total_engines: totalEngines,
    tags: data.data?.attributes?.tags || [],
    source: "virustotal",
  };
}

function calculateThreatScore(malicious: number, total: number, confidence: number, tags: string[]): number {
  if (total === 0) return 0;
  const baseScore = (malicious / Math.max(total, 1)) * 60;
  const confidenceBoost = (confidence / 100) * 25;
  const tagBoost = Math.min(tags.length * 2, 15);
  return Math.min(Math.round(baseScore + confidenceBoost + tagBoost), 100);
}

function getVerdict(score: number): string {
  if (score >= 75) return "MALICIOUS";
  if (score >= 50) return "SUSPICIOUS";
  if (score >= 25) return "POTENTIALLY_UNWANTED";
  if (score >= 10) return "INFORMATIONAL";
  return "CLEAN";
}

function getSignalStrength(total: number, malicious: number): string {
  if (total >= 4 && malicious >= 3) return "Very Strong";
  if (total >= 3 && malicious >= 2) return "Strong";
  if (total >= 2 && malicious >= 1) return "Moderate";
  if (malicious >= 1) return "Slightly Noisy";
  return "Noisy";
}

function getRecommendedAction(verdict: string, type: string): string {
  const actions: Record<string, Record<string, string>> = {
    MALICIOUS: {
      ip: "Block immediately in firewall. Investigate all connections from this IP in your logs.",
      domain: "Block at DNS resolver. Check all systems for connections to this domain.",
      url: "Block URL in proxy/web filter. Scan endpoints that accessed this URL.",
      hash: "Quarantine file immediately. Run memory scan on affected hosts.",
      default: "Immediate investigation required. Treat as active threat.",
    },
    SUSPICIOUS: {
      ip: "Monitor closely. Block if no legitimate business reason for the connection.",
      domain: "Investigate DNS queries. Consider blocking.",
      url: "Review web proxy logs. Block if no business justification.",
      hash: "Submit to sandbox for dynamic analysis before executing.",
      default: "Investigate further before taking action.",
    },
    CLEAN: { default: "No threat detected. Continue monitoring." },
  };
  return (actions[verdict]?.[type] || actions[verdict]?.default || actions["CLEAN"].default);
}
