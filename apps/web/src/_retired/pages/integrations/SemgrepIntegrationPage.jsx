import React from "react";
import { Code, ExternalLink, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SUPPORTED_LANGUAGES = [
  "TypeScript", "JavaScript", "Python", "Java", "Go", "Ruby", "PHP",
  "C/C++", "Rust", "Scala", "Kotlin", "Swift", "HTML", "JSON", "YAML",
  "Bash", "PowerShell", "Terraform", "Dockerfile", "Kubernetes",
];

export default function SemgrepIntegrationPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Semgrep Integration</h1>
        <p className="text-slate-400">Powered by Semgrep OSS — industry's most trusted SAST engine</p>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Code className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-white">Semgrep Engine</CardTitle>
              <CardDescription>Static analysis powered by Semgrep</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-400 text-sm">
            ShieldAI SAST is powered by <strong>Semgrep OSS</strong> — the industry's most trusted open-source
            static application security testing engine. Semgrep is fast, accurate, and supports 30+ languages.
          </p>

          <div className="flex flex-wrap gap-2">
            {SUPPORTED_LANGUAGES.slice(0, 10).map(lang => (
              <Badge key={lang} variant="outline" className="border-slate-700 text-slate-300">
                {lang}
              </Badge>
            ))}
            <Badge variant="outline" className="border-slate-700 text-slate-300">
              +{SUPPORTED_LANGUAGES.length - 10} more
            </Badge>
          </div>

          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="text-sm font-semibold text-white mb-2">Enabled Rule Packs</div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                <CheckCircle className="w-3 h-3 mr-1" /> OWASP Top 10
              </Badge>
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                <CheckCircle className="w-3 h-3 mr-1" /> CWE Top 25
              </Badge>
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                <CheckCircle className="w-3 h-3 mr-1" /> Secrets Detection
              </Badge>
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                <CheckCircle className="w-3 h-3 mr-1" /> Security Audit
              </Badge>
            </div>
          </div>

          <Button asChild>
            <a href="https://semgrep.dev/r" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Browse Semgrep Registry (3,000+ rules)
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Custom Semgrep Rules</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-400">
          Upload your own <code className="bg-slate-800 px-1 rounded">.yaml</code> rule files to extend ShieldAI's
          detection capabilities with organization-specific security patterns.
        </CardContent>
      </Card>
    </div>
  );
}