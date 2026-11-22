import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Play, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, CARD, PAGE_BG, SevBadge, Card, KpiCard } from "@/components/gds/GDSOSShared";

const SLSA_LEVELS = [
  { level: 0, name: "No Guarantee", color: DANGER },
  { level: 1, name: "Documented", color: HIGH },
  { level: 2, name: "Version Controlled", color: MEDIUM },
  { level: 3, name: "Hardened Builds", color: LOW },
  { level: 4, name: "Two-Party Review", color: CYAN },
];

const CHECK_LABELS = {
  has_pinned_deps: "Pinned Dependencies",
  has_sbom: "SBOM Generated",
  has_sigstore: "Sigstore Signing",
  has_provenance: "Build Provenance",
  hermetic_builds: "Hermetic Builds",
  two_party_review: "Two-Party Review",
  reproducible_builds: "Reproducible Builds",
  version_controlled: "Version Controlled",
  automated_pipeline: "Automated Pipeline",
  build_isolated: "Isolated Build Environment",
};

export default function GDSSLSAPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const assess = async () => {
    setLoading(true); setError(null);
    try {
      const res = await base44.functions.invoke("gdsSLSA", { action: "assess_repo", repo_full_name: "Al-Rabbani/gds-os" });
      setResult(res.data);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const currentLevel = result?.slsa_level ?? null;
  const checks = result?.checks || {};
  const sigstore = result?.sigstore || {};
  const findings = result?.findings || [];

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">🔗</span>
        <div>
          <h1 className="text-2xl font-black text-white">Supply Chain Provenance (SLSA)</h1>
          <p className="text-sm mt-0.5" style={{ color: MUTED }}>SLSA levels 0-4 assessment + Sigstore provenance verification</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={assess} disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {loading ? "Assessing…" : "Assess Repo"}
        </button>
        {error && <p className="text-sm" style={{ color: DANGER }}>{error}</p>}
      </div>

      {result && (
        <>
          {/* SLSA Level Gauge */}
          <Card className="p-5">
            <h3 className="font-bold text-white mb-4">SLSA Level</h3>
            <div className="flex items-center gap-3 flex-wrap">
              {SLSA_LEVELS.map(l => {
                const active = currentLevel !== null && l.level <= currentLevel;
                const isCurrent = l.level === currentLevel;
                return (
                  <div key={l.level} className="flex flex-col items-center gap-1">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black font-mono transition-all"
                      style={{
                        background: active ? `${l.color}20` : "rgba(255,255,255,0.03)",
                        border: `2px solid ${isCurrent ? l.color : active ? l.color + "60" : BORDER}`,
                        color: active ? l.color : MUTED,
                        boxShadow: isCurrent ? `0 0 16px ${l.color}40` : "none",
                      }}>
                      {l.level}
                    </div>
                    <span className="text-[9px] font-bold text-center w-16 text-center" style={{ color: isCurrent ? l.color : MUTED }}>{l.name}</span>
                  </div>
                );
              })}
            </div>
            {result.next_level_requirements?.length > 0 && (
              <div className="mt-4 p-3 rounded-xl" style={{ background: `${CYAN}08`, border: `1px solid ${CYAN}20` }}>
                <p className="text-[11px] font-bold mb-2" style={{ color: CYAN }}>To reach Level {(currentLevel ?? 0) + 1}:</p>
                {result.next_level_requirements.map((r, i) => (
                  <p key={i} className="text-[10px]" style={{ color: MUTED }}>• {r}</p>
                ))}
              </div>
            )}
          </Card>

          {/* Checks Grid */}
          <Card className="p-5">
            <h3 className="font-bold text-white mb-4">Security Checks</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(checks).map(([key, val]) => (
                <div key={key} className="p-3 rounded-xl flex flex-col items-center gap-2"
                  style={{ background: val ? `${LOW}08` : `${DANGER}08`, border: `1px solid ${val ? LOW : DANGER}20` }}>
                  {val ? <CheckCircle className="w-5 h-5" style={{ color: LOW }} /> : <XCircle className="w-5 h-5" style={{ color: DANGER }} />}
                  <span className="text-[9px] font-bold text-center" style={{ color: val ? LOW : DANGER }}>{CHECK_LABELS[key] || key}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Sigstore */}
          <Card className="p-5">
            <h3 className="font-bold text-white mb-3">Sigstore / Cosign Status</h3>
            <div className="grid grid-cols-2 gap-3">
              {[["Cosign Workflow", sigstore.cosign_workflow], ["Release Signatures", sigstore.release_signatures]].map(([label, val]) => (
                <div key={label} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: val ? `${LOW}08` : `${DANGER}08`, border: `1px solid ${val ? LOW : DANGER}20` }}>
                  {val ? <CheckCircle className="w-5 h-5" style={{ color: LOW }} /> : <XCircle className="w-5 h-5" style={{ color: DANGER }} />}
                  <span className="text-xs font-bold" style={{ color: val ? LOW : DANGER }}>{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ background: result.cisa_ssdf_compliant ? `${LOW}15` : `${DANGER}15`, border: `1px solid ${result.cisa_ssdf_compliant ? LOW : DANGER}30` }}>
              {result.cisa_ssdf_compliant ? <CheckCircle className="w-4 h-4" style={{ color: LOW }} /> : <XCircle className="w-4 h-4" style={{ color: DANGER }} />}
              <span className="text-xs font-bold" style={{ color: result.cisa_ssdf_compliant ? LOW : DANGER }}>
                CISA SSDF {result.cisa_ssdf_compliant ? "Compliant" : "Non-Compliant"}
              </span>
            </div>
          </Card>

          {/* Findings */}
          {findings.length > 0 && (
            <Card className="overflow-hidden">
              <div className="p-4 border-b" style={{ borderColor: BORDER }}>
                <h3 className="font-bold text-white">Remediation Steps ({findings.length})</h3>
              </div>
              <div className="divide-y" style={{ borderColor: BORDER + "40" }}>
                {findings.map((f, i) => (
                  <div key={i} className="p-4 flex items-start gap-3">
                    <SevBadge sev={f.severity} />
                    <div>
                      <p className="text-xs font-bold text-white">{f.title}</p>
                      <p className="text-[10px] mt-1" style={{ color: MUTED }}>{f.remediation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}