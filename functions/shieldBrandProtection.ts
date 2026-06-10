// shieldBrandProtection.ts — Brand Protection & Phishing Intelligence Engine
// Real sources: URLScan.io, PhishTank, OpenPhish, crt.sh (cert transparency), GitHub code search

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
    const { action, brand_name, domain, keywords } = body;

    if (!action || (!brand_name && !domain)) {
      return new Response(JSON.stringify({
        error: "action and (brand_name or domain) required",
        actions: ["typosquat_scan", "phishing_scan", "cert_monitor", "repo_leak_scan", "full_scan"]
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const domainParts = (domain || `${brand_name?.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`).split(".");
    const baseDomain = domain || `${domainParts[0]}.${domainParts.slice(1).join(".")}`;
    const brandNameClean = brand_name || domainParts[0] || "";

    const result: any = { brand: brandNameClean, domain: baseDomain, scanned_at: new Date().toISOString() };

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
      result.urlscan_brand = await searchURLScanForBrand(brandNameClean);
    }

    result.risk_summary = calculateBrandRisk(result);

    if (result.risk_summary.risk_level === "CRITICAL" || result.risk_summary.risk_level === "HIGH") {
      await persistBrandFindings(base44, result, brandNameClean, baseDomain);
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
});

// ─── TYPOSQUATTING ────────────────────────────────────────────────
async function detectTyposquatting(baseDomain: string, brandName: string): Promise<any> {
  const parts = baseDomain.split(".");
  const base = parts[0];
  const tld = parts.slice(1).join(".");
  const variants = generateTyposquatVariants(base, tld, brandName);

  const checkedDomains: any[] = [];
  const batchSize = 5;
  for (let i = 0; i < Math.min(variants.length, 25); i += batchSize) {
    const batch = variants.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(async (variant) => {
      const res = await fetch(`https://urlscan.io/api/v1/search/?q=domain:${variant}&size=3`, {
        headers: { "Accept": "application/json" }
      }).catch(() => null);
      if (!res?.ok) return null;
      const data = await res.json().catch(() => ({ results: [] }));
      const scans = data.results || [];
      if (scans.length > 0) {
        const malicious = scans.some((s: any) => s.verdicts?.overall?.malicious);
        return {
          domain: variant, type: "typosquat", registered: true, malicious,
          scan_count: scans.length, last_scanned: scans[0]?.task?.time,
          verdict: malicious ? "MALICIOUS" : "REGISTERED",
        };
      }
      return null;
    }));
    batchResults.forEach(r => { if (r.status === "fulfilled" && r.value) checkedDomains.push(r.value); });
    await new Promise(r => setTimeout(r, 300));
  }

  const recentCerts = await checkCRTForBrand(brandName);
  return {
    base_domain: baseDomain,
    variants_checked: Math.min(variants.length, 25),
    registered_domains: checkedDomains.filter(d => d.registered).length,
    malicious_domains: checkedDomains.filter(d => d.malicious).length,
    domains: checkedDomains,
    recent_cert_issuances: recentCerts.slice(0, 10),
  };
}

function generateTyposquatVariants(base: string, tld: string, brand: string): string[] {
  const variants = new Set<string>();
  const chars = base.split("");

  // Omission
  for (let i = 0; i < chars.length; i++) {
    const s = [...chars.slice(0, i), ...chars.slice(i + 1)].join("");
    if (s.length > 2) variants.add(`${s}.${tld}`);
  }
  // Duplication
  for (let i = 0; i < chars.length; i++) {
    variants.add([...chars.slice(0, i), chars[i], ...chars.slice(i)].join("") + `.${tld}`);
  }
  // Swap adjacent
  for (let i = 0; i < chars.length - 1; i++) {
    const s = [...chars]; [s[i], s[i + 1]] = [s[i + 1], s[i]];
    variants.add(`${s.join("")}.${tld}`);
  }
  // TLD swaps
  ["com", "net", "org", "io", "co", "info", "biz"].forEach(t => {
    if (t !== tld) variants.add(`${base}.${t}`);
  });
  // Common affixes
  ["secure", "login", "account", "verify", "support", "my", "app", "official"].forEach(a => {
    variants.add(`${a}-${base}.${tld}`);
    variants.add(`${base}-${a}.${tld}`);
    variants.add(`${a}${base}.${tld}`);
  });
  return [...variants].filter(v => v !== `${base}.${tld}`);
}

async function checkCRTForBrand(brandName: string): Promise<any[]> {
  try {
    const res = await fetch(`https://crt.sh/?q=%25${encodeURIComponent(brandName)}%25&output=json`, {
      headers: { "Accept": "application/json" }
    }).catch(() => null);
    if (!res?.ok) return [];
    const data = await res.json().catch(() => []);
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return (Array.isArray(data) ? data : [])
      .filter((c: any) => {
        const d = new Date(c.entry_timestamp || "");
        return !isNaN(d.getTime()) && d.getTime() > thirtyDaysAgo;
      })
      .slice(0, 20)
      .map((c: any) => ({
        domain: c.common_name || c.name_value,
        issued_at: c.entry_timestamp,
        cert_id: c.id,
      }));
  } catch { return []; }
}

// ─── PHISHING INTEL ───────────────────────────────────────────────
async function checkPhishingIntel(domain: string, brandName: string): Promise<any> {
  const [phishtankResult, openphishResult, urlscanResult] = await Promise.allSettled([
    checkPhishTank(domain),
    checkOpenPhish(brandName),
    searchURLScanPhishing(brandName),
  ]);

  const sources: any = {};
  if (phishtankResult.status === "fulfilled") sources.phishtank = phishtankResult.value;
  if (openphishResult.status === "fulfilled") sources.openphish = openphishResult.value;
  if (urlscanResult.status === "fulfilled") sources.urlscan = urlscanResult.value;

  const total = (sources.phishtank?.count || 0) + (sources.openphish?.mentions || 0) + (sources.urlscan?.phishing_scans || 0);
  return { total_phishing_detections: total, brand_targeted: total > 0, sources };
}

async function checkPhishTank(domain: string): Promise<any> {
  const phishtankKey = Deno.env.get("PHISHTANK_API_KEY");
  try {
    const body = `url=${encodeURIComponent(`https://${domain}`)}&format=json${phishtankKey ? `&app_key=${phishtankKey}` : ""}`;
    const res = await fetch("https://checkurl.phishtank.com/checkurl/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "ShieldAI-Security-Platform" },
      body
    }).catch(() => null);
    if (!res?.ok) return { count: 0, source: "phishtank" };
    const data = await res.json().catch(() => ({}));
    return {
      is_phish: data.results?.in_database && data.results?.verified,
      in_database: data.results?.in_database || false,
      verified: data.results?.verified || false,
      count: (data.results?.in_database && data.results?.verified) ? 1 : 0,
      source: "phishtank",
    };
  } catch { return { count: 0, source: "phishtank" }; }
}

