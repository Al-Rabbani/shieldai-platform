import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Code2, Brain, ShieldAlert, ChevronRight, Loader2, Zap, FileCode, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const severityColors = {
  critical: "bg-red-500/10 text-red-400 border-red-500/30",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  low: "bg-blue-500/10 text-blue-400 border-blue-500/30",
};

export default function AICodeAuditPage() {
  const [isRunning, setIsRunning] = useState(false);
  const qc = useQueryClient();

  const { data: findings = [] } = useQuery({
    queryKey: ["ai-audit-findings"],
    queryFn: () => base44.entities.RealSASTFinding.filter({ rule_id: "AI_AUDIT" }, "-detected_at", 100),
    initialData: [],
  });

  const runAuditMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("https://api.base44.com/api/apps/6a14246111a4fa5e22999619/functions/shieldAISAST", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ai_audit", repo_full_name: "Al-Rabbani/shieldai-platform" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onMutate: () => setIsRunning(true),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["ai-audit-findings"] });
      toast.success(`AI Audit complete: ${(data.findings || []).length} findings`);
    },
    onError: (error) => {
      toast.error(error.message || "Audit failed");
    },
    onSettled: () => setIsRunning(false),
  });

  const handleAutoFix = async (finding) => {
    try {
      await base44.functions.invoke("shieldAutoFix", {
        action: "create_pr",
        repo_full_name: "Al-Rabbani/shieldai-platform",
        finding: {
          title: finding.title,
          severity: finding.severity,
          file_path: finding.file_path,
          type: "sast",
          rule_id: finding.rule_id,
          line_number: finding.line_number,
          cwe_id: finding.cwe_id,
        },
      });
      toast.success("AutoFix PR created");
      qc.invalidateQueries({ queryKey: ["ai-audit-findings"] });
    } catch (error) {
      toast.error(`AutoFix failed: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-6 h-6 text-violet-400" />
              <h1 className="text-2xl font-bold text-white">AI Code Audit</h1>
            </div>
            <p className="text-slate-400 text-sm">
              Pentest-grade reasoning on your codebase — catches logic flaws other scanners miss
            </p>
          </div>
          <Button
            onClick={() => runAuditMutation.mutate()}
            disabled={isRunning}
            className="gap-2"
            style={{ background: "#8b5cf6" }}
          >
            <Brain className={`w-4 h-4 ${isRunning ? "animate-pulse" : ""}`} />
            {isRunning ? "Running AI Audit..." : "Run Code Audit"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card style={{ background: "#0f172a", border: "1px solid #1e3a5f" }}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-8 h-8 text-violet-400" />
                <div>
                  <p className="text-2xl font-black text-white">{findings.length}</p>
                  <p className="text-xs text-slate-400">AI Findings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card style={{ background: "#0f172a", border: "1px solid #1e3a5f" }}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-400" />
                <div>
                  <p className="text-2xl font-black text-white">
                    {findings.filter(f => f.severity === "critical").length}
                  </p>
                  <p className="text-xs text-slate-400">Critical</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card style={{ background: "#0f172a", border: "1px solid #1e3a5f" }}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Zap className="w-8 h-8 text-emerald-400" />
                <div>
                  <p className="text-2xl font-black text-white">
                    {findings.filter(f => f.autofix_available).length}
                  </p>
                  <p className="text-xs text-slate-400">AutoFixable</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card style={{ background: "#0f172a", border: "1px solid #1e3a5f" }}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileCode className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-black text-white">
                    {new Set(findings.map(f => f.file_path)).size}
                  </p>
                  <p className="text-xs text-slate-400">Files Affected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Findings List */}
        <Card style={{ background: "#0f172a", border: "1px solid #1e3a5f" }}>
          <CardHeader>
            <CardTitle className="text-white text-base">Audit Findings</CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              AI-detected vulnerabilities with context-aware analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {findings.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Code2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold text-slate-400 mb-2">
                  Connect a repo to run your first AI Code Audit
                </p>
                <p className="text-xs text-slate-600">
                  AI-powered scanning detects logic flaws, business logic vulnerabilities, and complex attack chains
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {findings.map((finding) => (
                  <div
                    key={finding.id}
                    className="p-4 rounded-lg bg-[#0a0f1e] border border-slate-700 hover:border-violet-500/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={severityColors[finding.severity]}>
                            {finding.severity.toUpperCase()}
                          </Badge>
                          {finding.cwe_id && (
                            <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/30 text-xs">
                              {finding.cwe_id}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-white mb-1">{finding.title}</p>
                        <p className="text-xs text-slate-500 mb-2">{finding.description}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                          <FileCode className="w-3 h-3" />
                          {finding.file_path}
                          {finding.line_number && <span>· Line {finding.line_number}</span>}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {finding.autofix_available ? (
                          <Button
                            onClick={() => handleAutoFix(finding)}
                            size="sm"
                            className="gap-1 text-xs"
                            style={{ background: "#10b981" }}
                          >
                            <Zap className="w-3 h-3" />
                            AutoFix
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs text-slate-400 border-slate-600"
                          >
                            View Details
                            <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}