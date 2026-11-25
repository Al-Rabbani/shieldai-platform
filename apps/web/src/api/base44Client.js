/**
 * The one file the builder app reads its data through.
 *
 * 789 of the app's 1,258 frontend files import { base44 } from here, and exactly one imports the
 * Base44 SDK directly, so replacing this module redirects the whole app at the VPS API without
 * touching a single page. That is the reason shipping this frontend is feasible at all.
 *
 * The contract is measured, not guessed. Across src/ the app calls:
 *   entities.<Name>.list 1016, .filter 268, .update 146, .create 123, .delete 27,
 *   .bulkUpdate 23, .subscribe 6, .bulkCreate 5, .get 4, .count 2   over 491 distinct entity names
 *   functions.invoke 428 times over 142 distinct function names
 *   auth.me 21, .logout 8, .setToken 4, .loginWithProvider 4, .isAuthenticated 2, .verifyOtp 1
 *
 * Two rules this file exists to enforce:
 *
 * 1. An entity the platform does not serve returns an empty list AND records itself in
 *    unavailableEntities(), so a page can say "not available on this platform yet". It must never
 *    render an empty chart, because an empty chart reads as zero and zero is a claim.
 * 2. A function the platform does not implement throws. It does not resolve with a made-up object.
 *    The builder app's backend invented results; the surface must not repeat that in the browser.
 */

const API = '/api';

