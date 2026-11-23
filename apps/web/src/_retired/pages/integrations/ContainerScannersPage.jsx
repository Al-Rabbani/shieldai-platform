import React from "react";
import { Shield, ExternalLink, CheckCircle, Database } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ContainerScannersPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Container Scanning</h1>
        <p className="text-slate-400">Powered by Trivy — industry standard container vulnerability scanner</p>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Shield className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-white">Trivy Integration</CardTitle>
              <CardDescription>Aqua Security's open-source scanner</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-400 text-sm">
            ShieldAI container scanning uses <strong>Trivy</strong> — the industry's most trusted open-source container vulnerability scanner.
            Trivy is comprehensive, fast, and actively maintained by Aqua Security.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="text-sm font-semibold text-white mb-2">Supported Formats</div>
              <ul className="space-y-1 text-sm text-slate-400">
                <li>• Docker images</li>
                <li>• OCI images</li>
                <li>• Helm charts</li>
                <li>• Filesystem scans</li>
                <li>• Git repositories</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="text-sm font-semibold text-white mb-2">Vulnerability Sources</div>
              <ul className="space-y-1 text-sm text-slate-400">
                <li>• NVD</li>
                <li>• GitHub Advisory</li>
                <li>• OSV.dev</li>
                <li>• RedHat advisories</li>
                <li>• Ubuntu/Alpine/Wolfi</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3">
            <Button asChild>
              <a href="https://github.com/aquasecurity/trivy" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Trivy GitHub
              </a>
            </Button>
            <Button variant="outline">
              Scan Public Image (Free)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Private Registry Support</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {["Docker Hub", "Amazon ECR", "Google GCR", "Azure ACR", "Harbor", "GitLab Registry"].map(registry => (
              <Badge key={registry} variant="outline" className="border-slate-700 text-slate-300">
                {registry}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}