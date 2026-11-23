import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, AlertTriangle, CheckCircle2, Copy, Package, Lock, Clock, User, GitBranch, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const ECOSYSTEMS = ["npm", "pypi", "maven", "nuget", "rubygems", "cargo", "go", "composer"];

const VERDICT_COLORS = {
  "🛑 BLOCKED": "bg-red-500/10 text-red-400 border-red-500/30",
  "⚠️ RISKY": "bg-amber-500/10 text-amber-400 border-amber-500/30",
  "✅ SAFE": "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
};

const ISSUE_COLORS = {
  typosquatting: "bg-red-500/10 text-red-400 border-red-500/30",
  malware: "bg-red-500/10 text-red-400 border-red-500/30",
  install_script: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  cve: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  newly_published: "bg-blue-500/10 text-blue-400 border-blue-500/30",
};

export default function SafeChainPage() {
  const [packageName, setPackageName] = useState("");
  const [version, setVersion] = useState("latest");
  const [ecosystem, setEcosystem] = useState("npm");
  const [lockfileInput, setLockfileInput] = useState("");
  const [result, setResult] = useState(null);
  const [lockfileResult, setLockfileResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ["safe-chain-events"],
    queryFn: () => base44.entities.SupplyChainEvent.filter({}).catch(() => []),
    initialData: [],
    refetchInterval: 30000,
  });

  const checkPackage = async () => {
    if (!packageName.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/functions/shieldSafeChain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', package_name: packageName.trim(), version, ecosystem })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.results?.[0]);
    } catch (error) {
      toast.error(`Check failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const auditLockfile = async () => {
    if (!lockfileInput.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/functions/shieldSafeChain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'audit', lockfile_content: lockfileInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLockfileResult(data);
    } catch (error) {
      toast.error(`Audit failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text, label) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const getVerdictBadge = (verdict) => {
    const color = VERDICT_COLORS[verdict] || VERDICT_COLORS["⚠️ RISKY"];
    return <Badge className={`text-lg font-bold ${color}`}>{verdict}</Badge>;
  };

  return (
    <div className="min-h-screen bg-[#030712] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Safe Chain</h1>
            <p className="text-slate-400 mt-2">Package security verification before installation</p>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
            <Shield className="w-3 h-3 mr-1" /> Production Ready
          </Badge>
        </div>

        <Tabs defaultValue="check" className="w-full">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="check" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
              <Package className="w-4 h-4 mr-2" /> Check Package
            </TabsTrigger>
            <TabsTrigger value="lockfile" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
              <GitBranch className="w-4 h-4 mr-2" /> Lockfile Auditor
            </TabsTrigger>
            <TabsTrigger value="setup" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              <Terminal className="w-4 h-4 mr-2" /> Integration
            </TabsTrigger>
          </TabsList>

          {/* Check Single Package */}
          <TabsContent value="check" className="mt-6 space-y-6">
            <Card style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
              <CardContent className="pt-6">
                <div className="grid grid-cols-12 gap-3">
                  <Input
                    value={packageName}
                    onChange={e => setPackageName(e.target.value)}
                    placeholder="lodash"
                    className="col-span-5 bg-slate-800 border-slate-700 text-white font-mono"
                    onKeyDown={e => e.key === 'Enter' && checkPackage()}
                  />
                  <Input
                    value={version}
                    onChange={e => setVersion(e.target.value)}
                    placeholder="latest"
                    className="col-span-3 bg-slate-800 border-slate-700 text-white font-mono"
                  />
                  <Select value={ecosystem} onValueChange={setEcosystem}>
                    <SelectTrigger className="col-span-2 bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {ECOSYSTEMS.map(eco => (
                        <SelectItem key={eco} value={eco}>{eco}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={checkPackage} disabled={!packageName.trim() || isLoading}
                    className="col-span-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 font-semibold">
                    {isLoading ? "Checking..." : "Check Now"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {result && (
              <Card style={{ background: "#0a0f1e", border: result.verdict?.includes("BLOCKED") ? "1px solid rgba(239,68,68,0.3)" : result.verdict?.includes("SAFE") ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(245,158,11,0.3)" }}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-white font-mono text-2xl flex items-center gap-3">
                        {result.package_name}
                        <span className="text-slate-500">@{result.version}</span>
                      </CardTitle>
                      <CardDescription className="text-slate-400 mt-2 flex items-center gap-2">
                        <User className="w-3 h-3" /> {result.metadata?.author || "Unknown"}
                        <Clock className="w-3 h-3" /> {result.metadata?.created ? new Date(result.metadata.created).toLocaleDateString() : "Unknown"}
                      </CardDescription>
                    </div>
                    {getVerdictBadge(result.verdict)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.issues?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-300">Security Issues:</p>
                      {result.issues.map((issue, i) => (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${ISSUE_COLORS[issue.type] || ISSUE_COLORS.cve}`}>
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={`text-[10px] font-bold ${ISSUE_COLORS[issue.type]}`}>
                                {issue.type === "typosquatting" ? "🔴 TYPOSQUATTING" : issue.type === "malware" ? "🔴 MALWARE" : issue.type === "install_script" ? "🟠 INSTALL SCRIPT" : issue.type === "cve" ? "🟡 CVE" : "🔵 NEWLY PUBLISHED"}
                              </Badge>
                              {issue.severity && (
                                <span className="text-xs font-semibold">{issue.severity.toUpperCase()}</span>
                              )}
                            </div>
                            <p className="text-sm text-slate-300">{issue.description}</p>
                            {issue.fix_version && (
                              <p className="text-xs text-emerald-400 mt-1">Fix: Upgrade to {issue.fix_version}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {result.verdict?.includes("SAFE") && result.issues?.length === 0 && (
                    <div className="rounded-lg p-4 bg-emerald-500/10 border border-emerald-500/30">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        <div>
                          <p className="text-sm font-semibold text-emerald-400">No security issues detected</p>
                          <p className="text-xs text-slate-400 mt-1">Package appears safe to install</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Lockfile Auditor */}
          <TabsContent value="lockfile" className="mt-6 space-y-6">
            <Card style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
              <CardContent className="pt-6">
                <Label className="text-slate-300 mb-2 block">Paste package-lock.json or requirements.txt:</Label>
                <textarea
                  value={lockfileInput}
                  onChange={e => setLockfileInput(e.target.value)}
                  placeholder="{&#10;  &quot;name&quot;: &quot;my-app&quot;,&#10;  &quot;dependencies&quot;: {&#10;    &quot;lodash&quot;: &quot;^4.17.15&quot;,&#10;    &quot;express&quot;: &quot;^4.18.0&quot;&#10;  }&#10;}"
                  className="w-full h-64 bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm text-slate-300 font-mono"
                />
                <Button onClick={auditLockfile} disabled={!lockfileInput.trim() || isLoading}
                  className="mt-4 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 font-semibold gap-2">
                  <Shield className="w-4 h-4" /> {isLoading ? "Auditing..." : "Audit Lockfile"}
                </Button>
              </CardContent>
            </Card>

            {lockfileResult && (
              <Card style={{ background: "#0a0f1e", border: "1px solid rgba(139,92,246,0.3)" }}>
                <CardHeader>
                  <CardTitle className="text-white">Audit Results</CardTitle>
                  <div className="flex gap-4 text-sm mt-2">
                    <span className="text-emerald-400 font-semibold">{lockfileResult.safe_count || 0} Safe</span>
                    <span className="text-amber-400 font-semibold">{lockfileResult.risky_count || 0} Risky</span>
                    <span className="text-red-400 font-semibold">{lockfileResult.blocked_count || 0} Blocked</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {lockfileResult.blocked_packages?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-300">Blocked Packages:</p>
                      {lockfileResult.blocked_packages.map((pkg, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                          <code className="text-sm text-white font-mono">{pkg.name}@{pkg.version}</code>
                          <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-xs">{pkg.reason}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Integration */}
          <TabsContent value="setup" className="mt-6 space-y-6">
            <div className="grid gap-6">
              <Card style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-blue-400" />
                    CI/CD Integration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-400">Add this GitHub Actions workflow to check packages on every PR:</p>
                  <div className="relative">
                    <pre className="bg-slate-900 rounded-lg p-4 overflow-x-auto text-xs text-slate-300 font-mono border border-slate-700">
{`name: Safe Chain Security Check
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Safe Chain
        run: npm install -g @shieldai/safe-chain
      - name: Check dependencies
        run: safe-chain audit`}
                    </pre>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(`name: Safe Chain Security Check
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Safe Chain
        run: npm install -g @shieldai/safe-chain
      - name: Check dependencies
        run: safe-chain audit`, "CI/CD workflow")}
                      className="absolute top-2 right-2 text-slate-400 hover:text-white">
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-purple-400" />
                    Pre-install Hook
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-400">Add this to your package.json to check before every install:</p>
                  <div className="relative">
                    <pre className="bg-slate-900 rounded-lg p-4 overflow-x-auto text-xs text-slate-300 font-mono border border-slate-700">
{`{
  "scripts": {
    "preinstall": "npx @shieldai/safe-chain check"
  }
}`}
                    </pre>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(`{
  "scripts": {
    "preinstall": "npx @shieldai/safe-chain check"
  }
}`, "Pre-install script")}
                      className="absolute top-2 right-2 text-slate-400 hover:text-white">
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Live Events Feed */}
        {events.length > 0 && (
          <Card style={{ background: "#0a0f1e", border: "1px solid rgba(239,68,68,0.3)" }}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Recent Supply Chain Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {events.slice(0, 5).map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div>
                      <p className="text-sm font-semibold text-white">{event.package_name}@{event.version}</p>
                      <p className="text-xs text-slate-400">{event.event_type}</p>
                    </div>
                    <Badge className={event.severity === "critical" ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30"}>
                      {event.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}