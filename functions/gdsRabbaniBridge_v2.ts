// Base44 Backend Function — GDS Rabbani Bridge v2
// Connects Base44 Super Agent to Rabbani AI Core on the VPS.
// v2: Added kernel_tool + kernel_status actions for direct kernel syscall routing.
// Tool execution now goes through the GDS Unified Kernel sandbox instead of legacy tool_gateway.

interface BridgeRequest {
  action: "health" | "agents" | "mission" | "mission_status" | "invoke" | "auto" 
        | "kernel_status" | "kernel_tool" | "kernel_process";
  goal?: string;
  agent_id?: string;
  mission_id?: string;
  context?: Record<string, unknown>;
  // Kernel tool execution
  tool_id?: string;
  payload?: Record<string, unknown>;
  // Kernel process management
  pid?: string;
  agent_type?: string;
  priority?: number;
}

const VPS_URL = "https://api.globaldigitalsecurity.io";
const BRIDGE_KEY = Deno.env.get("BRIDGE_API_KEY") || "gds_bridge_2026_secure_key";

export default async function gdsRabbaniBridge(req: Request): Promise<Response> {
  try {
    const body: BridgeRequest = await req.json();
    const { action, goal, agent_id, mission_id, context, tool_id, payload, pid, agent_type, priority } = body;

    const headers: Record<string, string> = {
      "Authorization": `Bearer ${BRIDGE_KEY}`,
      "Content-Type": "application/json",
    };

    // === LEGACY BRIDGE ACTIONS (still supported) ===

    // 1. Health check
    if (action === "health") {
      const resp = await fetch(`${VPS_URL}/bridge/health`, { headers });
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. List all agents
    if (action === "agents") {
      const resp = await fetch(`${VPS_URL}/bridge/agents`, { headers });
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Create async mission (legacy — still uses tool_gateway)
    if (action === "mission") {
      const resp = await fetch(`${VPS_URL}/bridge/mission`, {
        method: "POST",
        headers,
        body: JSON.stringify({ goal, agent_id, context }),
      });
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Get mission status
    if (action === "mission_status") {
      const resp = await fetch(`${VPS_URL}/bridge/mission/${mission_id}`, { headers });
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 5. Invoke agent directly (sync) — now routes through kernel
    if (action === "invoke") {
      const resp = await fetch(`${VPS_URL}/bridge/agent/${agent_id}/invoke`, {
        method: "POST",
        headers,
        body: JSON.stringify({ goal, context, use_kernel: true }),
      });
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 6. Auto-select agent and run (sync) — now routes through kernel
    if (action === "auto") {
      const resp = await fetch(`${VPS_URL}/bridge/auto`, {
        method: "POST",
        headers,
        body: JSON.stringify({ goal, context, use_kernel: true }),
      });
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // === NEW KERNEL ACTIONS (v2) ===

    // 7. Kernel status — check kernel health and sandbox state
    if (action === "kernel_status") {
      const resp = await fetch(`${VPS_URL}/kernel/status`, { headers });
      const data = await resp.json();
      return new Response(JSON.stringify({
        kernel: data,
        tools_wired: data.sandbox?.registered_tools || 0,
        tools_healthy: data.sandbox?.healthy_tools || 0,
        total_executions: data.sandbox?.total_executions || 0,
        success_rate: data.sandbox?.success_rate || 0,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 8. Kernel tool — execute a tool directly through the kernel sandbox
    // This bypasses the LLM reasoning loop for direct tool calls.
    // Available tools: nmap_scan, nuclei_scan, semgrep_scan, trivy_scan,
    //   cisa_kev_check, osv_check, security_headers_check, aws_iam_scan,
    //   get_findings, store_finding
    if (action === "kernel_tool") {
      if (!tool_id) {
        return new Response(JSON.stringify({ error: "tool_id required for kernel_tool action" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      const resp = await fetch(`${VPS_URL}/kernel/tool/execute`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          pid: pid || "base44-bridge",
          tool_id: tool_id,
          payload: payload || {},
        }),
      });
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 9. Kernel process — create an agent process in the kernel
    if (action === "kernel_process") {
      const resp = await fetch(`${VPS_URL}/kernel/process/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          agent_id: agent_id || "ai-vuln-director",
          agent_type: agent_type || "security",
          priority: priority || 2,
          goal: goal || "",
        }),
      });
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action: " + action }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
