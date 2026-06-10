// shieldBrandProtection.ts — Brand Protection & Phishing Intelligence Engine
// Real data sources:
//   - URLScan.io (newly registered/scanned domains)
//   - PhishTank API (phishing URL database)
//   - OpenPhish (live phishing feed)
//   - CertStream / crt.sh (SSL cert transparency — new domain detection)
//   - GitHub Code Search (brand/IP leak in public repos)
//   - Social media impersonation (Twitter/X, LinkedIn)

import { createClient } from "https://esm.sh/@base44/sdk@0.1.9/mod.js";

const base44 = createClient({ appId: Deno.env.get("SHIELD_APP_ID") || "6a22a773bb173a975d8337f9" });

export default async function handler(req: Request): Promise<Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { action, brand_name, domain, keywords } = body;

    if (!action || (!brand_name && !domain)) {
      return new Response(JSON.stringify({
        error: "action and brand_name or domain required",
        actions: ["typosquat_scan", "phishing_scan", "cert_monitor", "repo_leak_scan", "full_scan"]
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const baseDomain = domain || `${brand_name?.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
    const brandNameClean = brand_name || domain?.split(".")[0] || "";

    const result: any = {
      brand: brandNameClean,
      domain: baseDomain,
      scanned_at: new Date().toISOString(),
    };

    if (action === "typosquat_scan" || action === "full_scan") {
      result.typosquatting = await detectTyposquatting(baseDomain, brandNameClean);
    }

    if (action === "phishing_scan" || action === "full_scan") {
      result.phishing_intel = await checkPhishingIntel(baseDomain, brandNameClean);
    }

    if (action === "cert_monitor" || action === "full_scan") {
      result.cert_transparency = await scanCertTransparency(brandNameClean);
    }

    if (action === "repo_leak_scan" || action === "full_scan") {
      result.repo_leaks = await scanRepoLeaks(brandNameClean, keywords || []);
    }

    if (action === "full_scan") {
      result.urlscan_results = await searchURLScanForBrand(brandNameClean);
    }

    // Risk summary
    result.risk_summary = calculateBrandRisk(result);

    // Persist critical findings
    if (result.risk_summary.risk_level === "CRITICAL" || result.risk_summary.risk_level === "HIGH") {
      await persistBrandFindings(result, brandNameClean, baseDomain);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[Brand Protection] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

// ─── TYPOSQUATTING DETECTION ─────────────────────────────────────
async function detectTyposquatting(baseDomain: string, brandName: string): Promise<any> {
  const domainParts = baseDomain.split(".");
  const tld = domainParts.slice(1).join(".");
  const base = domainParts[0];

  // Generate typosquat variants
  const variants = generateTyposquatVariants(base, tld, brandName);

  // Check via URLScan.io
  const checkedDomains: any[] = [];
  const batchSize = 5;

  for (let i = 0; i < Math.min(variants.length, 30); i += batchSize) {
    const batch = variants.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (variant) => {
        const res = await fetch(
          `https://urlscan.io/api/v1/search/?q=domain:${variant}&size=3`,
          { headers: { "Accept": "application/json" } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        const scans = data.results || [];
        if (scans.length > 0) {
          const malicious = scans.some((s: any) => s.verdicts?.overall?.malicious);
          return {
            domain: variant,
            type: "typosquat",
            registered: true,
            malicious,
            scan_count: scans.length,
            last_scanned: scans[0]?.task?.time,
            screenshot: scans[0]?.screenshot,
            verdict: malicious ? "MALICIOUS" : "REGISTERED",
          };
        }
        return null;
      })
    );

    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value) checkedDomains.push(r.value);
    });
    await new Promise(r => setTimeout(r, 200));
  }

  // Also check via crt.sh for recently issued certs
  const recentCerts = await checkCRTForVariants(brandName, variants.slice(0, 10));

  const maliciousDomains = checkedDomains.filter(d => d.malicious);
  const registeredDomains = checkedDomains.filter(d => d.registered);

  return {
    base_domain: baseDomain,
    variants_checked: Math.min(variants.length, 30),
    total_variants_possible: variants.length,
    registered_domains: registeredDomains.length,
    malicious_domains: maliciousDomains.length,
    domains: checkedDomains,
    recent_cert_issuances: recentCerts,
    variant_types: ["character-omission", "character-addition", "character-swap", "homograph", "tld-swap", "prefix-suffix"],
  };
}

