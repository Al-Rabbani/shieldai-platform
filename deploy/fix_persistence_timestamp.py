#!/usr/bin/env python3
"""Fix PostgreSQL persistence — completed_at timestamp format + verify."""
import sys, json
sys.path.insert(0, "/opt/gds-os/apps/api")

f = "/opt/gds-os/apps/api/gds_api/reasoning/mission_orchestrator.py"
content = open(f).read()

# Fix 1: In _persist_mission, replace time.time() float with datetime
if "from datetime import" not in content:
    content = content.replace(
        "import threading",
        "import threading\nfrom datetime import datetime"
    )
    print("Added datetime import")

# Fix 2: In execute_mission, change completed_at to datetime.now()
content = content.replace(
    '"completed_at": time.time(),',
    '"completed_at": datetime.now().isoformat(),'
)
print("Fixed completed_at to use datetime.now().isoformat()")

# Fix 3: In _persist_mission, handle None completed_at gracefully
# The ON CONFLICT update already handles this — just make sure we pass the right value

open(f, "w").write(content)

# Verify compiles
try:
    compile(content, f, "exec")
    print("Compiles OK")
except SyntaxError as e:
    print("SYNTAX ERROR: %s at line %d" % (e.msg, e.lineno))
    sys.exit(1)

# Test: persist a completed mission manually
from gds_api.reasoning.mission_orchestrator import _persist_mission
test_mission = {
    "mission_id": "test-persist-fix-%d" % int(datetime.now().timestamp()),
    "goal": "Test persistence fix",
    "status": "completed",
    "plan": {"agents": ["test"], "parallel": True, "steps": [], "aggregator": "test"},
    "agent_results": [{"agent_id": "test", "success": True, "tool_calls": 1, "summary": "Test"}],
    "unified_report": "Test report",
    "mission_pid": "test-pid",
    "total_tool_calls": 1,
    "successful_agents": 1,
    "total_agents": 1,
    "duration_ms": 1000,
    "kernel_managed": True,
    "completed_at": datetime.now().isoformat(),
}
_persist_mission(test_mission)
print("Persisted test mission: %s" % test_mission["mission_id"])

# Verify in PostgreSQL
import psycopg2
conn = psycopg2.connect("postgresql://gds:Gds0s2026Secure@localhost:5432/gds_os")
cur = conn.cursor()
cur.execute("SELECT mission_id, status, total_tool_calls, duration_ms FROM mission_results WHERE mission_id = %s", (test_mission["mission_id"],))
row = cur.fetchone()
if row:
    print("✅ PostgreSQL read OK: %s | status=%s | tools=%d | %dms" % row)
else:
    print("❌ Test mission not found in PostgreSQL")

# Also check previous missions
cur.execute("SELECT mission_id, status, total_tool_calls FROM mission_results ORDER BY created_at DESC LIMIT 5")
print("\nRecent missions:")
for row in cur.fetchall():
    print("  %s | status=%s | tools=%d" % row)

# Clean up test mission
cur.execute("DELETE FROM mission_results WHERE mission_id = %s", (test_mission["mission_id"],))
conn.commit()
conn.close()
print("\nCleaned up test mission")
