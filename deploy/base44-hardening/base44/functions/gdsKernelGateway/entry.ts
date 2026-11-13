import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action } = body;
    // This legacy global gateway uses service-role entities. Restrict to platform
    // administrators until a tenant-bound runtime integration replaces it.
    if (user.role !== 'admin') return Response.json({ success: false, error: 'Admin role required' }, { status: 403 });

    if (action === "status") {
      const [sessions, events] = await Promise.all([
        base44.asServiceRole.entities.KernelSession.list('-created_date', 200),
        base44.asServiceRole.entities.KernelEvent.list('-created_date', 50),
      ]);

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todaySessions = sessions.filter(s => new Date(s.created_date) >= todayStart);

      const completed = sessions.filter(s => s.status === 'completed').length;
      const failed = sessions.filter(s => s.status === 'failed').length;
      const pendingApproval = sessions.filter(s => s.status === 'awaiting_approval').length;
      const durations = sessions.filter(s => s.duration_ms > 0).map(s => s.duration_ms);
      const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

      return Response.json({
        total_sessions: sessions.length,
        sessions_today: todaySessions.length,
        completed,
        failed,
        pending_approval: pendingApproval,
        avg_duration_ms: avgDuration,
        pipeline_stages: 15,
        recent_sessions: sessions.slice(0, 20),
        recent_events: events.slice(0, 30),
        last_event: events[0] || null,
      });
    }

    if (action === "metrics") {
      const [sessions, events, metrics] = await Promise.all([
        base44.asServiceRole.entities.KernelSession.list('-created_date', 500),
        base44.asServiceRole.entities.KernelEvent.list('-created_date', 500),
        base44.asServiceRole.entities.KernelMetric.list('-created_date', 500),
      ]);

      // Stage performance aggregation
      const stageMap = {};
      sessions.forEach(s => {
        if (s.current_stage) {
          if (!stageMap[s.current_stage]) stageMap[s.current_stage] = { executions: 0, total_ms: 0 };
          stageMap[s.current_stage].executions++;
          if (s.duration_ms) stageMap[s.current_stage].total_ms += s.duration_ms;
        }
      });
      const stage_metrics = Object.entries(stageMap).map(([stage, d]) => ({
        stage,
        executions: d.executions,
        avg_ms: d.executions > 0 ? Math.round(d.total_ms / d.executions) : 0,
      })).sort((a, b) => b.executions - a.executions);

      // Event counts
      const eventCountMap = {};
      events.forEach(e => {
        eventCountMap[e.event_type] = (eventCountMap[e.event_type] || 0) + 1;
      });
      const event_counts = Object.entries(eventCountMap).map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      return Response.json({
        total_sessions: sessions.length,
        total_events: events.length,
        total_metrics: metrics.length,
        completed: sessions.filter(s => s.status === 'completed').length,
        failed: sessions.filter(s => s.status === 'failed').length,
        stage_metrics,
        event_counts,
      });
    }

    if (action === "tools") {
      const tools = await base44.asServiceRole.entities.KernelTool.list('-created_date', 100);
      return Response.json({ tools: tools.map(tool => ({ ...tool, connected: false, verification_status: 'declared_unverified' })), total: tools.length, verified_connected_count: 0 });
    }

    if (action === "start") {
      const { intent, intent_type, actor_role, actor_id } = body;
      if (!intent) return Response.json({ error: 'intent is required' }, { status: 400 });

      const sessionId = `KS-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
      const session = await base44.asServiceRole.entities.KernelSession.create({
        session_id: sessionId,
        intent: intent.slice(0, 500),
        intent_type: intent_type || 'query',
        actor_role: user.role,
        actor_id: user.id || user.email,
        status: 'draft',
        current_stage: 1,
        duration_ms: 0,
        context_summary: `Session initiated by ${user.id || user.email} — intent: ${intent.slice(0,80)}`,
        next_step: 'Draft only; governed executor connection required',
        started_at: new Date().toISOString(),
      });

      // Log creation event
      await base44.asServiceRole.entities.KernelEvent.create({
        session_id: sessionId,
        event_type: 'kernel.started',
        severity: 'info',
        payload: JSON.stringify({ intent_type, actor_role }),
        occurred_at: new Date().toISOString(),
      }).catch(() => {});

      return Response.json({
        session_id: sessionId,
        status: 'draft',
        context_summary: session.context_summary,
        next_step: session.next_step,
      });
    }

    if (action === "approve") {
      if (!['approve', 'reject'].includes(body.approval_action)) return Response.json({ success: false, error: 'Invalid approval decision' }, { status: 400 });
      // Base44 entity updates do not provide the atomic, single-use execution
      // claim needed for quorum. Never advance a session using this legacy path.
      return Response.json({ success: false, code: 'GOVERNED_APPROVAL_REQUIRED',
        error: 'Use the governed runtime approval service; legacy approval execution is disabled',
        execution_mode: 'not_executed', approval_recorded: false,
      }, { status: 503 });
    }

    if (action === "notify") {
      // Check for failed sessions and stale pending approvals, send notifications
      const STALE_MINUTES = body.stale_minutes || 30;
      const now = new Date();
      const staleThreshold = new Date(now.getTime() - STALE_MINUTES * 60 * 1000);

      const allSessions = await base44.asServiceRole.entities.KernelSession.list('-created_date', 500);

      // Sessions that failed and haven't been notified yet (created in last 24h)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const recentFailed = allSessions.filter(s =>
        s.status === 'failed' &&
        new Date(s.created_date) > oneDayAgo
      );

      // Stale pending approvals
      const stalePending = allSessions.filter(s =>
        s.status === 'awaiting_approval' &&
        new Date(s.created_date) < staleThreshold
      );

      const notifications = [];

      for (const s of recentFailed) {
        // Create in-app notification
        await base44.asServiceRole.entities.Notification.create({
          title: `Kernel Session Failed`,
          message: `Session ${s.session_id?.slice(0, 20)} failed. Intent: ${(s.intent || '').slice(0, 80)}. Error: ${(s.error_message || 'unknown').slice(0, 120)}`,
          severity: 'critical',
          is_dismissed: false,
          notification_type: 'kernel_failure',
          link_url: `/kernel/session/${s.session_id}`,
        }).catch(() => {});
        notifications.push({ type: 'failure', session_id: s.session_id });
      }

      for (const s of stalePending) {
        const waitMins = Math.round((now - new Date(s.created_date)) / 60000);
        await base44.asServiceRole.entities.Notification.create({
          title: `Kernel Approval Overdue`,
          message: `Session ${s.session_id?.slice(0, 20)} has been awaiting approval for ${waitMins} minutes. Intent: ${(s.intent || '').slice(0, 80)}`,
          severity: 'high',
          is_dismissed: false,
          notification_type: 'kernel_stale_approval',
          link_url: `/kernel/session/${s.session_id}`,
        }).catch(() => {});
        notifications.push({ type: 'stale_approval', session_id: s.session_id, wait_mins: waitMins });
      }

      return Response.json({
        checked_at: now.toISOString(),
        failed_count: recentFailed.length,
        stale_pending_count: stalePending.length,
        notifications_created: notifications.length,
        notifications,
      });
    }

    if (action === "session") {
      const { session_id } = body;
      const sessions = await base44.asServiceRole.entities.KernelSession.filter({ session_id });
      const events = await base44.asServiceRole.entities.KernelEvent.filter({ session_id });
      const approvals = await base44.asServiceRole.entities.KernelApprovalRequest.filter({ session_id });
      return Response.json({ session: sessions[0] || null, events, approvals });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    return Response.json({ success: false, error: 'Kernel gateway unavailable', execution_mode: 'not_executed' }, { status: 503 });
  }
});
