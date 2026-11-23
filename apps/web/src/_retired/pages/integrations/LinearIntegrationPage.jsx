import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, XCircle, Loader2, ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function LinearIntegrationPage() {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [isLoading, setIsLoading] = useState(true);
  const [autoCreate, setAutoCreate] = useState(true);
  const [severityMapping, setSeverityMapping] = useState({
    critical: "urgent",
    high: "high",
    medium: "medium",
    low: "low",
  });

  useEffect(() => {
    loadIntegrationStatus();
  }, []);

  const loadIntegrationStatus = async () => {
    try {
      const integrations = await base44.entities.Integration.filter({ type: "linear" });
      if (integrations && integrations.length > 0 && integrations[0].status === "connected") {
        setConnectionStatus("connected");
      }
    } catch (error) {
      console.error("Failed to load Linear integration:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      await base44.entities.Integration.create({
        type: "linear",
        name: "Linear",
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
      const integrations = await base44.entities.Integration.filter({ type: "linear" });
      if (integrations.length > 0) {
        await base44.entities.Integration.delete(integrations[0].id);
      }
      setConnectionStatus("disconnected");
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Linear Integration</h1>
          <p className="text-slate-400">Bi-directional sync with Linear issues</p>
        </div>
        <Badge className={connectionStatus === "connected" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-slate-800 text-slate-400"}>
          {connectionStatus === "connected" ? <><CheckCircle className="w-3 h-3 mr-1" /> Connected</> : <><XCircle className="w-3 h-3 mr-1" /> Disconnected</>}
        </Badge>
      </div>

      {connectionStatus === "disconnected" ? (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-white">Connect Linear</CardTitle>
            <CardDescription>OAuth connect to your Linear workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleConnect}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Connect with Linear
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Sync Settings</CardTitle>
                  <CardDescription>Configure Linear integration behavior</CardDescription>
                </div>
                <Button variant="outline" onClick={handleDisconnect} className="border-red-500/20 text-red-400 hover:bg-red-500/10">
                  Disconnect
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                <div>
                  <div className="text-sm font-medium text-white">Auto-create Issues</div>
                  <div className="text-xs text-slate-400">Create Linear issues for new findings</div>
                </div>
                <Switch checked={autoCreate} onCheckedChange={setAutoCreate} />
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium text-white">Severity → Priority Mapping</div>
                {Object.entries(severityMapping).map(([severity, priority]) => (
                  <div key={severity} className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/50">
                    <div className="w-32">
                      <Badge className={
                        severity === "critical" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                        severity === "high" ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                        severity === "medium" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                        "bg-blue-500/10 text-blue-500 border-blue-500/20"
                      }>
                        {severity.charAt(0).toUpperCase() + severity.slice(1)}
                      </Badge>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                    <Select defaultValue={priority}>
                      <SelectTrigger className="w-48 bg-slate-800 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="urgent">🔴 Urgent</SelectItem>
                        <SelectItem value="high">🟠 High</SelectItem>
                        <SelectItem value="medium">🟡 Medium</SelectItem>
                        <SelectItem value="low">🔵 Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}