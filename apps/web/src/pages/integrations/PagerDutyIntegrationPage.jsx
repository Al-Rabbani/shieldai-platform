import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PagerDutyIntegrationPage() {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [integrationKey, setIntegrationKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadIntegrationStatus();
  }, []);

  const loadIntegrationStatus = async () => {
    try {
      const integrations = await base44.entities.Integration.filter({ type: "pagerduty" });
      if (integrations && integrations.length > 0 && integrations[0].status === "connected") {
        setConnectionStatus("connected");
        setIntegrationKey("••••••••••••••••");
      }
    } catch (error) {
      console.error("Failed to load PagerDuty integration:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const existing = await base44.entities.Integration.filter({ type: "pagerduty" });
      if (existing.length > 0) {
        await base44.entities.Integration.update(existing[0].id, {
          api_key: integrationKey,
          status: "connected",
          connected_at: new Date().toISOString(),
        });
      } else {
        await base44.entities.Integration.create({
          type: "pagerduty",
          name: "PagerDuty",
          api_key: integrationKey,
          status: "connected",
          connected_at: new Date().toISOString(),
        });
      }
      setConnectionStatus("connected");
      setIntegrationKey("••••••••••••••••");
    } catch (error) {
      console.error("Failed to save:", error);
    }
  };

  const handleDisconnect = async () => {
    try {
      const integrations = await base44.entities.Integration.filter({ type: "pagerduty" });
      if (integrations.length > 0) {
        await base44.entities.Integration.delete(integrations[0].id);
      }
      setConnectionStatus("disconnected");
      setIntegrationKey("");
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
          <h1 className="text-2xl font-bold text-white mb-2">PagerDuty Integration</h1>
          <p className="text-slate-400">Escalation for critical security incidents</p>
        </div>
        <Badge className={connectionStatus === "connected" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-slate-800 text-slate-400"}>
          {connectionStatus === "connected" ? <><CheckCircle className="w-3 h-3 mr-1" /> Connected</> : <><XCircle className="w-3 h-3 mr-1" /> Disconnected</>}
        </Badge>
      </div>

      {connectionStatus === "disconnected" ? (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-white">Integration Key</CardTitle>
            <CardDescription>Enter your PagerDuty Events API v2 integration key</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-slate-400">Integration Key</Label>
              <Input
                type="password"
                value={integrationKey}
                onChange={(e) => setIntegrationKey(e.target.value)}
                placeholder="Enter integration key"
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <Button onClick={handleSave} disabled={!integrationKey.trim()}>
              Save & Connect
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Escalation Rules</CardTitle>
                  <CardDescription>Configure when to trigger PagerDuty incidents</CardDescription>
                </div>
                <Button variant="outline" onClick={handleDisconnect} className="border-red-500/20 text-red-400 hover:bg-red-500/10">
                  Disconnect
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/50">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">Critical findings on internet-facing assets</div>
                  <div className="text-xs text-slate-400">Automatically trigger P1 incident</div>
                </div>
                <Select defaultValue="p1">
                  <SelectTrigger className="w-32 bg-slate-800 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="p1">P1 - Critical</SelectItem>
                    <SelectItem value="p2">P2 - High</SelectItem>
                    <SelectItem value="p3">P3 - Medium</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="text-sm text-slate-400 mb-2">Severity Mapping</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Critical</span> <span className="text-red-400">→ P1</span></div>
                  <div className="flex justify-between"><span>High</span> <span className="text-orange-400">→ P2</span></div>
                  <div className="flex justify-between"><span>Medium</span> <span className="text-yellow-400">→ P3</span></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}