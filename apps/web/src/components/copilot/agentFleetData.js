/* Tier colours and UI prompts only. The hardcoded AGENT_FLEET and MCP_TOOLS_FALLBACK arrays that lived here were removed
   on 22 Nov 2026: they drew 26 agents as a working fleet and listed jira_ticket_creator, on a platform with no agents
   table, one stale heartbeat row and no Jira. The fleet now comes from GET /agents, which serves the real registry in
   gds_api/agents/registry.py. */
export const TIER_COLORS = {
  sovereign: "#8B5CF6",
  command: "#3b82f6",
  specialist: "#10b981",
  restricted: "#ef4444",
};

/* The registry records a risk ceiling, not a tier. This maps one to the other so a colour is never undefined. */
export function tierForRisk(risk) {
  const value = String(risk || "").toLowerCase();
  if (value === "high" || value === "critical" || value === "destructive") return "restricted";
  if (value === "medium" || value === "moderate") return "specialist";
  return "command";
}

export const HEARTBEAT_COLORS = { live: "#22c55e", stale: "#f59e0b", never: "#475569" };

/* Prompts, not data: these are the suggestions shown before a conversation starts. */
export const QUICK_ACTIONS = [
  { emoji: "☁️", label: "Cloud risk review", prompt: "Review my cloud risks across AWS and Azure" },
  { emoji: "🔎", label: "Hunt threats", prompt: "Hunt for IOCs across the estate" },
  { emoji: "🛡️", label: "Board report", prompt: "Write the board report for this month" },
  { emoji: "📋", label: "Compliance status", prompt: "Show compliance status across frameworks" },
  { emoji: "🚑", label: "Investigate incident", prompt: "Investigate the open incidents" },
];

/* Empty on purpose: the chips render what is actually in flight, and no agent is in flight until a mission says so. */
export const DEFAULT_ACTIVE_AGENTS = [];

/* Empty on purpose. AgentStatusTicker renders what is actually in flight; this used to be a rotating list of agents
   presented as busy. */
export const TICKER_AGENTS = [];
