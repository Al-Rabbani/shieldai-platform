import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Settings, Cloud, GitBranch, MessageSquare, Ticket, Shield, AlertCircle, CheckCircle, XCircle, Plus, Trash2, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ErrorBoundary from "@/components/shared/ErrorBoundary";

const INTEGRATION_CATEGORIES = [
  { id: "source", name: "Source Control", icon: GitBranch, integrations: ["github", "gitlab", "bitbucket"] },
  { id: "tracking", name: "Issue Tracking", icon: Ticket, integrations: ["jira", "linear", "github_issues"] },
  { id: "notifications", name: "Notifications", icon: MessageSquare, integrations: ["slack", "teams", "pagerduty", "opsgenie"] },
  { id: "cloud", name: "Cloud Providers", icon: Cloud, integrations: ["aws", "azure", "gcp"] },
  { id: "siem", name: "SIEM & Monitoring", icon: Shield, integrations: ["splunk", "datadog", "servicenow", "aws_security_hub"] },
];

const INTEGRATION_DETAILS = {
  github: { name: "GitHub", description: "Connect repositories for automated scanning" },
  gitlab: { name: "GitLab", description: "Connect projects for CI/CD security" },
  bitbucket: { name: "Bitbucket", description: "Connect workspaces for scanning" },
  jira: { name: "Jira", description: "Create tickets for findings automatically" },
  linear: { name: "Linear", description: "Auto-create issues for vulnerabilities" },
  github_issues: { name: "GitHub Issues", description: "Native GitHub issue tracking" },
  slack: { name: "Slack", description: "Send alerts to Slack channels" },
  teams: { name: "Microsoft Teams", description: "Teams webhook notifications" },
  pagerduty: { name: "PagerDuty", description: "Critical alert escalation" },
  opsgenie: { name: "Opsgenie", description: "Incident management integration" },
  aws: { name: "AWS", description: "Cloud security posture management" },
  azure: { name: "Azure", description: "Azure cloud account scanning" },
  gcp: { name: "Google Cloud", description: "GCP security scanning" },
  splunk: { name: "Splunk", description: "SIEM integration for security events" },
  datadog: { name: "Datadog", description: "Security monitoring dashboards" },
  servicenow: { name: "ServiceNow", description: "Enterprise ticket management" },
  aws_security_hub: { name: "AWS Security Hub", description: "Centralized AWS security view" },
};

export default function IntegrationsPage() {
  const [selectedType, setSelectedType] = useState(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      try {
        return await base44.entities.Integration.list();
      } catch {
        return [];
      }
    },
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "connected": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "error": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "pending": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getIntegrationStatus = (type) => {
    const integration = integrations.find(i => i.type === type);
    return integration?.status || "disconnected";
  };

  const getIntegrationDetails = (type) => {
    const integration = integrations.find(i => i.type === type);
    return integration;
  };

  return (
    <ErrorBoundary>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Settings className="w-6 h-6 text-amber-500" />
              Integration Hub
            </h1>
            <p className="text-slate-400 text-sm mt-1">Connect your tools for automated security workflows</p>
          </div>
        </div>

        {/* Integration Categories */}
        {INTEGRATION_CATEGORIES.map(category => {
          const CategoryIcon = category.icon;
          return (
            <Card key={category.id} className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <CategoryIcon className="w-4 h-4 text-amber-500" />
                  {category.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {category.integrations.map(type => {
                    const details = INTEGRATION_DETAILS[type];
                    const status = getIntegrationStatus(type);
                    const integration = getIntegrationDetails(type);
                    
                    return (
                      <div
                        key={type}
                        className={`p-4 rounded-lg border transition-all cursor-pointer ${
                          status === "connected"
                            ? "bg-green-500/10 border-green-500/30 hover:border-green-500/50"
                            : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                        }`}
                        onClick={() => {
                          setSelectedType(type);
                          setConfigModalOpen(true);
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              status === "connected" ? "bg-green-500" :
                              status === "error" ? "bg-red-500" :
                              status === "pending" ? "bg-amber-500" : "bg-slate-500"
                            }`} />
                            <span className="text-white font-medium">{details?.name || type}</span>
                          </div>
                          <Badge className={getStatusColor(status)}>{status}</Badge>
                        </div>
                        <p className="text-xs text-slate-400 mb-3">{details?.description}</p>
                        {integration && (
                          <div className="space-y-1 text-xs text-slate-500">
                            {integration.account_name && (
                              <div>Account: {integration.account_name}</div>
                            )}
                            {integration.last_synced && (
                              <div>Last sync: {new Date(integration.last_synced).toLocaleString()}</div>
                            )}
                            {integration.total_resources_synced > 0 && (
                              <div>Resources: {integration.total_resources_synced.toLocaleString()}</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Configuration Modal */}
        <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
          <DialogContent className="bg-slate-900 border-slate-800 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">
                Configure {selectedType ? INTEGRATION_DETAILS[selectedType]?.name : "Integration"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-slate-400">
                Integration configuration coming soon. This will allow you to connect your {selectedType} account with API keys, OAuth, or webhook URLs.
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setConfigModalOpen(false)} className="border-slate-700 text-slate-300">
                  Cancel
                </Button>
                <Button className="bg-amber-500 hover:bg-amber-600 text-black">
                  Connect {selectedType && INTEGRATION_DETAILS[selectedType]?.name}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Info Banner */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div className="text-sm text-slate-400">
                <p className="text-white font-medium mb-1">Integration Credits Exhausted</p>
                <p>
                  This workspace is out of integration credits. OAuth connector functionality and backend functions requiring integration credits are blocked until 2026-06-20 UTC, 
                  or upgrade to a higher tier. See Settings → Billing for details.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}