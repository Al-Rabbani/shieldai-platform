import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import FleetPerformanceTab from "@/components/settings/FleetPerformanceTab";
import { Activity, Cpu, LineChart, Play, Save, SlidersHorizontal } from "lucide-react";

const FIELD = "w-full px-2.5 py-1.5 rounded-lg text-[11px] bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none";
const EMPTY = {
  name: "Default fleet scaling",
  is_active: true,
  min_agents: 2,
  max_agents: 12,
  tasks_per_agent: 5,
  task_limit_per_agent: 5,
};

export default function FleetScalingPage() {
  const [configId, setConfigId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [burstAgents, setBurstAgents] = useState([]);
  const [liveCount, setLiveCount] = useState(0);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("policy");

  async function load() {
    const [configs, agents] = await Promise.all([
      base44.entities.FleetScalingConfig.list("-created_date", 10).catch(() => []),
      base44.entities.Agent.list("-created_date", 300).catch(() => []),
    ]);
    const policy = (configs || [])[0];
    if (policy) {
      setConfigId(policy.id);
      setForm({
        name: policy.name || EMPTY.name,
        is_active: policy.is_active !== false,
        min_agents: policy.min_agents ?? EMPTY.min_agents,
        max_agents: policy.max_agents ?? EMPTY.max_agents,
        tasks_per_agent: policy.tasks_per_agent ?? EMPTY.tasks_per_agent,
        task_limit_per_agent: policy.task_limit_per_agent ?? EMPTY.task_limit_per_agent,
      });
      setStatus({
        last_action: policy.last_action,
        last_reason: policy.last_reason,
        last_run_at: policy.last_run_at,
        desired_agents: policy.desired_agents,
        active_agents: policy.active_agents,
      });
    }
    setLiveCount((agents || []).filter((agent) => ["active", "idle", "working"].includes(agent.status)).length);
    setBurstAgents((agents || []).filter((agent) => (agent.record_state || "").startsWith("burst")));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setBusy(true);
    const payload = {
      ...form,
      min_agents: Number(form.min_agents),
      max_agents: Number(form.max_agents),
      tasks_per_agent: Number(form.tasks_per_agent),
      task_limit_per_agent: Number(form.task_limit_per_agent),
    };
    try {
      if (configId) {
        await base44.entities.FleetScalingConfig.update(configId, payload);
      } else {
        const created = await base44.entities.FleetScalingConfig.create(payload);
        setConfigId(created.id);
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function runNow() {
    setBusy(true);
    try {
      const response = await base44.functions.invoke("gdsFleetAutoscale", { action: "run" });
      setStatus({
        last_action: response.data?.last_action,
        last_reason: response.data?.reason,
        last_run_at: new Date().toISOString(),
        desired_agents: response.data?.desired_agents,
        active_agents: response.data?.agents_after,
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function applyLimits() {
    setBusy(true);
    try {
      const response = await base44.functions.invoke("gdsFleetAutoscale", { action: "apply_limits" });
      setStatus((prev) => ({ ...prev, last_action: "limits_applied", last_reason: `${response.data?.updated ?? 0} agent task limit(s) set to ${response.data?.task_limit_per_agent}.` }));
      await load();
    } finally {
      setBusy(false);
    }
  }

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const ACTION_STYLE = {
    scaled_up: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10",
    scaled_down: "text-blue-300 border-blue-500/40 bg-blue-500/10",
    held: "text-slate-300 border-slate-600 bg-slate-700/20",
    limits_applied: "text-purple-300 border-purple-500/40 bg-purple-500/10",
  };

  return (
    <div className="space-y-4" style={{ background: "#0a0f1e", minHeight: "100vh" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Activity size={22} className="text-blue-400 mt-0.5" />
          <div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">FLT-021 | FLEET SCALING</span>
            <h1 className="text-xl font-bold text-white mt-1">Agent fleet autoscaling</h1>
            <p className="text-xs text-slate-500">There is no autoscaler on this platform: nothing measures a task backlog and nothing starts or retires an agent process, and no scaling policy is stored here. The floor, ceiling and limits below are not saved or applied. What is real on this page is the registry count and the performance tab, which read the platform.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled
            title="No scaling policy store exists on this platform, so there is nothing to save."
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-300/50 border border-blue-500/20 cursor-not-allowed"
          >
            <Save size={13} /> Save policy (no store)
          </button>
          <button
            disabled
            title="No autoscaler process exists on this platform, so scaling cannot run."
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-300/50 border border-emerald-500/20 cursor-not-allowed"
          >
            <Play size={13} /> Run scaling (no autoscaler)
          </button>
        </div>
      </div>

      <div className="inline-flex rounded-lg p-0.5" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        {[
          { key: "policy", label: "Scaling policy", icon: SlidersHorizontal },
          { key: "performance", label: "Performance monitoring", icon: LineChart },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition ${
              tab === key ? "bg-blue-500/25 text-blue-300" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="w-6 h-6 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto my-16" />
      ) : tab === "performance" ? (
        <FleetPerformanceTab />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3">
          <div className="space-y-3">
            <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
              <p className="text-xs font-bold text-white mb-2 flex items-center gap-1.5"><SlidersHorizontal size={13} className="text-blue-400" /> Scaling policy</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="col-span-2 text-[10px] uppercase text-slate-500">
                  Policy name
                  <input value={form.name} onChange={(e) => update("name", e.target.value)} className={`mt-1 ${FIELD}`} />
                </label>
                <label className="text-[10px] uppercase text-slate-500">
                  Minimum agents
                  <input type="number" min="0" value={form.min_agents} onChange={(e) => update("min_agents", e.target.value)} className={`mt-1 ${FIELD}`} />
                </label>
                <label className="text-[10px] uppercase text-slate-500">
                  Maximum agents
                  <input type="number" min="1" value={form.max_agents} onChange={(e) => update("max_agents", e.target.value)} className={`mt-1 ${FIELD}`} />
                </label>
                <label className="text-[10px] uppercase text-slate-500">
                  Tasks per agent
                  <input type="number" min="1" value={form.tasks_per_agent} onChange={(e) => update("tasks_per_agent", e.target.value)} className={`mt-1 ${FIELD}`} />
                </label>
                <label className="text-[10px] uppercase text-slate-500">
                  Task limit per agent
                  <input type="number" min="1" value={form.task_limit_per_agent} onChange={(e) => update("task_limit_per_agent", e.target.value)} className={`mt-1 ${FIELD}`} />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <label className="flex items-center gap-2 text-[11px] text-slate-400">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => update("is_active", e.target.checked)} className="accent-blue-500" />
                  Policy active
                </label>
                <button onClick={applyLimits} disabled={busy} className="ml-auto px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition disabled:opacity-40">
                  Apply task limit to all live agents
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Desired fleet = open tasks ÷ tasks per agent, clamped to the minimum and maximum. Only burst agents are ever retired, so your named agents stay untouched.
              </p>
            </div>

            <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
              <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid #1F2937" }}>
                <Cpu size={13} className="text-blue-400" />
                <p className="text-xs font-bold text-white">Burst agents ({burstAgents.filter((agent) => agent.status !== "archived").length} live)</p>
              </div>
              {burstAgents.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No burst agents yet. One is added automatically when the backlog needs more capacity.</p>
              ) : (
                <div className="divide-y divide-slate-800">
                  {burstAgents.map((agent) => (
                    <div key={agent.id} className="px-3 py-2 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-white flex-1 min-w-0 truncate">{agent.display_name || agent.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">limit {agent.max_concurrency ?? "—"}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${agent.status === "archived" ? "text-slate-500 border-slate-700" : "text-emerald-300 border-emerald-500/40"}`}>
                        {agent.status}
                      </span>
                      <span className="text-[10px] text-slate-500">{agent.created_date ? new Date(agent.created_date).toLocaleString("en-GB") : ""}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl p-3 h-fit space-y-2" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <p className="text-xs font-bold text-white">Current capacity</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg p-2" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                <p className="text-lg font-bold font-mono text-white">{liveCount}</p>
                <p className="text-[10px] text-slate-500">Live agents</p>
              </div>
              <div className="rounded-lg p-2" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                <p className="text-lg font-bold font-mono text-blue-400">{status?.desired_agents ?? "—"}</p>
                <p className="text-[10px] text-slate-500">Desired</p>
              </div>
            </div>
            {status?.last_action && (
              <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border ${ACTION_STYLE[status.last_action] || ACTION_STYLE.held}`}>
                last: {String(status.last_action).replace(/_/g, " ")}
              </span>
            )}
            {status?.last_reason && <p className="text-[10px] text-slate-400">{status.last_reason}</p>}
            {status?.last_run_at && <p className="text-[10px] text-slate-600">Run {new Date(status.last_run_at).toLocaleString("en-GB")}</p>}
            <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-800">
              The scheduled run fires every 15 minutes. Scaling changes the fleet registry and each agent's task limit; it does not start new worker processes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}