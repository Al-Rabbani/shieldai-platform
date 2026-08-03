#!/usr/bin/env python3
"""Replace the old /bridge/mission endpoint with our new orchestrator-backed one."""
import re, sys

f = "/opt/gds-os/apps/api/gds_api/bridge/super_agent_bridge.py"
content = open(f).read()

# Step 1: Add the import if not present
if "_run_mission_async" not in content:
    lines = content.split("\n")
    last_import_idx = 0
    for i, line in enumerate(lines):
        if line.startswith("from gds_api") or line.startswith("import gds_api"):
            last_import_idx = i
    lines.insert(last_import_idx + 1, "from gds_api.reasoning.mission_orchestrator import run_mission as _run_mission_async")
    content = "\n".join(lines)
    print("Added import for _run_mission_async")
else:
    print("Import already present")

# Step 2: Find and replace the old /bridge/mission endpoint
# Look for @router.post("/bridge/mission") and replace everything until the next @router or end of file
pattern = r'@router\.post\("/bridge/mission"\).*?(?=\n@router\.|\nclass |\Z)'
match = re.search(pattern, content, re.DOTALL)

if match:
    old_endpoint = match.group(0)
    new_endpoint = '''@router.post("/bridge/mission")
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
        raise HTTPException(status_code=500, detail=str(e))'''
    
    content = content[:match.start()] + new_endpoint + content[match.end():]
    print("Replaced old /bridge/mission endpoint with new orchestrator-backed one")
else:
    # No existing endpoint found — append it
    new_endpoint = '''

@router.post("/bridge/mission")
async def bridge_mission(request: Request):
    """Phase 6: Multi-agent mission orchestration."""
    try:
        body = await request.json()
        goal = body.get("goal", "")
        context = body.get("context", {})
        if not goal:
            raise HTTPException(status_code=400, detail="goal is required")
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
    content += new_endpoint
    print("Appended new /bridge/mission endpoint")

open(f, "w").write(content)

# Verify compiles
try:
    compile(content, f, "exec")
    print("Compiles OK")
except SyntaxError as e:
    print("SYNTAX ERROR: %s at line %d" % (e.msg, e.lineno))
    lines = content.split("\n")
    if e.lineno:
        for j in range(max(0, e.lineno - 3), min(len(lines), e.lineno + 2)):
            print("  L%d: %s" % (j + 1, lines[j]))
    sys.exit(1)

# Verify import
sys.path.insert(0, "/opt/gds-os/apps/api")
for mod in list(sys.modules.keys()):
    if "gds_api" in mod:
        del sys.modules[mod]
try:
    from gds_api.bridge.super_agent_bridge import router
    print("Import OK — %d routes" % len(router.routes))
    # List all routes to confirm /bridge/mission exists
    for route in router.routes:
        if hasattr(route, 'path') and 'mission' in str(route.path):
            print("  Found: %s %s" % (getattr(route, 'methods', set()), route.path))
except Exception as e:
    print("Import FAILED: %s" % e)
    import traceback; traceback.print_exc()
    sys.exit(1)
