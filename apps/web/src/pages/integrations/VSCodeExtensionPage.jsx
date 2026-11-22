import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Code, CheckCircle, XCircle, Loader2, ExternalLink, Copy, Terminal, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function VSCodeExtensionPage() {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [workspaceName, setWorkspaceName] = useState("");
  const [findingStats, setFindingStats] = useState({ critical: 0, high: 0, medium: 0, low: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadIntegrationStatus();
  }, []);

  const loadIntegrationStatus = async () => {
    try {
      const integrations = await base44.entities.Integration.filter({ type: "vscode" });
      if (integrations && integrations.length > 0) {
        const integration = integrations[0];
        setConnectionStatus(integration.status || "connected");
        setWorkspaceName(integration.workspace_name || "ShieldAI Workspace");
        if (integration.status === "connected") {
          const findings = await base44.entities.TriagedFinding.filter({ status: "open" });
          setFindingStats({
            critical: findings.filter(f => f.severity === "critical").length,
            high: findings.filter(f => f.severity === "high").length,
            medium: findings.filter(f => f.severity === "medium").length,
            low: findings.filter(f => f.severity === "low").length,
          });
        }
      }
    } catch (error) {
      console.error("Failed to load VS Code integration:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      await base44.entities.Integration.create({
        type: "vscode",
        name: "VS Code Extension",
        status: "connected",
        workspace_name: "ShieldAI Workspace",
        connected_at: new Date().toISOString(),
      });
      setConnectionStatus("connected");
      setWorkspaceName("ShieldAI Workspace");
      loadIntegrationStatus();
    } catch (error) {
      console.error("Failed to connect:", error);
    }
  };

  const handleDisconnect = async () => {
    try {
      const integrations = await base44.entities.Integration.filter({ type: "vscode" });
      if (integrations.length > 0) {
        await base44.entities.Integration.delete(integrations[0].id);
      }
      setConnectionStatus("disconnected");
      setWorkspaceName("");
      setFindingStats({ critical: 0, high: 0, medium: 0, low: 0 });
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  const copyInstallCommand = () => {
    navigator.clipboard.writeText("code --install-extension shieldai.shieldai-security");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Code className="w-6 h-6 text-blue-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">ShieldAI for VS Code</h1>
          </div>
          <p className="text-slate-400">Security findings inline as you code — real-time protection in your editor</p>
        </div>
        <div className="flex items-center gap-3">
          {connectionStatus === "connected" ? (
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
              <CheckCircle className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-slate-400">
              <XCircle className="w-3 h-3 mr-1" />
              Disconnected
            </Badge>
          )}
        </div>
      </div>

      {/* Connection Status Card */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Extension Status</CardTitle>
          <CardDescription>Current connection and workspace details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connectionStatus === "connected" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div>
                  <div className="text-sm text-slate-400">Connected to workspace</div>
                  <div className="text-white font-semibold">{workspaceName}</div>
                </div>
                <Button variant="outline" onClick={handleDisconnect} className="border-red-500/20 text-red-400 hover:bg-red-500/10">
                  Disconnect
                </Button>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="text-2xl font-bold text-red-500">{findingStats.critical}</div>
                  <div className="text-xs text-slate-400">Critical</div>
                </div>
                <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <div className="text-2xl font-bold text-orange-500">{findingStats.high}</div>
                  <div className="text-xs text-slate-400">High</div>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <div className="text-2xl font-bold text-yellow-500">{findingStats.medium}</div>
                  <div className="text-xs text-slate-400">Medium</div>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="text-2xl font-bold text-blue-500">{findingStats.low}</div>
                  <div className="text-xs text-slate-400">Low</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <div>
                <div className="text-white font-semibold">Not connected</div>
                <div className="text-sm text-slate-400">Install the extension to connect</div>
              </div>
              <Button onClick={handleConnect}>
                Connect Extension
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Installation */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Installation</CardTitle>
          <CardDescription>Install the ShieldAI extension in VS Code</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button asChild>
              <a href="https://marketplace.visualstudio.com/items?itemName=shieldai.shieldai-security" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Install from Marketplace
              </a>
            </Button>
          </div>

          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Terminal className="w-4 h-4" />
                Install via CLI
              </div>
              <Button variant="ghost" size="sm" onClick={copyInstallCommand} className="text-slate-400 hover:text-white">
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <code className="text-sm text-green-400 font-mono">
              code --install-extension shieldai.shieldai-security
            </code>
          </div>

          <Alert className="bg-slate-800/50 border-slate-700">
            <AlertDescription className="text-slate-300">
              Or search "ShieldAI Security" in VS Code Extensions panel (Ctrl+Shift+X)
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: "Inline Annotations", desc: "Red underlines on vulnerable code with hover tooltips", icon: Code },
          { title: "Problems Panel", desc: "All findings appear in VS Code Problems tab", icon: AlertTriangle },
          { title: "One-Click Fix", desc: "Apply AutoFix suggestions directly in editor", icon: CheckCircle },
          { title: "Scan on Save", desc: "Automatic scanning on every file save (<2s)", icon: Loader2 },
          { title: "Secret Detection", desc: "Instant warnings when secrets are typed", icon: XCircle },
          { title: "Real-time Sync", desc: "Findings sync bidirectionally with workspace", icon: ExternalLink },
        ].map((feature, i) => (
          <Card key={i} className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <feature.icon className="w-8 h-8 text-primary mb-2" />
              <CardTitle className="text-white text-lg">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">{feature.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}