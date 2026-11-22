import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Code, Search, CheckCircle2, AlertTriangle, Zap, FileCode, Loader2, ExternalLink, GitPullRequest, Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

function ConfidenceBadge({ confidence }) {
  if (!confidence) return null;
  const conf = confidence.toLowerCase();
  const styles = {
    high: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    low: "bg-slate-500/10 text-slate-400 border-slate-500/30"
  };
  return (
    <Badge className={`text-[10px] font-bold ${styles[conf] || styles.low}`}>
      {conf === "high" ? "✅ HIGH CONFIDENCE" : conf === "medium" ? "⚠️ MEDIUM" : "❓ LOW"}
    </Badge>
  );
}

function SeverityBadge({ severity }) {
  const styles = {
    critical: "bg-red-500/10 text-red-400 border-red-500/30",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    low: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    info: "bg-slate-500/10 text-slate-400 border-slate-500/30"
  };
  return (
    <Badge className={`text-[10px] font-bold ${styles[severity] || styles.info}`}>
      {severity.toUpperCase()}
    </Badge>
  );
}

export default function AISASTPage() {
  const [selectedRepo, setSelectedRepo] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [expandedFinding, setExpandedFinding] = useState(null);

  const qc = useQueryClient();

  const { data: repos = [] } = useQuery({
    queryKey: ["code-repos"],
    queryFn: () => base44.entities.CodeRepository.list().catch(() => []),
    initialData: [],
  });

  const { data: findings = [] } = useQuery({
    queryKey: ["ai-sast-findings"],
    queryFn: () => base44.entities.SASTFinding.filter({ source_scanner: "ai" }).catch(() => []),
    initialData: [],
  });

  const runAISAST = async () => {
    if (!selectedRepo) return;
    setIsScanning(true);
    try {
      const res = await fetch('/api/functions/shieldAISAST', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_full_name: selectedRepo,
          ai_review: true,
          max_files: 25
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setScanResult(data);
      toast.success(`AI SAST complete: ${data.total_findings} findings (${data.false_positives_removed} false positives removed)`);
      qc.invalidateQueries({ queryKey: ["ai-sast-findings"] });
    } catch (error) {
      toast.error(`Scan failed: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const openAutoFixPR = async (finding) => {
    try {
      const res = await fetch('/api/functions/shieldAutoFix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "create_pr",
          finding_id: finding.id,
          repo_full_name: selectedRepo
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`AutoFix PR created: ${data.pr_url}`);
      window.open(data.pr_url, '_blank');
    } catch (error) {
      toast.error(`Failed to create PR: ${error.message}`);
    }
  };

  const fpReduction = scanResult?.false_positive_reduction_pct || 0;
  const aiEngine = scanResult?.ai_engine || "gpt-4o-mini";

  return (
    <div className="min-h-screen bg-[#030712] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">AI SAST Scanner</h1>
            <p className="text-slate-400 mt-2">GPT-4o-mini AI code review · False positive reduction · Auto-fix PRs</p>
          </div>
        </div>

        {/* Scanner Controls */}
        <Card style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Code className="w-5 h-5 text-blue-400" />
              Scan Repository
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3 items-center">
            <Select value={selectedRepo} onValueChange={setSelectedRepo}>
              <SelectTrigger className="w-full max-w-md bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Select a repository" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {repos.map(repo => (
                  <SelectItem key={repo.id} value={repo.full_name}>
                    {repo.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={runAISAST} disabled={!selectedRepo || isScanning}
              className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 font-semibold gap-2">
              {isScanning ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</> : <><Search className="w-4 h-4" /> Scan</>}
            </Button>
          </CardContent>
        </Card>

        {/* Scan Results */}
        {scanResult && (
          <>
            {/* Hero Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card style={{ background: "#0a0f1e", border: "1px solid rgba(139,92,246,0.3)" }}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-semibold">AI-Confirmed Findings</p>
                      <p className="text-3xl font-black text-white mt-1">{scanResult.total_findings || 0}</p>
                    </div>
                    <Zap className="w-8 h-8 text-purple-400" />
                  </div>
                </CardContent>
              </Card>
              <Card style={{ background: "#0a0f1e", border: "1px solid rgba(16,185,129,0.3)" }}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-semibold">False Positives Removed</p>
                      <p className="text-3xl font-black text-emerald-400 mt-1">{scanResult.false_positives_removed || 0}</p>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                </CardContent>
              </Card>
              <Card style={{ background: "#0a0f1e", border: "1px solid rgba(139,92,246,0.3)" }}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-semibold">Noise Reduction</p>
                      <p className="text-3xl font-black text-purple-400 mt-1">{fpReduction}%</p>
                    </div>
                    <div className="text-[10px] text-purple-400 font-mono">⚡ {aiEngine}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Findings Table */}
            <Card style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
              <CardHeader>
                <CardTitle className="text-white text-base">AI-Reviewed Findings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {findings.slice(0, 20).map((finding) => (
                    <div key={finding.id} className="border border-slate-700 rounded-lg overflow-hidden">
                      <div className="p-3 bg-slate-800/50 flex items-center gap-3">
                        <SeverityBadge severity={finding.severity} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{finding.title}</p>
                          <p className="text-xs text-slate-500 font-mono">{finding.file_path}:{finding.line_number}</p>
                        </div>
                        <ConfidenceBadge confidence={finding.ai_confidence} />
                        {finding.autofix_available && (
                          <Button size="sm" onClick={() => openAutoFixPR(finding)}
                            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs gap-1">
                            <GitPullRequest className="w-3 h-3" /> AutoFix
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => setExpandedFinding(expandedFinding === finding.id ? null : finding.id)}
                          className="border-slate-600 text-slate-300 text-xs">
                          {expandedFinding === finding.id ? "Collapse" : "Details"}
                        </Button>
                      </div>
                      {expandedFinding === finding.id && (
                        <div className="p-4 bg-slate-900 space-y-3">
                          {finding.snippet && (
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Code Snippet:</p>
                              <pre className="p-3 rounded bg-black/50 text-xs text-slate-300 font-mono overflow-x-auto">
                                <code>{finding.snippet}</code>
                              </pre>
                            </div>
                          )}
                          {finding.ai_explanation && (
                            <div>
                              <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                                <Zap className="w-3 h-3 text-purple-400" /> AI Analysis:
                              </p>
                              <p className="text-sm text-slate-300">{finding.ai_explanation}</p>
                            </div>
                          )}
                          {finding.ai_fix && (
                            <div>
                              <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> AI Suggested Fix:
                              </p>
                              <pre className="p-3 rounded bg-emerald-950/30 text-xs text-emerald-300 font-mono overflow-x-auto">
                                <code>{finding.ai_fix}</code>
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}