// Every credential goes to the platform's own auth route and comes back as an httpOnly cookie. Nothing
// about a password or a session value is stored in the browser by this adapter.
async function authRequest(path, body) {
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const detail = payload && (payload.detail || payload.message);
    const message = typeof detail === 'string' ? detail : detail ? JSON.stringify(detail) : `Sign-in failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.data = payload;
    throw error;
  }
  return payload;
}

/* Entities that map to a real VPS resource. Each entry is a path plus the key the payload arrives
 * under; the response reader below tolerates a bare array as well, because several routes return
 * one and guessing wrong would silently produce an empty page. */
const ENTITY_ROUTES = {
  /* Computed from security_findings, not a stored table: one object, so single: true. */
  GlobalRiskScore: { path: '/executive/risk-score', single: true },
  /* The MSSP book: one real production customer, the provider excluded, and fixtures reported separately. */
  CustomerTenant: { path: '/mssp/customers' },
  /* What each customer is provisioned for. The platform holds no per-service telemetry, so those columns are
     absent rather than zero. */
  ManagedService: { path: '/mssp/services' },
  /* One object of billing arithmetic with its basis stated, and nulls when no subscription row exists. */
  RevenueReport: { path: '/mssp/revenue', single: true },
  KPI: { path: '/executive/kpis' },
  // Item 7: stores that exist and hold rows but had no read route before 22 Nov 2026.
  WebhookEndpoint: { path: '/webhooks' },
  RemediationPlan: { path: '/remediation/plans' },
  /* Item 9: drift and runtime posture have stores and collectors behind them as of 22 Nov 2026. */
  ConfigurationDrift: { path: '/drift/findings' },
  ConfigurationBaseline: { path: '/drift/baselines' },
  DriftAlertConfig: { path: '/drift/config', single: true },
  RuntimeThreat: { path: '/runtime/posture', summaryPath: '/runtime/summary' },
  /* Item 10: the AI layer's own inventory, ledger and guard records. */
  AIModel: { path: '/ai/models', summaryPath: '/ai/summary' },
  PromptAttack: { path: '/ai/attacks' },
  JailbreakAttempt: { path: '/ai/jailbreaks' },
  AIPolicy: { path: '/ai/policies' },
  LinearIssueLink: { path: '/integrations/linear/links' },
  AssetDependency: { path: '/cloud/relationships' },
  TriagedFinding: { path: '/findings', summaryPath: '/findings/summary' },
  /* There is no intel feed store, so this is derived: every finding in this tenant's register carrying a CVE, with its
   * CVSS, EPSS and CISA KEV flag. feed_type is KEV or CVE and nothing else, because no advisory, malware, ransomware or
   * APT source exists here - the route names those as unavailable rather than returning an empty page. */
  ThreatIntelFeed: { path: '/threat-intel/feed', summaryPath: '/threat-intel/feed?limit=1' },
  /* No CVE store exists on this platform, so this is aggregated from the tenant's own findings: one row per CVE, with
   * its worst severity, highest CVSS and EPSS, the KEV flag, the finding and asset counts, and the scanners that saw it.
   * Exploit maturity and ransomware use are not measured here and the route names them rather than returning zero. */
  CVERecord: { path: '/cve/records', summaryPath: '/cve/records?limit=1' },
  /* Item 37: the three intelligence pages had no store behind them. Each now reads a route that serves what is actually
   * measured, or refuses in a form the page can render. Ransomware exposure is real (the KEV catalogue's own
   * knownRansomwareCampaignUse flag crossed against this tenant's register); APT and dark web have no source at all, so
   * those routes refuse and the pages state the absence instead of drawing zeroes or a hardcoded fallback list. */
  RansomwareGroup: { path: '/intel/ransomware', summaryPath: '/intel/ransomware', readOnly: true },
  APTActor: { path: '/intel/apt', summaryPath: '/intel/apt', readOnly: true },
  DarkWebAlert: { path: '/intel/dark-web', summaryPath: '/intel/dark-web', readOnly: true },
  Finding: { path: '/findings', summaryPath: '/findings/summary' },
  /* The offensive side: real stores only. authorized_targets holds 2 rows and red_team_safety_state 1, so those are
   * served. /red-team/overview states the absent stores (attack paths, simulations, campaigns, attack findings) by name
   * instead of letting four counters print 0. */
  /* The fix calendar and planning board drag a finding into a week, move it, and drop it back to the backlog - create,
   * update and delete across 11 call sites. No fix_schedule table existed, so every one of those writes was refused and
   * the board reverted on reload. GET/POST/PATCH/DELETE /fix-schedule record exactly what a person placed. */
  FixScheduleItem: { path: "/fix-schedule" },
  /* Five sites saved assignment rules into a table that did not exist, above the promise "New findings matching it are
   * assigned on discovery", while nothing assigned anything. apply is a real POST that assigns unowned open findings. */
  AssignmentRule: { path: "/assignment-rules", actions: ["apply"] },
  /* No attack-path store exists and cloud_asset_relationships holds 0 edges against 145 assets, so a path cannot be
   * computed. The route answers with the measured state (assets, edges, why) instead of an empty list a page could read
   * as "0 paths, you are clean". */
  CloudAttackPath: { path: "/cloud/attack-paths", summaryPath: "/cloud/attack-paths" },
  /* The strategy library creates, edits and deletes; the triage queue reads published ones by times_reused and bumps the
   * counter when applied. No strategy table existed, so every write vanished and the library was always empty. */
  FixStrategy: { path: "/fix-strategies" },
  /* Item 26. CustomReportsPage runs real reports over six served sources; only the saved definition had no
   * table, and the refused Drive function already told the user the report was stored on the platform. */
  CustomReport: { path: "/custom-reports" },
  RemediationTemplate: { path: "/remediation-templates" },

  /* The settings page reads and saves org settings; both calls used to be swallowed, so nothing was ever written. The
   * store is one row per tenant, saved with PUT /settings/org, and the response states which fields are enforced. */
  OrgSettings: {
    path: "/settings/org",
    single: true,
    upsert: "PUT",
    /* The route answers {settings, stored, enforced_by, basis}: the page reads the fields at the top level and
     * checks `stored`, so the envelope is flattened here rather than in every page. */
    unwrap: (payload) => ({
      ...(payload?.settings || {}),
      stored: payload?.stored,
      enforced_by: payload?.enforced_by,
      basis: payload?.basis,
    }),
  },
  AuthorizedTarget: { path: "/red-team/targets" },
  RedTeamStatus: { path: "/red-team/status", single: true },
  RedTeamOverview: { path: "/red-team/overview", single: true },
  /* Four routed pages ask for a TeamMember to fill assignment dropdowns (Assets, Risk Thresholds, Vulnerability
   * Management, escalation settings). Measured 22 Nov 2026: there is no team_members table. GET /team/members serves the
   * caller's own tenant users with their role name, and `name` is the email because this platform stores no display
   * name. Reads are real; TeamMember.update has no store, so it refuses with a reason rather than pretending to save. */
  TeamMember: {
    path: "/team/members",
    summaryPath: "/team/summary",
    readOnly: true,
    readOnlyReason:
      'Team members are read from this tenant\'s own user roster at GET /team/members. There is no team member store, ' +
      'so Slack linkage and per-member escalation settings cannot be saved here; people are managed under Administration.',
  },
  Incident: { path: '/incidents' },
  IncidentTask: { path: "/incident-tasks" },
  CloudFinding: { path: '/cloud/findings' },
  /* 314 container CVEs exist in `findings` (source trivy_container); this is the route that serves them. */
  ContainerFinding: { path: '/containers/findings', summaryPath: '/containers/summary' },
  /* 60 real OSV findings for the packages installed in the API virtualenv. There is no vm_findings or vm_scans
     table on this platform, so VMScan stays deliberately refused rather than mapped to a guess. */
  VMFinding: { path: '/host/vulnerabilities', summaryPath: '/host/summary' },
  /* The scanned image estate, aggregated from the container findings by image. */
  ContainerScan: { path: '/containers/images' },
  CloudAccount: { path: '/cloud/connections' },
  Asset: { path: '/cloud/assets' },
  ASPMAsset: { path: '/cloud/assets' },
  /* 145 cloud assets with real linked-finding counts and stated nulls where nothing was measured. */
  AttackSurface: { path: '/cloud/attack-surface', summaryPath: '/cloud/attack-surface/summary' },
  ComplianceFramework: { path: '/compliance/frameworks', summaryPath: '/compliance/frameworks' },
  /* Control-level verdicts from the assessment engine: 297 controls, each carrying its own pass/fail. */
  ComplianceChecklistItem: { path: '/compliance/controls' },
  ComplianceAssessment: { path: '/compliance/assessments' },
  PolicyViolation: { path: '/compliance/determinations' },
  Agent: { path: '/agents', summaryPath: '/agents/fleet/status' },
  AuditLog: { path: '/audit' },
  /* Admin portal (step 10). Gated on users:manage, which is what these pages are for. */
  User: { path: '/admin/users' },
  Role: { path: '/admin/roles' },
  Permission: { path: '/admin/permissions' },
  ApiKey: { path: '/admin/api-keys' },
  /* Tenant is NOT mapped on purpose: see the module docstring. */
  Notification: { path: '/notifications' },
  /* alert_rules holds the real rules; /alerts/rules returns them with the API's own column names. */
  AlertRule: { path: '/alerts/rules' },
  /* The escalation panel's rules are siem_correlation_rules: ten real rows, with PATCH and DELETE now served. */
  VulnEscalationRule: { path: '/siem/correlation/rules' },
  ApprovalRequest: { path: '/approvals' },
  CodeRepository: { path: '/repositories' },
  ScanJob: { path: '/scans/activity' },
  Alert: { path: '/alerts/events' },
  CIEMFinding: { path: '/ciem/findings' },
  EvidenceRecord: { path: '/evidence' },
  ComplianceAssessment: { path: '/compliance/assessments' },
  RemediationTask: { path: '/remediation' },
  CustomerTenant: { path: '/mssp/customers' },
};

/* Backend functions the platform actually implements. Everything else throws. */
/* Refusals that know why. Measured 22 Nov 2026 before writing this: the only Slack credential on the host is
 * SLACK_WEBHOOK_URL (a webhook can post, it cannot enumerate channels - that needs a bot token), and there is no
 * department or threshold table of any kind, so a risk-limit check has nothing to read. Escalation RULES are real and
 * are served through VulnEscalationRule -> /siem/correlation/rules; it is only these two halves that are absent. */
/* A function name can cover actions that are served and actions that are not. gdsForensicChain verifies hash integrity
 * from MinIO, which is real, and exports to Google Drive, which needs a service account this host does not have. One
 * name, two truths, so the route is resolved per action and an unserved action is declared absent rather than guessed. */
const ABSENT = Symbol('absent');

const REFUSAL_REASONS = {
  /* Item 34: these four have no table at all. Reading one returns an empty list, which a page renders as "none". */
  SecretReference:
    'There is no secrets inventory on this platform: credentials live in the host environment, so no secret can be '
    + 'listed or rotated here. What is configured, by name only, is served at GET /secrets/posture.',
  CertificateRecord:
    'There is no certificate store on this platform. The certificate each hostname actually serves, with its expiry, '
    + 'is read from a live TLS handshake at GET /secrets/posture.',
  SecretLeakageAlert:
    'No secret scanner runs on this platform, so no leakage alert exists to record or read. GET /secrets/posture '
    + 'states which scanners were looked for and found absent.',
  SecretAccessPolicy:
    'There is no per-secret access-policy store. Credential access is enforced by the API\'s own permission checks, '
    + 'not by policy records a page could list or edit.',
  DarkWebAlert:
    'Reading dark-web coverage is served from GET /intel/dark-web, which states that no collector, leak feed or breach '
    + 'source is connected here. There is no alert store, so no alert can be recorded, and no continuous monitoring '
    + 'runs. Credential posture that IS measured is served at GET /secrets/posture.',
  CVERecord:
    'Reading the CVE register is served from GET /cve/records, aggregated from this tenant\'s own findings. Writing a '
    + 'CVE is not: there is no CVE store here, so a hand-written record would vanish on reload.',
  ThreatIntelFeed:
    'Reading the intel feed is served from GET /threat-intel/feed, derived from this tenant\'s own findings. Writing a '
    + 'feed item is not: there is no intel store, so a manually added item would vanish on reload.',
  'gdsLinearSync:':
    'Linear is served for three actions: reading the connection (status), listing teams and raising or moving a ticket. '
    + 'Any other action is not implemented, so it is refused rather than guessed.',
  TeamMember:
    'Reading team members is served from this tenant\'s own user roster at GET /team/members. Writing one is not: there ' +
    'is no team member store, so Slack linkage and per-member escalation settings have nowhere to be saved. People are ' +
    'managed under Administration, not here.',

  /* Measured 22 Nov 2026 before writing these, so each one states a fact rather than a guess. */
  gdsScheduledReports:
    'Every action on this function reads or writes a Google Drive folder, and this host holds no Google service ' +
    'account. The report content can be built from the platform, but it cannot be filed into Drive, so no folder can ' +
    'be listed and no report can be saved here.',
  saveReportToDrive:
    'Saving a custom report to Google Drive needs a service account this host does not have. The report itself is ' +
    'stored on the platform and can be exported as CSV or PDF from the page.',
  gdsCompliancePortalSync:
    'There is no external compliance portal configured on this host and no endpoint for one, so there is nothing to ' +
    'sync with. Evidence and assessments are stored and scored locally.',
  gdsApplyRiskScoring:
    'Measured 22 Nov 2026: cloud_assets has no risk_score or base_risk_score column, 0 of 145 assets link to any ' +
    'finding by name, and the seven weighted types (database, ai_model, api, storage, container, serverless, compute) ' +
    'do not occur among the ten measured categories, which are subnet 56, network 17, security_group 17, region 17, ' +
    'firewall 17 and similar. A score computed from those inputs would be invented, so nothing is applied.',
  gdsDataFabric:
    'There is no data fabric store on this platform: data_sources, data_catalog, data_lakes and data_quality_rules ' +
    'do not exist as tables, so nothing can be registered, catalogued or scored for quality.',
  gdsCleanup:
    'There is no cleanup function on this platform and nothing for one to clean. The call was removed from the app ' +
    'shell rather than left failing on every page load.',

  'gdsForensicChain:export_package':
    'Building the evidence package needs Google Drive, and this host holds no Google service account, so nothing can be ' +
    'uploaded or listed there. Integrity verification on the same page is real and reads the stored MinIO objects.',
  gdsEvidenceDriveExport:
    'Google Drive export needs a service account this host does not have. No file can be created or listed in Drive, so ' +
    'this cannot run; the evidence objects themselves are stored in MinIO and can be downloaded from the vault.',
  gdsFleetAutoscale:
    'No autoscaler exists on this platform: nothing watches a backlog and nothing starts or retires an agent process. ' +
    'The registry declares max_concurrency per agent, but no process adjusts it, so scaling cannot run and a policy ' +
    'has nowhere to be stored.',
  gdsVulnEscalation:
    'Escalation rules are served (they read and write the platform\'s own correlation rules), but two halves are not: ' +
    'the Slack channel list, because this host holds only a webhook and enumerating channels needs a bot token, and ' +
    'the department risk-limit check, because no threshold store exists here.',
};

const FUNCTION_ROUTES = {
  /* AssignmentRulesPage's escalate button asked this name and nothing answered it, while the platform has run the
   * age policy from scripts/ops/escalate_stale_findings.py by cron since step 14 - /executive/risk-score has been
   * counting the stale findings all along. POST /findings/escalate-stale runs that same policy. The page's own
   * click is the accountable act, so it passes apply; any other action stays refused. */
  gdsAutoAssignFindings: {
    path: '/findings/escalate-stale',
    method: 'POST',
    mapPayload: (payload = {}) => {
      const action = payload.action || 'escalate_stale';
      if (action !== 'escalate_stale') {
        throw new NotOnThisPlatform(`gdsAutoAssignFindings.${action}`, 'Function');
      }
      return { apply: payload.apply === true };
    },
  },
  // Linear is ported and proved against the live workspace; this is its sync action.
  /* Item 15. GET /agents/fleet/status has existed since item 11 and two routed components were calling a refused name
   * instead, so the fleet panel read "unknown - backend status unavailable" over a route answering 200 with 23 roles.
   * The payload carries no `success`, no `release` object and no `checked_at`, and both components gate on
   * `payload.success`. Nothing is invented in this mapping: success means the route answered, the release sha is the one
   * the newest heartbeat reported, checked_at is the newest heartbeat RECEIPT (which is what the label now says), and a
   * freshness window the route does not report stays null so the panel prints "not reported". */
  /* verify_signature reads GET /evidence/{id}/verify, which recomputes a SHA-256 over the stored MinIO object using the
   * same engine as the agent tool verify_evidence_integrity. collect_evidence is absent on purpose: the real upload is
   * multipart POST /evidence, and this page now uploads through evidence.upload() rather than pretending a title is a
   * file. export_package needs Drive, which this host cannot reach. */
  gdsForensicChain: {
    byAction: {
      verify_signature: {
        path: (payload) => `/evidence/${encodeURIComponent(String((payload && payload.evidence_id) || ''))}/verify`,
        method: 'GET',
        mapResponse: (data) => ({
          intact: data && data.intact === true,
          verdict: (data && data.verdict) || 'unknown',
          stored_sha256: (data && data.stored_sha256) || null,
          measured_sha256: (data && data.measured_sha256) || null,
          stored_size_bytes: (data && data.stored_size_bytes) ?? null,
          measured_size_bytes: (data && data.measured_size_bytes) ?? null,
          checked_content: (data && data.checked_content) || null,
          note: 'SHA-256 of the stored object, compared in constant time. Not a signature: no signing key exists here.',
        }),
      },
      export_package: ABSENT,
      collect_evidence: ABSENT,
    },
    default: ABSENT,
  },
  gdsEvidenceDriveExport: ABSENT,
  gdsFleetStatus: {
    path: '/agents/fleet/status',
    method: 'GET',
    mapResponse: (data) => {
      const roles = Array.isArray(data?.roles) ? data.roles : [];
      const newestOf = (key) => roles.map((role) => role?.[key]).filter(Boolean).sort().pop() || null;
      const withSha = roles
        .filter((role) => role?.release_sha)
        .sort((a, b) => String(a.last_received_at || '').localeCompare(String(b.last_received_at || '')));
      return {
        success: true,
        source: 'agent heartbeats (verified) + capability decisions (executed)',
        checked_at: newestOf('last_received_at'),
        release: {
          sha: withSha.length ? withSha[withSha.length - 1].release_sha : null,
          branch: null,
          deployed_at: null,
        },
        freshness: {
          fresh_seconds: data?.freshness?.fresh_within_seconds ?? null,
          stale_seconds: data?.freshness?.stale_after_seconds ?? null,
          capable_window_hours: null,
        },
        counts: data?.counts || {},
        roles,
      };
    },
  },
  /* The route resolves per action, and the caller's action must survive: a hardcoded body here sent "sync" for every
   * call and the route rejected it. "status" reads the connection; the other three are the actions the route implements.
   * sync_states is a real bulk action (it reads the linked tickets from Linear and writes their state back), and
   * push_state moves one finding's ticket. */
  gdsLinearSync: {
    byAction: {
      status: { path: '/integrations/linear/status', method: 'GET' },
      list_teams: { path: '/integrations/linear', method: 'POST' },
      create_ticket: { path: '/integrations/linear', method: 'POST' },
      push_state: { path: '/integrations/linear', method: 'POST' },
      sync_states: { path: '/integrations/linear', method: 'POST' },
      auto_critical: { path: '/integrations/linear', method: 'POST' },
    },
    default: ABSENT,
  },
  /* The shell asks for platform_intel on every page load; that function does not exist here, so the header showed
   * dashes on all 100 pages. GET /platform/intel answers it from security_findings and compliance_controls, returning
   * exactly risk.{score,grade} and defensive.{cloud_open,cloud_critical,vuln_total,vuln_critical,exploited_in_wild,
   * compliance_avg} that PlatformShell reads. The execute action stays refused: its only real equivalent needs the
   * shared bridge key, which must not live in a browser bundle. */
  gdsMasterOrchestrator: {
    path: '/platform/intel',
    method: 'GET',
    mapPayload: (payload = {}) => {
      if ((payload.action || 'platform_intel') !== 'platform_intel') {
        throw new NotOnThisPlatform('gdsMasterOrchestrator.execute', 'Function');
      }
      return undefined;
    },
  },
  /* The Co-Pilot chat. POST /reasoning/mission runs the real reasoning loop and is guarded by ai_guard, so an injected
   * instruction comes back 422 prompt_guard_refused instead of reaching a model. The engine returns summary, agent_id,
   * tool_calls and duration_ms; the page renders response, agent_steps and agents_count, so the mapping is explicit here
   * rather than invented in the component. */
  gdsAgentOS: {
    path: '/reasoning/mission',
    method: 'POST',
    mapPayload: (payload = {}) => {
      const goal = payload.goal || payload.input || payload.task || '';
      return {
        goal,
        ...(payload.agent_id ? { agent_id: payload.agent_id } : {}),
        context: { command_type: payload.command_type || null, priority: payload.priority || null },
      };
    },
    mapResponse: (data = {}) => ({
      success: data.success,
      response: data.summary || (data.error ? `Mission failed: ${data.error}` : ''),
      agent_id: data.agent_id || null,
      agents_used: data.agent_id ? [data.agent_id] : [],
      agents_count: data.agent_id ? 1 : 0,
      agent_steps: (data.tool_calls || []).map((call) => ({
        agent: call.tool,
        emoji: '🔧',
        color: '#3b82f6',
        duration_ms: call.duration_ms,
        output: typeof call.result === 'string' ? call.result : JSON.stringify(call.result, null, 2),
      })),
      total_duration_ms: data.duration_ms,
      iterations: data.iterations,
      /* The engine returns no mission id, so none is claimed. */
      mission_id: null,
      error: data.error || null,
    }),
  },
  gdsKernelGateway: { path: '/kernel/processes', method: 'GET' },
  gdsRabbaniBridge: { path: '/bridge/health', method: 'GET' },
};

const unmapped = new Set();

export { REVERSE_FIELD_MAPS, AMBIGUOUS_REVERSE_FIELDS };

export function unavailableEntities() {
  return Array.from(unmapped).sort();
}

/* The record is session-wide, so a banner that wants to speak about ONE page has to clear it first. Called by
 * DataAvailabilityBanner on mount, which PlatformShell keys on the pathname. Nothing else reads this: the pages
 * that state an absence explicitly use unavailableEntities() and are unaffected. */
export function resetUnavailable() {
  unmapped.clear();
}

class NotOnThisPlatform extends Error {
  /* `detail` is optional and only used where the platform measured exactly what is missing. A page can then tell the
   * operator which half of a feature is absent instead of "not served yet" for all of it. */
  constructor(what, kind, detail) {
    super(detail ? `${kind} "${what}" is not served by the GDSA Radar API yet. ${detail}`
                 : `${kind} "${what}" is not served by the GDSA Radar API yet.`);
    this.name = 'NotOnThisPlatform';
    this.what = what;
    this.kind = kind;
    this.detail = detail || null;
  }
}


/* Item 40. The voice routes answer with MP3 bytes, not JSON, so they cannot go through request(): it reads the body as
 * text and would hand back null. This returns the Blob and the response headers the routes set. */
/* A structured error detail must be read out, not stringified into "[object Object]". FastAPI returns a dict detail
 * for a prompt-guard refusal ({error, attack_type, matched_rules, severity, recorded, note}) and a list for validation
 * errors; that refusal is exactly the case where the operator needs to know which rule fired and whether it was recorded. */
function readableErrorDetail(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((v) => (v && v.msg ? `${(v.loc || []).slice(-1)[0] || 'field'}: ${v.msg}` : JSON.stringify(v)))
      .join('; ');
  }
  if (typeof value === 'object') {
    const head = value.error || value.detail || value.message || fallback;
    const extras = [];
    if (value.attack_type) extras.push(`attack type ${value.attack_type}`);
    if (value.matched_rules?.length) extras.push(`rules ${value.matched_rules.join(', ')}`);
    if (value.severity) extras.push(`severity ${value.severity}`);
    if (value.recorded !== undefined) extras.push(value.recorded ? 'attempt recorded' : 'attempt could NOT be recorded');
    if (value.note) extras.push(value.note);
    return extras.length ? `${head} (${extras.join('; ')})` : String(head);
  }
  return String(value);
}

async function requestBlob(path, { method = 'POST', body } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 401) {
    const error = new Error('Not authenticated');
    error.status = 401;
    throw error;
  }
  if (!response.ok) {
    const text = await response.text();
    let detail = response.statusText;
    try { detail = JSON.parse(text).detail || detail; } catch { detail = text || detail; }
    const error = new Error(`${method} ${path} failed: ${readableErrorDetail(detail, response.statusText)}`);
    error.status = response.status;
    error.detail = detail;
    throw error;
  }
  const blob = await response.blob();
  blob.gdsHeaders = {
    model: response.headers.get('X-GDS-Model'),
    latencyMs: response.headers.get('X-GDS-Latency-Ms'),
    costUsd: response.headers.get('X-GDS-Cost-Usd'),
    costRecorded: response.headers.get('X-GDS-Cost-Recorded'),
  };
  return blob;
}

async function request(path, { method = 'GET', body, query } = {}) {
  let url = `${API}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) params.append(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }
  /* A multipart body must keep the browser-generated boundary, so FormData is passed through with no Content-Type of
   * our own. Sending it as JSON.stringify(body) would post "[object FormData]" and the upload route would 422. */
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const response = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: isForm ? body : (body ? JSON.stringify(body) : undefined),
  });

  if (response.status === 401) {
    const error = new Error('Not authenticated');
    error.status = 401;
    throw error;
  }
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }
  if (!response.ok) {
    const detail = (payload && (payload.detail || payload.message)) || response.statusText;
    const error = new Error(`${method} ${path} failed: ${readableErrorDetail(detail, response.statusText)}`);
    error.status = response.status;
    error.detail = detail;
    throw error;
  }
  return payload;
}

