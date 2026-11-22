import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, XCircle, Loader2, ExternalLink, Settings, ArrowRightLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const ALERT_TYPES = [
  { id: "critical", name: "🔴 Critical finding detected", channel: "#security-critical" },
  { id: "autofix", name: "✅ AutoFix PR created", channel: "#engineering" },
  { id: "weekly", name: "📊 Weekly security digest", channel: "#security-team" },
  { id: "breach", name: "🚨 New breach detected (dark web)", channel: "#security-leadership" },
  { id: "compliance", name: "✅ Compliance score change", channel: "#ciso" },
];

export default function SlackIntegrationPage() {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadIntegrationStatus();
  }, []);

  const loadIntegrationStatus = async () => {
    try {
      const integrations = await base44.entities.Integration.filter({ type: "slack" });
      if (integrations && integrations.length > 0 && integrations[0].status === "connected") {
        setConnectionStatus("connected");
      }
    } catch (error) {
      console.error("Failed to load Slack integration:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      await base44.entities.Integration.create({
        type: "slack",
        name: "Slack Bot",
        status: "connected",
        connected_at: new Date().toISOString(),
      });
      setConnectionStatus("connected");
    } catch (error) {
      console.error("Failed to connect:", error);
    }
  };

  const handleDisconnect = async () => {
    try {
      const integrations = await base44.entities.Integration.filter({ type: "slack" });
      if (integrations.length > 0) {
        await base44.entities.Integration.delete(integrations[0].id);
      }
      setConnectionStatus("disconnected");
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  const handleChannelChange = async (alertId, newChannel) => {
    console.log(`Channel changed for ${alertId}:`, newChannel);
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
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-600">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Slack Integration</h1>
          </div>
          <p className="text-slate-400">Real-time security alerts and interactive notifications</p>
        </div>
        <Badge className={connectionStatus === "connected" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-slate-800 text-slate-400"}>
          {connectionStatus === "connected" ? <><CheckCircle className="w-3 h-3 mr-1" /> Connected</> : <><XCircle className="w-3 h-3 mr-1" /> Disconnected</>}
        </Badge>
      </div>

      {connectionStatus === "disconnected" ? (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-white">Connect Slack</CardTitle>
            <CardDescription>Add ShieldAI to your Slack workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleConnect} className="bg-purple-600 hover:bg-purple-700">
              <MessageSquare className="w-4 h-4 mr-2" />
              Add to Slack
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Alert Channel Configuration</CardTitle>
                  <CardDescription>Select which channels receive each alert type</CardDescription>
                </div>
                <Button variant="outline" onClick={handleDisconnect} className="border-red-500/20 text-red-400 hover:bg-red-500/10">
                  Disconnect
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {ALERT_TYPES.map((alert) => (
                <div key={alert.id} className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/50">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{alert.name}</div>
                  </div>
                  <div className="w-48">
                    <Select defaultValue={alert.channel}>
                      <SelectTrigger className="bg-slate-800 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="#security-critical">#security-critical</SelectItem>
                        <SelectItem value="#security-team">#security-team</SelectItem>
                        <SelectItem value="#engineering">#engineering</SelectItem>
                        <SelectItem value="#ciso">#ciso</SelectItem>
                        <SelectItem value="#general">#general</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs">
                    Test Alert
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-white">Slack Message Format</CardTitle>
              <CardDescription>Example of how alerts appear in Slack</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-2" />
                  <div className="flex-1">
                    <div className="text-white font-bold mb-1">🔴 Critical Finding Detected</div>
                    <div className="text-slate-300 text-sm space-y-1">
                      <div><strong>Finding:</strong> SQL Injection in /api/users</div>
                      <div><strong>Severity:</strong> Critical (CVSS 9.3)</div>
                      <div><strong>File:</strong> <code className="bg-slate-800 px-1 rounded">src/api/users.ts:47</code></div>
                      <div><strong>Reachability:</strong> EXPLOITABLE — endpoint is internet-facing</div>
                      <div><strong>Financial risk:</strong> ~$480K potential exposure</div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700">View Finding</button>
                      <button className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700">Generate AutoFix</button>
                      <button className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700">Assign →</button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}