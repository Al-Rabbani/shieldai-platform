import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { Shield, GitCommit, Bot, CheckCircle, AlertCircle, Play, Settings, Clock, TrendingUp, Zap, Package, Code, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

const GOLD = "#C9A84C";
const SEVERITY_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };

const STAGES = [
  { id: "code_push", label: "Code Push", icon: GitCommit, color: "#3b82f6" },
  { id: "ai_pentest", label: "AI Pentest", icon: Bot, color: "#8b5cf6" },
  { id: "exploitability", label: "Exploitability Validated", icon: AlertCircle, color: "#f97316" },
  { id: "patch_generated", label: "Patch Generated", icon: Code, color: "#eab308" },
  { id: "retest", label: "Retest Passed", icon: CheckCircle, color: "#22c55e" },
  { id: "deployed", label: "Deployed Safe", icon: Shield, color: "#10b981" },
];

export default function InfinitePage() {
  const [activeTab, setActiveTab] = useState("pipeline");
  const queryClient = useQueryClient();

  const { data: repos = [], isLoading: reposLoading } = useQuery({
    queryKey: ["code-repos"],
    queryFn: () => base44.entities.CodeRepository.list(),
  });

  const { data: pentestJobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["pentest-jobs-infinite"],
    queryFn: () => base44.entities.PentestJob.list("-created_date", 50),
  });

  const { data: findings = [] } = useQuery({
    queryKey: ["pentest-findings"],
    queryFn: () => base44.entities.PentestFinding.list(),
  });

  const infiniteJobs = pentestJobs.filter(j => j.triggered_by === "ci_cd" || j.mode === "continuous");

  const stats = {
    activeRuns: infiniteJobs.filter(j => j.status === "queued" || j.status === "discovering" || j.status === "attacking").length,
    vulnsToday: findings.filter(f => {
      const created = new Date(f.created_date);
      const today = new Date();
      return created.toDateString() === today.toDateString();
    }).length,
    autoPatched: infiniteJobs.filter(j => j.status === "completed" && j.report_type === "technical").length,
    humanReviews: infiniteJobs.filter(j => j.escalation_approved === true).length,
  };

  const toggleInfiniteMutation = useMutation({
    mutationFn: async ({ repoId, enabled }) => {
      await base44.entities.CodeRepository.update(repoId, { auto_scan: enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["code-repos"]);
      toast.success("Repository settings updated");
    },
  });

  const getStageForJob = (job) => {
    if (job.status === "queued") return STAGES[0];
    if (job.status === "discovering") return STAGES[1];
    if (job.status === "attacking") return STAGES[2];
    if (job.status === "validating") return STAGES[3];
    if (job.status === "reporting") return STAGES[4];
    if (job.status === "completed") return STAGES[5];
    return STAGES[0];
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#0A0E1A] text-white p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center relative" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
              <span className="text-black font-black text-lg animate-spin" style={{ animationDuration: "3s" }}>∞</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">ShieldAI Infinite</h1>
              <p className="text-sm text-slate-400">Self-securing software — AI agents pentest every release, patch every vulnerability, retest every fix. Automatically.</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-bold text-green-400">Infinite Engine: ACTIVE</span>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <Card className="bg-[#111827] border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">Active Runs</span>
                  <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                </div>
                <div className="text-3xl font-black text-white">{stats.activeRuns}</div>
                <div className="text-xs text-slate-500 mt-1">Currently scanning</div>
              </CardContent>
            </Card>
            <Card className="bg-[#111827] border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">Vulnerabilities Found Today</span>
                  <AlertCircle className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-3xl font-black text-white">{stats.vulnsToday}</div>
                <div className="text-xs text-slate-500 mt-1">Auto-discovered</div>
              </CardContent>
            </Card>
            <Card className="bg-[#111827] border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">Auto-Patched</span>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-3xl font-black text-white">{stats.autoPatched}</div>
                <div className="text-xs text-slate-500 mt-1">Fixed without human touch</div>
              </CardContent>
            </Card>
            <Card className="bg-[#111827] border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">Human Reviews Required</span>
                  <Settings className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-black text-white">{stats.humanReviews}</div>
                <div className="text-xs text-slate-500 mt-1">Escalated for approval</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-slate-700 pb-2">
          <button onClick={() => setActiveTab("pipeline")} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "pipeline" ? "text-white" : "text-slate-400 hover:text-white"}`} style={activeTab === "pipeline" ? { background: `${GOLD}20`, color: GOLD } : {}}>
            Pipeline View
          </button>
          <button onClick={() => setActiveTab("settings")} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "settings" ? "text-white" : "text-slate-400 hover:text-white"}`} style={activeTab === "settings" ? { background: `${GOLD}20`, color: GOLD } : {}}>
            Infinite Settings
          </button>
          <button onClick={() => setActiveTab("results")} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "results" ? "text-white" : "text-slate-400 hover:text-white"}`} style={activeTab === "results" ? { background: `${GOLD}20`, color: GOLD } : {}}>
            Results Feed
          </button>
        </div>

        {/* Pipeline View */}
        {activeTab === "pipeline" && (
          <div className="space-y-6">
            {/* Pipeline Stages */}
            <div className="flex items-center justify-between px-4">
              {STAGES.map((stage, idx) => (
                <React.Fragment key={stage.id}>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: `${stage.color}20`, border: `2px solid ${stage.color}` }}>
                      {React.createElement(stage.icon, { className: "w-8 h-8", style: { color: stage.color } })}
                    </div>
                    <span className="text-xs font-semibold text-slate-300">{stage.label}</span>
                  </div>
                  {idx < STAGES.length - 1 && (
                    <div className="flex-1 h-1 mx-2 rounded" style={{ background: `linear-gradient(90deg, ${stage.color}, ${STAGES[idx + 1].color})` }} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Active Runs */}
            <div className="mt-8">
              <h3 className="text-lg font-bold text-white mb-4">Active Infinite Runs</h3>
              {jobsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-4 rounded-lg bg-slate-800/30 border border-slate-700 animate-pulse">
                      <div className="h-4 w-32 bg-slate-700 rounded mb-2" />
                      <div className="h-3 w-48 bg-slate-700 rounded" />
                    </div>
                  ))}
                </div>
              ) : infiniteJobs.filter(j => j.status !== "completed" && j.status !== "failed").length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <div className="text-white font-medium mb-2">No active runs</div>
                  <div className="text-slate-400 text-sm">New runs will appear here when code is pushed</div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {infiniteJobs.filter(j => j.status !== "completed" && j.status !== "failed").slice(0, 6).map(job => {
                    const currentStage = getStageForJob(job);
                    const StageIcon = currentStage.icon;
                    return (
                      <Card key={job.id} className="bg-[#111827] border-slate-700 animate-pulse">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${currentStage.color}20` }}>
                              <StageIcon className="w-4 h-4" style={{ color: currentStage.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-white truncate">{job.title}</div>
                              <div className="text-xs text-slate-400 truncate">{job.target_app_name || "Unknown repo"}</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">{job.duration_minutes || 0}m elapsed</span>
                            <Badge style={{ background: `${currentStage.color}20`, color: currentStage.color }}>{currentStage.label}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-4">
            {reposLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 rounded-lg bg-slate-800/30 border border-slate-700 animate-pulse">
                    <div className="h-4 w-32 bg-slate-700 rounded mb-2" />
                    <div className="h-3 w-48 bg-slate-700 rounded" />
                  </div>
                ))}
              </div>
            ) : repos.length === 0 ? (
              <div className="text-center py-12">
                <GitCommit className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <div className="text-white font-medium mb-2">No repositories connected</div>
                <div className="text-slate-400 text-sm mb-4">Connect a GitHub or GitLab repository to enable Infinite</div>
                <Button className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black">Connect Repository</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {repos.map(repo => (
                  <Card key={repo.id} className="bg-[#111827] border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}20` }}>
                            <GitCommit className="w-5 h-5" style={{ color: GOLD }} />
                          </div>
                          <div>
                            <div className="font-semibold text-white">{repo.name}</div>
                            <div className="text-xs text-slate-400">{repo.full_name} • {repo.language || "Unknown"}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-xs text-slate-400">Infinite Status</div>
                            <div className={`text-sm font-semibold ${repo.auto_scan ? "text-green-400" : "text-slate-500"}`}>{repo.auto_scan ? "Enabled" : "Disabled"}</div>
                          </div>
                          <Switch checked={repo.auto_scan || false} onCheckedChange={(checked) => toggleInfiniteMutation.mutate({ repoId: repo.id, enabled: checked })} />
                        </div>
                      </div>
                      {repo.auto_scan && (
                        <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs text-slate-400 block mb-1">Trigger</label>
                            <Select defaultValue="commit">
                              <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="commit">On every commit to main</SelectItem>
                                <SelectItem value="pr">On every PR open</SelectItem>
                                <SelectItem value="deploy">On every deploy tag</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 block mb-1">Scope</label>
                            <Select defaultValue="changed">
                              <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="changed">Changed endpoints only (fast)</SelectItem>
                                <SelectItem value="full">Full application (thorough)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 block mb-1">Auto-patch threshold</label>
                            <Select defaultValue="critical">
                              <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="critical">Critical only</SelectItem>
                                <SelectItem value="high">High and above</SelectItem>
                                <SelectItem value="all">All findings</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Results Feed */}
        {activeTab === "results" && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white mb-4">Last 50 Infinite Runs</h3>
            {jobsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 rounded-lg bg-slate-800/30 border border-slate-700 animate-pulse">
                    <div className="h-4 w-32 bg-slate-700 rounded mb-2" />
                    <div className="h-3 w-48 bg-slate-700 rounded" />
                  </div>
                ))}
              </div>
            ) : infiniteJobs.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <div className="text-white font-medium mb-2">No Infinite runs yet</div>
                <div className="text-slate-400 text-sm">Runs will appear here once repositories are configured</div>
              </div>
            ) : (
              <div className="space-y-2">
                {infiniteJobs.slice(0, 50).map(job => (
                  <Card key={job.id} className="bg-[#111827] border-slate-700 hover:border-slate-600 transition-all cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${job.status === "completed" ? "bg-green-500" : job.status === "failed" ? "bg-red-500" : "bg-amber-500 animate-pulse"}`} />
                          <div>
                            <div className="text-sm font-semibold text-white">{job.title}</div>
                            <div className="text-xs text-slate-400">{new Date(job.created_date).toLocaleString()} • {job.duration_minutes || 0}m • {job.vectors_tested || 0} vectors</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-xs text-slate-400">Findings</div>
                            <div className="text-sm font-bold" style={{ color: SEVERITY_COLORS.critical }}>{job.critical_count || 0} critical</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-slate-400">Auto-Patched</div>
                            <div className="text-sm font-bold text-green-400">{job.high_count ? "Yes" : "No"}</div>
                          </div>
                          <Badge style={{ background: job.status === "completed" ? `${SEVERITY_COLORS.safe}20` : `${SEVERITY_COLORS.medium}20`, color: job.status === "completed" ? SEVERITY_COLORS.safe : SEVERITY_COLORS.medium }}>
                            {job.status}
                          </Badge>
                          {job.report_url && (
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}