function generateTyposquatVariants(base: string, tld: string, brandName: string): string[] {
  const variants = new Set<string>();
  const chars = base.split("");

  // Character omission (drop each char)
  for (let i = 0; i < chars.length; i++) {
    const omitted = [...chars.slice(0, i), ...chars.slice(i + 1)].join("");
    if (omitted.length > 2) variants.add(`${omitted}.${tld}`);
  }

  // Character duplication
  for (let i = 0; i < chars.length; i++) {
    const dup = [...chars.slice(0, i), chars[i], ...chars.slice(i)].join("");
    variants.add(`${dup}.${tld}`);
  }

  // Character swap (adjacent)
  for (let i = 0; i < chars.length - 1; i++) {
    const swapped = [...chars];
    [swapped[i], swapped[i + 1]] = [swapped[i + 1], swapped[i]];
    variants.add(`${swapped.join("")}.${tld}`);
  }

  // Homograph replacements
  const homographs: Record<string, string> = { a: "а", e: "е", o: "о", i: "і", l: "1", "0": "o" };
  for (let i = 0; i < chars.length; i++) {
    if (homographs[chars[i]]) {
      const hg = [...chars];
      hg[i] = homographs[chars[i]];
      variants.add(`${hg.join("")}.${tld}`);
    }
  }

  // TLD swaps
  const commonTLDs = ["com", "net", "org", "io", "co", "info", "biz", "online"];
  commonTLDs.forEach(t => { if (t !== tld) variants.add(`${base}.${t}`); });

  // Prefix/suffix patterns
  const affixes = ["secure", "login", "account", "verify", "support", "help", "official", "real", "my", "app"];
  affixes.forEach(a => {
    variants.add(`${a}-${base}.${tld}`);
    variants.add(`${base}-${a}.${tld}`);
    variants.add(`${a}${base}.${tld}`);
  });

  // Brand + keyword combos
  const extra = ["signin", "portal", "update", "alert", "now"];
  extra.forEach(e => {
    variants.add(`${base}${e}.${tld}`);
    variants.add(`${e}${base}.${tld}`);
  });

  return [...variants].filter(v => v !== `${base}.${tld}`);
}

async function checkCRTForVariants(brandName: string, variants: string[]): Promise<any[]> {
  try {
    const res = await fetch(
      `https://crt.sh/?q=%25${encodeURIComponent(brandName)}%25&output=json`,
      { headers: { "Accept": "application/json" } }
    );
    if (!res.ok) return [];
    const data = await res.json().catch(() => []);

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return (Array.isArray(data) ? data : [])
      .filter((cert: any) => {
        const d = new Date(cert.entry_timestamp || "");
        return !isNaN(d.getTime()) && d.getTime() > thirtyDaysAgo;
      })
      .slice(0, 20)
      .map((cert: any) => ({
        domain: cert.common_name || cert.name_value,
        issuer: cert.issuer_ca_id,
        issued_at: cert.entry_timestamp,
        cert_id: cert.id,
        is_suspicious: variants.some(v => (cert.common_name || "").toLowerCase().includes(v.split(".")[0])),
      }))
      .filter((c: any) => c.domain !== `${brandName.toLowerCase()}.com`);
  } catch {
    return [];
  }
}

