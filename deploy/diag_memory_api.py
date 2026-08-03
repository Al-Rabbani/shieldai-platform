import sys, importlib
sys.path.insert(0, '/opt/gds-os/apps/api')

# Import MemorySegmentType safely
mem_mod = importlib.import_module('gds_kernel.memory')
MemorySegmentType = getattr(mem_mod, 'MemorySegmentType')
print('Enum values:')
for v in MemorySegmentType:
    print('  ', v.name, '=', repr(v.value))

print()

# Check method signatures
kmod = importlib.import_module('gds_kernel.kernel_router')
get_kernel = getattr(kmod, 'get_kernel')
k = get_kernel()
m = getattr(k, 'memory')
import inspect
for method in ['allocate', 'get_stats', 'get_global_stats', 'build_context', 'recall']:
    if hasattr(m, method):
        print('%s: %s' % (method, inspect.signature(getattr(m, method))))
    else:
        print('%s: NOT FOUND' % method)

# Also check what methods exist
print()
print('All MemoryManager methods:')
for name in sorted(dir(m)):
    if not name.startswith('_'):
        print('  ', name)
