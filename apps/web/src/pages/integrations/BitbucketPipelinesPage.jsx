import React from "react";
import { GitBranch, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PIPELINES_YAML = `pipelines:
  pull-requests:
    '**':
      - step:
          name: ShieldAI Security Scan
          image: shieldai/scanner:latest
          script:
            - shieldai scan --token $SHIELDAI_TOKEN --fail-on critical`;

export default function BitbucketPipelinesPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Bitbucket Pipelines</h1>
        <p className="text-slate-400">CI/CD security gate for Bitbucket</p>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <GitBranch className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-white">Bitbucket Pipelines Configuration</CardTitle>
              <CardDescription>Copy-paste pipeline configuration</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 overflow-x-auto">
            <pre className="text-xs text-slate-300 font-mono">
              <code>{PIPELINES_YAML}</code>
            </pre>
          </div>
          <div className="space-y-2 text-sm text-slate-400">
            <div>• OAuth 2.0 connection</div>
            <div>• PR comments with finding summary</div>
            <div>• Bitbucket Code Insights integration</div>
          </div>
          <Button asChild>
            <a href="https://bitbucket.org/account/settings/oauth2/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Connect Bitbucket
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}