/* Several VPS routes wrap their rows (items, results, rows, data) and some return a bare array.
 * Reading all of them here keeps the pages from caring which. */
function rows(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    /* 'customers' and 'services' are named here because those payloads carry a second array beside the
       collection (customers beside non_production), which the one-array heuristic below must not guess at. */
    for (const key of ['items', 'results', 'rows', 'data', 'records', 'kpis', 'permissions', 'customers', 'services', 'schedules']) {
      if (Array.isArray(payload[key])) return payload[key];
    }
    /* A route that returns one collection beside its aggregates: /compliance/frameworks answers
     * {score_over_assessed, total_assessed, ..., frameworks: [...]}. The key name is the route's own, so
     * matching a fixed list of names turned a populated response into an empty page. */
    const arrays = Object.values(payload).filter(Array.isArray);
    if (arrays.length === 1) return arrays[0];
  }
  return [];
}

/* Platform column -> builder field. Only differences are listed; everything else passes through. */
const FIELD_MAPS = {
  /* The page calls the customer by its display name; the route calls that field display_name. plan_tier,
     subscription_status, onboarding_status, findings, critical_findings and health are native names. */
  CustomerTenant: { customer_name: 'display_name' },
  /* The route reports score_over_assessed (pass rate over controls actually assessed); the pages read score. */
  ComplianceFramework: { score: 'score_over_assessed', total_controls: 'official_control_count' },
  /* /compliance/controls rows carry control_ref and no id; the builder pages key on id, key and label. */
  /* The route calls the engine verdict `verdict`; every builder page reads `status`. */
  ComplianceChecklistItem: { id: 'control_ref', key: 'control_ref', label: 'title', status: 'verdict' },
  /* Builder rows carry created_date; the API carries created_at. */
  User: { created_date: 'created_at' },
  /* ApiKeysPage labels the scopes column Permissions. */
  ApiKey: { permissions: 'scopes', created_date: 'created_at' },
  /* The score object nests its counts; the pages expect them flat. */
  GlobalRiskScore: {
    current: 'overall_score',
    critical_findings: 'counts.critical',
    high_findings: 'counts.high',
    total_open_findings: 'counts.open_total',
    kev_unpatched: 'counts.kev_open',
    accepted_risk: 'counts.accepted_risk',
  },
  KPI: {
    name: 'label',
    current_value: 'value',
    target_value: 'target',
  },
  TriagedFinding: {
    normalized_severity: 'severity',
    cve_id: 'cve',
    cvss_score: 'cvss',
    epss_score: 'epss',
    exploited_in_wild: 'kev_listed',
    asset_name: 'target',
    first_detected: 'detected_at',
    last_seen: 'detected_at',
  },
  Finding: {
    normalized_severity: 'severity',
    cve_id: 'cve',
    cvss_score: 'cvss',
    epss_score: 'epss',
    exploited_in_wild: 'kev_listed',
    asset_name: 'target',
    first_detected: 'detected_at',
    last_seen: 'detected_at',
  },
  CloudFinding: {
    normalized_severity: 'severity',
    /* CloudFindingOut has created_at and no detected_at, so the old map translated nothing and the table's
       DETECTED column read "—" beside a real timestamp. It has no resource_name either, so that mapping is gone
       rather than left pointing at a field the API never sends. */
    detected_at: 'created_at',
  },
  /* /v2/alerts renders a rule table under the builder's column names; the API uses the table's own. */
  AlertRule: {
    rule_name: 'name',
    entity_name: 'entity_type',
    notification_channels: 'channels',
    trigger_count: 'fire_count',
  },
  /* The panel reads rule_name and severity_threshold; the correlation store calls them name and severity.
     min_risk_score, slack_channel_*, engineer_ids and team_names are native names and need no translation.
     The store has no CVSS floor for rules written before migration 054, so min_risk_score stays undefined and
     the card hides its badge rather than printing "CVSS >= 0". */
  VulnEscalationRule: {
    rule_name: 'name',
    severity_threshold: 'severity',
  },
  VMFinding: {
    package_name: 'package',
    exploited_in_wild: 'kev_listed',
    normalized_severity: 'severity',
  },
  ContainerFinding: {
    normalized_severity: 'severity',
    asset_name: 'image',
    package_name: 'package',
    package_version: 'installed_version',
    exploited_in_wild: 'kev_listed',
    detected_at: 'created_at',
  },
  CIEMFinding: {
    normalized_severity: 'severity',
    asset_name: 'identity_name',
  },
  Incident: {
    normalized_severity: 'severity',
    opened_at: 'opened_at',
  },
};

