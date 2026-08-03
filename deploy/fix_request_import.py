#!/usr/bin/env python3
"""Add Request import to bridge file."""
import sys

f = "/opt/gds-os/apps/api/gds_api/bridge/super_agent_bridge.py"
content = open(f).read()

# Check if Request is already imported
if "from fastapi import" in content and "Request" in content.split("from fastapi import")[1].split("\n")[0]:
    print("Request already imported from fastapi")
elif "from starlette.requests import Request" in content:
    print("Request already imported from starlette")
else:
    # Add import at the top
    lines = content.split("\n")
    # Find first non-comment, non-empty line
    insert_idx = 0
    for i, line in enumerate(lines):
        if line.startswith("import ") or line.startswith("from "):
            insert_idx = i
            break
    
    lines.insert(insert_idx, "from fastapi import Request")
    content = "\n".join(lines)
    print("Added 'from fastapi import Request' at line %d" % insert_idx)

open(f, "w").write(content)

# Verify compiles
try:
    compile(content, f, "exec")
    print("Compiles OK")
except SyntaxError as e:
    print("SYNTAX ERROR: %s at line %d" % (e.msg, e.lineno))
    sys.exit(1)

# Verify import
sys.path.insert(0, "/opt/gds-os/apps/api")
for mod in list(sys.modules.keys()):
    if "gds_api" in mod:
        del sys.modules[mod]
try:
    from gds_api.bridge.super_agent_bridge import router
    print("Import OK — %d routes" % len(router.routes))
    for route in router.routes:
        if hasattr(route, 'path') and 'mission' in str(route.path):
            print("  Found: %s %s" % (getattr(route, 'methods', set()), route.path))
except Exception as e:
    print("Import FAILED: %s" % e)
    import traceback; traceback.print_exc()
    sys.exit(1)
