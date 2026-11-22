import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Copy, CheckCircle2, XCircle, Shield } from "lucide-react";
import { toast } from "sonner";

export default function CICDGatePage() {
  const yamlSnippet = `name: ShieldAI Security Gate
on: [push, pull_request]
jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: ShieldAI Security Scan
        run: |
          curl -X POST https://primeendorsement.com/api/functions/shieldCICDGate \\
            -H "Content-Type: application/json" \\
            -d '{
              "repo_full_name": "\${{ github.repository }}",
              "github_token": "\${{ secrets.GITHUB_TOKEN }}",
              "commit_sha": "\${{ github.sha }}",
              "branch": "\${{ github.ref_name }}",
              "block_on": ["critical"]
            }'`;

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(yamlSnippet);
    toast.success("YAML snippet copied");
  };

  return (
    <div className="min-h-screen bg-[#030712] p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-400" />
              CI/CD Security Gate
            </h1>
            <p className="text-slate-400 mt-2">Block merges on critical security findings</p>
          </div>
        </div>

        {/* Status Badge */}
        <Card className="bg-[#0a0f1e] border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Last Gate Status</p>
                <p className="text-lg font-semibold text-white">No recent scans</p>
              </div>
              <Badge variant="outline" className="text-slate-400 border-slate-600">
                Waiting for first scan
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Setup Instructions */}
        <Card className="bg-[#0a0f1e] border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-blue-400" />
              Setup Instructions
            </CardTitle>
            <CardDescription className="text-slate-400">
              Add this GitHub Actions workflow to your repository
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300">
                <li>Add <code className="bg-slate-900 px-2 py-0.5 rounded text-blue-400 font-mono">GITHUB_TOKEN</code> to your repository secrets</li>
                <li>Create <code className="bg-slate-900 px-2 py-0.5 rounded text-blue-400 font-mono">.github/workflows/shieldai.yml</code></li>
                <li>Paste the YAML snippet below</li>
                <li>Push to trigger your first security scan</li>
              </ol>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-400">GitHub Actions Workflow</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyToClipboard}
                  className="text-slate-400 hover:text-white"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <pre className="bg-slate-900 rounded-lg p-4 text-xs text-slate-300 font-mono overflow-x-auto border border-slate-700 max-h-96 overflow-y-auto">
                {yamlSnippet}
              </pre>
            </div>

            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-400">What this does:</p>
                  <ul className="text-xs text-slate-300 space-y-1 mt-2">
                    <li>• Runs on every push and pull request</li>
                    <li>• Scans for SAST, SCA, and secrets</li>
                    <li>• Blocks merge if critical findings detected</li>
                    <li>• Posts findings as PR comments</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Block Configuration */}
        <Card className="bg-[#0a0f1e] border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Blocking Rules</CardTitle>
            <CardDescription className="text-slate-400">
              Configure which findings should block your CI/CD pipeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {[
                { severity: 'Critical', color: '#ef4444', default: true },
                { severity: 'High', color: '#f97316', default: false },
                { severity: 'Medium', color: '#eab308', default: false },
              ].map(rule => (
                <div
                  key={rule.severity}
                  className="p-4 rounded-lg border cursor-pointer transition-all"
                  style={{
                    background: rule.default ? `${rule.color}15` : '#1e293b',
                    borderColor: rule.default ? rule.color : '#334155'
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white">{rule.severity}</span>
                    {rule.default ? (
                      <CheckCircle2 className="w-5 h-5" style={{ color: rule.color }} />
                    ) : (
                      <XCircle className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    {rule.default ? 'Will block pipeline' : 'Won\'t block pipeline'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}