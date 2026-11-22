import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, ExternalLink, ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ServiceNowIntegrationPage() {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [instanceUrl, setInstanceUrl] = useState("");

  const handleConnect = async () => {
    try {
      await base44.entities.Integration.create({
        name: "ServiceNow",
        type: "servicenow",
        status: "connected",
        api_endpoint: instanceUrl,
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
        <h1 className="text-2xl font-bold text-white mb-2">ServiceNow Integration</h1>
        <p className="text-slate-400">Bi-directional sync with ITSM workflows</p>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Connection</CardTitle>
              <CardDescription>ServiceNow instance configuration</CardDescription>
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
                <Label className="text-slate-400">Instance URL</Label>
                <Input
                  placeholder="https://your-instance.service-now.com"
                  value={instanceUrl}
                  onChange={(e) => setInstanceUrl(e.target.value)}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">OAuth Client ID</Label>
                <Input placeholder="Enter OAuth client ID" className="bg-slate-800 border-slate-700" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">OAuth Client Secret</Label>
                <Input type="password" placeholder="Enter client secret" className="bg-slate-800 border-slate-700" />
              </div>
              <Button onClick={handleConnect} disabled={!instanceUrl}>
                Connect
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="text-sm text-slate-400 mb-2">Connected to</div>
                <div className="text-white font-semibold">{instanceUrl}</div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-white">Auto-create Incidents</div>
                    <div className="text-xs text-slate-400">Critical findings → ServiceNow Incident table</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-white">Auto-create Change Requests</div>
                    <div className="text-xs text-slate-400">AutoFix PR generation → Change table</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-white">Bi-directional Status Sync</div>
                    <div className="text-xs text-slate-400">ServiceNow incident closed → ShieldAI finding fixed</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-white">CMDB Integration</div>
                    <div className="text-xs text-slate-400">Correlate ShieldAI assets with ServiceNow CIs</div>
                  </div>
                </div>
              </div>

              <Button variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10">
                Disconnect
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}