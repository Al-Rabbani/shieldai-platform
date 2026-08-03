#!/usr/bin/env python3
"""Fix the broken bridge file directly — the previous script corrupted lines 242-245."""
import sys

f = "/opt/gds-os/apps/api/gds_api/bridge/super_agent_bridge.py"
content = open(f).read()

# The broken state looks like:
#             "error": result.error,
#         }"kernel_managed": result.kernel_managed,
#         }"pid": result.pid
#         }
#
# Should be:
#             "error": result.error,
#             "kernel_managed": result.kernel_managed,
#             "pid": result.pid
#         }

# Fix: replace the broken pattern
broken = '        }"kernel_managed": result.kernel_managed,\n        }"pid": result.pid\n        }'
fixed = '            "kernel_managed": result.kernel_managed,\n            "pid": result.pid\n        }'

if broken in content:
    content = content.replace(broken, fixed)
    print("Fixed broken pattern (matched exactly)")
else:
    # Try with different indentation
    # Find the broken pattern more flexibly
    lines = content.split('\n')
    new_lines = []
    fixed_count = 0
    for i, line in enumerate(lines):
        # Skip lines that have }" followed by a field name
        stripped = line.lstrip()
        if stripped.startswith('}"') and ('kernel_managed' in stripped or 'pid' in stripped):
            # Replace }"field" with proper indent + "field"
            indent = '            '  # 12 spaces (matching sibling lines)
            field_part = stripped[1:]  # Remove the leading }
            new_lines.append(indent + field_part)
            fixed_count += 1
        else:
            new_lines.append(line)
    
    if fixed_count > 0:
        content = '\n'.join(new_lines)
        print("Fixed %d broken lines" % fixed_count)
    else:
        print("Broken pattern not found — showing context:")
        for i, line in enumerate(lines):
            if 'kernel_managed' in line or 'pid' in line.lower():
                for j in range(max(0, i-2), min(len(lines), i+3)):
                    print("  L%d: %s" % (j+1, lines[j]))
        sys.exit(1)

# Also check: does the "error" line have a trailing comma already?
# The original might have been "error": result.error (no comma) — need comma before kernel_managed
if '"error": result.error\n' in content and '"kernel_managed"' in content:
    content = content.replace(
        '"error": result.error\n',
        '"error": result.error,\n'
    )
    print("Added missing comma after error line")

# But if error already has comma, we might have double comma
content = content.replace('"error": result.error,,\n', '"error": result.error,\n')

open(f, 'w').write(content)

# Verify compiles
try:
    compile(content, f, "exec")
    print("Compiles OK")
except SyntaxError as e:
    print("SYNTAX ERROR: %s at line %d" % (e.msg, e.lineno))
    lines = content.split('\n')
    if e.lineno:
        for j in range(max(0, e.lineno-4), min(len(lines), e.lineno+3)):
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
