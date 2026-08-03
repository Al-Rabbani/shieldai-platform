import sys
sys.path.insert(0, '/opt/gds-os/apps/api')

# 1. Check KERNEL_AVAILABLE
from gds_api.reasoning.kernel_agent_runner import KERNEL_AVAILABLE
print('KERNEL_AVAILABLE:', KERNEL_AVAILABLE)

# 2. Check get_kernel
if KERNEL_AVAILABLE:
    from gds_kernel.kernel_router import get_kernel
    k = get_kernel()
    m = getattr(k, 'memory')
    print('kernel id:', id(k))
    print('memory id:', id(m))
    cw = getattr(m, 'context_windows')
    print('context_windows count:', len(cw))

    # 3. Manually allocate and check
    m.allocate(pid='diag-test', content='hello world', segment_type='system_prompt', importance=1.0)
    print('after allocate - context_windows:', len(cw))
    print('stats:', m.get_stats('diag-test'))
else:
    print('KERNEL NOT AVAILABLE')

# 4. Check API logs for runner warnings
import subprocess
logs = subprocess.run(['tail', '-50', '/var/log/gds-os/stdout.log'], capture_output=True, text=True)
for line in logs.stdout.split('\n'):
    if 'kernel' in line.lower() or 'memory' in line.lower() or 'runner' in line.lower():
        print('LOG:', line.strip()[:150])
