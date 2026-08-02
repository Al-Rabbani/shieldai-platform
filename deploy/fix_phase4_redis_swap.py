#!/usr/bin/env python3
"""
Phase 4 Fix: Wire Redis swap + in-memory fallback for page_out.
Also fixes get_global_stats to count Redis swap segments.
Then runs the overflow test to verify.
"""
import sys
sys.path.insert(0, "/opt/gds-os/apps/api")

# ============================================================
# Step 1: Diagnose Redis connection
# ============================================================
print("=" * 60)
print("STEP 1: Diagnose Redis connection in MemoryManager")
print("=" * 60)

from gds_kernel.kernel_router import get_kernel
k = get_kernel()
mm = k.memory  # k.memory — NOT k.me anything

print(f"  MemoryManager.redis = {mm.redis}")
print(f"  MemoryManager.redis type = {type(mm.redis)}")
print(f"  MemoryManager.swap (in-memory) = {len(mm.swap)} segments")

if mm.redis is not None:
    try:
        ping_result = mm.redis.ping()
        print(f"  Redis ping: {ping_result}")
    except Exception as e:
        print(f"  Redis ping FAILED: {e}")
else:
    print("  Redis client is None - NOT connected!")

# Check what _redis_client the kernel has
if hasattr(k, '_redis_client'):
    print(f"  Kernel._redis_client = {k._redis_client}")
if hasattr(k, '_get_redis_client'):
    try:
        rc = k._get_redis_client()
        print(f"  Kernel._get_redis_client() = {rc}")
    except Exception as e:
        print(f"  Kernel._get_redis_client() FAILED: {e}")

# ============================================================
# Step 2: Fix _page_out method
# ============================================================
print()
print("=" * 60)
print("STEP 2: Fix _page_out with Redis error handling + in-memory fallback")
print("=" * 60)

f = "/opt/gds-os/apps/api/gds_kernel/memory.py"
content = open(f).read()

import re

# Find the _page_out method
page_out_match = re.search(
    r'(def _page_out\(self.*?)(?=\n    def |\Z)',
    content, re.DOTALL
)

if page_out_match:
    old_method = page_out_match.group(0)
    print(f"  Found _page_out method ({len(old_method)} chars)")
    
    # Check if already fixed
    if "Redis swap failed" in old_method:
        print("  Already fixed - _page_out has Redis error handling")
    else:
        # Replace the storage section with error handling + fallback
        # Find the "Store in swap" section
        if "self.redis.setex" in old_method:
            # Replace the entire storage block
            old_store = re.search(
                r'# Store in swap.*?\n(?:.*?\n)*?.*?segment\.tier = MemoryTier\.SWAP',
                old_method, re.DOTALL
            )
            if old_store:
                old_block = old_store.group(0)
                new_block = """# Store in swap (Redis with in-memory fallback)
        stored = False
        if self.redis:
            try:
                self.redis.setex(
                    f"mem:swap:{segment.segment_id}",
                    3600,
                    json.dumps({
                        "content": segment.content,
                        "summary": segment.summary,
                        "token_count": segment.token_count,
                        "segment_type": segment.segment_type.value,
                        "process_id": segment.process_id,
                    })
                )
                stored = True
            except Exception as e:
                logger.warning(f"Redis swap failed for {segment.segment_id}: {e} - using in-memory")
        
        if not stored:
            self.swap[segment.segment_id] = segment
        
        segment.tier = MemoryTier.SWAP"""
            
            new_method = old_method.replace(old_block, new_block)
            content = content.replace(old_method, new_method)
            open(f, "w").write(content)
            print("  FIXED: _page_out now has Redis error handling + in-memory fallback")
        else:
            print("  WARNING: Could not find setex block in _page_out")
            # Show what's there
            for line in old_method.split("\n")[:20]:
                print(f"    {line}")
    else:
        print("  WARNING: Could not find _page_out method")
else:
    print("  Already fixed or pattern not found")

# ============================================================
# Step 3: Fix get_global_stats to count Redis swap
# ============================================================
print()
print("=" * 60)
print("STEP 3: Fix get_global_stats to count Redis swap segments")
print("=" * 60)

content = open(f).read()

# Add a _count_redis_swap helper if not present
if "_count_redis_swap" not in content:
    helper = '''
    def _count_redis_swap(self) -> int:
        """Safely count Redis swap segments."""
        try:
            if self.redis:
                keys = self.redis.keys("mem:swap:*")
                return len(keys) if keys else 0
        except Exception:
            pass
        return 0

'''
    # Add before get_global_stats
    content = content.replace("    def get_global_stats", helper + "    def get_global_stats")
    print("  Added _count_redis_swap helper method")

# Fix swap_segments counting
content = re.sub(
    r'"swap_segments":\s*len\(self\.swap\)\s*(?:\+[^,]+)?,',
    '"swap_segments": len(self.swap) + self._count_redis_swap(),',
    content,
    count=1
)

open(f, "w").write(content)
print("  FIXED: get_global_stats now counts in-memory + Redis swap segments")