/* The inverse of FIELD_MAPS, built once. A write has to speak the platform's column names, so the same
 * declaration drives both directions instead of a second map that can drift out of step. */
const { REVERSE_FIELD_MAPS, AMBIGUOUS_REVERSE_FIELDS } = (() => {
  const reverse = {};
  /* entity -> platform field -> [builder fields]. Anything with more than one source is un-writable: a save
     cannot know which name the page meant, so it is left untranslated and the page's own names go through. */
  const ambiguous = {};
  for (const [entity, map] of Object.entries(FIELD_MAPS)) {
    const sources = {};
    for (const [builderField, platformField] of Object.entries(map)) {
      (sources[platformField] = sources[platformField] || []).push(builderField);
    }
    const byPlatformField = {};
    for (const [platformField, builderFields] of Object.entries(sources)) {
      if (builderFields.length > 1) {
        (ambiguous[entity] = ambiguous[entity] || []).push(platformField);
        continue;
      }
      const [only] = builderFields;
      /* `id` is the route's primary key on every entity; it is never a writable alias for a column. */
      if (only === 'id') {
        (ambiguous[entity] = ambiguous[entity] || []).push(platformField);
        continue;
      }
      byPlatformField[platformField] = only;
    }
    reverse[entity] = byPlatformField;
  }
  return { REVERSE_FIELD_MAPS: reverse, AMBIGUOUS_REVERSE_FIELDS: ambiguous };
})();

