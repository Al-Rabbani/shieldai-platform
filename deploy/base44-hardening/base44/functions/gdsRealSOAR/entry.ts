import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'admin') return Response.json({ success: false, error: 'Admin role required' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const { action, playbook_id } = body;

    const PLAYBOOKS = [
      {
        id: 'CRITICAL_CVE',
        name: 'Critical CVE Response',
        trigger: 'TriagedFinding with severity=critical and status=open created or updated',
        steps_count: 5,
        functions_called: ['shieldAutoTriage', 'shieldAutoFix', 'shieldSlackCriticalAlert', 'gdsJiraIntegration', 'gdsRegulatoryIntel'],
        description: 'Auto-triage critical CVE, attempt auto-fix PR, alert Slack, create Jira ticket, check regulatory impact',
      },
      {
        id: 'KEV_EMERGENCY',
        name: 'CISA KEV Emergency',
        trigger: 'Known Exploited Vulnerability detected in TriagedFinding (exploitability=exploited_in_wild)',
        steps_count: 4,
        functions_called: ['shieldAutoTriage', 'shieldSlackCriticalAlert', 'gdsRegulatoryIntel', 'gdsRuntimeProtectionEngine'],
        description: 'Emergency response for actively exploited vulnerabilities — blocks deploy gate, escalates to Slack, activates runtime protection',
      },
      {
        id: 'DARK_WEB_LEAK',
        name: 'Dark Web Credential Leak',
        trigger: 'CredentialLeak entity created with severity=critical or high',
        steps_count: 4,
        functions_called: ['shieldDarkWebMonitor', 'shieldSlackCriticalAlert', 'gdsRegulatoryIntel', 'shieldAutoTriage'],
        description: 'Detects credential leaks, assesses regulatory exposure (GDPR breach notification), alerts security team',
      },
      {
        id: 'WEEKLY_REVIEW',
        name: 'Weekly Security Review',
        trigger: 'Scheduled: every Monday 09:00 UTC',
        steps_count: 3,
        functions_called: ['gdsWeeklyReport', 'shieldWeeklySummary', 'shieldSlackCriticalAlert'],
        description: 'Generates weekly security posture report, sends to Slack, saves to Google Drive',
      },
    ];

    if (action === 'list_cases') {
      // Fetch real recent cases from AuditLog entity
      const recentCases = await base44.asServiceRole.entities.AuditLog.filter(
        { action_type: 'scan_triggered' }, '-timestamp', 10
      );

      return Response.json({
        playbooks: PLAYBOOKS,
        real_execution: false,
        recent_cases: recentCases.map(log => ({
          case_id: log.id,
          playbook: log.action || 'Unknown',
          status: 'unverified',
          actor: log.actor_email || 'system',
          timestamp: log.timestamp || log.created_date,
          resource: log.resource_name || '—',
        })),
        total_cases: recentCases.length,
      });
    }

    if (action === 'run_case') {
      if (!PLAYBOOKS.some(p => p.id === playbook_id)) return Response.json({ success: false, error: 'Unknown playbook' }, { status: 400 });
      return Response.json({ success: false, real_execution: false, execution_mode: 'not_executed',
        code: 'GOVERNED_PLAYBOOK_REQUIRED', error: 'A verified runtime playbook executor is required',
        step_results: [], steps_completed: 0,
      }, { status: 503 });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ success: false, real_execution: false, error: 'SOAR source unavailable' }, { status: 503 });
  }
});
