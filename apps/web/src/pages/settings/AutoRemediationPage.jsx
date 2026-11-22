import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Switch } from "@/components/ui/switch";
import { BookOpen, Sparkles, Zap } from "lucide-react";

const ASSET_TYPES = [
  { key: "compute", label: "Cloud compute", hint: "EC2, VM instances and autoscaling groups" },
  { key: "container", label: "Containers", hint: "Image tags, base layers and cluster workloads" },
  { key: "serverless", label: "Serverless", hint: "Functions, queues and managed runtimes" },
  { key: "database", label: "Databases", hint: "Managed engines, parameters and exposed snapshots" },
  { key: "storage", label: "Object storage", hint: "Bucket policies, ACLs and public objects" },
  { key: "ai_model", label: "AI models", hint: "Model endpoints, prompt surfaces and guardrails" },
  { key: "api", label: "APIs", hint: "Gateways, contracts and authentication schemes" },
  { key: "repository", label: "Repositories", hint: "Source, dependencies and pipeline secrets" },
  { key: "vm", label: "Virtual machines", hint: "Host patches, agents and installed packages" },
  { key: "cloud", label: "Cloud accounts", hint: "Account baselines, IAM and logging posture" },
  { key: "domain", label: "Domains & DNS", hint: "Certificates, DNS records and brand exposure" },
];

export default function AutoRemediationPage() {
  const [policies, setPolicies] = useState([]);
  const [eligible, setEligible] = useState({});
  const [busyType, setBusyType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  async function load() {
    const [rows, aggregate] = await Promise.all([
      base44.entities.AutoRemediationPolicy.list("-created_date", 50).catch(() => []),
      base44.entities.TriagedFinding
        .aggregate({ query: { severity: "low", status: "open" }, groupBy: "asset_type" })
        .catch(() => ({ rows: [] })),
    ]);
    setPolicies(rows || []);
    const counts = {};
    (aggregate?.rows || []).forEach((row) => { counts[row.asset_type] = row.count; });
    setEligible(counts);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const policyFor = (assetType) => policies.find((policy) => policy.asset_type === assetType);
  const isEnabled = (assetType) => policyFor(assetType)?.is_enabled !== false;

  async function toggle(assetType, next) {
    setBusyType(assetType);
    setMessage(null);
    const existing = policyFor(assetType);
    try {
      if (existing) {
        await base44.entities.AutoRemediationPolicy.update(existing.id, { is_enabled: next });
        setPolicies((prev) => prev.map((policy) => (policy.id === existing.id ? { ...policy, is_enabled: next } : policy)));
      } else {
        const created = await base44.entities.AutoRemediationPolicy.create({ asset_type: assetType, is_enabled: next });
        setPolicies((prev) => [...prev, created]);
      }
    } catch (error) {
      setMessage(`Could not save ${assetType}: ${error.message}`);
    }
    setBusyType(null);
  }

  const enabledCount = ASSET_TYPES.filter((type) => isEnabled(type.key)).length;
  const totalEligible = Object.values(eligible).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-4" style={{ background: "#0a0f1e", minHeight: "100vh" }}>
      <div className="flex items-start gap-3">
        <Zap size={22} className="text-emerald-400 mt-0.5" />
        <div>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">AUT-014 | AUTO-REMEDIATION</span>
          <h1 className="text-xl font-bold text-white mt-1">Auto-remediation controls</h1>
          <p className="text-xs text-slate-500">Low-severity findings are patched automatically only on the asset types you leave switched on. Everything else waits for manual triage.</p>
        </div>
      </div>

      {message && (
        <div className="rounded-lg px-3 py-2 text-[11px] border bg-red-500/10 border-red-500/40 text-red-300">{message}</div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <p className="text-lg font-bold font-mono text-emerald-300">{enabledCount}/{ASSET_TYPES.length}</p>
          <p className="text-[10px] text-slate-500">Asset types on autopilot</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <p className="text-lg font-bold font-mono text-blue-300">{totalEligible}</p>
          <p className="text-[10px] text-slate-500">Open low-risk findings eligible</p>
        </div>
      </div>

      {loading ? (
        <div className="w-6 h-6 border-2 border-t-emerald-500 border-white/10 rounded-full animate-spin mx-auto my-16" />
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid #1F2937" }}>
            <Sparkles size={13} className="text-emerald-400" />
            <p className="text-xs font-bold text-white">Automatic fixes by asset type</p>
          </div>
          <div className="divide-y divide-slate-800">
            {ASSET_TYPES.map((type) => {
              const on = isEnabled(type.key);
              const count = eligible[type.key] || 0;
              return (
                <div key={type.key} className="px-3 py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-white">{type.label}</p>
                    <p className="text-[10px] text-slate-500 truncate">{type.hint}</p>
                    <p className="text-[10px] mt-0.5">
                      <span className={on ? "text-emerald-300" : "text-slate-500"}>{on ? "auto-patching low-risk findings" : "manual triage only"}</span>
                      <span className="text-slate-600"> · {count} eligible now</span>
                    </p>
                  </div>
                  <Switch
                    checked={on}
                    disabled={busyType === type.key}
                    onCheckedChange={(next) => toggle(type.key, next)}
                    aria-label={`Auto-remediation for ${type.label}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="px-3 py-2 border-t border-slate-800 flex flex-wrap items-center gap-2">
            <p className="text-[10px] text-slate-500 flex-1">
              Only low-severity findings are auto-patched, and each one takes its fix from the strategy library.
            </p>
            <Link to="/fix-library" className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300">
              <BookOpen size={11} /> Fix Strategy Library
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}