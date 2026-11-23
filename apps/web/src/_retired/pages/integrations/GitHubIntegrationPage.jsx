import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Github, CheckCircle, XCircle, Loader2, ExternalLink, Settings, Shield, GitPullRequest, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const MOCK_REPOS = [
  { name: "shieldai-platform", access: "Full", lastScan: "2 hours ago", findings: 12, status: "active" },
  { name: "api-gateway", access: "Full", lastScan: "5 hours ago", findings: 5, status: "active" },
  { name: "frontend-app", access: "Read-only", lastScan: "1 day ago", findings: 23, status: "active" },
];

export default function GitHubIntegrationPage() {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [installedRepos, setInstalledRepos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [prComments, setPrComments] = useState(true);
  const [statusChecks, setStatusChecks] = useState(true);
  const [blockOnCritical, setBlockOnCritical] = useState(true);
  const [autoIssues, setAutoIssues] = useState(false);

  useEffect(() => {
    loadIntegrationStatus();
  }, []);

  const loadIntegrationStatus = async () => {
    try {
      const integrations = await base44.entities.Integration.filter({ type: "github" });
      if (integrations && integrations.length > 0) {
        const integration = integrations[0];
        setConnectionStatus(integration.status || "connected");
        setInstalledRepos(MOCK_REPOS);
      }
    } catch (error) {
      console.error("Failed to load GitHub integration:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      await base44.entities.Integration.create({
        type: "github",
        name: "GitHub App",
        status: "connected",
        connected_at: new Date().toISOString(),
        settings: {
          pr_comments: true,
          status_checks: true,
          block_critical: true,
          auto_issues: false,
        },
      });
      setConnectionStatus("connected");
      setInstalledRepos(MOCK_REPOS);
    } catch (error) {
      console.error("Failed to connect:", error);
    }
  };

  const handleDisconnect = async () => {
    try {
      const integrations = await base44.entities.Integration.filter({ type: "github" });
      if (integrations.length > 0) {
        await base44.entities.Integration.delete(integrations[0].id);
      }
      setConnectionStatus("disconnected");
      setInstalledRepos([]);
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-slate-800">
              <Github className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">GitHub Integration</h1>
          </div>
          <p className="text-slate-400">PR security comments, status checks, and automated issue creation</p>
        </div>
        <Badge className={connectionStatus === "connected" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-slate-800 text-slate-400"}>
          {connectionStatus === "connected" ? <><CheckCircle className="w-3 h-3 mr-1" /> Connected</> : <><XCircle className="w-3 h-3 mr-1" /> Disconnected</>}
        </Badge>
      </div>

      {/* Connection Card */}
      {connectionStatus === "disconnected" ? (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-white">Connect GitHub App</CardTitle>
            <CardDescription>Install the ShieldAI GitHub App to enable security scanning</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleConnect} className="bg-slate-100 text-slate-900 hover:bg-slate-200">
              <Github className="w-4 h-4 mr-2" />
              Install ShieldAI GitHub App
            </Button>
            <Alert className="bg-slate-800/50 border-slate-700">
              <AlertDescription className="text-slate-300">
                The app will request read/write access to your repositories for security scanning and PR comments
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Settings */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Integration Settings</CardTitle>
                  <CardDescription>Configure GitHub integration behavior</CardDescription>
                </div>
                <Button variant="outline" onClick={handleDisconnect} className="border-red-500/20 text-red-400 hover:bg-red-500/10">
                  Disconnect
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <GitPullRequest className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-sm font-medium text-white">PR Security Comments</div>
                    <div className="text-xs text-slate-400">Post finding summaries on pull requests</div>
                  </div>
                </div>
                <Switch checked={prComments} onCheckedChange={setPrComments} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-sm font-medium text-white">Status Checks</div>
                    <div className="text-xs text-slate-400">Add "ShieldAI Security Scan" as required check</div>
                  </div>
                </div>
                <Switch checked={statusChecks} onCheckedChange={setStatusChecks} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <div>
                    <div className="text-sm font-medium text-white">Block on Critical</div>
                    <div className="text-xs text-slate-400">Prevent merging PRs with critical findings</div>
                  </div>
                </div>
                <Switch checked={blockOnCritical} onCheckedChange={setBlockOnCritical} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <ExternalLink className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-sm font-medium text-white">Auto-create Issues</div>
                    <div className="text-xs text-slate-400">Create GitHub Issues for critical findings</div>
                  </div>
                </div>
                <Switch checked={autoIssues} onCheckedChange={setAutoIssues} />
              </div>
            </CardContent>
          </Card>

          {/* Connected Repos */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-white">Connected Repositories</CardTitle>
              <CardDescription>Repositories with ShieldAI access</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Repository</TableHead>
                    <TableHead className="text-slate-400">Access</TableHead>
                    <TableHead className="text-slate-400">Last Scan</TableHead>
                    <TableHead className="text-slate-400">Findings</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installedRepos.map((repo, i) => (
                    <TableRow key={i} className="border-slate-800">
                      <TableCell className="font-medium text-white">{repo.name}</TableCell>
                      <TableCell className="text-slate-400">{repo.access}</TableCell>
                      <TableCell className="text-slate-400">{repo.lastScan}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-red-500/20 text-red-400">
                          {repo.findings}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                          {repo.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* PR Comment Example */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-white">PR Comment Example</CardTitle>
              <CardDescription>How ShieldAI comments appear on pull requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-sm">
                <div className="text-slate-400 mb-3">## 🛡️ ShieldAI Security Scan Results</div>
                <div className="text-white mb-3">**2 new findings in this PR:**</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="pb-2 text-slate-400 font-normal">Severity</th>
                        <th className="pb-2 text-slate-400 font-normal">Finding</th>
                        <th className="pb-2 text-slate-400 font-normal">File</th>
                        <th className="pb-2 text-slate-400 font-normal">Line</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      <tr className="border-b border-slate-800/50">
                        <td className="py-2">🔴 Critical</td>
                        <td className="py-2">SQL Injection</td>
                        <td className="py-2">api/users.ts</td>
                        <td className="py-2">47</td>
                      </tr>
                      <tr>
                        <td className="py-2">🟠 High</td>
                        <td className="py-2">XSS</td>
                        <td className="py-2">views/profile.tsx</td>
                        <td className="py-2">123</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}