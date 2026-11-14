import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const FUNCTIONS_BY_PHASE = {
  'Phase 1': ['shieldScanRepo','shieldScanAWSAgentless','shieldScanContainer','shieldScanGitLab','shieldAutoFix','shieldAutoTriage','shieldDarkWebMonitor'],
  'Phase 2': ['shieldThreatIntel','shieldIOCRadar','shieldBrandProtection','shieldDeviceProtection','shieldJiraIntegration','shieldDASTScan','shieldAIPentest'],
  'Phase 3': ['shieldMonthlyReport','shieldWeeklySummary','shieldPentestReport','shieldPostScanPipeline','shieldRevenue','shieldSlackCriticalAlert','shieldOnboard'],
  'Phase 4': ['gdsAISAST','gdsReachability','gdsPRReview','gdsIDEPlugin','gdsRuntimeProtection','gdsAzureScan','gdsGCPScan'],
  'Phase 5': ['gdsQuantumSafe','gdsAISPM','gdsFAIRRisk','gdsZeroTrust','gdsAutonomousIR','gdsSLSA','gdsRegulatoryIntel'],
  'Phase 6': ['gdsMSSP','gdsThreatIntelligenceHub','gdsAlertRuleEngine','gdsPredictiveRisk','gdsWeeklyReport','agentSimulator','agentWorker'],
  'Phase 7': ['gdsMultiCloudScanner','gdsAutoRemediation','resolveSlackChannel','saveReportToDrive','purgeRuntimeThreats'],
  'Phase 8': ['gdsCloudNativeScanner','gdsExecutiveSummaryEngine','gdsPostureMLEngine','gdsVulnIntelCorrelator','gdsJiraIntegration'],
  'Phase 9': ['gdsAutoRemediation'],
  'Phase 10': ['gdsSOAROrchestrator','gdsEventStreamGateway','gdsConnectorSDK','gdsSecurityKnowledgeGraph','gdsPlatformHealthMonitor'],
  'Phase 11': ['gdsSOAROrchestrator','gdsEventStreamGateway','gdsConnectorSDK','gdsSecurityKnowledgeGraph','gdsPlatformHealthMonitor'],
};

const ENTITY_NAMES = ['TriagedFinding','CloudFinding','ComplianceFramework','AuditLog','RuntimeThreat','DarkWebEvent','SecurityGraph'];
const INTEGRATION_NAMES = ['Slack','PagerDuty','GitHub','AWS','Jira','Azure','GCP'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'admin') return Response.json({ success: false, error: 'Admin role required' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'health_check';

    if (action === 'health_check') {
      const entity_health = await Promise.all(ENTITY_NAMES.map(async name => {
        const items = await base44.entities[name].list('-created_date', 1);
        return { entity: name, sampled_records: items.length, status: 'readable', collection_verified: false };
      }));
      return Response.json({ platform_health_score: null, posture_score: null, status: 'UNVERIFIED',
        entity_health, integrations: INTEGRATION_NAMES.map(name => ({ name, configured: null, verified: false })),
        automations: { total: null, critical: null, runs_last_24h: null },
        execution_mode: 'source_read_checks', checked_at: new Date().toISOString() });
    }

    if (action === 'function_inventory') {
      const functions = [...new Set(Object.values(FUNCTIONS_BY_PHASE).flat())].map(name => ({ name, status: 'declared_unverified' }));
      return Response.json({ total: functions.length, verified_operational: 0, inventory_type: 'declared_catalog', functions });
    }

    if (action === 'data_freshness') {
      const entities = await Promise.all(ENTITY_NAMES.slice(0, 10).map(async (name) => {
        const items = await base44.entities[name].list('-created_date', 1);
        const last = items[0]?.created_date || items[0]?.detected_at || null;
        const age = last && Number.isFinite(Date.parse(last)) && Date.parse(last) <= Date.now() ? Math.round((Date.now() - Date.parse(last)) / 60000) : null;
        return { entity: name, last_updated: last, age_minutes: age, freshness: age === null ? 'UNKNOWN' : age < 60 ? 'FRESH' : age < 1440 ? 'STALE' : 'OUTDATED' };
      }));
      return Response.json({ entities });
    }

    if (action === 'platform_kpis') {
      // Historical timestamps and verified provenance are prerequisites to KPIs.
      return Response.json({ kpis: [
        { name: 'Findings Remediation Rate', actual: null, unit: '%', status: 'UNMEASURED' },
        { name: 'Mean Time to Detect (MTTD)', actual: null, unit: 'min', status: 'UNMEASURED' },
        { name: 'Mean Time to Remediate (MTTR)', actual: null, unit: 'hrs', status: 'UNMEASURED' },
        { name: 'False Positive Rate', actual: null, unit: '%', status: 'UNMEASURED' },
        { name: 'SLA Compliance', actual: null, unit: '%', status: 'UNMEASURED' },
      ], reason: 'Verified provenance and complete historical measurement are required' });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ success: false, status: 'UNKNOWN', error: 'Health source unavailable' }, { status: 503 });
  }
});
