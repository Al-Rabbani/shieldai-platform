import React from "react";
import { Github, CheckCircle, ExternalLink, Code } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function GitHubActionsPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">GitHub Actions Integration</h1>
        <p className="text-slate-400">CI/CD security gate with SARIF export</p>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-700">
              <Github className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-white">ShieldAI Security Action</CardTitle>
              <CardDescription>GitHub Actions workflow integration</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 overflow-x-auto">
            <pre className="text-xs text-slate-300 font-mono">
{`name: ShieldAI Security Gate

on:
  pull_request:
    branches: [main, develop]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: ShieldAI Security Scan
        uses: shieldai/security-action@v2
        with:
          api-token: \${{ secrets.SHIELDAI_TOKEN }}
          fail-on-severity: critical
          scanners: sast,sca,secrets
          
      - name: Upload SARIF results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: shieldai-results.sarif`}
            </pre>
          </div>

          <div className="flex gap-3">
            <Button asChild>
              <a href="https://github.com/marketplace/shieldai-security" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                View on Marketplace
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Configuration Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-slate-800/50">
              <div className="text-sm font-semibold text-white mb-1">fail-on-severity</div>
              <div className="text-xs text-slate-400">critical | high | medium | none</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/50">
              <div className="text-sm font-semibold text-white mb-1">scanners</div>
              <div className="text-xs text-slate-400">Comma-separated: sast,sca,secrets</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/50">
              <div className="text-sm font-semibold text-white mb-1">exclude-paths</div>
              <div className="text-xs text-slate-400">Glob patterns to exclude</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/50">
              <div className="text-sm font-semibold text-white mb-1">timeout</div>
              <div className="text-xs text-slate-400">Scan timeout in minutes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-primary" />
            <CardTitle className="text-white">SARIF Output</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-slate-400">
          ShieldAI scan results are exported in SARIF format and displayed natively in GitHub's Security tab,
          providing seamless integration with GitHub's code scanning alerts.
        </CardContent>
      </Card>
    </div>
  );
}