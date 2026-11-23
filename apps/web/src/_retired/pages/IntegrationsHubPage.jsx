import React from "react";
import { Link } from "react-router-dom";
import { Code, GitBranch, MessageSquare, Settings, Cloud, Database, Shield, FileText, ExternalLink, CheckCircle, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const INTEGRATIONS = {
  "IDE & Editor": [
    { name: "VS Code Extension", path: "/integrations/vscode", icon: Code, status: "available" },
    { name: "JetBrains Plugin", path: "/integrations/jetbrains", icon: Code, status: "available" },
  ],
  "Source Control": [
    { name: "GitHub App", path: "/integrations/github", icon: GitBranch, status: "available" },
    { name: "GitLab Integration", path: "/integrations/gitlab", icon: GitBranch, status: "available" },
    { name: "Bitbucket", path: "/integrations/bitbucket", icon: GitBranch, status: "available" },
  ],
  "Issue Tracking": [
    { name: "Jira", path: "/integrations/jira", icon: FileText, status: "available" },
    { name: "Linear", path: "/integrations/linear", icon: FileText, status: "available" },
  ],
  "Communication": [
    { name: "Slack", path: "/integrations/slack", icon: MessageSquare, status: "available" },
    { name: "Microsoft Teams", path: "/integrations/teams", icon: MessageSquare, status: "available" },
    { name: "PagerDuty", path: "/integrations/pagerduty", icon: Shield, status: "available" },
    { name: "OpsGenie", path: "/integrations/opsgenie", icon: Shield, status: "coming_soon" },
  ],
  "CI/CD": [
    { name: "GitHub Actions", path: "/integrations/github-actions", icon: GitBranch, status: "available" },
    { name: "GitLab CI/CD", path: "/integrations/gitlab-cicd", icon: GitBranch, status: "available" },
    { name: "Bitbucket Pipelines", path: "/integrations/bitbucket-pipelines", icon: GitBranch, status: "coming_soon" },
  ],
  "SIEM & Monitoring": [
    { name: "Splunk", path: "/integrations/siem?tab=splunk", icon: Database, status: "available" },
    { name: "Datadog", path: "/integrations/siem?tab=datadog", icon: Database, status: "available" },
    { name: "Elastic", path: "/integrations/siem?tab=elastic", icon: Database, status: "available" },
    { name: "ServiceNow", path: "/integrations/servicenow", icon: Settings, status: "available" },
  ],
  "Cloud": [
    { name: "AWS Security Hub", path: "/integrations/aws-security-hub", icon: Cloud, status: "available" },
  ],
  "Scanner Engines": [
    { name: "Semgrep SAST", path: "/integrations/semgrep", icon: Shield, status: "available" },
    { name: "OSV.dev / NVD", path: "/integrations/vulnerability-databases", icon: Database, status: "available" },
    { name: "Trivy / Grype", path: "/integrations/container-scanners", icon: Shield, status: "available" },
    { name: "Shodan / Censys", path: "/integrations/attack-surface-intel", icon: Globe, status: "available" },
    { name: "VirusTotal", path: "/integrations/virustotal", icon: Shield, status: "available" },
  ],
};

export default function IntegrationsHubPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Integrations Hub</h1>
        <p className="text-slate-400">Connect ShieldAI to your existing security and development tools</p>
      </div>

      {Object.entries(INTEGRATIONS).map(([category, integrations]) => (
        <div key={category}>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            {category}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {integrations.map((integration) => (
              <Card key={integration.name} className="border-slate-800 bg-slate-900/50 hover:border-slate-700 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-2 rounded-lg bg-slate-800">
                      <integration.icon className="w-5 h-5 text-primary" />
                    </div>
                    {integration.status === "available" ? (
                      <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-400 border-slate-700 text-xs">
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-white text-base">{integration.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {integration.status === "available" ? (
                    <Link to={integration.path}>
                      <button className="w-full text-left text-sm text-primary hover:underline flex items-center gap-1">
                        Configure
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </Link>
                  ) : (
                    <div className="text-sm text-slate-400">Coming soon</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}