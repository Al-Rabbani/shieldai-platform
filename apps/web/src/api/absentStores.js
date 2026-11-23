/* Why a store a module asks for does not exist on this platform.
 *
 * GENERATED from apps/web/.entity-coverage-baseline.json, the same file tests/test_entity_coverage.py measures, and
 * pinned by tests/test_absent_store_wording.py so the wording cannot drift from the measurement. A module that reads
 * one of these names renders <AbsentStore entity="..." /> rather than "No X yet", because an empty list reads as a
 * measured zero and zero is a claim this platform will not make. */

export const ABSENT_STORES = {
  AttackFinding: "no offensive finding store; red-team results land in security_findings",
  AttackSimulation: "no simulation store; authorized_targets exists but no simulation records",
  AuthorizationPolicy: "no authorisation-policy store; the simulator has no policy input",
  AutoRemediationPolicy: "no per-asset-type policy store; the remediation engine acts only when asked",
  BoardReport: "no board-report store; reports are exported, not saved",
  BusinessUnit: "no business-unit store",
  ComplianceEvidenceAudit: "no compliance evidence audit store; evidence and audit_events are separate",
  ComplianceGap: "no gap store; gaps are derived from failing controls",
  ComplianceRecommendation: "no recommendation store; recommendations come from the reasoning engine, not a table",
  ContainmentAction: "no containment store and no execution path; actions are proposals in the answer",
  CopilotAuditLog: "no copilot audit store; audit_events covers governed actions only",
  CopilotReport: "no report store; the chat exports Markdown client-side and says so",
  CopilotSession: "no copilot session store; missions and cost_records are the record",
  CopilotTask: "no copilot task store; missions and mission_tasks are the real records",
  DataCatalog: "no data-fabric stores at all",
  DataLake: "no data-fabric stores at all",
  DataQualityRule: "no data-fabric stores at all",
  DataSource: "no data-fabric stores at all (sources, catalog, lake, quality rules)",
  EscalationPolicy: "no escalation-policy store",
  EvidenceActivity: "the evidence table exists but carries no per-record activity feed; needs a route over audit_events joined to evidence",
  EvidenceLibrary: "the evidence table exists; the library page needs a listing route over it rather than a new store",
  ExecutiveInsight: "no insight store; insights are generated per answer",
  FleetScalingConfig: "no autoscaling store and no scaler; the platform runs fixed supervisor processes",
  FleetScalingRun: "no autoscaling store and no scaler",
  IdentityThreat: "no identity-threat store; identity signals live in security_findings and ciem_findings",
  IncidentComment: "no comment store; incident_comms writes are refused rather than silently dropped",
  IncidentTimeline: "no incident_timeline table exists; the timeline is derived from incident_tasks and audit_events, which need a join route",
  LicenseRisk: "no licence store; SBOM ingestion never ran, so there is nothing to licence-scan",
  MSSPClientOrganization: "/mssp/customers serves this shape already; the page must be repointed",
  NationalThreat: "no national threat store; nothing ingests national advisories",
  NotificationDispatch: "no dispatch log; /notifications is per-user, not a delivery record",
  NotificationPreference: "no notification-preference store",
  Organization: "no organisation store beyond tenants; multi-org grouping is not modelled",
  OrganizationRiskProfile: "no per-organisation risk profile store; risk is tenant-level",
  PentestCampaign: "no campaign store; pentest_agreements and authorized_targets exist but no campaigns",
  PostureAlertConfig: "no posture-alert configuration store; drift_alert_configs covers drift only",
  RegulatoryNotification: "the regulatory_notifications table exists; needs a listing route over it",
  RiskScoringConfig: "no scoring-config store; risk weights are code, not data",
  SBOM: "no SBOM store; no generator has run, so a listing would be empty",
  SelfHealingEvent: "no self-healing store and no healer; nothing repairs automatically",
  SlaTarget: "no SLA target store; sla policy lives in org_settings columns",
  SlackAlertSetting: "no alert-channel settings store; alert_rules holds rules, not channel configuration",
  Team: "no team store; users and roles carry no team grouping",
  ZeroTrustPolicy: "no zero-trust policy store",
};

export function absentStoreReason(entity) {
  return ABSENT_STORES[entity] || null;
}
