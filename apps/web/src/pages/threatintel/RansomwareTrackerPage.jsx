import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { invokeAction } from "@/lib/invokeAction";
import { buildLiveDataOverride } from "@/lib/liveDataOverride";
import AIResponseModal from "@/components/shared/AIResponseModal";
import { AlertTriangle, Database, ShieldCheck } from "lucide-react";

/* Item 37, 23 Nov 2026. This page used to draw four hardcoded gangs - LockBit 3.0, The Gentlemen, Qilin, Akira - with
 * invented victim counts, invented average ransoms and invented leak sites (FALLBACK_GROUPS), under a permanent red
 * banner claiming LockBit 3.0 was "#1 active ransomware threat to GDS - 47 victims this month, targeting EU MSPs
 * directly". None of it came from anywhere: there is no ransomware store on this platform, so the empty read fell
 * through to the fallback and the page showed fiction as live intelligence.
 *
 * What is actually measured is the CISA KEV catalogue's own per-CVE ransomware flag (knownRansomwareCampaignUse),
 * crossed against this tenant's register. That is real exposure. Everything a gang page normally shows - leak sites,
 * victim counts, ransom demands, attribution - is refused here by name, because nothing on this host collects it.
 */

const REFUSAL_LABELS = {
  leak_site_presence: "Leak-site presence",
  victim_counts: "Victim counts",
  ransom_demands: "Ransom demands",
  gang_attribution: "Gang attribution",
  negotiation_activity: "Negotiation activity",
};

function Tile({ label, value, sub, tone = "text-white" }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{label}</p>
      {sub ? <p className="text-[10px] text-slate-600 mt-1">{sub}</p> : null}
    </div>
  );
}

