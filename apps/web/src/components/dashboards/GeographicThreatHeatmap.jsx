import { absentStoreReason } from "@/api/absentStores";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Globe2, RefreshCw } from "lucide-react";

const REGIONS = ["North America", "Europe", "APAC", "Middle East", "Africa", "Latin America", "Global"];
const SECTORS = [
  "Financial Services",
  "Healthcare",
  "Energy",
  "Government",
  "Technology",
  "Industrial",
  "Telecom",
  "Retail",
  "Education",
  "Other",
];

const REGION_KEYWORDS = [
  { region: "North America", words: ["united states", "u.s", "usa", "canada", "north america", "mexico city"] },
  { region: "Europe", words: ["europe", "eu", "uk", "united kingdom", "germany", "france", "italy", "spain", "netherlands", "ireland", "poland", "sweden", "belgium", "switzerland", "dach", "nordics"] },
  { region: "APAC", words: ["apac", "asia", "china", "japan", "korea", "india", "australia", "singapore", "taiwan", "vietnam", "oceania", "pacific"] },
  { region: "Middle East", words: ["middle east", "iran", "israel", "saudi", "uae", "emirates", "qatar", "turkey", "iraq"] },
  { region: "Africa", words: ["africa", "nigeria", "kenya", "egypt", "south africa", "morocco"] },
  { region: "Latin America", words: ["latin america", "brazil", "argentina", "chile", "colombia", "peru", "south america"] },
];

const SECTOR_KEYWORDS = [
  { sector: "Financial Services", words: ["financ", "bank", "insurance", "payment", "fintech", "credit"] },
  { sector: "Healthcare", words: ["health", "hospital", "medical", "pharma", "clinic", "biotech"] },
  { sector: "Energy", words: ["energy", "utility", "utilities", "oil", "gas", "power", "nuclear"] },
  { sector: "Government", words: ["government", "defense", "defence", "federal", "public sector", "agency", "military", "municipal"] },
  { sector: "Technology", words: ["tech", "software", "saas", "cloud", "internet", "ai ", "data center", "telecom software"] },
  { sector: "Industrial", words: ["industrial", "manufactur", "factory", "ot", "ics", "scada", "supply chain", "logistics"] },
  { sector: "Telecom", words: ["telecom", "carrier", "5g", "mobile network"] },
  { sector: "Retail", words: ["retail", "e-commerce", "ecommerce", "consumer", "hospitality"] },
  { sector: "Education", words: ["education", "university", "school", "academic"] },
];

const SEVERITY_WEIGHT = { critical: 4, high: 3, medium: 2, low: 1 };

function mapRegion(text) {
  const value = String(text || "").toLowerCase();
  if (!value.trim()) return "Global";
  const match = REGION_KEYWORDS.find((entry) => entry.words.some((word) => value.includes(word)));
  return match ? match.region : "Global";
}

function mapSectors(text) {
  const value = String(text || "").toLowerCase();
  if (!value.trim()) return ["Other"];
  const matches = SECTOR_KEYWORDS.filter((entry) => entry.words.some((word) => value.includes(word))).map((entry) => entry.sector);
  return matches.length ? [...new Set(matches)] : ["Other"];
}

function cellColor(value, max) {
  if (!value) return "rgba(31,41,55,0.35)";
  const ratio = Math.min(1, value / Math.max(max, 1));
  if (ratio > 0.75) return "rgba(239,68,68,0.85)";
  if (ratio > 0.5) return "rgba(249,115,22,0.8)";
  if (ratio > 0.3) return "rgba(234,179,8,0.7)";
  if (ratio > 0.15) return "rgba(59,130,246,0.6)";
  return "rgba(59,130,246,0.3)";
}

