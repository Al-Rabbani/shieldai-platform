import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, GitBranch } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function BitbucketIntegrationPage() {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  const handleConnect = async () => {
    try {
      await base44.entities.Integration.create({
        name: "Bitbucket",
        type: "bitbucket",
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Bitbucket Integration</h1>
          <p className="text-slate-400">PR comments and Pipelines integration</p>
        </div>
        <Badge className={connectionStatus === "connected" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-slate-800 text-slate-400"}>
          {connectionStatus === "connected" ? <><CheckCircle className="w-3 h-3 mr-1" /> Connected</> : "Disconnected"}
        </Badge>
      </div>

      {connectionStatus === "disconnected" ? (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-white">Connect Bitbucket</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={handleConnect}>Connect with Bitbucket</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-white">Integration Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-400">
            <div>• OAuth 2.0 connection</div>
            <div>• Bitbucket Pipelines integration</div>
            <div>• PR comments with finding summary</div>
            <div>• Bitbucket Code Insights integration</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}