// ─── PHISHING INTEL ───────────────────────────────────────────────
async function checkPhishingIntel(domain: string, brandName: string): Promise<any> {
  const [phishtankRes, openphishRes, urlscanPhishRes] = await Promise.allSettled([
    checkPhishTank(domain, brandName),
    checkOpenPhish(brandName),
    searchURLScanPhishing(brandName),
  ]);

  const results: any = { sources: {} };

  if (phishtankRes.status === "fulfilled") results.sources.phishtank = phishtankRes.value;
  if (openphishRes.status === "fulfilled") results.sources.openphish = openphishRes.value;
  if (urlscanPhishRes.status === "fulfilled") results.sources.urlscan_phish = urlscanPhishRes.value;

  const totalPhishing = [
    results.sources.phishtank?.count || 0,
    results.sources.openphish?.mentions || 0,
    results.sources.urlscan_phish?.phishing_scans || 0,
  ].reduce((a, b) => a + b, 0);

  return {
    total_phishing_detections: totalPhishing,
    brand_targeted: totalPhishing > 0,
    ...results,
  };
}

async function checkPhishTank(domain: string, brandName: string): Promise<any> {
  const phishtankKey = Deno.env.get("PHISHTANK_API_KEY");
  // PhishTank has a free public feed (no auth for basic)
  try {
    const res = await fetch(`https://checkurl.phishtank.com/checkurl/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `url=${encodeURIComponent(`https://${domain}`)}&format=json${phishtankKey ? `&app_key=${phishtankKey}` : ""}`,
    });
    if (!res.ok) return { error: `PhishTank HTTP ${res.status}`, count: 0 };
    const data = await res.json();
    return {
      is_phish: data.results?.in_database && data.results?.verified,
      in_database: data.results?.in_database || false,
      verified: data.results?.verified || false,
      url: data.url,
      count: (data.results?.in_database && data.results?.verified) ? 1 : 0,
      source: "phishtank",
    };
  } catch {
    return { count: 0, source: "phishtank", error: "unavailable" };
  }
}

async function checkOpenPhish(brandName: string): Promise<any> {
  try {
    const res = await fetch("https://openphish.com/feed.txt", {
      headers: { "User-Agent": "ShieldAI-Security-Platform" }
    });
    if (!res.ok) return { mentions: 0, source: "openphish" };
    const text = await res.text();
    const lines = text.split("\n").filter(l => l.trim());
    const mentions = lines.filter(l => l.toLowerCase().includes(brandName.toLowerCase()));
    return {
      mentions: mentions.length,
      sample_urls: mentions.slice(0, 5),
      total_feed_size: lines.length,
      source: "openphish",
    };
  } catch {
    return { mentions: 0, source: "openphish", error: "unavailable" };
  }
}

async function searchURLScanPhishing(brandName: string): Promise<any> {
  try {
    const res = await fetch(
      `https://urlscan.io/api/v1/search/?q=page.title:"${encodeURIComponent(brandName)}" AND verdicts.overall.malicious:true&size=10`,
      { headers: { "Accept": "application/json" } }
    );
    if (!res.ok) return { phishing_scans: 0, source: "urlscan" };
    const data = await res.json();
    const results = data.results || [];
    return {
      phishing_scans: results.length,
      total_results: data.total || 0,
      samples: results.slice(0, 5).map((r: any) => ({
        url: r.page?.url,
        domain: r.page?.domain,
        scanned: r.task?.time,
        screenshot: r.screenshot,
        score: r.verdicts?.urlscan?.score,
      })),
      source: "urlscan.io",
    };
  } catch {
    return { phishing_scans: 0, source: "urlscan" };
  }
}

