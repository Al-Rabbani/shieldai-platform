import React from "react";
import { ExternalLink, GitBranch } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function GitLabCICDPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">GitLab CI/CD</h1>
        <p className="text-slate-400">Native GitLab Security Dashboard integration</p>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <GitBranch className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-white">Security Dashboard Integration</CardTitle>
              <CardDescription>Native GitLab SAST report format</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm text-slate-400">
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="text-white font-medium mb-1">Output Format</div>
              <div>GitLab's native SAST report JSON format</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="text-white font-medium mb-1">Security Dashboard</div>
              <div>Findings automatically appear in GitLab's Security Dashboard</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="text-white font-medium mb-1">MR Security Widget</div>
              <div>Finding count displayed inline on merge requests</div>
            </div>
          </div>
          <Button asChild>
            <a href="https://docs.gitlab.com/ee/user/application_security/sast/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              GitLab SAST Docs
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}