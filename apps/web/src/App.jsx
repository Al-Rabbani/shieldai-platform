import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { PlatformProvider } from '@/context/PlatformContext';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";

import ProtectedRoute from '@/components/ProtectedRoute';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import PageNotFound from './lib/PageNotFound';

// Auth pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// Shell & Command Center
import PlatformShell from '@/components/platform/PlatformShell';
import CommandCenter from '@/pages/CommandCenter';
import MyDashboardPage from '@/pages/MyDashboardPage';

// Co-Pilot
import GDSCoPilotPage from '@/pages/gds/GDSCoPilotPage';
import GDSCoPilotMemoryPage from '@/pages/gds/GDSCoPilotMemoryPage';
import GDSCoPilotSchedulerPage from '@/pages/gds/GDSCoPilotSchedulerPage';

// Red Team Command (Layer 4 — Hermes)
import RedTeamCommandPage from '@/pages/RedTeamCommandPage';
import RiskReductionReportPage from '@/pages/RiskReductionReportPage';
import KillChainPage from '@/pages/redteam/KillChainPage';
import AdversarySimPage from '@/pages/redteam/AdversarySimPage';
import AttackPathsPage from '@/pages/redteam/AttackPathsPage';
import PentestLaunchPage from '@/pages/redteam/PentestLaunchPage';
import PentestResultsPage from '@/pages/redteam/PentestResultsPage';
import BlueTeamCommandPage from '@/pages/BlueTeamCommandPage';
import ZeroTrustPage from '@/pages/blueteam/ZeroTrustPage';
import ConfigurationDriftPage from '@/pages/ConfigurationDriftPage';
import APTTrackerPage from '@/pages/threatintel/APTTrackerPage';
import RansomwareTrackerPage from '@/pages/threatintel/RansomwareTrackerPage';
import NotificationCenterPage from '@/pages/NotificationCenterPage';
import SOCOperationsPage from '@/pages/SOCOperationsPage';
import AgentFleetPage from '@/pages/settings/AgentFleetPage';
import CloudCIEMPage from '@/pages/cloud/CloudCIEMPage';
import CodeSecurityDashboardPage from '@/pages/code/CodeSecurityDashboardPage';
import SBOMDependenciesPage from '@/pages/code/SBOMDependenciesPage';
import RuntimeProtectionPage from '@/pages/blueteam/RuntimeProtectionPage';
import IntegrationsSettingsPage from '@/pages/settings/IntegrationsSettingsPage';

// EDP Dashboard Pages
import ExecutiveDashboardPage from '@/pages/dashboards/ExecutiveDashboardPage';
import AuditCompliancePage from '@/pages/dashboards/AuditCompliancePage';
import AISecurityDashboardPage from '@/pages/dashboards/AISecurityPage';
import OrganizationManagementPage from '@/pages/dashboards/OrganizationManagementPage';
import SecretsKeyManagementPage from '@/pages/dashboards/SecretsKeyManagementPage';
import ConnectorsIntegrationsPage from '@/pages/dashboards/ConnectorsIntegrationsPage';
import AlertsNotificationsPage from '@/pages/dashboards/AlertsNotificationsPage';

