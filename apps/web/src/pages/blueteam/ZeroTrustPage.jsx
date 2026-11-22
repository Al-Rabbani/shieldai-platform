import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function ZeroTrustPage() {
  const [policies, setPolicies] = useState([]);
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.ZeroTrustPolicy.list("-priority", 50).catch(() => []),
      base44.entities.GlobalRiskScore.list("-calculated_at", 1).catch(() => []),
    ]).then(([p, r]) => {
      setPolicies(p);
      setRisk(r[0] || null);
    }).finally(() => setLoading(false));
  }, []);

  const identityScore = risk?.identity_score ?? null;

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <h1 className="text-xl font-bold text-white">🔐 Zero Trust</h1>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <>
          <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Identity / Zero Trust Score</p>
            <p className="text-4xl font-black mt-2" style={{ color: identityScore == null ? "#64748b" : identityScore < 60 ? "#EF4444" : identityScore < 80 ? "#F59E0B" : "#10B981" }}>
              {identityScore != null ? `${identityScore}/100` : "—"}
            </p>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 px-4 pt-3 pb-2">Zero Trust Policies</p>
            {policies.length === 0 ? (
              <p className="text-sm text-slate-500 px-4 pb-4">No zero trust policies configured.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase text-slate-500 border-t border-slate-800">
                    <th className="text-left px-4 py-2">Policy</th>
                    <th className="text-left px-4 py-2">Type</th>
                    <th className="text-left px-4 py-2">Min Trust</th>
                    <th className="text-left px-4 py-2">MFA</th>
                    <th className="text-left px-4 py-2">Status</th>
                    <th className="text-left px-4 py-2">Evaluations</th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map(p => (
                    <tr key={p.id} className="border-t border-slate-800/60 hover:bg-white/5">
                      <td className="px-4 py-2 font-medium text-white">{p.policy_name}</td>
                      <td className="px-4 py-2 text-slate-400 capitalize">{p.policy_type}</td>
                      <td className="px-4 py-2 text-slate-300">{p.min_trust_score}</td>
                      <td className="px-4 py-2">{p.require_mfa ? <span className="text-emerald-400 font-bold text-xs">Required</span> : <span className="text-slate-600 text-xs">Optional</span>}</td>
                      <td className="px-4 py-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${p.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700/40 text-slate-400"}`}>{p.status}</span>
                      </td>
                      <td className="px-4 py-2 text-slate-400">{p.evaluation_count || 0} <span className="text-emerald-500">({p.allow_count || 0} allow)</span> <span className="text-red-500">({p.deny_count || 0} deny)</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}