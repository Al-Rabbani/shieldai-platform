import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Zap } from "lucide-react";

const ASSET_TYPES = ["compute", "container", "serverless", "database", "storage", "ai_model", "api", "repository", "vm", "cloud", "domain"];

export default function AutoRemediationToggles() {
  const [policies, setPolicies] = useState([]);
  const [busyType, setBusyType] = useState(null);

  useEffect(() => {
    base44.entities.AutoRemediationPolicy.list("-created_date", 50)
      .then((rows) => setPolicies(rows || []))
      .catch(() => setPolicies([]));
  }, []);

  const policyFor = (assetType) => policies.find((policy) => policy.asset_type === assetType);
  const enabled = (assetType) => policyFor(assetType)?.is_enabled !== false;

  async function toggle(assetType) {
    setBusyType(assetType);
    const existing = policyFor(assetType);
    const next = !enabled(assetType);
    try {
      if (existing) {
        await base44.entities.AutoRemediationPolicy.update(existing.id, { is_enabled: next });
        setPolicies((prev) => prev.map((policy) => (policy.id === existing.id ? { ...policy, is_enabled: next } : policy)));
      } else {
        const created = await base44.entities.AutoRemediationPolicy.create({ asset_type: assetType, is_enabled: next });
        setPolicies((prev) => [...prev, created]);
      }
    } finally {
      setBusyType(null);
    }
  }

  return (
    <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <p className="text-xs font-bold text-white flex items-center gap-1.5 mb-1">
        <Zap size={13} className="text-emerald-400" /> Auto-remediation by asset type
      </p>
      <p className="text-[10px] text-slate-500 mb-2">
        Low-risk findings pick up their matching library strategy and auto-patch. Switch a type off to keep it for manual triage.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {ASSET_TYPES.map((assetType) => {
          const on = enabled(assetType);
          return (
            <button
              key={assetType}
              onClick={() => toggle(assetType)}
              disabled={busyType === assetType}
              className={`px-2 py-1 rounded-full text-[10px] font-bold border transition disabled:opacity-40 ${
                on ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
            >
              {assetType.replace(/_/g, " ")} · {on ? "on" : "off"}
            </button>
          );
        })}
      </div>
    </div>
  );
}