# ============================================================
# Step 4: Restart services
# ============================================================
print()
print("=" * 60)
print("STEP 4: Restart services")
print("=" * 60)

import subprocess
subprocess.run(["supervisorctl", "restart", "gds-kernel"], check=True)
import time
time.sleep(3)
subprocess.run(["supervisorctl", "restart", "gds-os"], check=True)
time.sleep(15)
print("  Services restarted")

# ============================================================
# Step 5: Run overflow test
# ============================================================
print()
print("=" * 60)
print("STEP 5: Overflow test - fill 128K context window")
print("=" * 60)

import httpx

KERNEL_API = "http://127.0.0.1:8000/kernel"
PID = "final-swap-verify"
client = httpx.Client(timeout=120.0)

def kpost(path, data):
    try:
        r = client.post(f"{KERNEL_API}{path}", json=data)
        if r.status_code == 200:
            result = r.json()
            return result if isinstance(result, dict) else {}
    except Exception:
        pass
    return {}

def kget(path):
    try:
        r = client.get(f"{KERNEL_API}{path}")
        return r.json() if r.status_code == 200 else {}
    except Exception:
        pass
    return {}

# Allocate system prompt + goal
kpost("/memory/alloc", {
    "pid": PID,
    "content": "You are a security analyst. Analyze all scan results.",
    "segment_type": "system_prompt",
    "importance": 1.0
})
kpost("/memory/alloc", {
    "pid": PID,
    "content": "Analyze 250 vulnerability scan results and provide a summary.",
    "segment_type": "conversation",
    "importance": 0.8
})

before = kget("/memory/global-stats")
print(f"  Before: faults={before.get('page_faults',0)}, swap={before.get('swap_segments',0)}")

# Fill context with 250 large results
for i in range(250):
    result_text = (
        f"TOOL_RESULT_{i}: nuclei_scan target=api.globaldigitalsecurity.io "
        f"template=CVE-2024-{10000+i} severity="
        f"{'critical' if i%5==0 else 'high' if i%3==0 else 'medium'} "
        f"description=RCE vulnerability payload={'A'*1500} "
        f"response=HTTP/1.1 {'500' if i%5==0 else '200'} "
        f"body={'B'*500} remediation=Update to latest version immediately"
    )
    kpost("/memory/alloc", {
        "pid": PID,
        "content": result_text,
        "segment_type": "tool_result",
        "importance": 0.5
    })
    
    if (i + 1) % 50 == 0:
        stats = kget(f"/memory/stats/{PID}")
        g = kget("/memory/global-stats")
        total_faults = g.get("page_faults", 0) - before.get("page_faults", 0)
        print(
            f"  [{i+1}/250] tokens: {stats.get('tokens_used',0)}/"
            f"{stats.get('max_tokens',0)} ({stats.get('utilization_pct',0)}%) | "
            f"segments: {stats.get('segment_count',0)} | "
            f"faults: {total_faults} | swap: {g.get('swap_segments',0)}"
        )

# Final results
g = kget("/memory/global-stats")
stats = kget(f"/memory/stats/{PID}")
total_faults = g.get("page_faults", 0) - before.get("page_faults", 0)

# Check Redis directly
redis_result = subprocess.run(
    ["redis-cli", "-n", "0", "KEYS", "mem:swap:*"],
    capture_output=True, text=True
)
redis_keys = [l.strip() for l in redis_result.stdout.strip().split("\n") if l.strip()]

print()
print("=" * 60)
print("FINAL RESULTS")
print("=" * 60)
print(f"  Tokens in context:  {stats.get('tokens_used',0)}/{stats.get('max_tokens',0)} ({stats.get('utilization_pct',0)}%)")
print(f"  Segments in context: {stats.get('segment_count',0)}")
print(f"  Page faults:        {total_faults}")
print(f"  Page-outs:          {g.get('page_outs',0)}")
print(f"  Page-ins:           {g.get('page_ins',0)}")
print(f"  Swap (stats):       {g.get('swap_segments',0)}")
print(f"  Swap (Redis raw):   {len(redis_keys)} keys")
print(f"  Total tokens paged: {g.get('total_tokens_paged',0)}")

if redis_keys:
    print(f"  Redis key samples:  {redis_keys[:3]}")

# Check kernel logs for Redis errors
log_path = "/var/log/gds-os/error.log"
try:
    with open(log_path) as lf:
        lines = lf.readlines()[-30:]
        redis_errors = [l for l in lines if "Redis swap" in l or "redis" in l.lower()]
        if redis_errors:
            print(f"\n  Redis errors in log:")
            for l in redis_errors[:3]:
                print(f"    {l.strip()[:150]}")
except Exception:
    pass

print()
if total_faults > 0 and (g.get("swap_segments", 0) > 0 or len(redis_keys) > 0):
    print("  [VERIFIED] PAGE FAULTS + SWAP WORKING - 3-tier memory hierarchy confirmed!")
elif total_faults > 0:
    print("  [PARTIAL] Page faults work but swap storage still not recording")
else:
    print("  [FAIL] No page faults triggered")

client.close()
print()
print("Phase 4 fix complete.")
