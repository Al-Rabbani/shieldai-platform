import React from "react";
import { Zap } from "lucide-react";

/**
 * These toggles switched nothing on.
 *
 * Measured 23 Nov 2026: the component read and wrote AutoRemediationPolicy, which the adapter refuses because no policy
 * table exists, and every toggle defaulted to "on" through `policyFor(t)?.is_enabled !== false`. The copy beneath it read
 * "Low-risk findings pick up their matching library strategy and auto-patch", but nothing on this platform picks up a
 * strategy per asset type: the remediation engine only generates and executes a plan when asked (POST
 * /remediation/plans/generate, /remediation/plans/execute, /remediation/plans/verify), and no code patches an asset on its
 * own. The toggles therefore described an automation that does not exist, over eleven switches that could not be saved.
 */
export default function AutoRemediationToggles() {
  return (
    <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <p className="text-xs font-bold text-white flex items-center gap-1.5 mb-1">
        <Zap size={13} className="text-slate-500" /> Auto-remediation by asset type
      </p>
      <p className="text-[10px] text-slate-400">
        Not automated. No per-asset-type policy is stored here and nothing patches a finding on its own: remediation is a
        plan a person asks for. A plan can be generated, executed and verified through the remediation engine, and every
        step it runs is recorded on the plan.
      </p>
      <p className="text-[9px] text-slate-600 mt-1.5">
        The eleven switches that used to sit here defaulted to on and saved to a table that does not exist, so a type
        switched off stayed on. They were removed rather than left looking configured.
      </p>
    </div>
  );
}