async function checkOpenPhish(brandName: string): Promise<any> {
  try {
    const res = await fetch("https://openphish.com/feed.txt", {
      headers: { "User-Agent": "ShieldAI-Security-Platform" }
    }).catch(() => null);
    if (!res?.ok) return { mentions: 0, source: "openphish" };
    const text = await res.text();
    const lines = text.split("\n").filter(l => l.trim());
    const mentions = lines.filter(l => l.toLowerCase().includes(brandName.toLowerCase()));
    return { mentions: mentions.length, sample_urls: mentions.slice(0, 5), total_feed_size: lines.length, source: "openphish" };
  } catch { return { mentions: 0, source: "openphish" }; }
}

async function searchURLScanPhishing(brandName: string): Promise<any> {
  try {
    const res = await fetch(
      `https://urlscan.io/api/v1/search/?q=page.title:"${encodeURIComponent(brandName)}" AND verdicts.overall.malicious:true&size=10`,
      { headers: { "Accept": "application/json" } }
    ).catch(() => null);
    if (!res?.ok) return { phishing_scans: 0, source: "urlscan" };
    const data = await res.json().catch(() => ({ results: [] }));
    const results = data.results || [];
    return {
      phishing_scans: results.length,
      total_results: data.total || 0,
      samples: results.slice(0, 5).map((r: any) => ({
        url: r.page?.url, domain: r.page?.domain, scanned: r.task?.time, score: r.verdicts?.urlscan?.score,
      })),
      source: "urlscan.io",
    };
  } catch { return { phishing_scans: 0, source: "urlscan" }; }
}

// ─── CERT TRANSPARENCY ────────────────────────────────────────────
async function scanCertTransparency(brandName: string): Promise<any> {
  try {
    const res = await fetch(`https://crt.sh/?q=%25${encodeURIComponent(brandName)}%25&output=json&deduplicate=Y`, {
      headers: { "Accept": "application/json" }
    }).catch(() => null);
    if (!res?.ok) return { error: `crt.sh unavailable` };
    const data = await res.json().catch(() => []);
    if (!Array.isArray(data)) return { total: 0, recent: [] };
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = data.filter((c: any) => {
      const d = new Date(c.entry_timestamp || "");
      return !isNaN(d.getTime()) && d.getTime() > thirtyDaysAgo;
    });
    const suspicious_patterns = ["login", "signin", "account", "verify", "secure", "update", "support", "portal"];
    const suspicious = recent.filter((c: any) => {
      const name = (c.common_name || c.name_value || "").toLowerCase();
      return suspicious_patterns.some(p => name.includes(p));
    });
    return {
      total_certs_found: data.length,
      recent_30d: recent.length,
      new_last_7d: recent.filter((c: any) => new Date(c.entry_timestamp || "").getTime() > sevenDaysAgo).length,
      suspicious_certs: suspicious.length,
      recent_cert_details: recent.slice(0, 15).map((c: any) => ({
        domain: c.common_name || c.name_value,
        issued: c.entry_timestamp || c.not_before,
        cert_id: c.id,
        suspicious: suspicious.some((s: any) => s.id === c.id),
      })),
      source: "crt.sh (Certificate Transparency)",
    };
  } catch (err: any) { return { error: err.message }; }
}

