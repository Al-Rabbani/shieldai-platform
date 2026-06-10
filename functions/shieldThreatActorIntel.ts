// shieldThreatActorIntel.ts — Threat Actor Profiling + CVE/Malware Correlation Engine
// Sources: MITRE ATT&CK (live JSON), EPSS API (first.org), CISA KEV, NVD CVE enrichment
// Maps: Actor → TTPs → CVEs → Malware Families → Targeted Industries

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action, actor_name, cve_id, industry } = body;

    if (!action) {
      return new Response(JSON.stringify({
        error: "action required",
        actions: ["list_actors", "actor_profile", "cve_actors", "epss_enrich", "industry_threats", "full_threat_landscape"],
      }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    let result: any = { action, generated_at: new Date().toISOString() };

    // Load MITRE ATT&CK data (cached within function execution)
    const attackData = await loadMITREAttack();

    if (action === "list_actors") {
      result.threat_actors = buildActorList(attackData);
      result.total = result.threat_actors.length;
    }

    if (action === "actor_profile" && actor_name) {
      result.profile = await buildActorProfile(attackData, actor_name);
    }

    if (action === "cve_actors" && cve_id) {
      result.cve_id = cve_id;
      result.cve_details = await enrichCVEWithEPSS(cve_id);
      result.actors_exploiting = findActorsForCVE(attackData, cve_id);
      result.in_cisa_kev = await checkCISAKEV(cve_id);
    }

    if (action === "epss_enrich") {
      // Enrich top KEV CVEs with EPSS scores
      const kevCVEs = await fetchCISAKEV();
      result.kev_with_epss = await enrichMultipleCVEsWithEPSS(kevCVEs.slice(0, 20));
      result.total_kev = kevCVEs.length;
    }

    if (action === "industry_threats" && industry) {
      result.industry = industry;
      result.targeting_actors = findActorsByIndustry(attackData, industry);
      result.active_malware = findMalwareByIndustry(attackData, industry);
    }

    if (action === "full_threat_landscape") {
      const actors = buildActorList(attackData);
      const kevCVEs = await fetchCISAKEV();
      const topKEV = await enrichMultipleCVEsWithEPSS(kevCVEs.slice(0, 10));

      result.summary = {
        total_tracked_actors: actors.length,
        total_kev_cves: kevCVEs.length,
        top_exploited_cves: topKEV.filter(c => (c.epss_score || 0) > 0.5),
        most_active_actors: actors
          .sort((a, b) => (b.technique_count || 0) - (a.technique_count || 0))
          .slice(0, 10),
        high_risk_industries: getHighRiskIndustries(attackData),
        malware_families_tracked: getMalwareFamilies(attackData).length,
      };
      result.recent_kev = kevCVEs.slice(0, 15);
      result.threat_actors = actors.slice(0, 20);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[ThreatActorIntel] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

// ─── MITRE ATT&CK LOADER ─────────────────────────────────────────
async function loadMITREAttack(): Promise<any> {
  const res = await fetch(
    "https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json",
    { headers: { "User-Agent": "ShieldAI-Security-Platform" } }
  ).catch(() => null);
  if (!res?.ok) return { objects: [] };
  return await res.json().catch(() => ({ objects: [] }));
}

function buildActorList(data: any): any[] {
  const objects = data.objects || [];
  const groups = objects.filter((o: any) => o.type === "intrusion-set");

  // Build technique → group mapping
  const relationshipMap: Record<string, string[]> = {};
  objects.filter((o: any) => o.type === "relationship" && o.relationship_type === "uses")
    .forEach((r: any) => {
      if (!relationshipMap[r.source_ref]) relationshipMap[r.source_ref] = [];
      relationshipMap[r.source_ref].push(r.target_ref);
    });

  return groups.map((g: any) => {
    const techniques = (relationshipMap[g.id] || []).filter(id => id.startsWith("attack-pattern--"));
    const malware = (relationshipMap[g.id] || []).filter(id => id.startsWith("malware--") || id.startsWith("tool--"));
    const mitreId = g.external_references?.find((r: any) => r.source_name === "mitre-attack")?.external_id;
    return {
      id: g.id,
      name: g.name,
      mitre_id: mitreId,
      aliases: (g.aliases || []).slice(0, 5),
      description: g.description?.substring(0, 300),
      technique_count: techniques.length,
      malware_count: malware.length,
      technique_refs: techniques.slice(0, 10),
      malware_refs: malware.slice(0, 5),
      created: g.created?.substring(0, 10),
      modified: g.modified?.substring(0, 10),
    };
  }).sort((a, b) => b.technique_count - a.technique_count);
}

async function buildActorProfile(data: any, actorName: string): Promise<any> {
  const objects = data.objects || [];
  const nameLower = actorName.toLowerCase();

  const group = objects.find((o: any) =>
    o.type === "intrusion-set" &&
    (o.name?.toLowerCase().includes(nameLower) || (o.aliases || []).some((a: string) => a.toLowerCase().includes(nameLower)))
  );

  if (!group) return { error: `Actor "${actorName}" not found in MITRE ATT&CK`, suggestion: "Try actor names like: APT28, Lazarus Group, Cozy Bear, FIN7, Sandworm" };

  // Get all related objects
  const usesRelationships = objects.filter((o: any) =>
    o.type === "relationship" && o.relationship_type === "uses" && o.source_ref === group.id
  );
  const targetedRelationships = objects.filter((o: any) =>
    o.type === "relationship" && (o.relationship_type === "targets" || o.relationship_type === "attributed-to") && o.source_ref === group.id
  );

  const techniqueRefs = usesRelationships.map((r: any) => r.target_ref).filter((id: string) => id.startsWith("attack-pattern--"));
  const malwareRefs = usesRelationships.map((r: any) => r.target_ref).filter((id: string) => id.startsWith("malware--") || id.startsWith("tool--"));

  // Resolve technique objects
  const techniques = techniqueRefs.map((ref: string) => {
    const t = objects.find((o: any) => o.id === ref);
    if (!t) return null;
    const extId = t.external_references?.find((r: any) => r.source_name === "mitre-attack")?.external_id;
    return {
      technique_id: extId,
      name: t.name,
      tactic: t.kill_chain_phases?.[0]?.phase_name,
      description: t.description?.substring(0, 200),
    };
  }).filter(Boolean);

  // Resolve malware objects
  const malwareFamilies = malwareRefs.map((ref: string) => {
    const m = objects.find((o: any) => o.id === ref);
    if (!m) return null;
    return { name: m.name, type: m.type, description: m.description?.substring(0, 150) };
  }).filter(Boolean);

  // Extract targeted industries & countries from description
  const industries = extractIndustriesFromText(group.description || "");
  const countries = extractCountriesFromText(group.description || "");

  const mitreId = group.external_references?.find((r: any) => r.source_name === "mitre-attack")?.external_id;
  const mitreUrl = `https://attack.mitre.org/groups/${mitreId}/`;

  // Get top CVEs associated with this actor's techniques
  const cveAssociations = await getActorCVEs(group.name, techniques);

  return {
    name: group.name,
    mitre_id: mitreId,
    mitre_url: mitreUrl,
    aliases: group.aliases || [],
    description: group.description,
    created: group.created?.substring(0, 10),
    modified: group.modified?.substring(0, 10),
    suspected_origin: countries.origin,
    targeted_countries: countries.targets,
    targeted_industries: industries,
    technique_count: techniques.length,
    malware_family_count: malwareFamilies.length,
    tactics_used: [...new Set(techniques.map((t: any) => t.tactic).filter(Boolean))],
    top_techniques: techniques.slice(0, 15),
    malware_tools: malwareFamilies.slice(0, 10),
    associated_cves: cveAssociations,
    threat_level: techniques.length > 50 ? "CRITICAL" : techniques.length > 20 ? "HIGH" : techniques.length > 10 ? "MEDIUM" : "LOW",
  };
}

function findActorsForCVE(data: any, cveId: string): any[] {
  // Search ATT&CK for references to this CVE
  const objects = data.objects || [];
  const cveUpper = cveId.toUpperCase();

  const matchingObjects = objects.filter((o: any) =>
    JSON.stringify(o).includes(cveUpper)
  );

  const groupIds = new Set<string>();
  const relationships = objects.filter((o: any) => o.type === "relationship");

  matchingObjects.forEach((obj: any) => {
    relationships.filter((r: any) => r.target_ref === obj.id)
      .forEach((r: any) => {
        if (r.source_ref.startsWith("intrusion-set--")) groupIds.add(r.source_ref);
      });
  });

  return [...groupIds].map(id => {
    const g = objects.find((o: any) => o.id === id);
    if (!g) return null;
    return {
      name: g.name,
      mitre_id: g.external_references?.find((r: any) => r.source_name === "mitre-attack")?.external_id,
      aliases: (g.aliases || []).slice(0, 3),
    };
  }).filter(Boolean);
}

function findActorsByIndustry(data: any, industry: string): any[] {
  const objects = data.objects || [];
  const industryLower = industry.toLowerCase();
  return objects.filter((o: any) =>
    o.type === "intrusion-set" && (
      (o.description || "").toLowerCase().includes(industryLower) ||
      (o.x_mitre_contributors || []).some((c: string) => c.toLowerCase().includes(industryLower))
    )
  ).slice(0, 15).map((g: any) => ({
    name: g.name,
    mitre_id: g.external_references?.find((r: any) => r.source_name === "mitre-attack")?.external_id,
    description: g.description?.substring(0, 200),
  }));
}

function findMalwareByIndustry(data: any, industry: string): any[] {
  const objects = data.objects || [];
  const industryLower = industry.toLowerCase();
  return objects.filter((o: any) =>
    (o.type === "malware" || o.type === "tool") &&
    (o.description || "").toLowerCase().includes(industryLower)
  ).slice(0, 10).map((m: any) => ({
    name: m.name,
    type: m.type,
    description: m.description?.substring(0, 200),
  }));
}

function getMalwareFamilies(data: any): any[] {
  return (data.objects || []).filter((o: any) => o.type === "malware" || o.type === "tool");
}

function getHighRiskIndustries(data: any): string[] {
  const allText = (data.objects || [])
    .filter((o: any) => o.type === "intrusion-set")
    .map((o: any) => o.description || "").join(" ");
  const industries = ["financial", "healthcare", "energy", "government", "defense", "technology", "retail", "manufacturing", "telecommunications", "education"];
  return industries.filter(i => allText.toLowerCase().includes(i));
}

// ─── EPSS API ─────────────────────────────────────────────────────
async function enrichCVEWithEPSS(cveId: string): Promise<any> {
  const [epssRes, nvdRes] = await Promise.allSettled([
    fetch(`https://api.first.org/data/v1/epss?cve=${cveId}`, { headers: { "Accept": "application/json" } }),
    fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${cveId}`, { headers: { "Accept": "application/json", "User-Agent": "ShieldAI-Security-Platform" } }),
  ]);

  const result: any = { cve_id: cveId };

  if (epssRes.status === "fulfilled" && epssRes.value.ok) {
    const data = await epssRes.value.json().catch(() => ({}));
    const entry = data.data?.[0];
    if (entry) {
      result.epss_score = parseFloat(entry.epss);
      result.epss_percentile = parseFloat(entry.percentile);
      result.epss_date = entry.date;
      result.exploitation_probability = `${Math.round(parseFloat(entry.epss) * 100)}%`;
      result.epss_risk = result.epss_score > 0.7 ? "CRITICAL" : result.epss_score > 0.4 ? "HIGH" : result.epss_score > 0.1 ? "MEDIUM" : "LOW";
    }
  }

  if (nvdRes.status === "fulfilled" && nvdRes.value.ok) {
    const data = await nvdRes.value.json().catch(() => ({}));
    const vuln = data.vulnerabilities?.[0]?.cve;
    if (vuln) {
      const cvss = vuln.metrics?.cvssMetricV31?.[0]?.cvssData || vuln.metrics?.cvssMetricV30?.[0]?.cvssData;
      result.cvss_score = cvss?.baseScore;
      result.cvss_severity = cvss?.baseSeverity;
      result.cvss_vector = cvss?.vectorString;
      result.description = vuln.descriptions?.find((d: any) => d.lang === "en")?.value?.substring(0, 300);
      result.published = vuln.published?.substring(0, 10);
      result.last_modified = vuln.lastModified?.substring(0, 10);
    }
  }

  return result;
}

async function enrichMultipleCVEsWithEPSS(cves: string[]): Promise<any[]> {
  if (cves.length === 0) return [];
  const cveList = cves.slice(0, 20).join(",");
  const res = await fetch(`https://api.first.org/data/v1/epss?cve=${cveList}`, {
    headers: { "Accept": "application/json" }
  }).catch(() => null);
  if (!res?.ok) return cves.map(c => ({ cve_id: c }));
  const data = await res.json().catch(() => ({ data: [] }));
  return (data.data || []).map((entry: any) => ({
    cve_id: entry.cve,
    epss_score: parseFloat(entry.epss),
    epss_percentile: parseFloat(entry.percentile),
    exploitation_probability: `${Math.round(parseFloat(entry.epss) * 100)}%`,
    epss_risk: parseFloat(entry.epss) > 0.7 ? "CRITICAL" : parseFloat(entry.epss) > 0.4 ? "HIGH" : parseFloat(entry.epss) > 0.1 ? "MEDIUM" : "LOW",
  }));
}

async function fetchCISAKEV(): Promise<string[]> {
  const res = await fetch("https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json", {
    headers: { "User-Agent": "ShieldAI-Security-Platform" }
  }).catch(() => null);
  if (!res?.ok) return [];
  const data = await res.json().catch(() => ({ vulnerabilities: [] }));
  return (data.vulnerabilities || [])
    .sort((a: any, b: any) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
    .map((v: any) => v.cveID);
}

async function checkCISAKEV(cveId: string): Promise<any> {
  const res = await fetch("https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json", {
    headers: { "User-Agent": "ShieldAI-Security-Platform" }
  }).catch(() => null);
  if (!res?.ok) return { in_kev: false };
  const data = await res.json().catch(() => ({ vulnerabilities: [] }));
  const entry = (data.vulnerabilities || []).find((v: any) => v.cveID === cveId.toUpperCase());
  return {
    in_kev: !!entry,
    date_added: entry?.dateAdded,
    due_date: entry?.dueDate,
    ransomware_campaign: entry?.knownRansomwareCampaignUse,
    vendor_project: entry?.vendorProject,
    product: entry?.product,
    required_action: entry?.requiredAction?.substring(0, 200),
  };
}

async function getActorCVEs(actorName: string, techniques: any[]): Promise<any[]> {
  // Search NVD for CVEs referencing this actor or its techniques
  const actorSearch = actorName.split(" ")[0]; // Use first word of actor name
  const res = await fetch(
    `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(actorSearch)}&resultsPerPage=5`,
    { headers: { "Accept": "application/json", "User-Agent": "ShieldAI-Security-Platform" } }
  ).catch(() => null);
  if (!res?.ok) return [];
  const data = await res.json().catch(() => ({ vulnerabilities: [] }));
  return (data.vulnerabilities || []).slice(0, 5).map((v: any) => ({
    cve_id: v.cve?.id,
    description: v.cve?.descriptions?.find((d: any) => d.lang === "en")?.value?.substring(0, 200),
    cvss_score: v.cve?.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore,
    published: v.cve?.published?.substring(0, 10),
  }));
}

// ─── TEXT EXTRACTION HELPERS ──────────────────────────────────────
function extractIndustriesFromText(text: string): string[] {
  const industries = ["financial", "banking", "healthcare", "energy", "oil", "gas", "government", "defense", "military", "technology", "telecom", "retail", "manufacturing", "aerospace", "media", "education", "pharmaceutical", "critical infrastructure"];
  return industries.filter(i => text.toLowerCase().includes(i));
}

function extractCountriesFromText(text: string): { origin: string | null, targets: string[] } {
  const originKeywords = ["russia", "china", "iran", "north korea", "dprk", "lazarus", "apt28", "apt41"];
  const targetKeywords = ["united states", "europe", "ukraine", "taiwan", "south korea", "japan", "india", "australia", "uk", "germany", "france"];

  const textLower = text.toLowerCase();
  const origin = originKeywords.find(k => textLower.includes(k)) || null;
  const targets = targetKeywords.filter(k => textLower.includes(k));

  return {
    origin: origin ? origin.charAt(0).toUpperCase() + origin.slice(1) : null,
    targets: targets.map(t => t.charAt(0).toUpperCase() + t.slice(1)),
  };
}
