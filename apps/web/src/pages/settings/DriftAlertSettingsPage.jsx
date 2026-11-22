import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, BellRing, Check, Zap } from "lucide-react";

const ASSET_TYPES = [
  { key: "server", label: "Servers" },
  { key: "network", label: "Network" },
  { key: "database", label: "Databases" },
  { key: "container", label: "Containers" },
  { key: "kubernetes", label: "Kubernetes" },
  { key: "cloud_resource", label: "Cloud resources" },
];

const SEVERITIES = [
  { key: "critical", label: "Critical", color: "text-red-300 border-red-500/40 bg-red-500/15" },
  { key: "high", label: "High", color: "text-orange-300 border-orange-500/40 bg-orange-500/15" },
  { key: "medium", label: "Medium", color: "text-amber-300 border-amber-500/40 bg-amber-500/15" },
  { key: "low", label: "Low", color: "text-blue-300 border-blue-500/40 bg-blue-500/15" },
];

const DEFAULTS = {
  is_enabled: true,
  asset_types: ASSET_TYPES.map((type) => type.key),
  severities: ["critical"],
  auto_fix_enabled: false,
};

export default function DriftAlertSettingsPage() {
  const [config, setConfig] = useState(DEFAULTS);
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const rows = await base44.entities.DriftAlertConfig.list("-updated_date", 1).catch(() => []);
    const record = rows?.[0];
    if (record) {
      setRecordId(record.id);
      setConfig({
        is_enabled: record.is_enabled !== false,
        asset_types: record.asset_types?.length ? record.asset_types : DEFAULTS.asset_types,
        severities: record.severities?.length ? record.severities : DEFAULTS.severities,
        auto_fix_enabled: record.auto_fix_enabled === true,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function persist(patch) {
    const next = { ...config, ...patch };
    setConfig(next);
    setSaving(true);
    setSaved(false);
    const me = await base44.auth.me().catch(() => null);
    try {
      if (recordId) {
        await base44.entities.DriftAlertConfig.update(recordId, { ...next, updated_by: me?.email || null });
      } else {
        const created = await base44.entities.DriftAlertConfig.create({ ...next, updated_by: me?.email || null });
        setRecordId(created.id);
      }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  function toggleIn(listKey, key) {
    const current = config[listKey];
    const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
    if (next.length === 0) return;
    persist({ [listKey]: next });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0f1e" }}>
        <div className="w-8 h-8 border-4 border-t-amber-500 border-white/10 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex items-start gap-3">
        <BellRing size={22} className="text-amber-400 mt-0.5" />
        <div>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">CFG-006 | DRIFT ALERTS</span>
          <h1 className="text-xl font-bold text-white mt-1">Drift alert targeting</h1>
          <p className="text-xs text-slate-500">Choose which asset types and severities raise a drift notification and Slack alert as soon as the change is detected.</p>
        </div>
      </div>

      {saving && <p className="text-[10px] text-slate-500">Saving…</p>}
      {!saving && saved && <p className="text-[10px] text-emerald-400 flex items-center gap-1"><Check size={11} /> Saved</p>}

      <div className="rounded-xl p-3 flex items-center justify-between gap-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div>
          <p className="text-sm font-semibold text-white">Drift alerting</p>
          <p className="text-[10px] text-slate-500">Master switch for in-app notifications and Slack pings on drift.</p>
        </div>
        <Switch checked={config.is_enabled} onCheckedChange={(value) => persist({ is_enabled: value })} />
      </div>

      <div className={`rounded-xl p-3 space-y-2 ${config.is_enabled ? "" : "opacity-50"}`} style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Asset types</p>
        <div className="flex flex-wrap gap-1.5">
          {ASSET_TYPES.map((type) => {
            const on = config.asset_types.includes(type.key);
            return (
              <button
                key={type.key}
                disabled={!config.is_enabled}
                onClick={() => toggleIn("asset_types", type.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${on ? "text-amber-200 border-amber-500/40 bg-amber-500/15" : "text-slate-400 border-slate-700 bg-white/5 hover:bg-white/10"}`}
              >
                {type.label}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-500">Drift on a type you switch off is still recorded and listed, it just does not page anyone.</p>
      </div>

      <div className={`rounded-xl p-3 space-y-2 ${config.is_enabled ? "" : "opacity-50"}`} style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Severities that alert</p>
        <div className="flex flex-wrap gap-1.5">
          {SEVERITIES.map((severity) => {
            const on = config.severities.includes(severity.key);
            return (
              <button
                key={severity.key}
                disabled={!config.is_enabled}
                onClick={() => toggleIn("severities", severity.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${on ? severity.color : "text-slate-400 border-slate-700 bg-white/5 hover:bg-white/10"}`}
              >
                {severity.label}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-500">At least one severity must stay selected. Critical is the default.</p>
      </div>

      <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: "3px solid #10b981" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Zap size={15} className="text-emerald-400 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">Auto-remediate low-risk drift</p>
              <p className="text-[10px] text-slate-500">
                Reverts low-severity drift to the approved baseline with no approval step: anything detection flags auto-correctable plus the common classes (logging, encryption, storage exposure, MFA), on any asset still in service. Decommissioned, archived and inactive assets are left alone.
              </p>
            </div>
          </div>
          <Switch checked={config.auto_fix_enabled} onCheckedChange={(value) => persist({ auto_fix_enabled: value })} />
        </div>
      </div>

      <p className="text-[10px] text-slate-600 flex items-start gap-1.5">
        <AlertTriangle size={11} className="mt-0.5 flex-shrink-0" />
        Auto-remediation writes a configuration correction record for every reverted drift, so each change stays auditable in the asset's forensic history.
      </p>
    </div>
  );
}