// EDP-042 & EDP-046
import ForensicEvidenceVaultPage from '@/pages/forensics/ForensicEvidenceVaultPage';
import AuditorReportPage from '@/pages/forensics/AuditorReportPage';
import DataFabricPage from '@/pages/datafabric/DataFabricPage';
import RiskFixPlannerPage from '@/pages/RiskFixPlannerPage';
import FrameworkTrackingPage from '@/pages/compliance/FrameworkTrackingPage';
import ComplianceEvidenceVaultPage from '@/pages/compliance/ComplianceEvidenceVaultPage';
import ComplianceAuditLogPage from '@/pages/compliance/ComplianceAuditLogPage';
import VulnerabilityTop10Page from '@/pages/VulnerabilityTop10Page';
import AttackVectorSimulatorPage from '@/pages/AttackVectorSimulatorPage';
import CustomReportsPage from '@/pages/CustomReportsPage';
import CloudAssetRiskReportPage from '@/pages/reports/CloudAssetRiskReportPage';
import AgentRiskReductionPage from '@/pages/AgentRiskReductionPage';
import AgentPerformancePage from '@/pages/reports/AgentPerformancePage';
import FixPlanningBoardPage from '@/pages/FixPlanningBoardPage';
import VulnerabilityFixesPage from '@/pages/VulnerabilityFixesPage';
import TriageQueuePage from '@/pages/TriageQueuePage';
import SlaBreachRadarPage from '@/pages/SlaBreachRadarPage';
import SlaTargetsPage from '@/pages/settings/SlaTargetsPage';
import DriftAlertSettingsPage from '@/pages/settings/DriftAlertSettingsPage';
import EscalationSettingsPage from '@/pages/EscalationSettingsPage';
import RiskThresholdsPage from '@/pages/RiskThresholdsPage';
import RiskScoringPage from '@/pages/settings/RiskScoringPage';
import FleetScalingPage from '@/pages/settings/FleetScalingPage';
import AutoRemediationPage from '@/pages/settings/AutoRemediationPage';
import AssignmentRulesPage from '@/pages/settings/AssignmentRulesPage';
import LinearIntegrationPage from '@/pages/settings/LinearIntegrationPage';
import LeadershipBriefingPage from '@/pages/LeadershipBriefingPage';
import ExecutiveOverviewPage from '@/pages/ExecutiveOverviewPage';
import MfaSettingsPage from '@/pages/MfaSettingsPage';
import ApiKeysPage from '@/pages/ApiKeysPage';
import BillingSettingsPage from '@/pages/BillingSettingsPage';
import FixCalendarPage from '@/pages/FixCalendarPage';
import DriveReportsPage from '@/pages/DriveReportsPage';
import FixStrategyLibraryPage from '@/pages/FixStrategyLibraryPage';
import RemediationTemplatesPage from '@/pages/RemediationTemplatesPage';
import AttackChainMapPage from '@/pages/AttackChainMapPage';
import CVEExploitTrackerPage from '@/pages/cve/CVEExploitTrackerPage';

// Core operational pages
import IncidentResponsePage from '@/pages/IncidentResponsePage';
import VulnerabilityManagementPage from '@/pages/VulnerabilityManagementPage';
import AgentConsolePage from '@/pages/AgentConsolePage';
import CloudSecurityPage from '@/pages/CloudSecurityPage';
import ThreatIntelligencePage from '@/pages/ThreatIntelligencePage';
import MSSPDashboardPage from '@/pages/MSSPDashboardPage';
import CompliancePageNew from '@/pages/CompliancePage';
import IdentityCIEMPage from '@/pages/IdentityCIEMPage';
import AlertsPage from '@/pages/AlertsPage';
import Assets from '@/pages/Assets';
import VMSecurityPage from '@/pages/VMSecurityPage';
import ContainerSecurityPage from '@/pages/ContainerSecurityPage';
import DarkWebIntelPage from '@/pages/DarkWebIntelPage';
import GDSSettingsPage from '@/pages/GDSSettingsPage';

// Defensive pages
import SOCPage from '@/pages/platform/defensive/SOCPage';
import CloudPage from '@/pages/platform/defensive/CloudPage';
import VulnerabilitiesPage from '@/pages/platform/defensive/VulnerabilitiesPage';
import IdentityPage from '@/pages/platform/defensive/IdentityPage';
import CompliancePage from '@/pages/platform/defensive/CompliancePage';
import ThreatIntelPage from '@/pages/platform/defensive/ThreatIntelPage';
import AISecurityPage from '@/pages/platform/defensive/AISecurityPage';
import IncidentsPage from '@/pages/platform/defensive/IncidentsPage';
import RiskPage from '@/pages/platform/defensive/RiskPage';