function toPlatformBody(name, data) {
  const reverse = REVERSE_FIELD_MAPS[name];
  if (!reverse || !data || typeof data !== 'object' || Array.isArray(data)) return data;
  const body = { ...data };
  /* reverse is { platformField: builderField }, so entries arrive column-first. Reading them the other way
     looked for a body key named after the column, found none, and silently sent the body unchanged. */
  for (const [platformField, builderField] of Object.entries(reverse)) {
    if (!(builderField in body)) continue;
    /* Leave an explicitly-sent platform field alone: a page that already speaks the API's names is not
       wrong, and overwriting it would lose the value it chose. */
    if (platformField in body && body[platformField] !== body[builderField]) continue;
    body[platformField] = body[builderField];
    delete body[builderField];
  }
  return body;
}

function applyFields(name, row) {
  /* CATALOGUE_PERMISSIONS is a list of strings; the pages read item.name. */
  if (name === 'Permission' && typeof row === 'string') {
    return { id: row, name: row, display_name: row };
  }
  const map = FIELD_MAPS[name];
  if (!map || !row || typeof row !== 'object') return row;
  const out = { ...row };
  const read = (source, path) =>
    String(path)
      .split('.')
      .reduce((value, key) => (value == null ? undefined : value[key]), source);
  for (const [builderField, platformField] of Object.entries(map)) {
    const value = read(row, platformField);
    if (out[builderField] === undefined && value !== undefined) {
      out[builderField] = value;
    }
  }
  return out;
}

