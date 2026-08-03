#!/bin/bash
# ============================================================
# GDS KERNEL PHASE 6 — MULTI-AGENT MISSION ORCHESTRATION
# ============================================================
# Deploys mission_orchestrator.py and wires /bridge/mission endpoint
# ============================================================

set -e

API_DIR="/opt/gds-os/apps/api"
BRIDGE_FILE="$API_DIR/gds_api/bridge/super_agent_bridge.py"

echo "============================================================"
echo "GDS KERNEL PHASE 6 — MULTI-AGENT MISSION ORCHESTRATION"
echo "============================================================"

# [1/3] Deploy mission_orchestrator.py
echo "[1/3] Deploying mission_orchestrator.py..."
cp /tmp/shieldai-kb/deploy/mission_orchestrator.py "$API_DIR/gds_api/reasoning/mission_orchestrator.py"
echo "  ✅ mission_orchestrator.py deployed"

# [2/3] Verify imports
echo "[2/3] Verifying imports..."
cd "$API_DIR"
python3 -c "
import sys; sys.path.insert(0, '.')
try:
    from gds_api.reasoning.mission_orchestrator import run_mission, execute_mission, plan_mission
    print('  ✅ mission_orchestrator imports OK')
    print('  ✅ AGENT_CATALOG: %d agents' % len(__import__('gds_api.reasoning.mission_orchestrator', fromlist=['AGENT_CATALOG']).AGENT_CATALOG))
except Exception as e:
    print('  ❌ Import FAILED:', e)
    import traceback; traceback.print_exc()
    exit(1)
" 2>&1

# [3/3] Patch bridge to add /bridge/mission endpoint
echo "[3/3] Patching bridge to add /bridge/mission endpoint..."

python3 << 'PYEOF'
import re

f = "/opt/gds-os/apps/api/gds_api/bridge/super_agent_bridge.py"
content = open(f).read()

# Check if mission endpoint already exists
if "/bridge/mission" in content and "run_mission" in content:
    print("  ⚠️  Mission endpoint already exists — skipping patch")
else:
    # Add import for mission_orchestrator at the top of the file (after existing imports)
    import_line = "from gds_api.reasoning.mission_orchestrator import run_mission as _run_mission_async"
    
    # Find a good place to add the import — after the last "from gds_api" import
    lines = content.split("\n")
    last_import_idx = 0
    for i, line in enumerate(lines):
        if line.startswith("from gds_api") or line.startswith("import gds_api"):
            last_import_idx = i
    
    lines.insert(last_import_idx + 1, import_line)
    content = "\n".join(lines)
    
    # Add the mission endpoint before the last line of the router
    # Find the last route definition or the end of the file
    mission_endpoint = '''

@router.post("/bridge/mission")
async def bridge_mission(request: Request):
    """Phase 6: Multi-agent mission orchestration.
    Takes a high-level goal, plans agent selection, runs agents in parallel,
    and returns a unified security report.
    """
    try:
        body = await request.json()
        goal = body.get("goal", "")
        context = body.get("context", {})
        
        if not goal:
            raise HTTPException(status_code=400, detail="goal is required")
        
        import asyncio
        result = await _run_mission_async(goal, context)
        
        return {
            "success": result.get("successful_agents", 0) > 0,
            "mission_id": result.get("mission_id"),
            "goal": result.get("goal"),
            "plan": result.get("plan"),
            "agent_results": result.get("agent_results"),
            "unified_report": result.get("unified_report"),
            "duration_ms": result.get("duration_ms"),
            "kernel_managed": result.get("kernel_managed", False),
            "mission_pid": result.get("mission_pid"),
            "total_tool_calls": result.get("total_tool_calls", 0),
            "successful_agents": result.get("successful_agents", 0),
            "total_agents": result.get("total_agents", 0)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Mission failed: %s" % str(e))
        raise HTTPException(status_code=500, detail=str(e))
'''
    
    content += mission_endpoint
    print("  ✅ Mission endpoint added to bridge")

open(f, "w").write(content)

# Verify compiles
try:
    compile(content, f, "exec")
    print("  ✅ Compiles OK")
except SyntaxError as e:
    print("  ❌ SYNTAX ERROR: %s at line %d" % (e.msg, e.lineno))
    lines = content.split("\n")
    if e.lineno:
        for j in range(max(0, e.lineno - 3), min(len(lines), e.lineno + 2)):
            print("    L%d: %s" % (j + 1, lines[j]))
    exit(1)

# Verify import
import sys
sys.path.insert(0, "/opt/gds-os/apps/api")
for mod in list(sys.modules.keys()):
    if "gds_api" in mod:
        del sys.modules[mod]
try:
    from gds_api.bridge.super_agent_bridge import router
    print("  ✅ Import OK — %d routes (was 7, should be 8)" % len(router.routes))
except Exception as e:
    print("  ❌ Import FAILED: %s" % e)
    import traceback; traceback.print_exc()
    exit(1)
PYEOF

# Restart services
echo ""
echo "Restarting services..."
supervisorctl restart gds-os
sleep 10

# Verify both services running
echo "  gds-kernel: $(supervisorctl status gds-kernel | awk '{print $2, $3}')"
echo "  gds-os: $(supervisorctl status gds-os | awk '{print $2, $3}')"

echo ""
echo "============================================================"
echo "PHASE 6 — MULTI-AGENT MISSION ORCHESTRATION DEPLOYED"
echo "============================================================"
echo ""
echo "New endpoint: POST /bridge/mission"
echo "  Body: {\"goal\": \"Run a full security assessment\", \"context\": {}}"
echo ""
echo "What it does:"
echo "  1. GPT-4.1 analyzes goal and selects best agents (from 8-agent catalog)"
echo "  2. Creates kernel APCB for mission with shared context"
echo "  3. Runs selected agents in PARALLEL (asyncio.gather)"
echo "  4. Each agent gets kernel-managed memory + real tool execution"
echo "  5. GPT-4.1 synthesizes all agent results into unified report"
echo "  6. Returns: mission_id, agent_results, unified_report, kernel PIDs"
echo ""
echo "Agent catalog:"
echo "  ai-vuln-director  — nmap, CISA KEV, OSV, security headers"
echo "  ai-cloud-director  — AWS IAM scan"
echo "  ai-threat-hunter   — nmap, nuclei, security headers"
echo "  ai-incident-cmd    — findings triage, evidence"
echo "  ai-remediation-dir  — patch planning, fix tracking"
echo "  ai-soc-director    — SOC ops, alert triage"
echo "  ai-compliance-dir   — compliance assessment"
echo "  ai-chief-ciso       — executive risk assessment"
echo "============================================================"
