import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OpsGenieIntegrationPage() {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [apiKey, setApiKey] = useState("");

  const handleConnect = async () => {
    try {
      await base44.entities.Integration.create({
        name: "OpsGenie",
        type: "opsgenie",
        status: "connected",
        api_key: apiKey,
        connected_at: new Date().toISOString(),
      });
      setConnectionStatus("connected");
    } catch (error) {
      console.error("Failed to connect:", error);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">OpsGenie Integration</h1>
        <p className="text-slate-400">Escalation for critical security incidents</p>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">OpsGenie API Key</CardTitle>
              <CardDescription>Enter your OpsGenie API key</CardDescription>
            </div>
            {connectionStatus === "connected" && (
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                <CheckCircle className="w-3 h-3 mr-1" /> Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {connectionStatus === "disconnected" ? (
            <>
              <div className="space-y-2">
                <Label className="text-slate-400">API Key</Label>
                <Input
                  type="password"
                  placeholder="Enter OpsGenie API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <Button onClick={handleConnect} disabled={!apiKey}>Connect</Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="text-sm font-semibold text-white mb-2">Escalation Rules</div>
                <ul className="text-xs text-slate-400 space-y-1">
                  <li>• Critical findings → P1 alert</li>
                  <li>• High findings → P2 alert</li>
                  <li>• Medium findings → P3 alert</li>
                  <li>• On-call schedule respected (no P1 10pm-7am)</li>
                </ul>
              </div>
              <Button variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10">Disconnect</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}