import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Code, CheckCircle, XCircle, Loader2, ExternalLink, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const JETBRAINS_IDES = ["IntelliJ IDEA", "PyCharm", "GoLand", "WebStorm", "Rider", "CLion", "PhpStorm", "RubyMine"];

export default function JetBrainsPluginPage() {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [apiToken, setApiToken] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadIntegrationStatus();
  }, []);

  const loadIntegrationStatus = async () => {
    try {
      const integrations = await base44.entities.Integration.filter({ type: "jetbrains" });
      if (integrations && integrations.length > 0) {
        const integration = integrations[0];
        setConnectionStatus(integration.status || "connected");
        setApiToken(integration.api_token ? "••••••••••••••••" : "");
      }
    } catch (error) {
      console.error("Failed to load JetBrains integration:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToken = async () => {
    try {
      const existing = await base44.entities.Integration.filter({ type: "jetbrains" });
      if (existing.length > 0) {
        await base44.entities.Integration.update(existing[0].id, {
          api_token: apiToken,
          status: "connected",
          connected_at: new Date().toISOString(),
        });
      } else {
        await base44.entities.Integration.create({
          type: "jetbrains",
          name: "JetBrains Plugin",
          api_token: apiToken,
          status: "connected",
          connected_at: new Date().toISOString(),
        });
      }
      setConnectionStatus("connected");
      setApiToken("••••••••••••••••");
    } catch (error) {
      console.error("Failed to save token:", error);
    }
  };

  const handleDisconnect = async () => {
    try {
      const integrations = await base44.entities.Integration.filter({ type: "jetbrains" });
      if (integrations.length > 0) {
        await base44.entities.Integration.delete(integrations[0].id);
      }
      setConnectionStatus("disconnected");
      setApiToken("");
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
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Code className="w-6 h-6 text-purple-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">ShieldAI for JetBrains</h1>
          </div>
          <p className="text-slate-400">Security integration for IntelliJ, PyCharm, GoLand, WebStorm, and more</p>
        </div>
        <Badge className={connectionStatus === "connected" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-slate-800 text-slate-400"}>
          {connectionStatus === "connected" ? <><CheckCircle className="w-3 h-3 mr-1" /> Connected</> : <><XCircle className="w-3 h-3 mr-1" /> Disconnected</>}
        </Badge>
      </div>

      {/* Supported IDEs */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Supported IDEs</CardTitle>
          <CardDescription>Fully compatible with all JetBrains IDEs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {JETBRAINS_IDES.map(ide => (
              <Badge key={ide} variant="outline" className="border-slate-700 text-slate-300">
                {ide}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Token Setup */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">API Token Configuration</CardTitle>
          <CardDescription>Enter your ShieldAI API token to connect the plugin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connectionStatus === "connected" ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="text-sm text-slate-400 mb-1">API Token</div>
                <code className="text-green-400 font-mono">{apiToken}</code>
              </div>
              <Button variant="outline" onClick={handleDisconnect} className="border-red-500/20 text-red-400 hover:bg-red-500/10">
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">ShieldAI API Token</label>
                <input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Enter your API token"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-primary"
                />
              </div>
              <Button onClick={handleSaveToken} disabled={!apiToken.trim()}>
                Save Token & Connect
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Installation Steps */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Installation Steps</CardTitle>
          <CardDescription>Install the plugin from JetBrains Marketplace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-3 text-sm text-slate-300">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <strong>Open Settings</strong> — Go to File → Settings (or Ctrl+Alt+S)
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">2</span>
              <div>
                <strong>Navigate to Plugins</strong> — Select "Plugins" in the left sidebar
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">3</span>
              <div>
                <strong>Search Marketplace</strong> — Search for "ShieldAI Security"
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">4</span>
              <div>
                <strong>Install & Restart</strong> — Click Install and restart your IDE
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">5</span>
              <div>
                <strong>Configure Token</strong> — Go to Settings → Tools → ShieldAI → paste API token
              </div>
            </li>
          </ol>

          <div className="flex gap-3 pt-4">
            <Button asChild>
              <a href="https://plugins.jetbrains.com/plugin/shieldai-security" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                JetBrains Marketplace
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "Inline Annotations", desc: "Vulnerability underlines in editor" },
          { title: "Problems View", desc: "Findings in IDE Problems panel" },
          { title: "AutoFix Integration", desc: "One-click fixes in context menu" },
        ].map((feature, i) => (
          <Card key={i} className="border-slate-800 bg-slate-900/50">
            <CardHeader>
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