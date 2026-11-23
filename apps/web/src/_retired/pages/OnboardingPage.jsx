import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Github, Cloud, Laptop, CheckCircle2, ArrowRight, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const STEPS = {
  CODE: 'code',
  CLOUD: 'cloud',
  DEVICE: 'device',
  DONE: 'done'
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(STEPS.CODE);
  const [githubToken, setGithubToken] = useState("");
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [repos, setRepos] = useState([]);
  const [selectedRepos, setSelectedRepos] = useState([]);
  const [stepComplete, setStepComplete] = useState({ code: false, cloud: false, device: false });

  const listReposMut = useMutation({
    mutationFn: async (token) => {
      const res = await fetch('/api/functions/shieldOnboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_repos', github_token: token })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data.repos;
    },
    onSuccess: (data) => {
      setRepos(data);
      setShowTokenModal(false);
    }
  });

  const connectReposMut = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/functions/shieldOnboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect_repos', github_token: githubToken, repos: selectedRepos })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      setStepComplete(prev => ({ ...prev, code: true }));
      setCurrentStep(STEPS.CLOUD);
      toast.success("Repos connected — scanning started");
    }
  });

  const handleTokenSubmit = () => {
    if (githubToken.trim()) {
      localStorage.setItem('shield_github_token', githubToken);
      listReposMut.mutate(githubToken);
    }
  };

  const toggleRepo = (fullName) => {
    setSelectedRepos(prev =>
      prev.includes(fullName) ? prev.filter(r => r !== fullName) : [...prev, fullName]
    );
  };

  const renderStep = () => {
    if (currentStep === STEPS.CODE) {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <Github className="w-16 h-16 mx-auto text-blue-400 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Connect Your Code</h2>
            <p className="text-slate-400">Import your GitHub repositories to start security scanning</p>
          </div>

          {!stepComplete.code ? (
            <>
              {!repos.length ? (
                <>
                  <Button
                    onClick={() => setShowTokenModal(true)}
                    className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 font-semibold gap-2"
                  >
                    <Github className="w-5 h-5" /> Connect GitHub
                  </Button>
                  <p className="text-xs text-slate-500 text-center">
                    You'll need a GitHub Personal Access Token with <code className="bg-slate-800 px-1 rounded">read:repo</code> scope
                  </p>
                </>
              ) : (
                <>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {repos.map(repo => (
                      <div
                        key={repo.full_name}
                        onClick={() => toggleRepo(repo.full_name)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedRepos.includes(repo.full_name)
                            ? "bg-blue-500/10 border-blue-500/30"
                            : "bg-slate-800 border-slate-700 hover:border-slate-600"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white">{repo.name}</p>
                            <p className="text-xs text-slate-500 font-mono">{repo.full_name}</p>
                          </div>
                          {selectedRepos.includes(repo.full_name) && (
                            <CheckCircle2 className="w-5 h-5 text-blue-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={() => connectReposMut.mutate()}
                    disabled={!selectedRepos.length || connectReposMut.isPending}
                    className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 font-semibold gap-2"
                  >
                    <ArrowRight className="w-4 h-4" />
                    {connectReposMut.isPending ? "Connecting..." : `Connect ${selectedRepos.length} Repos`}
                  </Button>
                </>
              )}
            </>
          ) : (
            <div className="p-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
              <p className="text-emerald-400 font-semibold">✅ Code connected successfully</p>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => { setStepComplete(prev => ({ ...prev, code: true })); setCurrentStep(STEPS.CLOUD); }} className="text-slate-400">
              Skip for now
            </Button>
            {stepComplete.code && (
              <Button onClick={() => setCurrentStep(STEPS.CLOUD)} className="bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Next: Connect Cloud <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      );
    }

    if (currentStep === STEPS.CLOUD) {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <Cloud className="w-16 h-16 mx-auto text-orange-400 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Connect Cloud Providers</h2>
            <p className="text-slate-400">Scan AWS, Azure, or GCP for misconfigurations</p>
          </div>

          <div className="grid gap-3">
            {['AWS', 'Azure', 'GCP'].map(provider => (
              <Card key={provider} className="bg-slate-800 border-slate-700 cursor-pointer hover:border-orange-500/30 transition-all">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Cloud className="w-8 h-8 text-orange-400" />
                    <div>
                      <p className="text-sm font-semibold text-white">{provider}</p>
                      <p className="text-xs text-slate-500">Cloud security scanning</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                    Connect
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => { setStepComplete(prev => ({ ...prev, cloud: true })); setCurrentStep(STEPS.DEVICE); }} className="text-slate-400">
              Skip
            </Button>
            <Button onClick={() => { setStepComplete(prev => ({ ...prev, cloud: true })); setCurrentStep(STEPS.DEVICE); }} className="bg-orange-500/20 text-orange-400 border border-orange-500/30">
              Next: Device Agent <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      );
    }

    if (currentStep === STEPS.DEVICE) {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <Laptop className="w-16 h-16 mx-auto text-purple-400 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Install Device Agent</h2>
            <p className="text-slate-400">Protect your developer machines from malicious packages</p>
          </div>

          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400 mb-2">macOS/Linux:</p>
              <div className="flex gap-2">
                <pre className="flex-1 bg-black rounded p-3 text-xs text-emerald-400 font-mono overflow-x-auto">
                  curl -sSL https://shieldai.dev/install | bash
                </pre>
                <Button size="sm" variant="ghost" className="text-slate-400">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-400 mb-2 mt-3">Windows:</p>
              <div className="flex gap-2">
                <pre className="flex-1 bg-black rounded p-3 text-xs text-emerald-400 font-mono overflow-x-auto">
                  iwr https://shieldai.dev/install.ps1 | iex
                </pre>
                <Button size="sm" variant="ghost" className="text-slate-400">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => { setStepComplete(prev => ({ ...prev, device: true })); setCurrentStep(STEPS.DONE); }} className="text-slate-400">
              Skip
            </Button>
            <Button onClick={() => { setStepComplete(prev => ({ ...prev, device: true })); setCurrentStep(STEPS.DONE); }} className="bg-purple-500/20 text-purple-400 border border-purple-500/30">
              Complete Setup <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      );
    }

    if (currentStep === STEPS.DONE) {
      return (
        <div className="text-center py-12">
          <CheckCircle2 className="w-20 h-20 mx-auto text-emerald-400 mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">🎉 You're all set!</h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            Your ShieldAI security platform is ready. Start exploring your dashboards and monitoring your security posture.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate('/code')} className="bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Go to Code Security
            </Button>
            <Button onClick={() => navigate('/')} className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              View Dashboard
            </Button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] p-6 flex items-center justify-center">
      <Card className="w-full max-w-2xl bg-[#0a0f1e] border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Welcome to ShieldAI</CardTitle>
              <CardDescription className="text-slate-400">Let's get your security platform set up</CardDescription>
            </div>
            <div className="flex gap-2">
              {['code', 'cloud', 'device'].map((step, i) => (
                <div
                  key={step}
                  className={`w-3 h-3 rounded-full ${
                    currentStep === (step === 'code' ? STEPS.CODE : step === 'cloud' ? STEPS.CLOUD : STEPS.DEVICE)
                      ? 'bg-blue-400'
                      : stepComplete[step] ? 'bg-emerald-400' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renderStep()}
        </CardContent>
      </Card>

      {/* GitHub Token Modal */}
      <Dialog open={showTokenModal} onOpenChange={setShowTokenModal}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">GitHub Personal Access Token</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a token at{' '}
              <a href="https://github.com/settings/tokens" target="_blank" className="text-blue-400 hover:underline flex items-center gap-1">
                github.com/settings/tokens <ExternalLink className="w-3 h-3" />
              </a>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Token</Label>
              <Input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_..."
                className="bg-slate-800 border-slate-700 text-white font-mono"
              />
            </div>
            <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
              <p className="text-xs text-slate-400">Required scopes:</p>
              <Badge variant="outline" className="mt-1 text-[10px]">read:repo</Badge>
            </div>
            <Button
              onClick={handleTokenSubmit}
              disabled={!githubToken.trim() || listReposMut.isPending}
              className="w-full bg-blue-500/20 text-blue-400 border border-blue-500/30"
            >
              {listReposMut.isPending ? "Loading..." : "Continue"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}