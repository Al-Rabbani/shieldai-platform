#!/usr/bin/env python3
"""Fix: revert bridge and add kernel_managed + pid fields correctly."""
import subprocess, re, sys

f = "/opt/gds-os/apps/api/gds_api/bridge/super_agent_bridge.py"

# Step 1: Revert the broken bridge file from git
print("Reverting bridge from git...")
subprocess.run(["git", "-C", "/tmp/shieldai-kb", "checkout", "--", "."], check=True)
# Copy the clean version back
subprocess.run(["cp", "/tmp/shieldai-kb/gds_api/bridge/super_agent_bridge.py", f], check=True)
print("Bridge reverted to clean state")

# Step 2: Read the clean file and apply fix correctly
content = open(f).read()

# Find "error": result.error followed by newline + whitespace + }
# We want to insert our fields BEFORE the closing }
pattern = r'("error":\s*result\.error\s*,?)(\n(\s+)\})'
match = re.search(pattern, content)

if match:
    error_line = match.group(1)  # "error": result.error or "error": result.error,
    newline_brace = match.group(2)  # \n        }
    indent_ws = match.group(3)  # just the whitespace (no brace!)
    
    # Build replacement: error line + comma + our fields + closing brace
    replacement = error_line.rstrip(',')
    replacement += ',\n' + indent_ws + '"kernel_managed": result.kernel_managed,'
    replacement += '\n' + indent_ws + '"pid": result.pid'
    replacement += '\n' + indent_ws + '}'
    
    content = content[:match.start()] + replacement + content[match.end():]
    print("Added kernel_managed and pid correctly")
else:
    # Try alternate pattern without comma
    pattern2 = r'("error":\s*result\.get\("error"[^}\n]*)(\n(\s+)\})'
    match2 = re.search(pattern2, content)
    if match2:
        error_line = match2.group(1).rstrip(',')
        indent_ws = match2.group(3)
        replacement = error_line + ',\n' + indent_ws + '"kernel_managed": result.kernel_managed,'
        replacement += '\n' + indent_ws + '"pid": result.pid'
        replacement += '\n' + indent_ws + '}'
        content = content[:match2.start()] + replacement + content[match2.end():]
        print("Added kernel_managed and pid (get-style)")
    else:
        print("Pattern not found — dumping return block area:")
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if '"error"' in line and 'result' in line:
                for j in range(max(0,i-2), min(len(lines), i+5)):
                    print("  L%d: %s" % (j+1, lines[j]))
        sys.exit(1)

open(f, 'w').write(content)

# Verify compiles
try:
    compile(content, f, "exec")
    print("Compiles OK")
except SyntaxError as e:
    print("SYNTAX ERROR: %s at line %d" % (e.msg, e.lineno))
    lines = content.split('\n')
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