export default function RansomwareTrackerPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalTitle, setModalTitle] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    base44.entities.RansomwareGroup.summary()
      .then((payload) => setData(payload || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const counts = data?.counts || {};
  const items = data?.items || [];
  const catalogue = data?.catalogue || {};
  const examples = data?.catalogue_examples || [];
  const notMeasured = data?.not_measured || {};
  const checked = counts.findings_checked ?? 0;
  const flaggedCves = counts.flagged_cves ?? 0;
  const unchecked = counts.unchecked_findings ?? 0;

  async function brief() {
    setModalTitle("AI Threat Brief — ransomware exposure from the register");
    setModalLoading(true);
    setModalData(null);
    const { liveDataOverride } = await buildLiveDataOverride().catch(() => ({ liveDataOverride: "" }));
    const input = [
      "Brief me on this tenant's ransomware exposure using only these measured figures.",
      `Register: ${counts.distinct_cves ?? 0} distinct CVEs. Findings checked against the CISA KEV catalogue: ${checked}.`,
      `CVEs the catalogue flags as used in ransomware campaigns: ${flaggedCves}.`,
      `Findings never checked against the catalogue (unknown, not clean): ${unchecked}.`,
      flaggedCves > 0
        ? `Flagged CVEs: ${items.map((i) => i.cve_id).join(", ")}.`
        : "No CVE in the register is flagged.",
      "Do not state victim counts, ransom amounts or gang names: none of that is collected here.",
      "Recommend patch sequencing for what is flagged, and what to do about the unchecked findings.",
    ].join(" ");
    const result = await invokeAction("gdsAgentOS", {
      action: "command",
      command_type: "threat_hunt",
      input,
      priority: "high",
      live_data_override: liveDataOverride,
    }).catch((e) => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#050b14" }}>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-white">🦠 RANSOMWARE EXPOSURE</h1>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-700/40 text-slate-300">
          From the CISA KEV catalogue, not a gang feed
        </span>
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-red-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : !data ? (
        <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/40">
          <p className="text-sm font-bold text-red-400">Ransomware exposure could not be read from the API.</p>
          <p className="text-xs text-slate-400 mt-1">
            Nothing is shown rather than a fallback list: this page has no hardcoded gangs to fall back to.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Tile label="Findings checked" value={checked} sub="against the KEV catalogue" />
            <Tile
              label="CVEs flagged"
              value={flaggedCves}
              sub="known ransomware use"
              tone={flaggedCves > 0 ? "text-red-400" : "text-emerald-400"}
            />
            <Tile label="Unchecked findings" value={unchecked} sub="unknown, not clean" tone={unchecked > 0 ? "text-amber-400" : "text-white"} />
            <Tile
              label="Catalogue flagged"
              value={catalogue.known_ransomware_entries ?? "—"}
              sub={`of ${catalogue.entries ?? "—"} KEV entries`}
            />
          </div>

          {flaggedCves === 0 ? (
            <div className="rounded-xl p-4 bg-emerald-500/10 border border-emerald-500/40 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-400">
                  No CVE in this register is flagged as used in ransomware campaigns.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {checked} finding(s) were checked against the catalogue
                  {unchecked > 0
                    ? `, and ${unchecked} were never checked - those are unknown, not clean.`
                    : ", and every finding with a CVE was checked."}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1F2937" }}>
              <table className="w-full text-xs">
                <thead style={{ background: "#111827" }}>
                  <tr className="text-slate-400 text-left">
                    <th className="p-2">CVE</th>
                    <th className="p-2">Severity</th>
                    <th className="p-2">CVSS</th>
                    <th className="p-2">EPSS</th>
                    <th className="p-2">Findings</th>
                    <th className="p-2">Assets</th>
                    <th className="p-2">KEV added</th>
                    <th className="p-2">CISA due</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.cve_id} className="border-t border-white/5 text-slate-300">
                      <td className="p-2 font-mono text-white">{row.cve_id}</td>
                      <td className="p-2 uppercase">{row.severity || "—"}</td>
                      <td className="p-2">{row.cvss_score ?? "—"}</td>
                      <td className="p-2">{row.epss_score != null ? `${Math.round(row.epss_score * 100)}%` : "—"}</td>
                      <td className="p-2">{row.finding_count}</td>
                      <td className="p-2">{(row.assets || []).join(", ") || "—"}</td>
                      <td className="p-2">{row.kev_date_added || "—"}</td>
                      <td className="p-2">{row.kev_due_date || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="rounded-xl p-4 space-y-2" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <p className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-500" /> Catalogue context (published CVEs, not on your estate)
            </p>
            <p className="text-xs text-slate-400">
              {catalogue.catalog_version ? `CISA KEV catalogVersion ${catalogue.catalog_version}` : "Catalogue version unavailable"}
              {catalogue.released ? `, released ${catalogue.released}` : ""}
              {catalogue.cache_age_hours != null ? ` · cached ${catalogue.cache_age_hours}h ago` : ""}
            </p>
            <div className="grid md:grid-cols-2 gap-2">
              {examples.map((entry) => (
                <div key={entry.cve_id} className="rounded-lg p-2 text-xs" style={{ background: "#0b1220", border: "1px solid #1F2937" }}>
                  <p className="font-mono text-slate-200">{entry.cve_id}</p>
                  <p className="text-slate-400">
                    {entry.vendor} {entry.product}
                  </p>
                  <p className="text-slate-500">
                    added {entry.date_added || "—"} · CISA due {entry.due_date || "—"}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              These entries are what the catalogue flags; they are counted as context and never as exposure on this estate.
            </p>
          </div>

          <div className="rounded-xl p-4 space-y-2 bg-amber-500/5 border border-amber-500/30">
            <p className="text-xs font-bold text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Not measured here
            </p>
            {Object.entries(notMeasured).map(([key, reason]) => (
              <div key={key} className="text-xs">
                <span className="text-slate-300 font-semibold">{REFUSAL_LABELS[key] || key}: </span>
                <span className="text-slate-400">{reason}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={brief}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30"
            >
              Brief me on this exposure
            </button>
            <p className="text-[11px] text-slate-500">
              {data?.basis?.exposure || "Exposure = a finding in this register whose CVE the catalogue flags."}
            </p>
          </div>
        </>
      )}

      {modalTitle && (
        <AIResponseModal
          title={modalTitle}
          loading={modalLoading}
          response={modalData?.response}
          agentSteps={modalData?.agent_steps}
          onClose={() => setModalTitle(null)}
        />
      )}
    </div>
  );
}
