#!/usr/bin/env python3
"""Replace the OLD /bridge/mission endpoint and remove the duplicate."""
import re, sys

f = "/opt/gds-os/apps/api/gds_api/bridge/super_agent_bridge.py"
content = open(f).read()

# Step 1: Remove the duplicate /bridge/bridge/mission endpoint we appended
# Find @router.post("/bridge/bridge/mission") and remove it
dup_pattern = r'\n@router\.post\("/bridge/bridge/mission"\).*?(?=\n@router\.|\nclass |\Z)'
content = re.sub(dup_pattern, '', content, flags=re.DOTALL)
print("Removed duplicate /bridge/bridge/mission endpoint")

# Step 2: Find the OLD /bridge/mission endpoint
# The old endpoint might use @router.post("/bridge/mission") OR @router.post("/mission") 
# depending on whether the router has a prefix

# Let's find it by looking for "bridge_mission" or "mission" POST endpoint
# First, let's see what the old endpoint looks like
old_patterns = [
    r'@router\.post\("/bridge/mission"\)\s*\nasync def (\w+)\(.*?\n(?=\n@router\.|\nclass |\Z)',
    r'@router\.post\("/mission"\)\s*\nasync def (\w+)\(.*?\n(?=\n@router\.|\nclass |\Z)',
]

old_replaced = False
for pat in old_patterns:
    match = re.search(pat, content, re.DOTALL)
    if match:
        old_func_name = match.group(1)
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
        
        # If router has prefix "/bridge", use "/mission" instead of "/bridge/mission"
        if 'prefix="/bridge"' in content or 'prefix="/bridge/"' in content:
            new_endpoint = new_endpoint.replace('"/bridge/mission"', '"/mission"')
            print("Adjusted path to /mission (router has /bridge prefix)")
        
        content = content[:match.start()] + "\n" + new_endpoint + content[match.end():]
        print("Replaced old endpoint (was: %s)" % old_func_name)
        old_replaced = True
        break

if not old_replaced:
    print("Could not find old mission endpoint to replace")
    print("Searching for mission-related routes...")
    for i, line in enumerate(content.split("\n")):
        if "mission" in line.lower() and ("@router" in line or "def " in line):
            print("  L%d: %s" % (i+1, line.rstrip()))
    sys.exit(1)

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

# Verify import + routes
sys.path.insert(0, "/opt/gds-os/apps/api")
for mod in list(sys.modules.keys()):
    if "gds_api" in mod:
        del sys.modules[mod]
try:
    from gds_api.bridge.super_agent_bridge import router
    print("Import OK — %d routes" % len(router.routes))
    for route in router.routes:
        if hasattr(route, 'path') and 'mission' in str(route.path):
            methods = getattr(route, 'methods', set())
            print("  %s %s" % (methods, route.path))
except Exception as e:
    print("Import FAILED: %s" % e)
    import traceback; traceback.print_exc()
    sys.exit(1)
