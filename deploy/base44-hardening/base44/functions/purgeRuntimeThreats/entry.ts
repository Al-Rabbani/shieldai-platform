import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
// Legacy bulk deletion and credential-backed writes require a scoped governed replacement.
Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  try {
    const user = await createClientFromRequest(req).auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    return Response.json({ success: false, status: 'unavailable',
      code: 'GOVERNED_OPERATION_REQUIRED',
      error: 'This legacy operation is disabled pending scoped authorization and recovery controls.',
      persisted: false, real_execution: false,
    }, { status: 503 });
  } catch {
    return Response.json({ error: 'Operation unavailable' }, { status: 503 });
  }
});
