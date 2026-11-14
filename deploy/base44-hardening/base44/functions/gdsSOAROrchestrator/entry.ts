import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PLAYBOOKS = [
  { id: 'PB-001', name: 'Critical Vulnerability Response', trigger: 'critical_finding', steps: ['Notify CISO', 'Create Jira ticket', 'Assign to AppSec', 'Trigger auto-triage', 'Send Slack alert'], auto_execute: false, avg_duration_seconds: null, executions: null },
  { id: 'PB-002', name: 'KEV Emergency Patch', trigger: 'kev_detected', steps: ['Page on-call', 'Block asset in WAF', 'Create emergency ticket', 'Notify compliance', 'Start timer'], auto_execute: false, avg_duration_seconds: null, executions: null },
  { id: 'PB-003', name: 'Credential Leak Containment', trigger: 'credential_leak', steps: ['Revoke credentials', 'Alert identity team', 'Force MFA reset', 'Audit access logs', 'Create IR report'], auto_execute: false, avg_duration_seconds: null, executions: null },
  { id: 'PB-004', name: 'Compliance Drift Remediation', trigger: 'compliance_fail', steps: ['Identify failing controls', 'Assign control owner', 'Generate evidence request', 'Schedule audit', 'Update status'], auto_execute: false, avg_duration_seconds: null, executions: null },
  { id: 'PB-005', name: 'Supply Chain Threat Response', trigger: 'supply_chain_alert', steps: ['Quarantine package', 'Scan all repos', 'Notify dev teams', 'Update SBOM', 'File CVE'], auto_execute: false, avg_duration_seconds: null, executions: null },
];

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'list_playbooks';
    if (action === 'list_playbooks') return Response.json({
      playbooks: PLAYBOOKS, total: PLAYBOOKS.length, auto_execute: 0,
      last_case_id: null, avg_duration: null, execution_verified: false,
      provenance: 'declared_playbook_definitions',
    });
    if (['run_playbook', 'create_case'].includes(action)) return Response.json({
      success: false, status: 'unavailable', code: 'VERIFIED_SOAR_CONNECTOR_REQUIRED',
      error: 'A governed SOAR connector and durable case storage must be verified first.',
      real_execution: false, persisted: false,
    }, { status: 503 });
    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch {
    return Response.json({ error: 'SOAR request failed' }, { status: 503 });
  }
});
