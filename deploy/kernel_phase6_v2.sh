#!/bin/bash
# ============================================================
# GDS KERNEL PHASE 6 v2 — Async Missions + Agent IPC + Persistence
# ============================================================
set -e

API_DIR="/opt/gds-os/apps/api"
BRIDGE_FILE="$API_DIR/gds_api/bridge/super_agent_bridge.py"

echo "============================================================"
echo "PHASE 6 v2 — Async Missions + Agent IPC + Persistence"
echo "============================================================"

# [1/4] Deploy updated mission_orchestrator.py
echo "[1/4] Deploying mission_orchestrator_v2.py..."
cp /tmp/shieldai-kb/deploy/mission_orchestrator_v2.py "$API_DIR/gds_api/reasoning/mission_orchestrator.py"
echo "  ✅ mission_orchestrator.py updated (v2)"

# [2/4] Verify imports
echo "[2/4] Verifying imports..."
cd "$API_DIR"
python3 -c "
import sys; sys.path.insert(0, '.')
try:
    from gds_api.reasoning.mission_orchestrator import run_mission, execute_mission, start_mission_async, get_mission_status
    print('  ✅ v2 imports OK')
    print('  ✅ start_mission_async: available')
    print('  ✅ get_mission_status: available')
except Exception as e:
    print('  ❌ Import FAILED:', e)
    import traceback; traceback.print_exc()
    exit(1)
" 2>&1

# [3/4] Patch bridge — replace mission endpoints with async-aware versions
echo "[3/4] Patching bridge for async missions..."

python3 << 'PYEOF'
import re, sys

f = "/opt/gds-os/apps/api/gds_api/bridge/super_agent_bridge.py"
content = open(f).read()

# Update the import to include new functions
if "start_mission_async" not in content:
    content = content.replace(
        "from gds_api.reasoning.mission_orchestrator import run_mission as _run_mission_async",
        "from gds_api.reasoning.mission_orchestrator import run_mission as _run_mission_async, start_mission_async as _start_mission_async, get_mission_status as _get_mission_status"
    )
    print("  Updated import to include async + status functions")
else:
    print("  Import already has async functions")

# Replace the POST /bridge/mission endpoint to support async mode
# Find @router.post("/mission") or @router.post("/bridge/mission") that calls _run_mission_async
post_pattern = r'@router\.post\("/(?:bridge/)?mission"\).*?raise HTTPException\(status_code=500, detail=str\(e\)\)'
post_match = re.search(post_pattern, content, re.DOTALL)

if post_match:
    new_post = '''@router.post("/mission")
async def bridge_mission(request: Request):
    """Phase 6 v2: Multi-agent mission orchestration with async support."""
    try:
        body = await request.json()
        goal = body.get("goal", "")
        context = body.get("context", {})
        async_mode = body.get("async", False)
        
        if not goal:
            raise HTTPException(status_code=400, detail="goal is required")
        
        if async_mode:
            result = await _start_mission_async(goal, context)
            return result
        else:
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
    
    content = content[:post_match.start()] + new_post + content[post_match.end():]
    print("  Replaced POST /mission endpoint with async-aware version")
else:
    print("  ⚠️ POST /mission endpoint not found for replacement")

# Replace the GET /bridge/mission/{mission_id} endpoint to use our status function
get_pattern = r'@router\.get\("/(?:bridge/)?mission/\{mission_id\}"\).*?(?=\n@router\.|\nclass |\Z)'
get_match = re.search(get_pattern, content, re.DOTALL)

if get_match:
    new_get = '''@router.get("/mission/{mission_id}")
async def get_mission_status_endpoint(mission_id: str):
    """Phase 6 v2: Get mission status (in-memory or PostgreSQL)."""
    result = _get_mission_status(mission_id)
    return result'''
    
    content = content[:get_match.start()] + new_get + content[get_match.end():]
    print("  Replaced GET /mission/{mission_id} endpoint with status function")
else:
    print("  ⚠️ GET /mission/{mission_id} endpoint not found — appending")
    content += '''

@router.get("/mission/{mission_id}")
async def get_mission_status_endpoint(mission_id: str):
    result = _get_mission_status(mission_id)
    return result
'''

open(f, "w").write(content)

# Verify compiles
try:
    compile(content, f, "exec")
    print("  Compiles OK")
except SyntaxError as e:
    print("  ❌ SYNTAX ERROR: %s at line %d" % (e.msg, e.lineno))
    lines = content.split("\n")
    if e.lineno:
        for j in range(max(0, e.lineno-3), min(len(lines), e.lineno+2)):
            print("    L%d: %s" % (j+1, lines[j]))
    sys.exit(1)

# Verify import
sys.path.insert(0, "/opt/gds-os/apps/api")
for mod in list(sys.modules.keys()):
    if "gds_api" in mod:
        del sys.modules[mod]
try:
    from gds_api.bridge.super_agent_bridge import router
    print("  Import OK — %d routes" % len(router.routes))
    for route in router.routes:
        if hasattr(route, 'path') and 'mission' in str(route.path):
            print("    %s %s" % (getattr(route, 'methods', set()), route.path))
except Exception as e:
    print("  ❌ Import FAILED: %s" % e)
    import traceback; traceback.print_exc()
    sys.exit(1)
PYEOF

# [4/4] Restart and verify
echo "[4/4] Restarting services..."
supervisorctl restart gds-os
sleep 15
echo "  gds-os: $(supervisorctl status gds-os | awk '{print $2, $3}')"

# Verify PostgreSQL table
echo ""
echo "Verifying PostgreSQL mission_results table..."
python3 -c "
import psycopg2, json
conn = psycopg2.connect('postgresql://gds:Gds0s2026Secure@localhost:5432/gds_os')
cur = conn.cursor()
cur.execute('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = %s ORDER BY ordinal_position', ('mission_results',))
cols = cur.fetchall()
if cols:
    print('  ✅ mission_results table exists (%d columns)' % len(cols))
    for col, dtype in cols:
        print('    %s: %s' % (col, dtype))
else:
    print('  ❌ Table not found')
conn.close()
" 2>&1

echo ""
echo "============================================================"
echo "PHASE 6 v2 DEPLOYED"
echo "============================================================"
echo ""
echo "Features:"
echo "  1. Sync missions: POST /bridge/mission {goal, context}"
echo "  2. Async missions: POST /bridge/mission {goal, context, async:true}"
echo "     → Returns {mission_id, status:'running'} immediately"
echo "     → Poll: GET /bridge/mission/{mission_id}"
echo "  3. Agent IPC: Sequential agents share findings via kernel memory"
echo "  4. Persistence: Mission results stored in PostgreSQL mission_results table"
echo "     → Survives API restarts"
echo "     → Status checkable from PostgreSQL if not in memory"
echo "============================================================"
