#!/usr/bin/env python3
"""Remove the OLD /bridge/mission endpoint, keep only our new one that calls _run_mission_async."""
import re, sys

f = "/opt/gds-os/apps/api/gds_api/bridge/super_agent_bridge.py"
content = open(f).read()

# Find ALL @router.post endpoints related to "mission"
# We want to keep ONLY the one that calls _run_mission_async
# Remove all others

# Pattern: @router.post("/mission") or @router.post("/bridge/mission") 
# followed by async def + body until next @router or class or EOF
pattern = r'@router\.post\("/(?:bridge/)?mission"\)\s*\n(?:async def|def)\s+(\w+)\([^)]*\).*?(?=\n@router\.|\nclass |\Z)'

matches = list(re.finditer(pattern, content, re.DOTALL))
print("Found %d POST mission endpoints:" % len(matches))

keep_content = None
remove_contents = []

for m in matches:
    func_name = m.group(1)
    body = m.group(0)
    uses_our_orchestrator = "_run_mission_async" in body
    
    print("  %s: calls _run_mission_async=%s" % (func_name, uses_our_orchestrator))
    
    if uses_our_orchestrator:
        keep_content = body
    else:
        remove_contents.append((m.start(), m.end(), func_name))

if keep_content is None:
    print("ERROR: No endpoint calls _run_mission_async — cannot proceed")
    sys.exit(1)

# Remove old endpoints (in reverse order to preserve indices)
for start, end, func_name in sorted(remove_contents, key=lambda x: x[0], reverse=True):
    content = content[:start] + content[end:]
    print("Removed old endpoint: %s" % func_name)

# If our new endpoint path is /mission but router has /bridge prefix, fix it
if 'prefix="/bridge"' in content:
    # Our endpoint should use /mission (router adds /bridge prefix)
    pass  # Already correct

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
    mission_routes = [(getattr(r, 'methods', set()), r.path) for r in router.routes if hasattr(r, 'path') and 'mission' in str(r.path)]
    for methods, path in mission_routes:
        print("  %s %s" % (methods, path))
    # Count POST /bridge/mission — should be exactly 1
    post_mission = [r for r in router.routes if hasattr(r, 'path') and r.path == '/bridge/mission' and 'POST' in getattr(r, 'methods', set())]
    print("POST /bridge/mission count: %d (should be 1)" % len(post_mission))
except Exception as e:
    print("Import FAILED: %s" % e)
    import traceback; traceback.print_exc()
    sys.exit(1)
