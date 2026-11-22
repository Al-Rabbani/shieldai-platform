import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function TeamsIntegrationPage() {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  const handleConnect = async () => {
    try {
      await base44.entities.Integration.create({
        name: "Microsoft Teams",
        type: "teams",
        status: "connected",
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
        <h1 className="text-2xl font-bold text-white mb-2">Microsoft Teams</h1>
        <p className="text-slate-400">Adaptive Cards for security notifications</p>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Teams Connection</CardTitle>
              <CardDescription>Webhook or OAuth setup</CardDescription>
            </div>
            {connectionStatus === "connected" && (
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                <CheckCircle className="w-3 h-3 mr-1" /> Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {connectionStatus === "disconnected" ? (
            <Button onClick={handleConnect}>Connect Teams</Button>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="text-sm text-slate-400 mb-2">Adaptive Cards Format</div>
                <div className="text-xs text-slate-300 space-y-1">
                  <div>• Severity color bar (red/orange/yellow)</div>
                  <div>• Structured finding details</div>
                  <div>• Action buttons: View | Assign | AutoFix</div>
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