import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, GitBranch, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function GitLabIntegrationPage() {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  const handleConnect = async () => {
    try {
      await base44.entities.Integration.create({
        name: "GitLab",
        type: "gitlab",
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
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <GitBranch className="w-6 h-6 text-orange-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">GitLab Integration</h1>
          </div>
          <p className="text-slate-400">MR security comments, pipeline integration, and GitLab Issues</p>
        </div>
        <Badge className={connectionStatus === "connected" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-slate-800 text-slate-400"}>
          {connectionStatus === "connected" ? <><CheckCircle className="w-3 h-3 mr-1" /> Connected</> : <><CheckCircle className="w-3 h-3 mr-1" /> Disconnected</>}
        </Badge>
      </div>

      {connectionStatus === "disconnected" ? (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-white">Connect GitLab</CardTitle>
            <CardDescription>OAuth connect to your GitLab workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleConnect}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Connect with GitLab
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-white">Integration Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-400">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5" />
              <div>MR security comments with finding summaries</div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5" />
              <div>Pipeline integration via .gitlab-ci.yml</div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5" />
              <div>GitLab Issues creation for critical findings</div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5" />
              <div>Support for GitLab.com + Self-Hosted</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}