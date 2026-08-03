#!/usr/bin/env python3
"""
Priority 1: Fix Autonomous Scan Loop
Error: AgentResult has no attribute kernel_managed
Root cause: The agent_loop.py creates an AgentResult object that doesn't have
a kernel_managed field. The bridge tries to access result.kernel_managed and fails.
Fix: Add kernel_managed to AgentResult + make all attribute access safe.
"""
import os, re, sys, glob

API_DIR = "/opt/gds-os/apps/api"
FIXED = []

def find_files():
    """Find all Python files in the gds_api directory."""
    files = []
    for root, dirs, filenames in os.walk(os.path.join(API_DIR, "gds_api")):
        for fn in filenames:
            if fn.endswith(".py"):
                files.append(os.path.join(root, fn))
    return files

# Step 1: Find AgentResult class definition and add kernel_managed field
print("[1/3] Searching for AgentResult class...")
for fpath in find_files():
    try:
        content = open(fpath).read()
    except:
        continue
    
    # Look for class AgentResult definition
    if re.search(r'class\s+AgentResult', content):
        print("  Found AgentResult class in: %s" % fpath)
        
        # Check if kernel_managed already exists
        if "kernel_managed" in content:
            print("  kernel_managed already present — skipping")
            continue
        
        # Find the class and add kernel_managed field
        # Pattern: class AgentResult: ... with fields like field: type = value
        pattern = r'(class\s+AgentResult.*?\n)(.*?)(?=\nclass |\ndef |\Z)'
        match = re.search(pattern, content, re.DOTALL)
        if match:
            class_body = match.group(2)
            # Find the last field definition in the class
            lines = class_body.split("\n")
            last_field_idx = -1
            for i, line in enumerate(lines):
                stripped = line.strip()
                if ":" in stripped and "=" in stripped and not stripped.startswith("#"):
                    last_field_idx = i
                elif ":" in stripped and not stripped.startswith("#") and not stripped.startswith("def"):
                    last_field_idx = i
            
            if last_field_idx >= 0:
                # Add kernel_managed after the last field
                indent = "    "  # Standard indent
                lines.insert(last_field_idx + 1, "%skernel_managed: bool = False" % indent)
                new_body = "\n".join(lines)
                content = content[:match.start(2)] + new_body + content[match.end(2):]
                open(fpath, "w").write(content)
                print("  ✅ Added kernel_managed: bool = False to AgentResult")
                FIXED.append(fpath)
            else:
                # No fields found — add after class declaration
                content = content.replace(
                    match.group(0),
                    match.group(1) + "    kernel_managed: bool = False\n" + match.group(2)
                )
                open(fpath, "w").write(content)
                print("  ✅ Added kernel_managed: bool = False to AgentResult (after class line)")
                FIXED.append(fpath)

# Step 2: Fix unsafe .kernel_managed attribute access
print("\n[2/3] Fixing unsafe .kernel_managed attribute access...")
for fpath in find_files():
    try:
        content = open(fpath).read()
    except:
        continue
    
    changed = False
    
    # Replace result.kernel_managed with getattr(result, 'kernel_managed', False)
    # But only for variable names that look like result objects (not dict.get)
    patterns = [
        (r'(\w+)\.kernel_managed\b(?!\s*[=\(])', r"getattr(\1, 'kernel_managed', False)"),
    ]
    
    for pat, repl in patterns:
        new_content = re.sub(pat, repl, content)
        if new_content != content:
            content = new_content
            changed = True
    
    if changed:
        open(fpath, "w").write(content)
        print("  ✅ Fixed .kernel_managed access in: %s" % os.path.basename(fpath))
        if fpath not in FIXED:
            FIXED.append(fpath)

# Step 3: Also check for any dataclass or Pydantic model that might need the field
print("\n[3/3] Checking for result serialization patterns...")
for fpath in find_files():
    try:
        content = open(fpath).read()
    except:
        continue
    
    # Look for patterns where result is being constructed as a dict with kernel_managed
    # but the class doesn't support it
    if "kernel_managed" in content and "AgentResult" in content:
        # Make sure AgentResult construction includes kernel_managed
        # Pattern: AgentResult(... without kernel_managed
        if "AgentResult(" in content and "kernel_managed" not in content.split("AgentResult(")[1].split(")")[0]:
            print("  ⚠️ AgentResult construction without kernel_managed in: %s" % os.path.basename(fpath))

# Verify compilation
print("\n[4/4] Verifying compilation...")
all_ok = True
for fpath in FIXED:
    try:
        compile(open(fpath).read(), fpath, "exec")
        print("  ✅ %s compiles OK" % os.path.basename(fpath))
    except SyntaxError as e:
        print("  ❌ %s: %s at line %d" % (os.path.basename(fpath), e.msg, e.lineno))
        all_ok = False

# Import test
sys.path.insert(0, API_DIR)
for mod in list(sys.modules.keys()):
    if "gds_api" in mod:
        del sys.modules[mod]
try:
    from gds_api.bridge.super_agent_bridge import router
    print("\n  Bridge import OK — %d routes" % len(router.routes))
except Exception as e:
    print("\n  Bridge import FAILED: %s" % e)
    import traceback; traceback.print_exc()

print("\n" + "=" * 50)
if FIXED:
    print("Fixed files: %s" % ", ".join(os.path.basename(f) for f in FIXED))
else:
    print("No files needed fixing — checking if issue is elsewhere...")
    # Search for the exact error pattern
    print("\nSearching for 'AgentResult' references...")
    for fpath in find_files():
        try:
            content = open(fpath).read()
            if "AgentResult" in content:
                print("  Found in: %s" % os.path.relpath(fpath, API_DIR))
                # Show context
                for i, line in enumerate(content.split("\n")):
                    if "AgentResult" in line:
                        print("    L%d: %s" % (i+1, line.strip()))
        except:
            continue

print("=" * 50)
print("\nRestart with: supervisorctl restart gds-os")
