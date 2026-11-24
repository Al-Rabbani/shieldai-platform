import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  DEFAULT_SLA_HOURS,
  SLA_SEVERITIES,
  formatSlaHours,
  loadSlaTargets,
  resetSlaTargetsCache,
} from "@/lib/slaTargets";
import { Timer, Save } from "lucide-react";
import { absentStoreReason } from "@/api/absentStores";

const SEV_STYLE = {
  critical: "text-red-300 border-red-500/40 bg-red-500/10",
  high: "text-orange-300 border-orange-500/40 bg-orange-500/10",
  medium: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  low: "text-blue-300 border-blue-500/40 bg-blue-500/10",
  info: "text-slate-300 border-slate-600 bg-slate-700/20",
};

export default function SlaTargetsPage() {
  const [rows, setRows] = useState({});
  const [values, setValues] = useState({ ...DEFAULT_SLA_HOURS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    (async () => {
      const existing = await base44.entities.SlaTarget.list("-created_date", 50).catch(() => []);
      const map = {};
      const next = { ...DEFAULT_SLA_HOURS };
      (existing || []).forEach((row) => {
        map[row.severity] = row;
        if (Number(row.hours) > 0) next[row.severity] = Number(row.hours);
      });
      setRows(map);
      setValues(next);
      setLoading(false);
    })();
  }, []);

  function change(severity, raw) {
    const numeric = Number(raw);
    setValues((prev) => ({ ...prev, [severity]: Number.isFinite(numeric) ? numeric : 0 }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const updates = [];
      const creates = [];
      SLA_SEVERITIES.forEach((severity) => {
        const hours = Number(values[severity]);
        if (!Number.isFinite(hours) || hours <= 0) return;
        const existing = rows[severity];
        if (existing) {
          if (Number(existing.hours) !== hours) updates.push({ id: existing.id, hours });
        } else {
          creates.push({ severity, hours });
        }
      });
      if (updates.length) await base44.entities.SlaTarget.bulkUpdate(updates);
      if (creates.length) await base44.entities.SlaTarget.bulkCreate(creates);
      resetSlaTargetsCache();
      await loadSlaTargets();
      setMessage(`Deadlines saved · countdowns and the SLA radar now use these hours.`);
    } catch (error) {
      setMessage(`Could not save: ${error.message}`);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4" style={{ background: "#0a0f1e", minHeight: "100vh" }}>
      <div className="flex items-start gap-3">
        <Timer size={22} className="text-blue-400 mt-0.5" />
        <div>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">TRQ-005 | SLA TARGETS</span>
          <h1 className="text-xl font-bold text-white mt-1">Remediation deadlines by severity</h1>
          <p className="text-xs text-slate-500">
            How many hours each severity gets before its fix deadline expires. Used by every countdown and the SLA radar.
          </p>
        </div>
      </div>

      <div className="rounded-xl p-3 md:p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2.5">
            {SLA_SEVERITIES.map((severity) => (
              <div key={severity} className="flex flex-wrap items-center gap-2.5">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border w-20 text-center ${SEV_STYLE[severity]}`}>
                  {severity}
                </span>
                <input
                  type="number"
                  min="1"
                  value={values[severity]}
                  onChange={(e) => change(severity, e.target.value)}
                  className="w-24 px-2.5 py-1.5 rounded-lg text-xs bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none"
                  aria-label={`${severity} deadline in hours`}
                />
                <span className="text-[11px] text-slate-500">hours before the deadline</span>
                <span className="ml-auto text-[11px] font-mono text-slate-400">{formatSlaHours(values[severity])}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-50"
              >
                <Save size={13} /> {saving ? "Saving…" : "Save deadlines"}
              </button>
              {message && <p className="text-[11px] text-slate-400">{message}</p>}
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-600">
        A finding with its own SLA date keeps that date; these hours apply whenever no SLA has been set. <span className="text-amber-300/90">Saving needs a store this platform does not have, so Save reports that rather than confirming: {absentStoreReason("SlaTarget")}</span>
      </p>
    </div>
  );
}