// ─── CERT TRANSPARENCY MONITORING ────────────────────────────────
async function scanCertTransparency(brandName: string): Promise<any> {
  try {
    const res = await fetch(
      `https://crt.sh/?q=%25${encodeURIComponent(brandName)}%25&output=json&deduplicate=Y`,
      { headers: { "Accept": "application/json" } }
    );
    if (!res.ok) return { error: `crt.sh HTTP ${res.status}` };
    const data = await res.json().catch(() => []);

    if (!Array.isArray(data)) return { total: 0, recent: [] };

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const recentCerts = data.filter((c: any) => {
      const d = new Date(c.entry_timestamp || c.not_before || "");
      return !isNaN(d.getTime()) && d.getTime() > thirtyDaysAgo;
    });

    const verySuspicious = recentCerts.filter((c: any) => {
      const name = (c.common_name || c.name_value || "").toLowerCase();
      const suspicious_patterns = ["login", "signin", "account", "verify", "secure", "update", "support"];
      return suspicious_patterns.some(p => name.includes(p));
    });

    const newIn7Days = recentCerts.filter((c: any) => {
      const d = new Date(c.entry_timestamp || "");
      return !isNaN(d.getTime()) && d.getTime() > sevenDaysAgo;
    });

    return {
      total_certs_found: data.length,
      recent_30d: recentCerts.length,
      new_last_7d: newIn7Days.length,
      suspicious_certs: verySuspicious.length,
      recent_cert_details: recentCerts.slice(0, 15).map((c: any) => ({
        domain: c.common_name || c.name_value,
        issuer: c.issuer_name?.split("O=")[1]?.split(",")[0]?.trim() || c.issuer_ca_id,
        issued: c.entry_timestamp || c.not_before,
        cert_id: c.id,
        suspicious: verySuspicious.some(s => s.id === c.id),
      })),
      source: "crt.sh (Certificate Transparency)",
    };
  } catch (err: any) {
    return { error: err.message };
  }
}

// ─── GITHUB REPO LEAK SCAN ────────────────────────────────────────
async function scanRepoLeaks(brandName: string, keywords: string[]): Promise<any> {
  const githubToken = Deno.env.get("GITHUB_TOKEN");
  if (!githubToken) {
    return { note: "Add GITHUB_TOKEN for repository leak scanning", limited: true };
  }

  const searchTerms = [brandName, ...keywords].slice(0, 3);
  const leakPatterns = [
    `${brandName} password`,
    `${brandName} api_key`,
    `${brandName} secret`,
    `${brandName} credentials`,
  ];

  const allResults: any[] = [];

  for (const term of leakPatterns.slice(0, 3)) {
    const res = await fetch(
      `https://api.github.com/search/code?q=${encodeURIComponent(term)}&per_page=5`,
      {
        headers: {
          "Authorization": `Bearer ${githubToken}`,
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "ShieldAI-Security-Platform",
        }
      }
    ).catch(() => null);

    if (res?.ok) {
      const data = await res.json().catch(() => ({ items: [] }));
      allResults.push(...(data.items || []).map((item: any) => ({
        repo: item.repository?.full_name,
        file: item.path,
        url: item.html_url,
        is_private: item.repository?.private,
        search_term: term,
        severity: term.includes("password") || term.includes("secret") ? "HIGH" : "MEDIUM",
      })));
    }
    await new Promise(r => setTimeout(r, 500)); // Rate limit
  }

  const publicLeaks = allResults.filter(r => !r.is_private);

  return {
    total_matches: allResults.length,
    public_repo_matches: publicLeaks.length,
    high_severity: allResults.filter(r => r.severity === "HIGH").length,
    leaks: allResults.slice(0, 10),
    source: "github-code-search",
    action_required: publicLeaks.length > 0 ? "Immediate review required for public repository exposures" : null,
  };
}

// ─── URLSCAN BRAND SEARCH ─────────────────────────────────────────
async function searchURLScanForBrand(brandName: string): Promise<any> {
  const res = await fetch(
    `https://urlscan.io/api/v1/search/?q=page.domain:*${encodeURIComponent(brandName)}*&size=10`,
    { headers: { "Accept": "application/json" } }
  ).catch(() => null);

  if (!res?.ok) return { total: 0 };
  const data = await res.json().catch(() => ({ results: [] }));
  const results = data.results || [];

  return {
    total_scans: data.total || results.length,
    malicious: results.filter((r: any) => r.verdicts?.overall?.malicious).length,
    domains_found: [...new Set(results.map((r: any) => r.page?.domain))].slice(0, 10),
    source: "urlscan.io",
  };
}

