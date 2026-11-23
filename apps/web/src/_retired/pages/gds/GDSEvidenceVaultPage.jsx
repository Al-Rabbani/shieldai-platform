import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Download, ChevronDown, ChevronUp, Shield, FileText, CheckCircle } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  SevBadge, Skeleton, EmptyState, Card, Breadcrumb, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";

const FRAMEWORKS = ["SOC2","ISO27001","GDPR","PCI-DSS"];
const FW_COLORS = { SOC2: CYAN, ISO27001: "#8b5cf6", GDPR: HIGH, "PCI-DSS": DANGER };

function RagBadge({ rag }) {
  const map = { green: LOW, amber: HIGH, red: DANGER };
  const c = map[rag?.toLowerCase()] || MUTED;
  return (
    <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase"
      style={{ color: c, background: `${c}18`, border: `1px solid ${c}30` }}>{rag || "—"}</span>
  );
}

function ScoreBar({ value }) {
  const color = value >= 70 ? LOW : value >= 40 ? HIGH : DANGER;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(value ?? 0, 100)}%`, background: color, transition: "width 1s ease" }} />
      </div>
      <span className="text-[10px] font-mono w-8 text-right" style={{ color }}>{value ?? 0}%</span>
    </div>
  );
}

function ControlAccordion({ ctrl }) {
  const [open, setOpen] = useState(false);
  const attest = ctrl.attestation_status || "UNKNOWN";
  const attestColor = attest === "EVIDENCE_AVAILABLE" ? LOW : attest === "NO_EVIDENCE" ? HIGH : MUTED;
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
      <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-all"
        onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono font-bold" style={{ color: CYAN }}>{ctrl.control_id}</span>
          <span className="text-xs text-white">{ctrl.control_name}</span>
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase"
            style={{ color: attestColor, background: `${attestColor}18` }}>{attest.replace(/_/g," ")}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px]" style={{ color: MUTED }}>{ctrl.total_evidence_records ?? 0} records</span>
          {open ? <ChevronUp className="w-4 h-4" style={{ color: MUTED }} /> : <ChevronDown className="w-4 h-4" style={{ color: MUTED }} />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: BORDER + "40" }}>
          {/* Evidence sources */}
          {(ctrl.evidence_sources || []).length > 0 && (
            <div className="flex flex-wrap gap-2 pt-3">
              {ctrl.evidence_sources.map(s => (
                <span key={s} className="text-[9px] px-2 py-0.5 rounded-full"
                  style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}20` }}>{s}</span>
              ))}
            </div>
          )}
          {/* Auditor note */}
          {ctrl.auditor_note && <p className="text-[11px] italic" style={{ color: MUTED }}>{ctrl.auditor_note}</p>}
          {/* Sample records */}
          {(ctrl.sample_records || []).length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#050e1f" }}>
                    {["ID","Title","Severity","Date"].map(h => (
                      <th key={h} className="px-3 py-1.5 text-left text-[9px] font-bold uppercase" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ctrl.sample_records.slice(0, 5).map((r, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${BORDER}20` }}>
                      <td className="px-3 py-1.5 text-[10px] font-mono" style={{ color: MUTED }}>{(r.id || "").slice(0,10)}</td>
                      <td className="px-3 py-1.5 text-[11px] text-white truncate max-w-[180px]">{r.title}</td>
                      <td className="px-3 py-1.5"><SevBadge sev={r.severity} /></td>
                      <td className="px-3 py-1.5 text-[10px]" style={{ color: MUTED }}>{timeAgo(r.date || r.created_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function GDSEvidenceVaultPage() {
  const [fwStatus, setFwStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [collectFw, setCollectFw] = useState("SOC2");
  const [collectLoading, setCollectLoading] = useState(false);
  const [evidencePkg, setEvidencePkg] = useState(null);
  const [controls, setControls] = useState({});
  const [controlsOpen, setControlsOpen] = useState(false);
  const [controlsLoading, setControlsLoading] = useState(false);

  useEffect(() => {
    base44.functions.invoke("gdsEvidenceVault", { action: "status" })
      .then(r => { if (r.data) setFwStatus(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const collectEvidence = async () => {
    setCollectLoading(true); setEvidencePkg(null);
    try {
      const r = await base44.functions.invoke("gdsEvidenceVault", { action: "collect", framework: collectFw });
      if (r.data) setEvidencePkg(r.data);
    } catch (e) { console.error(e); }
    finally { setCollectLoading(false); }
  };

  const loadControls = async () => {
    if (Object.keys(controls).length > 0) { setControlsOpen(o => !o); return; }
    setControlsLoading(true);
    try {
      const r = await base44.functions.invoke("gdsEvidenceVault", { action: "controls" });
      if (r.data) setControls(r.data);
    } catch (e) { console.error(e); }
    finally { setControlsLoading(false); setControlsOpen(true); }
  };

  const downloadPackage = () => {
    if (!evidencePkg) return;
    const blob = new Blob([JSON.stringify(evidencePkg, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `evidence-package-${evidencePkg.package_id || collectFw}-${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const fwKeys = Object.keys(fwStatus).length > 0 ? Object.keys(fwStatus) : FRAMEWORKS;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Evidence Vault" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Compliance Evidence Vault</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Automated audit evidence collection for SOC2, ISO27001, GDPR, PCI-DSS</p>
      </div>

      {/* Framework Status Cards */}
      {loading ? <Skeleton lines={3} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {fwKeys.map(fw => {
            const d = fwStatus[fw] || {};
            const color = FW_COLORS[fw] || CYAN;
            return (
              <Card key={fw} className="p-5 space-y-3" style={{ border: `1px solid ${color}25` }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black" style={{ color }}>{fw}</span>
                  <RagBadge rag={d.rag || (d.audit_readiness >= 70 ? "green" : d.audit_readiness >= 40 ? "amber" : "red")} />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: MUTED }}>Score</p>
                  <ScoreBar value={d.score ?? d.overall_score ?? 0} />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: MUTED }}>Audit Readiness</p>
                  <ScoreBar value={d.audit_readiness ?? 0} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div><span style={{ color: MUTED }}>Controls: </span><span className="font-bold text-white">{d.controls_mapped ?? "—"}</span></div>
                  <div><span style={{ color: MUTED }}>Violations: </span><span className="font-bold" style={{ color: (d.open_violations ?? 0) > 0 ? DANGER : LOW }}>{d.open_violations ?? 0}</span></div>
                </div>
                {d.last_assessed && <p className="text-[9px]" style={{ color: MUTED }}>Assessed: {timeAgo(d.last_assessed)}</p>}
                {d.next_audit && <p className="text-[9px]" style={{ color: MUTED }}>Next audit: {timeAgo(d.next_audit)}</p>}
              </Card>
            );
          })}
        </div>
      )}

      {/* Collect Evidence */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-bold text-white">Collect Evidence Package</h3>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={collectFw} onChange={e => setCollectFw(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: "#e2e8f0" }}>
            {FRAMEWORKS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <button onClick={collectEvidence} disabled={collectLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            {collectLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            {collectLoading ? "Collecting…" : "Collect Evidence"}
          </button>
        </div>

        {evidencePkg && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-xl"
              style={{ background: `${LOW}08`, border: `1px solid ${LOW}30` }}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MUTED }}>Package ID</p>
                <p className="text-sm font-mono font-bold" style={{ color: LOW }}>
                  {evidencePkg.package_id || `EVP-${collectFw}-${Date.now()}`}
                </p>
              </div>
              <button onClick={downloadPackage}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
                style={{ background: `${LOW}15`, border: `1px solid ${LOW}40`, color: LOW }}>
                <Download className="w-4 h-4" /> Download Package
              </button>
            </div>

            {/* Controls accordion */}
            <div className="space-y-2">
              {(evidencePkg.evidence_package || evidencePkg.controls || []).map((ctrl, i) => (
                <ControlAccordion key={ctrl.control_id || i} ctrl={ctrl} />
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Controls Reference */}
      <Card className="overflow-hidden">
        <button className="w-full flex items-center justify-between p-4" onClick={loadControls}>
          <span className="text-sm font-bold text-white">Controls Reference</span>
          {controlsLoading
            ? <RefreshCw className="w-4 h-4 animate-spin" style={{ color: MUTED }} />
            : controlsOpen
              ? <ChevronUp className="w-4 h-4" style={{ color: MUTED }} />
              : <ChevronDown className="w-4 h-4" style={{ color: MUTED }} />}
        </button>
        {controlsOpen && (
          <div className="border-t space-y-4 p-4" style={{ borderColor: BORDER }}>
            {Object.entries(controls).map(([fw, ctrlList]) => (
              <div key={fw}>
                <p className="text-xs font-black uppercase mb-2" style={{ color: FW_COLORS[fw] || CYAN }}>{fw}</p>
                <div className="space-y-1">
                  {(Array.isArray(ctrlList) ? ctrlList : []).map((c, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-all">
                      <span className="text-[10px] font-mono font-bold w-20 flex-shrink-0" style={{ color: CYAN }}>{c.control_id}</span>
                      <span className="text-xs text-white flex-1 truncate">{c.control_name || c.name}</span>
                      <span className="text-[9px]" style={{ color: MUTED }}>{c.entity || c.source}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}