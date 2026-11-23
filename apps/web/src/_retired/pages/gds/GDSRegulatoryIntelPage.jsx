import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, CARD, PAGE_BG, SevBadge, Card, KpiCard } from "@/components/gds/GDSOSShared";

const REGULATIONS_REF = [
  { id: "GDPR", name: "GDPR", jurisdiction: "EU", penalty: "€20M or 4% global turnover", notification: "72 hours", color: "#3b82f6" },
  { id: "NIS2", name: "NIS2 Directive", jurisdiction: "EU", penalty: "€10M or 2% global turnover", notification: "24 hours", color: "#8b5cf6" },
  { id: "DORA", name: "DORA", jurisdiction: "EU Financial", penalty: "€5M or 1% daily turnover", notification: "4 hours", color: "#f59e0b" },
  { id: "SEC", name: "SEC Cyber Rules", jurisdiction: "US Public Companies", penalty: "SEC enforcement action", notification: "4 business days", color: "#10b981" },
  { id: "UK-CE", name: "UK Cyber Essentials", jurisdiction: "UK", penalty: "Loss of certification", notification: "N/A", color: CYAN },
  { id: "SOX", name: "SOX IT Controls", jurisdiction: "US Listed", penalty: "Criminal liability", notification: "N/A", color: HIGH },
];

export default function GDSRegulatoryIntelPage() {
  const [updates, setUpdates] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState({ updates: false, assess: false });
  const [error, setError] = useState(null);

  const { data: triaged = [] } = useQuery({ queryKey: ["reg-triaged"], queryFn: () => base44.entities.TriagedFinding.filter({ status: "open" }).catch(() => []) });
  const { data: cloudFindings = [] } = useQuery({ queryKey: ["reg-cloud"], queryFn: () => base44.entities.CloudFinding.list("-detected_at", 50).catch(() => []) });

  const callFn = async (payload, key) => {
    setLoading(l => ({ ...l, [key]: true })); setError(null);
    try {
      const res = await base44.functions.invoke("gdsRegulatoryIntel", payload);
      return res.data;
    } catch (e) { setError(e.message); return null; }
    finally { setLoading(l => ({ ...l, [key]: false })); }
  };

  const fetchUpdates = async () => { const d = await callFn({ action: "get_updates" }, "updates"); if (d) setUpdates(d); };
  const runAssessment = async (fList) => {
    const findings = fList || [...triaged, ...cloudFindings];
    const d = await callFn({ action: "full_assessment", org_profile: { gdpr_applicable: true, uk_ce_applicable: true }, findings }, "assess");
    if (d) setAssessment(d);
  };

  // Auto-run assessment when entity data is ready
  useEffect(() => {
    if ((triaged.length > 0 || cloudFindings.length > 0) && !assessment && !loading.assess) {
      runAssessment([...triaged, ...cloudFindings]);
    }
  }, [triaged, cloudFindings]);

  const kevItems = updates?.kev_additions || [];
  const obligations = assessment?.obligations || [];
  const boardExposure = assessment?.board_exposure || {};

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">⚖️</span>
        <div>
          <h1 className="text-2xl font-black text-white">Regulatory Intelligence</h1>
          <p className="text-sm mt-0.5" style={{ color: MUTED }}>Live regulatory obligation mapping — GDPR, NIS2, DORA, SEC Cyber Rules, UK Cyber Essentials</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={fetchUpdates} disabled={loading.updates}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          <RefreshCw className={`w-4 h-4 ${loading.updates ? "animate-spin" : ""}`} />
          Fetch Live KEV Updates
        </button>
        <button onClick={() => runAssessment()} disabled={loading.assess}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, color: MUTED }}>
          <RefreshCw className={`w-4 h-4 ${loading.assess ? "animate-spin" : ""}`} />
          {loading.assess ? "Assessing…" : "Re-run Assessment"}
        </button>
        {error && <p className="text-sm" style={{ color: DANGER }}>{error}</p>}
      </div>

      {/* KEV Updates */}
      {kevItems.length > 0 && (
        <Card className="p-5" style={{ border: `1px solid ${DANGER}30` }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} />
            <h3 className="font-bold text-white">Live CISA KEV Additions</h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse" style={{ color: DANGER, background: `${DANGER}20` }}>URGENT</span>
          </div>
          <div className="space-y-2">
            {kevItems.slice(0, 8).map((k, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
                <span className="text-[10px] font-mono font-black" style={{ color: CYAN }}>{k.cve_id || k.id}</span>
                <span className="text-xs flex-1 text-white truncate">{k.product || k.vulnerability_name || k.title}</span>
                {k.due_date && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: DANGER, background: `${DANGER}15` }}>Due: {k.due_date}</span>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Board Exposure */}
      {assessment && (
        <Card className="p-5">
          <h3 className="font-bold text-white mb-3">Board Exposure Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {REGULATIONS_REF.slice(0, 4).map(r => {
              const applicable = boardExposure[r.id]?.applicable !== false;
              return (
                <div key={r.id} className="p-3 rounded-xl text-center"
                  style={{ background: applicable ? `${r.color}10` : "rgba(255,255,255,0.02)", border: `1px solid ${applicable ? r.color + "30" : BORDER}`, opacity: applicable ? 1 : 0.4 }}>
                  <p className="text-xs font-black" style={{ color: applicable ? r.color : MUTED }}>{r.id}</p>
                  <p className="text-[9px] mt-1" style={{ color: MUTED }}>{r.penalty}</p>
                  <p className="text-[9px] mt-1 font-bold" style={{ color: applicable ? DANGER : MUTED }}>
                    {applicable ? `⏱ ${r.notification}` : "Not applicable"}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Obligations Table */}
      {obligations.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: BORDER }}>
            <h3 className="font-bold text-white">Regulatory Obligations ({obligations.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                  {["Finding", "Regulations", "Notification Required", "Fastest Deadline", "Legal Risk"].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {obligations.map((o, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                    <td className="px-4 py-2 text-xs text-white truncate max-w-[180px]">{o.finding_title}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1 flex-wrap">
                        {(o.regulations_triggered || []).map(r => (
                          <span key={r} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ color: REGULATIONS_REF.find(x => x.id === r)?.color || CYAN, background: "rgba(0,212,255,0.1)" }}>{r}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full`}
                        style={{ color: o.notification_required ? DANGER : LOW, background: o.notification_required ? `${DANGER}15` : `${LOW}15` }}>
                        {o.notification_required ? "YES" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs font-bold" style={{ color: DANGER }}>{o.fastest_notification_deadline_hours ? `${o.fastest_notification_deadline_hours}h` : "—"}</td>
                    <td className="px-4 py-2"><SevBadge sev={o.legal_risk} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Reference Panel */}
      <div>
        <h3 className="font-bold text-white mb-3">Regulation Reference</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {REGULATIONS_REF.map(r => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-black" style={{ color: r.color }}>{r.id}</span>
                <span className="text-[10px]" style={{ color: MUTED }}>{r.jurisdiction}</span>
              </div>
              <p className="text-xs font-semibold text-white mb-1">{r.name}</p>
              <p className="text-[10px]" style={{ color: DANGER }}>Penalty: {r.penalty}</p>
              <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Notification: {r.notification}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}