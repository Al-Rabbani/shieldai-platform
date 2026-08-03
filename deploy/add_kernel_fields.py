#!/usr/bin/env python3
"""Add kernel_managed and pid fields to the bridge return block."""
import sys

f = "/opt/gds-os/apps/api/gds_api/bridge/super_agent_bridge.py"
content = open(f).read()

# The return block in the invoke endpoint looks like:
#     return {
#         "success": result.success,
#         "agent_id": result.agent_id,
#         ...
#         "error": result.error
#     }
#
# We need to add:
#         "kernel_managed": result.kernel_managed,
#         "pid": result.pid,

# Strategy: find "error": result.error in the return block and add after it
# But only in the invoke endpoint, not in other endpoints

# Find all occurrences of "error": result.error
# The invoke endpoint should have it followed by a closing brace

# Let's find the pattern and add our fields
# We look for: "error": result.error\n    } (or with different indentation)
import re

# Match the error line followed by closing brace, in the invoke endpoint
# This pattern: "error": result.error (optionally with .get() variant) followed by }
pattern = r'("error":\s*result\.error[^}\n]*)(\n\s*\})'
match = re.search(pattern, content)

if match:
    old = match.group(0)
    # Add our two fields before the closing brace
    indent = match.group(2).split("\n")[1]  # Get the indentation of the closing brace
    new = match.group(1) + ',\n' + indent + '"kernel_managed": result.kernel_managed,\n' + indent + '"pid": result.pid' + match.group(2)
    content = content.replace(old, new)
    print("Added kernel_managed and pid to return block")
else:
    # Try alternate patterns - maybe it uses .get() style
    pattern2 = r'("error":\s*result\.get\("error"[^}\n]*)(\n\s*\})'
    match2 = re.search(pattern2, content)
    if match2:
        old = match2.group(0)
        indent = match2.group(2).split("\n")[1]
        new = match2.group(1) + ',\n' + indent + '"kernel_managed": result.kernel_managed,\n' + indent + '"pid": result.pid' + match2.group(2)
        content = content.replace(old, new)
        print("Added kernel_managed and pid to return block (get-style)")
    else:
        print("Could not find return block pattern")
        # Show what the return block looks like
        for i, line in enumerate(content.split("\n")):
            if '"error"' in line and 'result' in line:
                print("  L%d: %s" % (i+1, line.rstrip()))
        sys.exit(1)

open(f, 'w').write(content)

# Verify compiles
try:
    compile(content, f, "exec")
    print("Compiles OK")
except SyntaxError as e:
    print("SYNTAX ERROR: %s at line %d" % (e.msg, e.lineno))
    lines = content.split("\n")
    if e.lineno:
        for j in range(max(0, e.lineno-3), min(len(lines), e.lineno+2)):
            print("  L%d: %s" % (j+1, lines[j]))
    sys.exit(1)

# Verify import
sys.path.insert(0, "/opt/gds-os/apps/api")
for mod in list(sys.modules.keys()):
    if "gds_api" in mod:
        del sys.modules[mod]
try:
    from gds_api.bridge.super_agent_bridge import router
    print("Import OK — %d routes" % len(router.routes))
except Exception as e:
    print("Import FAILED: %s" % e)
    import traceback; traceback.print_exc()
