import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Legacy random worker retired. Preview samples never enter production entities.
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ success: false, error: 'POST required' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ success: false, error: 'Admin role required' }, { status: 403 });
    const body = await req.json();
    if (body?.simulation_preview !== true) return Response.json({
      success: false, error: 'Legacy synthetic worker cannot run production scans',
      code: 'LIVE_EXECUTOR_REQUIRED', execution_mode: 'not_executed', tool_calls: 0,
    }, { status: 409 });
    return Response.json({
      success: true, execution_mode: 'simulation_preview', provenance: 'simulation',
      persisted: false, tool_calls: 0, notifications_sent: 0,
      result: { title: '[SIMULATION] Example vulnerability for training', severity: 'info',
        target: 'training.invalid', evidence: 'Synthetic fixture; no target was contacted.' },
    });
  } catch {
    return Response.json({ success: false, error: 'Worker request unavailable', execution_mode: 'not_executed' }, { status: 503 });
  }
});