// Offensive pages
import RedTeamPage from '@/pages/platform/offensive/RedTeamPage';
import ThreatHuntingPage from '@/pages/platform/offensive/ThreatHuntingPage';
import DarkWebPage from '@/pages/platform/offensive/DarkWebPage';
import PentestPage from '@/pages/platform/offensive/PentestPage';
import SimulationPage from '@/pages/platform/offensive/SimulationPage';
import ExploitsPage from '@/pages/platform/offensive/ExploitsPage';
import OSINTPage from '@/pages/platform/offensive/OSINTPage';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  React.useEffect(() => {
    if (!isLoadingAuth && !isLoadingPublicSettings && authError?.type === 'auth_required') {
      navigateToLogin();
    }
  }, [isLoadingAuth, isLoadingPublicSettings, authError]);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#020817" }}>
        <div className="w-8 h-8 border-4 border-t-cyan-400 border-white/10 rounded-full animate-spin" />
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') return null;
  }

  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected platform */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<PlatformShell />}>
          {/* Command Center */}
          <Route path="/" element={<CommandCenter />} />
          <Route path="/my-dashboard" element={<MyDashboardPage />} />

          {/* Co-Pilot */}
          <Route path="/copilot" element={<GDSCoPilotPage />} />
          <Route path="/copilot/memory" element={<GDSCoPilotMemoryPage />} />
          <Route path="/copilot/scheduler" element={<GDSCoPilotSchedulerPage />} />

          {/* Red Team Command (Layer 4 — Hermes) */}
          <Route path="/red-team" element={<RedTeamCommandPage />} />
          <Route path="/reports/risk-reduction" element={<RiskReductionReportPage />} />
          <Route path="/red-team/kill-chain" element={<KillChainPage />} />
          <Route path="/red-team/adversary-sim" element={<AdversarySimPage />} />
          <Route path="/red-team/attack-paths" element={<AttackPathsPage />} />
          <Route path="/red-team/pentest" element={<PentestLaunchPage />} />
          <Route path="/pentest-results" element={<PentestResultsPage />} />
          <Route path="/blue-team" element={<BlueTeamCommandPage />} />
          <Route path="/blue-team/zero-trust" element={<ZeroTrustPage />} />
          <Route path="/configuration-drift" element={<ConfigurationDriftPage />} />
          <Route path="/threat-intelligence/dark-web" element={<DarkWebIntelPage />} />
          <Route path="/threat-intelligence/apt" element={<APTTrackerPage />} />
          <Route path="/threat-intelligence/ransomware" element={<RansomwareTrackerPage />} />
          <Route path="/notifications" element={<NotificationCenterPage />} />
          <Route path="/soc" element={<SOCOperationsPage />} />
          <Route path="/settings/agents" element={<AgentFleetPage />} />
          <Route path="/cloud/ciem" element={<CloudCIEMPage />} />
          <Route path="/code" element={<CodeSecurityDashboardPage />} />
          <Route path="/code/sbom" element={<SBOMDependenciesPage />} />
          <Route path="/blue-team/runtime" element={<RuntimeProtectionPage />} />
          <Route path="/settings/integrations" element={<IntegrationsSettingsPage />} />
          <Route path="/forensics" element={<ForensicEvidenceVaultPage />} />
          <Route path="/forensics/auditor-report" element={<AuditorReportPage />} />
          <Route path="/data-fabric" element={<DataFabricPage />} />
          <Route path="/risk-planner" element={<RiskFixPlannerPage />} />
          <Route path="/compliance/frameworks" element={<FrameworkTrackingPage />} />
          <Route path="/compliance/evidence-vault" element={<ComplianceEvidenceVaultPage />} />
          <Route path="/compliance/audit-log" element={<ComplianceAuditLogPage />} />
          <Route path="/vulnerabilities/top10" element={<VulnerabilityTop10Page />} />
          <Route path="/attack-simulator" element={<AttackVectorSimulatorPage />} />
          <Route path="/attack-chains" element={<AttackChainMapPage />} />
          <Route path="/reports/custom" element={<CustomReportsPage />} />
          <Route path="/reports/agent-risk" element={<AgentRiskReductionPage />} />
          <Route path="/reports/agent-performance" element={<AgentPerformancePage />} />
          <Route path="/fix-planner" element={<FixPlanningBoardPage />} />
          <Route path="/fix-calendar" element={<FixCalendarPage />} />
          <Route path="/briefing" element={<LeadershipBriefingPage />} />
          <Route path="/executive-overview" element={<ExecutiveOverviewPage />} />
          <Route path="/settings/mfa" element={<MfaSettingsPage />} />
          <Route path="/settings/api-keys" element={<ApiKeysPage />} />
          <Route path="/settings/billing" element={<BillingSettingsPage />} />
          <Route path="/vulnerability-fixes" element={<VulnerabilityFixesPage />} />
          <Route path="/triage" element={<TriageQueuePage />} />
          <Route path="/sla-radar" element={<SlaBreachRadarPage />} />
          <Route path="/settings/escalation" element={<EscalationSettingsPage />} />
          <Route path="/settings/risk-thresholds" element={<RiskThresholdsPage />} />
          <Route path="/settings/sla-targets" element={<SlaTargetsPage />} />
          <Route path="/settings/drift-alerts" element={<DriftAlertSettingsPage />} />
          <Route path="/settings/risk-scoring" element={<RiskScoringPage />} />
          <Route path="/settings/fleet-scaling" element={<FleetScalingPage />} />
          <Route path="/settings/auto-remediation" element={<AutoRemediationPage />} />
          <Route path="/settings/assignment" element={<AssignmentRulesPage />} />
          <Route path="/settings/linear" element={<LinearIntegrationPage />} />
          <Route path="/reports/drive" element={<DriveReportsPage />} />
          <Route path="/reports/cloud-asset-risk" element={<CloudAssetRiskReportPage />} />
          <Route path="/fix-library" element={<FixStrategyLibraryPage />} />
          <Route path="/fix-templates" element={<RemediationTemplatesPage />} />
          <Route path="/cve-tracker" element={<CVEExploitTrackerPage />} />

          {/* EDP Dashboard Pages */}
          <Route path="/executive-dashboard" element={<ExecutiveDashboardPage />} />
          <Route path="/ai-security" element={<AISecurityDashboardPage />} />
          <Route path="/organization" element={<OrganizationManagementPage />} />
          <Route path="/secrets" element={<SecretsKeyManagementPage />} />
          <Route path="/connectors" element={<ConnectorsIntegrationsPage />} />

          {/* Core operational pages */}
          <Route path="/incidents" element={<IncidentResponsePage />} />
          <Route path="/vulnerabilities" element={<VulnerabilityManagementPage />} />
          <Route path="/agents" element={<AgentConsolePage />} />
          <Route path="/cloud" element={<CloudSecurityPage />} />
          <Route path="/threat-intelligence" element={<ThreatIntelligencePage />} />
          <Route path="/mssp" element={<MSSPDashboardPage />} />
          <Route path="/compliance" element={<AuditCompliancePage />} />
          <Route path="/identity" element={<IdentityCIEMPage />} />
          <Route path="/alerts" element={<AlertsNotificationsPage />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/vm-security" element={<VMSecurityPage />} />
          <Route path="/container-security" element={<ContainerSecurityPage />} />
          <Route path="/dark-web" element={<DarkWebIntelPage />} />
          <Route path="/settings" element={<GDSSettingsPage />} />

          {/* Defensive */}
          <Route path="/defensive" element={<Navigate to="/defensive/soc" replace />} />
          <Route path="/defensive/soc" element={<SOCPage />} />
          <Route path="/defensive/cloud" element={<CloudPage />} />
          <Route path="/defensive/vulnerabilities" element={<VulnerabilitiesPage />} />
          <Route path="/defensive/identity" element={<IdentityPage />} />
          <Route path="/defensive/compliance" element={<CompliancePage />} />
          <Route path="/defensive/threat-intel" element={<ThreatIntelPage />} />
          <Route path="/defensive/ai-security" element={<AISecurityPage />} />
          <Route path="/defensive/incidents" element={<IncidentsPage />} />
          <Route path="/defensive/risk" element={<RiskPage />} />

          {/* Offensive */}
          <Route path="/offensive" element={<Navigate to="/offensive/red-team" replace />} />
          <Route path="/offensive/red-team" element={<RedTeamPage />} />
          <Route path="/offensive/threat-hunting" element={<ThreatHuntingPage />} />
          <Route path="/offensive/dark-web" element={<DarkWebPage />} />
          <Route path="/offensive/pentest" element={<PentestPage />} />
          <Route path="/offensive/simulation" element={<SimulationPage />} />
          <Route path="/offensive/exploits" element={<ExploitsPage />} />
          <Route path="/offensive/osint" element={<OSINTPage />} />

          <Route path="*" element={<PageNotFound />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <PlatformProvider>
          <Router basename={import.meta.env.BASE_URL}>
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <SonnerToaster position="bottom-right" theme="dark" />
        </PlatformProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}