// ─── GITHUB REPO LEAK ─────────────────────────────────────────────
async function scanRepoLeaks(brandName: string, keywords: string[]): Promise<any> {
  const githubToken = Deno.env.get("GITHUB_TOKEN");
  if (!githubToken) return { note: "Add GITHUB_TOKEN for repository leak scanning", limited: true };
  const leakPatterns = [`${brandName} password`, `${brandName} api_key`, `${brandName} secret`, `${brandName} credentials`];
  const allResults: any[] = [];
  for (const term of leakPatterns.slice(0, 3)) {
    const res = await fetch(`https://api.github.com/search/code?q=${encodeURIComponent(term)}&per_page=5`, {
      headers: { "Authorization": `Bearer ${githubToken}`, "Accept": "application/vnd.github.v3+json", "User-Agent": "ShieldAI-Security-Platform" }
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json().catch(() => ({ items: [] }));
      allResults.push(...(data.items || []).map((item: any) => ({
        repo: item.repository?.full_name, file: item.path, url: item.html_url,
        is_private: item.repository?.private, search_term: term,
        severity: term.includes("password") || term.includes("secret") ? "HIGH" : "MEDIUM",
      })));
    }
    await new Promise(r => setTimeout(r, 500));
  }
  const publicLeaks = allResults.filter(r => !r.is_private);
  return {
    total_matches: allResults.length, public_repo_matches: publicLeaks.length,
    high_severity: allResults.filter(r => r.severity === "HIGH").length,
    leaks: allResults.slice(0, 10), source: "github-code-search",
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

// ─── RISK SCORE ───────────────────────────────────────────────────
function calculateBrandRisk(result: any): any {
  let score = 0;
  const findings: string[] = [];
  if (result.typosquatting?.malicious_domains > 0) { score += 35; findings.push(`${result.typosquatting.malicious_domains} malicious typosquat domain(s)`); }
  if (result.typosquatting?.registered_domains > 3) { score += 15; findings.push(`${result.typosquatting.registered_domains} typosquat variants registered`); }
  if (result.phishing_intel?.total_phishing_detections > 0) { score += 30; findings.push(`${result.phishing_intel.total_phishing_detections} active phishing detection(s)`); }
  if (result.cert_transparency?.suspicious_certs > 0) { score += 20; findings.push(`${result.cert_transparency.suspicious_certs} suspicious SSL cert(s) for brand-like domains`); }
  if (result.repo_leaks?.public_repo_matches > 0) { score += 25; findings.push(`${result.repo_leaks.public_repo_matches} public repo exposure(s)`); }
  const risk_level = score >= 60 ? "CRITICAL" : score >= 40 ? "HIGH" : score >= 20 ? "MEDIUM" : score >= 5 ? "LOW" : "CLEAN";
  return {
    risk_level, risk_score: Math.min(score, 100), key_findings: findings,
    recommended_actions: score >= 40
      ? ["File takedown requests for malicious domains via ICANN", "Report phishing URLs to Google Safe Browsing", "Alert users about active phishing campaigns", "Submit suspicious domains to VirusTotal for community blocking"]
      : ["Register key typosquat variants defensively", "Set up certificate transparency monitoring alerts"],
  };
}

// ─── PERSIST ─────────────────────────────────────────────────────
async function persistBrandFindings(base44: any, result: any, brand: string, domain: string): Promise<void> {
  try {
    const svc = base44.asServiceRole;
    const now = new Date().toISOString();
    if (result.typosquatting?.malicious_domains > 0) {
      await svc.entities.ThreatIntelFeed.create({
        title: `Brand Protection: ${result.typosquatting.malicious_domains} Malicious Typosquat Domains for "${brand}"`,
        feed_type: "phishing", severity: "critical",
        description: `${result.typosquatting.registered_domains} variants registered, ${result.typosquatting.malicious_domains} confirmed malicious.`,
        source: "urlscan.io + crt.sh", affects_you: true, affected_asset: domain,
        action_required: "Immediate takedown requests and user alerting required",
        published_at: now, detected_at: now,
      });
    }
    if (result.phishing_intel?.total_phishing_detections > 0) {
      await svc.entities.ThreatIntelFeed.create({
        title: `Active Phishing Campaign Targeting "${brand}"`,
        feed_type: "phishing", severity: "critical",
        description: `${result.phishing_intel.total_phishing_detections} active phishing detection(s) across PhishTank, OpenPhish, URLScan`,
        source: "phishtank + openphish + urlscan.io", affects_you: true, affected_asset: domain,
        action_required: "Report to Google Safe Browsing, block URLs in proxy, alert users",
        published_at: now, detected_at: now,
      });
    }
    console.log(`[Brand Protection] Persisted findings for ${brand}`);
  } catch (err) {
    console.error("[Brand Protection] Failed to persist:", err);
  }
}
