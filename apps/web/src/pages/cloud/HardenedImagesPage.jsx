import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, AlertTriangle, CheckCircle2, ArrowRight, Copy, Terminal, Package, TrendingDown, Lock, ExternalLink, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const PROVIDER_COLORS = {
  "Google Distroless": "bg-blue-500/10 text-blue-400 border-blue-500/30",
  "Chainguard": "bg-purple-500/10 text-purple-400 border-purple-500/30",
  "endoflife.date": "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
};

function BenefitBadge({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
      <Icon className="w-3 h-3 text-emerald-400" />
      <span className="text-[10px] font-semibold text-emerald-400">{value} {label}</span>
    </div>
  );
}

export default function HardenedImagesPage() {
  const [imageInput, setImageInput] = useState("");
  const [dockerfileInput, setDockerfileInput] = useState("");
  const [result, setResult] = useState(null);
  const [migrateResult, setMigrateResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkImage = async () => {
    if (!imageInput.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/functions/shieldHardenedImages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recommend', image: imageInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.results?.[0]);
    } catch (error) {
      toast.error(`Analysis failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const scanDockerfile = async () => {
    if (!dockerfileInput.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/functions/shieldHardenedImages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'migrate', dockerfile_content: dockerfileInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMigrateResult(data);
    } catch (error) {
      toast.error(`Scan failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text, label) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <div className="min-h-screen bg-[#030712] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Hardened Images</h1>
            <p className="text-slate-400 mt-2">Container image security analysis & migration to distroless</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span>Powered by:</span>
            {Object.keys(PROVIDER_COLORS).map(provider => (
              <Badge key={provider} variant="outline" className={`text-[10px] ${PROVIDER_COLORS[provider]}`}>
                {provider}
              </Badge>
            ))}
          </div>
        </div>

        <Tabs defaultValue="check" className="w-full">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="check" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
              <Package className="w-4 h-4 mr-2" /> Check Image
            </TabsTrigger>
            <TabsTrigger value="scan" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
              <Terminal className="w-4 h-4 mr-2" /> Scan Dockerfile
            </TabsTrigger>
          </TabsList>

          {/* Check Single Image */}
          <TabsContent value="check" className="mt-6 space-y-6">
            <Card style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Input
                    value={imageInput}
                    onChange={e => setImageInput(e.target.value)}
                    placeholder="node:18-alpine"
                    className="bg-slate-800 border-slate-700 text-white font-mono"
                    onKeyDown={e => e.key === 'Enter' && checkImage()}
                  />
                  <Button onClick={checkImage} disabled={!imageInput.trim() || isLoading}
                    className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 font-semibold gap-2">
                    <Shield className="w-4 h-4" /> {isLoading ? "Analyzing..." : "Analyze"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {result && (
              <Card style={{ background: "#0a0f1e", border: result.status === "already_hardened" ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(239,68,68,0.3)" }}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-white font-mono text-lg">{result.image_name}</CardTitle>
                      <CardDescription className="text-slate-400 mt-1">
                        Risk Score: <span className={`font-bold ${result.risk_score >= 70 ? "text-red-400" : result.risk_score >= 40 ? "text-amber-400" : "text-emerald-400"}`}>{result.risk_score}/100</span>
                      </CardDescription>
                    </div>
                    <Badge className={`text-sm font-bold ${result.status === "already_hardened" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-red-500/10 text-red-400 border-red-500/30"}`}>
                      {result.status === "already_hardened" ? "✅ Already Hardened" : "🔴 VULNERABLE"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.eol_warning && (
                    <div className="rounded-lg p-3 bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-400">⚠️ EOL Warning</p>
                        <p className="text-xs text-slate-400 mt-1">{result.eol_warning}</p>
                      </div>
                    </div>
                  )}

                  {result.top_recommendation && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-300">Recommended Migration:</p>
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> HARDENED
                        </Badge>
                      </div>
                      <div className="rounded-lg p-4 bg-slate-800/50 border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <code className="text-sm text-emerald-400 font-mono">{result.top_recommendation}</code>
                          <Button size="sm" variant="ghost" onClick={() => copyToClipboard(result.top_recommendation, "Image name")}
                            className="text-slate-400 hover:text-white">
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {result.benefits?.size_reduction && <BenefitBadge icon={TrendingDown} label="smaller" value={result.benefits.size_reduction} />}
                          {result.benefits?.cve_reduction && <BenefitBadge icon={Shield} label="fewer CVEs" value={result.benefits.cve_reduction} />}
                          {result.benefits?.nonroot && <BenefitBadge icon={Lock} label="nonroot" value="" />}
                        </div>
                      </div>
                    </div>
                  )}

                  {result.dockerfile_example && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-300">Migration Dockerfile:</p>
                        <Button size="sm" variant="ghost" onClick={() => copyToClipboard(result.dockerfile_example, "Dockerfile")}
                          className="text-slate-400 hover:text-white">
                          <Copy className="w-3 h-3" /> Copy
                        </Button>
                      </div>
                      <pre className="bg-slate-900 rounded-lg p-4 overflow-x-auto text-xs text-slate-300 font-mono border border-slate-700">
                        {result.dockerfile_example}
                      </pre>
                    </div>
                  )}

                  {result.hardened_alternatives && result.hardened_alternatives.length > 1 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-300">All Alternatives:</p>
                      <div className="grid gap-2">
                        {result.hardened_alternatives.map((alt, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                            <code className="text-xs text-slate-300 font-mono">{alt}</code>
                            <Badge variant="outline" className="text-[10px]">
                              {alt.includes("distroless") ? "Google" : "Chainguard"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Scan Dockerfile */}
          <TabsContent value="scan" className="mt-6 space-y-6">
            <Card style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
              <CardContent className="pt-6">
                <Label className="text-slate-300 mb-2 block">Paste your Dockerfile:</Label>
                <textarea
                  value={dockerfileInput}
                  onChange={e => setDockerfileInput(e.target.value)}
                  placeholder="FROM node:18-alpine&#10;WORKDIR /app&#10;COPY . .&#10;CMD [&quot;node&quot;, &quot;index.js&quot;]"
                  className="w-full h-48 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white font-mono text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <div className="flex justify-end mt-3">
                  <Button onClick={scanDockerfile} disabled={!dockerfileInput.trim() || isLoading}
                    className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 font-semibold gap-2">
                    <Terminal className="w-4 h-4" /> {isLoading ? "Scanning..." : "Scan Dockerfile"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {migrateResult && (
              <Card style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-400" />
                    Migration Analysis
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    {migrateResult.needs_hardening ? "Vulnerable images found — migration recommended" : "✅ All images are already hardened"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {migrateResult.needs_hardening && migrateResult.recommendations?.length > 0 && (
                    <div className="space-y-4">
                      {migrateResult.recommendations.map((rec, i) => (
                        <div key={i} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                              <code className="text-sm text-red-400 font-mono">{rec.current_image}</code>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-500" />
                            <code className="text-sm text-emerald-400 font-mono">{rec.recommended_image}</code>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {rec.benefits?.size_reduction && <BenefitBadge icon={TrendingDown} label="smaller" value={rec.benefits.size_reduction} />}
                            {rec.benefits?.cve_reduction && <BenefitBadge icon={Shield} label="fewer CVEs" value={rec.benefits.cve_reduction} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}