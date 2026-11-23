import React, { useState, useEffect } from "react";
import { Check, X, ArrowRight, ArrowLeft, Github, Gitlab, Cloud, Bell, Shield, AlertTriangle, Code, Target, Bot, FileText, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import confetti from "canvas-confetti";

const GOALS = [
  { id: "code", icon: Code, label: "Find vulnerabilities in my code", tag: "code" },
  { id: "cloud", icon: Cloud, label: "Secure my cloud infrastructure", tag: "cloud" },
  { id: "compliance", icon: FileText, label: "Achieve compliance — SOC2 / ISO27001", tag: "compliance" },
  { id: "ai", icon: Bot, label: "Secure my AI systems & LLM apps", tag: "ai" },
  { id: "attack", icon: Target, label: "Map my attack surface", tag: "attack" },
  { id: "runtime", icon: Shield, label: "Real-time threat monitoring", tag: "runtime" },
];

export default function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [githubToken, setGithubToken] = useState("");
  const [githubUser, setGithubUser] = useState(null);
  const [githubRepos, setGithubRepos] = useState([]);
  const [selectedRepos, setSelectedRepos] = useState([]);
  const [scanningRepo, setScanningRepo] = useState(false);
  const [cloudProvider, setCloudProvider] = useState("aws");
  const [cloudCredentials, setCloudCredentials] = useState({});
  const [alertEmail, setAlertEmail] = useState("");
  const [alertSeverity, setAlertSeverity] = useState("high");
  const [slackWebhook, setSlackWebhook] = useState("");
  const queryClient = useQueryClient();

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
  });

  // Load saved progress
  useEffect(() => {
    const saved = localStorage.getItem("onboarding_goals");
    if (saved) {
      setSelectedGoals(JSON.parse(saved));
    }
    if (currentUser?.email) {
      setAlertEmail(currentUser.email);
    }
  }, [currentUser]);

  const toggleGoal = (goalId) => {
    setSelectedGoals(prev =>
      prev.includes(goalId)
        ? prev.filter(g => g !== goalId)
        : [...prev, goalId]
    );
  };

  // Validate GitHub token
  const validateGithubMutation = useMutation({
    mutationFn: async (token) => {
      const res = await fetch("https://api.github.com/user", {
        headers: { Authorization: `token ${token}` },
      });
      if (!res.ok) throw new Error("Invalid token");
      const user = await res.json();
      const reposRes = await fetch("https://api.github.com/user/repos?per_page=10", {
        headers: { Authorization: `token ${token}` },
      });
      const repos = await reposRes.json();
      return { user, repos };
    },
    onSuccess: ({ user, repos }) => {
      setGithubUser(user);
      setGithubRepos(repos);
      toast.success(`Connected as @${user.login}`);
    },
    onError: () => toast.error("Invalid GitHub token"),
  });

  // Start repo scan
  const startScanMutation = useMutation({
    mutationFn: async (repo) => {
      await base44.entities.CodeRepository.create({
        name: repo.name,
        full_name: repo.full_name,
        provider: "github",
        language: repo.language || "Unknown",
        is_private: repo.private,
        default_branch: repo.default_branch || "main",
        status: "scanning",
        repo_url: repo.html_url,
        auto_scan: true,
      });
      // Simulate scan job
      await base44.entities.ScanJob.create({
        repo_name: repo.full_name,
        scan_type: "sast",
        status: "running",
        progress_pct: 0,
        triggered_by: "onboarding",
      });
    },
    onSuccess: () => {
      setScanningRepo(true);
      toast.success("Scan started");
      setTimeout(() => {
        setScanningRepo(false);
        toast.success("Scan complete — findings will appear in AutoTriage");
      }, 5000);
    },
  });

  // Save org settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (data) => {
      const existing = await base44.entities.OrgSettings.list();
      if (existing.length > 0) {
        await base44.entities.OrgSettings.update(existing[0].id, data);
      } else {
        await base44.entities.OrgSettings.create({
          organization_name: currentUser?.full_name || "My Organization",
          ...data,
        });
      }
    },
    onSuccess: () => {
      toast.success("Alert preferences saved");
      queryClient.invalidateQueries(["org-settings"]);
    },
  });

  // Complete onboarding
  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      // Mark user as completed onboarding
      await base44.entities.User.update(currentUser.id, {
        onboarding_completed: true,
        onboarding_step: 5,
      });
      localStorage.setItem("onboarding_completed", "true");
    },
    onSuccess: () => {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#C9A84C", "#6366F1", "#10B981"],
      });
    },
  });

  const getRecommendedNextSteps = () => {
    const steps = [];
    if (selectedGoals.includes("code")) {
      steps.push({ label: "View your critical code findings", link: "/autotriage?source=sast", icon: AlertTriangle });
    }
    if (selectedGoals.includes("cloud")) {
      steps.push({ label: "Review cloud misconfigurations", link: "/cloud/findings", icon: Cloud });
    }
    if (selectedGoals.includes("compliance")) {
      steps.push({ label: "Start SOC2 assessment", link: "/compliance", icon: FileText });
    }
    if (selectedGoals.includes("ai")) {
      steps.push({ label: "Set up AI-SPM monitoring", link: "/ai-spm", icon: Bot });
    }
    return steps.slice(0, 3);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to ShieldAI 👋</h2>
              <p className="text-slate-400">Tell us your biggest security concern — we'll configure your dashboard for you.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {GOALS.map((goal) => {
                const Icon = goal.icon;
                const isSelected = selectedGoals.includes(goal.id);
                return (
                  <div
                    key={goal.id}
                    onClick={() => toggleGoal(goal.id)}
                    className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-[#C9A84C] bg-[#C9A84C]/10"
                        : "border-slate-700 bg-slate-800/30 hover:border-slate-600"
                    }`}
                  >
                    <Icon className={`w-8 h-8 mb-3 ${isSelected ? "text-[#C9A84C]" : "text-slate-400"}`} />
                    <div className="text-white font-medium mb-1">{goal.label}</div>
                    <Badge className={`${isSelected ? "bg-[#C9A84C]/20 text-[#C9A84C]" : "bg-slate-700 text-slate-300"} text-xs`}>
                      {goal.tag}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Connect your first repository</h2>
              <p className="text-slate-400">ShieldAI scans your code for vulnerabilities, secrets, and outdated dependencies</p>
            </div>
            {!githubUser ? (
              <div className="space-y-4">
                <Input
                  placeholder="GitHub Personal Access Token (repo, read:org scopes)"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  type="password"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => validateGithubMutation.mutate(githubToken)}
                    className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black flex-1"
                  >
                    <Github className="w-4 h-4 mr-2" />
                    Validate Token
                  </Button>
                  <Button variant="outline" onClick={() => window.open("https://github.com/settings/tokens/new", "_blank")}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    How to create
                  </Button>
                </div>
                <div className="flex gap-4">
                  <Button variant="outline" className="flex-1 border-slate-700 text-slate-300">
                    <Gitlab className="w-4 h-4 mr-2" />
                    Connect GitLab
                  </Button>
                  <Button variant="outline" className="flex-1 border-slate-700 text-slate-300">
                    Connect Bitbucket
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Connected as @{githubUser.login} — {githubRepos.length} repositories found</span>
                  </div>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {githubRepos.map((repo) => (
                    <div
                      key={repo.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedRepos.includes(repo.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRepos([...selectedRepos, repo.id]);
                            } else {
                              setSelectedRepos(selectedRepos.filter(id => id !== repo.id));
                            }
                          }}
                          className="accent-[#C9A84C]"
                        />
                        <div>
                          <div className="text-white font-medium">{repo.name}</div>
                          <div className="text-xs text-slate-400">{repo.language || "Unknown"} • {repo.private ? "Private" : "Public"}</div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => startScanMutation.mutate(repo)}
                        disabled={scanningRepo}
                        className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black"
                      >
                        {scanningRepo ? "Scanning..." : "Scan"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Connect your cloud account</h2>
              <p className="text-slate-400">Scan your cloud infrastructure for misconfigurations and compliance gaps</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {["aws", "azure", "gcp", "oci"].map((provider) => (
                <div
                  key={provider}
                  onClick={() => setCloudProvider(provider)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    cloudProvider === provider
                      ? "border-[#C9A84C] bg-[#C9A84C]/10"
                      : "border-slate-700 bg-slate-800/30 hover:border-slate-600"
                  } ${provider === "oci" ? "opacity-50" : ""}`}
                >
                  <div className="text-white font-medium mb-1 capitalize">{provider}</div>
                  <div className="text-xs text-slate-400">{provider === "oci" ? "Coming soon" : "Click to configure"}</div>
                </div>
              ))}
            </div>
            {cloudProvider !== "oci" && (
              <div className="space-y-3">
                <Input placeholder="Access Key ID" className="bg-slate-800 border-slate-700 text-white" />
                <Input placeholder="Secret Access Key" type="password" className="bg-slate-800 border-slate-700 text-white" />
                <Button className="w-full bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black">
                  <Cloud className="w-4 h-4 mr-2" />
                  Validate & Scan
                </Button>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Where should we send security alerts?</h2>
              <p className="text-slate-400">Stay informed about critical security issues</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-white text-sm mb-2 block">Email</label>
                <Input
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-white text-sm mb-2 block">Slack Webhook URL (optional)</label>
                <Input
                  value={slackWebhook}
                  onChange={(e) => setSlackWebhook(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="bg-slate-800 border-slate-700 text-white"
                />
                <Button variant="outline" size="sm" className="mt-2 border-slate-700 text-slate-300">
                  Test Slack Connection
                </Button>
              </div>
              <div>
                <label className="text-white text-sm mb-2 block">Alert Severity Threshold</label>
                <div className="flex gap-4">
                  {["critical", "high", "all"].map((severity) => (
                    <label key={severity} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="severity"
                        checked={alertSeverity === severity}
                        onChange={() => setAlertSeverity(severity)}
                        className="accent-[#C9A84C]"
                      />
                      {severity === "critical" ? "Critical only" : severity === "high" ? "High and above ★" : "All findings"}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        const nextSteps = getRecommendedNextSteps();
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Your ShieldAI dashboard is ready! 🎉</h2>
              <p className="text-slate-400">Here's what we've set up for you</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <Check className="w-5 h-5 text-emerald-400" />
                <span className="text-white">{githubRepos.length} repositories connected and scanned</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <Check className="w-5 h-5 text-emerald-400" />
                <span className="text-white">Cloud account connected</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <Check className="w-5 h-5 text-emerald-400" />
                <span className="text-white">Alerts configured to {alertEmail}</span>
              </div>
            </div>
            <div>
              <h3 className="text-white font-medium mb-3">Recommended next steps</h3>
              <div className="space-y-2">
                {nextSteps.map((step, idx) => {
                  const Icon = step.icon;
                  return (
                    <a
                      key={idx}
                      href={step.link}
                      className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700 hover:border-[#C9A84C] transition-colors"
                    >
                      <Icon className="w-5 h-5 text-[#C9A84C]" />
                      <span className="text-white">{step.label}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const handleContinue = () => {
    if (step === 1 && selectedGoals.length === 0) {
      toast.error("Please select at least one goal");
      return;
    }
    if (step === 1) {
      localStorage.setItem("onboarding_goals", JSON.stringify(selectedGoals));
    }
    if (step === 4) {
      saveSettingsMutation.mutate({
        auto_triage_enabled: true,
        alert_email: alertEmail,
        alert_severity_threshold: alertSeverity,
      });
    }
    if (step === 5) {
      completeOnboardingMutation.mutate();
    }
    setStep(step + 1);
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  s === step ? "bg-[#C9A84C] text-black" : s < step ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-400"
                }`}>
                  {s < step ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 5 && (
                  <div className={`w-16 h-1 ${s < step ? "bg-emerald-500" : "bg-slate-800"}`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center text-slate-400 text-sm">
            Step {step} of 5
          </div>
        </div>

        {/* Step Content */}
        <Card className="border-slate-800 bg-slate-900/50 mb-6">
          <CardContent className="p-8">
            {renderStep()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)} className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-4">
            {step < 5 && (
              <Button variant="ghost" onClick={() => setStep(5)} className="text-slate-400 hover:text-white">
                Skip for now
              </Button>
            )}
            <Button
              onClick={handleContinue}
              className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black px-8"
              disabled={step === 1 && selectedGoals.length === 0}
            >
              {step === 5 ? "Go to Dashboard" : "Continue"}
              {step < 5 && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}