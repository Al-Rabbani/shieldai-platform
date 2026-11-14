import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'admin') return Response.json({ success: false, error: 'Admin role required' }, { status: 403 });
    const events = await base44.asServiceRole.entities.DarkWebEvent.list();
    const summary = {
      breach_events: events.length,
      exposed_credentials: events.reduce((s, e) => s + (e.exposed_count || 0), 0),
      active_breaches: events.filter(e => e.status === 'active').length,
      last_scan: null
    };

    return Response.json({ success: true, summary, execution_mode: 'stored_record_summary', collection_verified: false, scanned_at: null, generated_at: new Date().toISOString() });
  } catch (error) {
    return Response.json({ success: false, error: 'Dark web source unavailable' }, { status: 500 });
  }
});