/* A single-object route may publish an envelope; `unwrap` names how to flatten it, so pages keep reading flat fields. */
const singleRow = (route, payload) => (route.unwrap ? route.unwrap(payload) : payload);

function entity(name) {
  const route = ENTITY_ROUTES[name];

  /* A read from an unserved entity is recorded and returns nothing. A write from one throws. */
  const refuseRead = () => {
    unmapped.add(name);
  };

  const guard = (method) => {
    if (!route) {
      unmapped.add(name);
      throw new NotOnThisPlatform(name, 'Entity');
    }
    /* Some resources are served for reading only. Without this, an update went to PATCH <path>/<id>, a route that does
     * not exist, and the page reported whatever the 405 said. A read-only route now refuses in words. */
    if (route.readOnly && method !== 'list' && method !== 'filter' && method !== 'get') {
      throw new NotOnThisPlatform(name, `entity ${method}`, route.readOnlyReason || REFUSAL_REASONS[name]);
    }
    return route;
  };

  return {
    async list(sort, limit) {
      if (!route) {
        refuseRead();
        return [];
      }
      const { path } = guard('list');
      const payload = await request(path, {
        query: { sort: typeof sort === 'string' ? sort : undefined, limit },
      });
      return (route.single ? [singleRow(route, payload)] : rows(payload)).map((row) => applyFields(name, row));
    },
    async filter(query, sortOrOptions, limit) {
      if (!route) {
        refuseRead();
        return [];
      }
      const { path } = guard('filter');
      /* Pages call this as filter(query, sort, limit), the shape of Base44's own SDK. An earlier version
       * took (query, options) and spread the second argument into the query string, so a string sort
       * became numeric params (0=-, 1=c, ...) and the limit was dropped: sorting and paging were silently
       * ignored at every one of those call sites. Both shapes are accepted here. */
      const params = { ...(query || {}) };
      if (sortOrOptions && typeof sortOrOptions === 'object') {
        Object.assign(params, sortOrOptions);
      } else if (typeof sortOrOptions === 'string') {
        params.sort = sortOrOptions;
      }
      if (limit != null) params.limit = limit;

      /* The platform takes ONE value per filter field. A page asking for { status: { $in: [...] } } would
       * otherwise send a JSON array, which matches nothing and comes back as an empty list - an absence the
       * page cannot tell from "no findings". One request per value, merged, then trimmed to the limit. */
      const expandable = Object.entries(params).find(
        ([, value]) => value && typeof value === 'object' && Array.isArray(value.$in),
      );
      if (expandable) {
        const [field, op] = expandable;
        const base = { ...params };
        delete base[field];
        const merged = [];
        for (const value of op.$in) {
          const payload = await request(path, { query: { ...base, [field]: value } });
          merged.push(...(route.single ? [singleRow(route, payload)] : rows(payload)));
        }
        const trimmed = limit != null ? merged.slice(0, limit) : merged;
        return trimmed.map((row) => applyFields(name, row));
      }

      const payload = await request(path, { query: params });
      return (route.single ? [singleRow(route, payload)] : rows(payload)).map((row) => applyFields(name, row));
    },
    /* The platform's own count for an entity that publishes one. A page that shows a total must read this,
     * because a fetched page is capped and can only ever describe itself. */
    async summary() {
      if (!route || !route.summaryPath) {
        unmapped.add(name);
        throw new NotOnThisPlatform(name, 'Summary');
      }
      return request(route.summaryPath);
    },
    async get(id) {
      if (!route) {
        refuseRead();
        return null;
      }
      const { path } = guard('get');
      return request(`${path}/${encodeURIComponent(id)}`);
    },
    /* A route may publish non-CRUD actions as POST /<path>/<action>. An action it does not list refuses by name rather than
     * posting to a guessed path, so a page cannot silently hit nothing. */
    async run(action, body) {
      if (!route || !Array.isArray(route.actions) || !route.actions.includes(action)) {
        unmapped.add(name);
        throw new NotOnThisPlatform(`${name}.${action}`, 'Action');
      }
      const { path } = guard('run');
      return request(`${path}/${encodeURIComponent(action)}`, { method: 'POST', body: toPlatformBody(name, body || {}) });
    },
    /* One row per tenant (or per scope) is saved with a PUT at the collection path, not a POST that appends. Pages that
     * edit a single record call upsert() so a second save updates instead of duplicating. */
    async upsert(data) {
      if (!route || !route.upsert) {
        unmapped.add(name);
        throw new NotOnThisPlatform(name, 'Upsert');
      }
      const { path } = guard('upsert');
      const payload = await request(path, { method: route.upsert, body: toPlatformBody(name, data) });
      return route.single ? singleRow(route, payload) : payload;
    },
    async create(data) {
      const { path } = guard('create');
      return request(path, { method: 'POST', body: toPlatformBody(name, data) });
    },
    async update(id, data) {
      const { path } = guard('update');
      return request(`${path}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: toPlatformBody(name, data),
      });
    },
    async delete(id) {
      const { path } = guard('delete');
      return request(`${path}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
    async bulkCreate(items) {
      const { path } = guard('bulkCreate');
      return request(path, { method: 'POST', body: { items: (items || []).map((i) => toPlatformBody(name, i)) } });
    },
    async bulkUpdate(items) {
      const { path } = guard('bulkUpdate');
      return request(`${path}/bulk`, {
        method: 'PATCH',
        body: { items: (items || []).map((i) => toPlatformBody(name, i)) },
      });
    },
    async count(query) {
      if (!route) {
        refuseRead();
        return 0;
      }
      const { path } = guard('count');
      const payload = await request(`${path}/count`, { query });
      return payload && typeof payload.count === 'number' ? payload.count : rows(payload).length;
    },
    subscribe() {
      /* Base44 pushed entity changes over its own socket. The platform has no equivalent yet, so
       * this returns an unsubscribe function and never pretends a subscription is live. */
      unmapped.add(name);
      return () => {};
    },
  };
}

const entityCache = new Map();

export const base44 = {
  entities: new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop !== 'string') return undefined;
        if (!entityCache.has(prop)) entityCache.set(prop, entity(prop));
        return entityCache.get(prop);
      },
    },
  ),

  /* The sixteen agent pages (Exploits, Pentest, Red Team, OSINT, Threat Hunting, Dark Web, Simulation, Vulnerabilities,
   * SOC, Incidents, Cloud, AI Security, Identity, Risk, Compliance) used to post gdsMasterOrchestrator {action:
   * "execute"}, which this adapter refuses: its only real equivalent needs the shared bridge key, and that must not live
   * in a browser bundle. So each page showed "Could not load - retrying..." over four zeros. GET /platform/agent-page
   * answers each task from the register and the operational tables, and names in _absent the keys it cannot measure so
   * the page can print an em dash instead of a zero that reads as a measured absence. */
  platform: {
    /* Item 40. The Co-Pilot's brain, its voice, and the map of both. */
    copilotCapabilities: () => request('/copilot/capabilities'),
    /* Item 41. The Co-Pilot's standing memory: what the planner is given, in the operator's own words. */
    memories: () => request('/copilot/memory'),
    remember: (memory) => request('/copilot/memory', { method: 'POST', body: memory }),
    forget: (memoryId) => request(`/copilot/memory/${memoryId}`, { method: 'DELETE' }),
    /* Item 42. The autonomous loop: a host cron job, read and controlled through these routes. */
    /* Item 44. Plans the goal across agents and runs them under governance. Not the same call as a question: it costs
     * roughly $0.07 measured, takes 30-60s, and streams nothing. */
    orchestrateMission: (goal, options = {}) =>
      request('/copilot/mission/orchestrate', { method: 'POST', body: { goal, allow_writes: !!options.allow_writes } }),
    /* Which alert channels are actually configured. A critical finding can reach the in-app inbox only when
     * no external channel is set, and the Alerts page must say so rather than draw a zero. */
    alertChannels: () => request('/alerts/channels'),
    scheduler: () => request('/copilot/scheduler'),
    pauseSchedule: (name) => request(`/copilot/scheduler/${encodeURIComponent(name)}/pause`, { method: 'POST', body: {} }),
    resumeSchedule: (name) => request(`/copilot/scheduler/${encodeURIComponent(name)}/resume`, { method: 'POST', body: {} }),
    /* Speech to text. The transcript comes back for review; nothing is sent on the operator's behalf. */
    transcribe: (audioBlob, filename) => {
      const form = new FormData();
      form.append('file', audioBlob, filename || 'speech.webm');
      return request('/copilot/voice/transcribe', { method: 'POST', body: form });
    },
    /* Text to speech. Returns an object URL for an MP3 the caller plays; the bytes are never stored on the host. */
    speak: async (text) => {
      const blob = await requestBlob('/copilot/voice/speak', { method: 'POST', body: { text } });
      return { url: URL.createObjectURL(blob), headers: blob.gdsHeaders || {} };
    },

    /* What is actually deployed, from the route that reports it: commit sha, branch, deploy time, migrations applied.
     * The Co-Pilot header used to print an invented "v2.0" instead. */
    async version() {
      return request('/health/version');
    },
    /* The calling user's own unread notifications. GET /notifications is scoped to current_user.user_id and returns
     * the whole unread set (no page cap), so its length is the count, not the length of a truncated page. Returns
     * null when the route cannot be read, so a badge is omitted rather than drawn as zero. */
    async unreadNotificationCount() {
      try {
        const list = await request('/notifications', { query: { unread_only: true } });
        return Array.isArray(list) ? list.length : null;
      } catch {
        return null;
      }
    },
    async agentPage(task, agent) {
      return request('/platform/agent-page', { query: { task, agent } });
    },
    /* Item 34. The secrets page used to read four entities that have no table, so it printed four zeros over "No
     * secrets registered / No certificates tracked / No leakage alerts / No access policies configured" - a clean bill
     * of health for an estate nothing had measured. One route answers all of it from what exists: a live TLS handshake
     * per hostname, credential NAMES from the process environment (never values), the api_keys table, and named
     * refusals for the scanner and policy stores that do not exist. */
    async secretsPosture() {
      return request('/secrets/posture');
    },
  },

  integrations: {
    /* Every surface this platform can actually speak to, plus the connector stores that do not exist. The page renders
     * from this rather than from hardcoded copy, so "connected" always means measured. */
    async status() {
      return request('/integrations/status');
    },
    /* Whether ticketing can work, and how much of the open register is filed. Kept as its own call because it owns the
     * linear_issue_links facts, which the status route does not read. */
    async linearStatus() {
      return request('/integrations/linear/status');
    },
  },

  evidence: {
    /* POST /evidence takes multipart: file, subject_type, subject_id. The bytes are hashed and stored in MinIO by the
     * API, which is why the vault can then verify them. */
    async upload(file, { subject_type = 'manual-upload', subject_id = null } = {}) {
      const form = new FormData();
      form.append('file', file);
      form.append('subject_type', subject_type);
      if (subject_id) form.append('subject_id', subject_id);
      return request('/evidence', { method: 'POST', body: form });
    },
  },

  functions: {
    async invoke(name, payload) {
      const declared = FUNCTION_ROUTES[name];
      if (!declared) {
        unmapped.add(`fn:${name}`);
        throw new NotOnThisPlatform(name, 'Function', REFUSAL_REASONS[name]);
      }
      const route = declared.byAction
        ? (declared.byAction[payload && payload.action] || declared.default)
        : declared;
      if (!route || route === ABSENT) {
        unmapped.add(`fn:${name}:${(payload && payload.action) || ''}`);
        throw new NotOnThisPlatform(
          name,
          'Function',
          REFUSAL_REASONS[`${name}:${payload && payload.action}`] || REFUSAL_REASONS[name],
        );
      }
      const outgoing = route.mapPayload ? route.mapPayload(payload) : (route.body || payload);
      const path = typeof route.path === 'function' ? route.path(payload) : route.path;
      const data = await request(path, {
        method: route.method || 'POST',
        body: route.method === 'GET' ? undefined : outgoing,
      });
      /* The SDK contract is { data }. Every call site that reads a result reads r.data, so returning the payload bare
       * made res.data undefined and threw on the first page that used it. */
      return { data: route.mapResponse ? route.mapResponse(data) : data };
    },
  },

  /* The provider surface. The overview is read whole rather than unwrapped to its customers array, because the
   * payload's counts and its exclusion reasons are the honest part: five tenants were three fixtures, the provider
   * and one real account. */
  /* What scanning is actually doing. Six cron-driven schedules with a derived state; there is no job queue on this
   * platform, and the payload says so in its own words rather than leaving a page to imply one. */
  scans: {
    async activity() {
      return request('/scans/activity');
    },
  },

  /* Only what the console can really start. Discovery is the cloud operation this platform has a route for; the
   * environment id is required by the API and is never guessed. */
  cloud: {
    async environments() {
      return request('/cloud/environments');
    },
    async startDiscovery(environmentId, categories = []) {
      return request('/cloud/discovery-jobs', {
        method: 'POST',
        body: { environment_id: environmentId, discovery_categories: categories },
      });
    },
  },

  mssp: {
    async overview() {
      return request('/mssp/customers');
    },
    async services() {
      return request('/mssp/services');
    },
    async revenue() {
      return request('/mssp/revenue');
    },
  },

  /* Step 18. The platform's own billing routes. Nothing is derived here: a plan, a price, a status and an
   * invoice come from /billing/*, and the page decides what to say about them. */
  billing: {
    async plans() {
      return request('/billing/plans');
    },
    async quota() {
      return request('/billing/quota');
    },
    async subscription() {
      return request('/billing/subscription');
    },
    async invoices() {
      return request('/billing/invoices');
    },
    async checkout(planTier) {
      return request('/billing/checkout', { method: 'POST', body: { plan_tier: planTier } });
    },
    async portal() {
      return request('/billing/portal', { method: 'POST' });
    },
    async cancel(immediate = false) {
      return request('/billing/cancel', { method: 'POST', body: { immediate } });
    },
  },

  auth: {
    async me() {
      return request('/auth/me');
    },
    async isAuthenticated() {
      try {
        await request('/auth/me');
        return true;
      } catch {
        return false;
      }
    },
    async logout() {
      await request('/auth/logout', { method: 'POST' });
      return true;
    },
    setToken() {
      /* The platform authenticates with an HttpOnly session cookie on the same origin, so there is
       * no client-held token to set. Kept as a no-op because four call sites expect it to exist. */
    },
    // The builder's sign-in form calls this exact name.
    async loginViaEmailPassword(email, password, mfaCode) {
      return authRequest('/auth/login', {
        email,
        password,
        ...(mfaCode ? { mfa_code: mfaCode } : {}),
      });
    },
    async login(email, password, mfaCode) {
      return authRequest('/auth/login', {
        email,
        password,
        ...(mfaCode ? { mfa_code: mfaCode } : {}),
      });
    },
    async register(email, password, fullName) {
      return authRequest('/auth/register', {
        email,
        password,
        ...(fullName ? { full_name: fullName } : {}),
      });
    },
    async loginWithProvider() {
      throw new NotOnThisPlatform('loginWithProvider', 'Auth method');
    },
    /* Step 17. Enrolment is two-step on the server: /mfa/enrol stores a secret and returns it with the
     * recovery codes once, and nothing is enforced until /mfa/confirm proves the app produces codes. */
    async mfaStatus() {
      return request('/auth/mfa/status');
    },
    /* What this account's ROLE requires, and the date it starts being enforced. Status says what is true of the
     * factor; policy says what is demanded of the person and how long is left. */
    async mfaPolicy() {
      return request('/auth/mfa/policy');
    },
    async mfaEnrol() {
      return authRequest('/auth/mfa/enrol', {});
    },
    async mfaConfirm(code) {
      return authRequest('/auth/mfa/confirm', { code });
    },
    async mfaDisable(password, code) {
      return authRequest('/auth/mfa/disable', { password, ...(code ? { code } : {}) });
    },
    async verifyOtp() {
      throw new NotOnThisPlatform('verifyOtp', 'Auth method');
    },
  },
};

export default base44;

/* Item 46. Scanner liveness: when each scheduled scan last ran, whether it wrote anything, and whether it is
 * overdue or silent. Deliberately its own export rather than an entity name - it reads two tables and the register
 * at once, and a collection shape would invite a page to count a page of results and call it the estate. */
export async function scanHealth() {
  return request('/scan/health');
}