export default function GeographicThreatHeatmap() {
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sectorFilter, setSectorFilter] = useState("all");
  const [activeCell, setActiveCell] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [apt, ransomware, national] = await Promise.all([
      base44.entities.APTActor.list("-last_seen", 200).catch(() => []),
      base44.entities.RansomwareGroup.list("-last_seen", 200).catch(() => []),
      base44.entities.NationalThreat.list("-last_seen", 200).catch(() => []),
    ]);

    const rows = [
      ...(apt || []).map((actor) => ({
        id: actor.id,
        name: actor.actor_name,
        kind: "APT",
        geo: actor.target_geography,
        sectors: mapSectors(actor.target_sectors),
        weight: SEVERITY_WEIGHT[actor.threat_level] || 2,
        detail: actor.threat_level,
      })),
      ...(ransomware || []).map((group) => ({
        id: group.id,
        name: group.group_name,
        kind: "Ransomware",
        geo: group.target_geography,
        sectors: mapSectors(group.target_sectors),
        weight: (SEVERITY_WEIGHT[group.threat_level] || 2) + 0.5,
        detail: group.threat_level,
      })),
      ...(national || []).map((threat) => ({
        id: threat.id,
        name: threat.title,
        kind: threat.threat_type || "National threat",
        geo: threat.origin_country,
        sectors: mapSectors((threat.targeted_sectors || []).join(", ")),
        weight: (SEVERITY_WEIGHT[threat.severity] || 2) + (threat.campaign_active ? 0.5 : 0),
        detail: threat.severity,
      })),
    ].map((row) => ({ ...row, region: mapRegion(row.geo) }));

    setThreats(rows);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const grid = useMemo(() => {
    const cells = {};
    threats.forEach((row) => {
      row.sectors.forEach((sector) => {
        const key = `${sector}|${row.region}`;
        cells[key] = (cells[key] || 0) + row.weight;
      });
    });
    const max = Math.max(1, ...Object.values(cells));
    return { cells, max };
  }, [threats]);

  const visibleSectors = sectorFilter === "all" ? SECTORS : [sectorFilter];

  const ranking = useMemo(() => {
    const bySector = {};
    threats.forEach((row) => {
      row.sectors.forEach((sector) => { bySector[sector] = (bySector[sector] || 0) + row.weight; });
    });
    return Object.entries(bySector).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [threats]);

  const cellRows = activeCell
    ? threats.filter((row) => row.region === activeCell.region && row.sectors.includes(activeCell.sector))
    : [];

  const top = ranking[0];

  if (loading) {
    return <div className="w-6 h-6 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto my-8" />;
  }

  if (threats.length === 0) {
    return (
      <div className="text-center py-8">
        <Globe2 size={20} className="mx-auto text-slate-600 mb-2" />
        <p className="text-xs text-slate-500">{absentStoreReason("NationalThreat")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={sectorFilter}
          onChange={(e) => { setSectorFilter(e.target.value); setActiveCell(null); }}
          className="px-2 py-1.5 rounded-lg text-[11px] bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none"
          aria-label="Filter heatmap by sector"
        >
          <option value="all">All sectors</option>
          {SECTORS.map((sector) => <option key={sector} value={sector}>{sector}</option>)}
        </select>
        <span className="text-[10px] text-slate-500">{threats.length} threat records mapped</span>
        <button onClick={load} className="ml-auto flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200">
          <RefreshCw size={11} /> Refresh
        </button>
      </div>

      {top && (
        <p className="text-[11px] text-slate-400">
          Highest pressure: <span className="text-white font-semibold">{top[0]}</span> · {ranking.slice(1).map(([sector, value]) => `${sector} (${value.toFixed(0)})`).join(" · ")}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[10px] border-collapse min-w-[560px]">
          <thead>
            <tr>
              <th className="text-left py-1.5 pr-2 font-medium text-slate-500">Sector / region</th>
              {REGIONS.map((region) => (
                <th key={region} className="py-1.5 px-1 font-medium text-slate-500 text-center">{region.replace(" ", "\u00a0")}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleSectors.map((sector) => (
              <tr key={sector}>
                <td className="py-1 pr-2 text-slate-300 whitespace-nowrap">{sector}</td>
                {REGIONS.map((region) => {
                  const value = grid.cells[`${sector}|${region}`] || 0;
                  const selected = activeCell?.sector === sector && activeCell?.region === region;
                  return (
                    <td key={region} className="py-1 px-1">
                      <button
                        onClick={() => setActiveCell(selected ? null : { sector, region })}
                        title={`${sector} · ${region}: ${value ? value.toFixed(0) : 0} pressure`}
                        className="w-full h-7 rounded flex items-center justify-center font-mono text-[9px] transition"
                        style={{
                          background: cellColor(value, grid.max),
                          color: value ? "#f8fafc" : "#475569",
                          outline: selected ? "2px solid #3b82f6" : "none",
                        }}
                      >
                        {value ? value.toFixed(0) : "·"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[9px] text-slate-500">
        <span>Pressure scale</span>
        {[0.1, 0.3, 0.6, 0.9].map((ratio) => (
          <span key={ratio} className="w-6 h-2 rounded" style={{ background: cellColor(ratio * 10, 10) }} />
        ))}
        <span>Low → critical</span>
      </div>

      {activeCell && (
        <div className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-white">{activeCell.sector} · {activeCell.region}</p>
            <button onClick={() => setActiveCell(null)} className="text-[10px] text-slate-500 hover:text-slate-300">Close</button>
          </div>
          {cellRows.length === 0 ? (
            <p className="text-[10px] text-slate-500">No threat records target this combination.</p>
          ) : (
            <div className="space-y-1">
              {cellRows.map((row) => (
                <div key={`${row.kind}-${row.id}`} className="flex flex-wrap items-baseline gap-2 text-[10px]">
                  <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/30">{row.kind}</span>
                  <span className="text-slate-200">{row.name}</span>
                  <span className="text-slate-500 capitalize">{row.detail || "—"}</span>
                  <span className="text-slate-600">{row.geo || "unattributed geography"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}