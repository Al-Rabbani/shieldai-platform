// A stored status label or health score cannot prove current worker liveness.
export function observeAgent(agent, now = Date.now()) {
  const stamp = agent.last_heartbeat ? Date.parse(agent.last_heartbeat) : NaN;
  const age = Number.isFinite(stamp) ? (now - stamp) / 1000 : null;
  const fresh = age !== null && age >= 0 && age <= 300;
  const status = fresh ? (['offline','error','degraded'].includes(agent.status) ? 'degraded' : 'online')
    : age !== null && age >= 0 ? 'offline' : 'unknown';
  return { ...agent, declared_status: agent.status, status, health_score: null,
    executions_total: null, avg_duration_ms: null, tasks_completed: null, sessions_count: null,
    tool_execution_verified: false };
}
