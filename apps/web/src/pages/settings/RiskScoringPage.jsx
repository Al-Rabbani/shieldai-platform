import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { SlidersHorizontal, RefreshCw, RotateCcw, Save } from "lucide-react";
import { DEFAULT_SCORING_CONFIG, loadScoringConfig, resolveScoringConfig } from "@/lib/riskScoring";
import AssetTypeWeightGrid from "@/components/settings/AssetTypeWeightGrid";
import RiskBandThresholds from "@/components/settings/RiskBandThresholds";
import RiskBandPreview from "@/components/settings/RiskBandPreview";

const ACTION_BUTTON = "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition disabled:opacity-40";

export default function RiskScoringPage() {
  const [recordId, setRecordId] = useState(null);
  const [config, setConfig] = useState(DEFAULT_SCORING_CONFIG);
  const [assets, setAssets] = useState([]);
  const [lastApplied, setLastApplied] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    const [{ record, config: stored }, assetRows] = await Promise.all([
      loadScoringConfig(),
      base44.entities.Asset.list("-created_date", 500).catch(() => []),
    ]);
    setRecordId(record?.id || null);
    setConfig(stored);
    setLastApplied(record?.last_applied ? { at: record.last_applied, count: record.applied_count || 0 } : null);
    setAssets(assetRows || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function updateWeight(field, value) {
    setConfig((prev) => ({ ...prev, [field]: value }));
  }

  function updateThreshold(field, value) {
    setConfig((prev) => ({ ...prev, [field]: value === "" ? "" : Number(value) }));
  }

  function validate() {
    const critical = Number(config.critical_threshold);
    const high = Number(config.high_threshold);
    const medium = Number(config.medium_threshold);
    if (![critical, high, medium].every((value) => Number.isFinite(value) && value >= 1 && value <= 100)) {
      return "Thresholds must be whole numbers between 1 and 100.";
    }
    if (!(critical > high && high > medium)) {
      return "Critical must be higher than high, and high higher than medium.";
    }
    return null;
  }

  async function save() {
    const error = validate();
    if (error) {
      setMessage({ type: "err", text: error });
      return;
    }
    setSaving(true);
    setMessage(null);
    const payload = {
      ...resolveScoringConfig(config),
      name: config.name || "Default scoring model",
      is_active: true,
    };
    try {
      if (recordId) {
        await base44.entities.RiskScoringConfig.update(recordId, payload);
      } else {
        const created = await base44.entities.RiskScoringConfig.create(payload);
        setRecordId(created.id);
      }
      setMessage({ type: "ok", text: "Scoring model saved. Apply it to recalculate asset scores." });
    } catch (err) {
      setMessage({ type: "err", text: `Could not save: ${err.message}` });
    }
    setSaving(false);
  }

  async function apply(action = "apply") {
    setApplying(true);
    setMessage(null);
    try {
      const response = await base44.functions.invoke("gdsApplyRiskScoring", { action });
      const data = response.data || {};
      setMessage({
        type: "ok",
        text: action === "reset"
          ? `Weights cleared from ${data.assets_updated || 0} asset scores.`
          : `Applied to ${data.assets_updated || 0} assets · ${data.bands?.critical || 0} critical, ${data.bands?.high || 0} high, ${data.bands?.medium || 0} medium, ${data.bands?.low || 0} low.`,
      });
      await load();
    } catch (err) {
      setMessage({ type: "err", text: err?.response?.data?.error || err.message });
    }
    setApplying(false);
  }

  return (
    <div className="space-y-4" style={{ background: "#0a0f1e", minHeight: "100vh" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <SlidersHorizontal size={22} className="text-blue-400 mt-0.5" />
          <div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">RSK-014 | RISK SCORING</span>
            <h1 className="text-xl font-bold text-white mt-1">Asset risk scoring</h1>
            <p className="text-xs text-slate-500">Weight asset types and set the score bands that define critical, high, medium and low risk.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setConfig(DEFAULT_SCORING_CONFIG)} disabled={saving} className={`${ACTION_BUTTON} bg-slate-700/40 text-slate-300 border border-slate-700 hover:bg-slate-700/60`}>
            <RotateCcw size={13} /> Defaults
          </button>
          <button onClick={save} disabled={saving} className={`${ACTION_BUTTON} bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30`}>
            <Save size={13} /> {saving ? "Saving…" : "Save model"}
          </button>
          <button onClick={() => apply("apply")} disabled={applying} className={`${ACTION_BUTTON} bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30`}>
            <RefreshCw size={13} className={applying ? "animate-spin" : ""} /> {applying ? "Applying…" : "Apply to asset scores"}
          </button>
        </div>
      </div>

      {message && (
        <div className={`rounded-lg px-3 py-2 text-[11px] border ${message.type === "err" ? "bg-red-500/10 border-red-500/40 text-red-300" : "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="w-6 h-6 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto my-16" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-3">
          <div className="space-y-3">
            <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
              <p className="text-xs font-bold text-white mb-1">Asset type weights</p>
              <p className="text-[10px] text-slate-500 mb-2">Each asset's score is multiplied by its type weight. Database and AI model assets default above general compute.</p>
              <AssetTypeWeightGrid config={config} onChange={updateWeight} />
            </div>

            <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
              <p className="text-xs font-bold text-white mb-2">Risk band thresholds</p>
              <RiskBandThresholds config={config} onChange={updateThreshold} />
            </div>
          </div>

          <div className="rounded-xl p-3 h-fit" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-white">Preview</p>
              <span className="text-[9px] text-slate-500">unsaved changes included</span>
            </div>
            <RiskBandPreview assets={assets} config={resolveScoringConfig(config)} />
            {lastApplied && (
              <p className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-800">
                Last applied {new Date(lastApplied.at).toLocaleString("en-GB")} across {lastApplied.count} assets.
              </p>
            )}
            <button onClick={() => apply("reset")} disabled={applying} className="mt-2 text-[10px] text-slate-500 hover:text-slate-300 underline">
              Restore unweighted scores
            </button>
          </div>
        </div>
      )}
    </div>
  );
}