// ─── RISK CALCULATOR ─────────────────────────────────────────────
function calculateBrandRisk(result: any): any {
  let score = 0;
  const findings: string[] = [];

  if (result.typosquatting?.malicious_domains > 0) {
    score += 35;
    findings.push(`${result.typosquatting.malicious_domains} malicious typosquat domain(s) detected`);
  }
  if (result.typosquatting?.registered_domains > 3) {
    score += 15;
    findings.push(`${result.typosquatting.registered_domains} typosquat variants are registered`);
  }
  if (result.phishing_intel?.total_phishing_detections > 0) {
    score += 30;
    findings.push(`${result.phishing_intel.total_phishing_detections} active phishing detection(s) targeting brand`);
  }
  if (result.cert_transparency?.suspicious_certs > 0) {
    score += 20;
    findings.push(`${result.cert_transparency.suspicious_certs} suspicious SSL certificate(s) issued for brand-like domains`);
  }
  if (result.repo_leaks?.public_repo_matches > 0) {
    score += 25;
    findings.push(`${result.repo_leaks.public_repo_matches} public repository exposure(s) containing brand credentials`);
  }

  const risk_level = score >= 60 ? "CRITICAL" : score >= 40 ? "HIGH" : score >= 20 ? "MEDIUM" : score >= 5 ? "LOW" : "CLEAN";

  return {
    risk_level,
    risk_score: Math.min(score, 100),
    key_findings: findings,
    recommended_actions: getBrandRecommendations(risk_level),
  };
}

function getBrandRecommendations(level: string): string[] {
  if (level === "CRITICAL" || level === "HIGH") {
    return [
      "File takedown requests for malicious domains via your registrar / ICANN",
      "Report phishing URLs to Google Safe Browsing and PhishTank",
      "Alert users about active phishing campaigns targeting your brand",
      "Submit suspicious domains to VirusTotal and AbuseIPDB for community blocking",
      "Engage legal team for trademark infringement on malicious lookalike domains",
    ];
  }
  return [
    "Register key typosquat variants defensively",
    "Set up ongoing certificate transparency monitoring",
    "Monitor newly registered domains containing brand keywords",
  ];
}

// ─── PERSIST FINDINGS ─────────────────────────────────────────────
async function persistBrandFindings(result: any, brand: string, domain: string): Promise<void> {
  try {
    const serviceClient = base44.asServiceRole;

    if (result.typosquatting?.malicious_domains > 0) {
      await serviceClient.entities.ThreatIntelFeed.create({
        title: `Brand Protection: ${result.typosquatting.malicious_domains} Malicious Typosquat Domains Detected for "${brand}"`,
        feed_type: "phishing",
        severity: "critical",
        description: `${result.typosquatting.registered_domains} typosquat variants registered, ${result.typosquatting.malicious_domains} confirmed malicious. Examples: ${result.typosquatting.domains?.filter((d: any) => d.malicious).slice(0, 3).map((d: any) => d.domain).join(", ")}`,
        source: "urlscan.io + crt.sh",
        affects_you: true,
        affected_asset: domain,
        action_required: "Immediate takedown requests and user alerting required",
        published_at: new Date().toISOString(),
        detected_at: new Date().toISOString(),
      });
    }

    if (result.phishing_intel?.total_phishing_detections > 0) {
      await serviceClient.entities.ThreatIntelFeed.create({
        title: `Active Phishing Campaign Targeting "${brand}"`,
        feed_type: "phishing",
        severity: "critical",
        description: `${result.phishing_intel.total_phishing_detections} active phishing detection(s) across PhishTank, OpenPhish, and URLScan targeting brand "${brand}"`,
        source: "phishtank + openphish + urlscan.io",
        affects_you: true,
        affected_asset: domain,
        action_required: "Report to Google Safe Browsing, block URLs in proxy, alert users",
        published_at: new Date().toISOString(),
        detected_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("[Brand Protection] Failed to persist findings:", err);
  }
}
