import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Laptop, AlertTriangle, CheckCircle2, Copy, Terminal, Package, Lock, Eye, Activity, TrendingUp, ShieldAlert, Globe, Code2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const OS_ICONS = {
  macos: { icon: "🍎", label: "macOS" },
  linux: { icon: "🐧", label: "Linux" },
  windows: { icon: "🪟", label: "Windows" },
};

const ECOSYSTEMS = ["npm", "pypi"];

export default function DeviceProtectionPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedOS, setSelectedOS] = useState("macos");
  const [installData, setInstallData] = useState(null);
  const [checkPkg, setCheckPkg] = useState({ name: "", version: "latest", ecosystem: "npm" });
  const [checkResult, setCheckResult] = useState(null);

  const qc = useQueryClient();

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ["device-agents"],
    queryFn: () => base44.entities.DeviceAgent.list().catch(() => []),
    initialData: [],
  });

  const { data: policy } = useQuery({
    queryKey: ["device-policy"],
    queryFn: async () => {
      try {
        const res = await fetch('/api/functions/shieldDeviceProtection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'policy' })
        });
        return await res.json();
      } catch {
        return { settings: { block_malicious_packages: true, block_typosquatting: true, block_install_scripts: false } };
      }
    },
  });

  const installMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/functions/shieldDeviceProtection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install_agent', install_platform: selectedOS })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setInstallData(data);
      toast.success("Device agent configured");
    },
  });

  const checkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/functions/shieldDeviceProtection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'report',
          device_id: 'manual-check',
          device_name: 'Manual Check',
          os: 'macos',
          packages: [{ name: checkPkg.name, version: checkPkg.version, ecosystem: checkPkg.ecosystem }]
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data.all_package_results?.[0];
    },
    onSuccess: (data) => {
      setCheckResult(data);
    },
  });

  const copyToClipboard = async (text, label) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const totalBlocked = devices.reduce((sum, d) => sum + (d.blocked_packages || 0), 0);
  const totalPackages = devices.reduce((sum, d) => sum + (d.packages_monitored || 0), 0);

  return (
    <div className="min-h-screen bg-[#030712] p-6">
      {showModal && (
        <Dialog open onOpenChange={setShowModal}>
          <DialogContent className="bg-slate-900 border-slate-700 max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Laptop className="w-5 h-5 text-blue-400" />
                Add Device Protection
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Install the ShieldAI agent on your developer machine
              </DialogDescription>
            </DialogHeader>

            {!installData ? (
              <div className="space-y-4 py-4">
                <Label className="text-slate-300">Select Platform:</Label>
                <Tabs value={selectedOS} onValueChange={setSelectedOS} className="w-full">
                  <TabsList className="bg-slate-800 border border-slate-700 w-full">
                    <TabsTrigger value="macos" className="flex-1 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                      🍎 macOS
                    </TabsTrigger>
                    <TabsTrigger value="linux" className="flex-1 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                      🐧 Linux
                    </TabsTrigger>
                    <TabsTrigger value="windows" className="flex-1 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                      🪟 Windows
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-sm text-slate-300 mb-2">Installation will:</p>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• Install background agent for continuous monitoring</li>
                    <li>• Scan npm/PyPI packages on install</li>
                    <li>• Block malicious and typosquatting packages</li>
                    <li>• Report findings to ShieldAI dashboard</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-400">Installation Script Ready</p>
                      <p className="text-xs text-slate-400">Copy and run the command below in your terminal</p>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <pre className="bg-slate-900 rounded-lg p-4 overflow-x-auto text-xs text-emerald-400 font-mono border border-slate-700 max-h-48">
                    {installData.install_script}
                  </pre>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(installData.install_script, "Install script")}
                    className="absolute top-2 right-2 text-slate-400 hover:text-white">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">Device Token:</p>
                  <code className="text-sm text-blue-400 font-mono">SHIELD_DEVICE_TOKEN={installData.device_token}</code>
                </div>
              </div>
            )}

            <DialogFooter>
              {!installData && (
                <>
                  <Button variant="outline" onClick={() => setShowModal(false)} className="border-slate-700">Cancel</Button>
                  <Button onClick={() => installMutation.mutate()} disabled={installMutation.isPending}
                    className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 font-semibold gap-2">
                    <Terminal className="w-4 h-4" /> {installMutation.isPending ? "Generating..." : "Generate Script"}
                  </Button>
                </>
              )}
              {installData && (
                <Button onClick={() => setShowModal(false)} className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Done
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Device Protection</h1>
            <p className="text-slate-400 mt-2">See and control every package installed on your team's developer machines</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { setShowModal(true); setInstallData(null); }}
              className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 font-semibold gap-2">
              <Plus className="w-4 h-4" /> Register New Device
            </Button>
            <Button onClick={() => setShowModal(true)}
              className="bg-slate-500/20 hover:bg-slate-500/30 text-slate-400 border border-slate-500/30 font-semibold gap-2">
              <Laptop className="w-4 h-4" /> Add Device
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card style={{ background: "#0a0f1e", border: "1px solid rgba(59,130,246,0.3)" }}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Laptop className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-black text-white">{devices.length}</p>
                  <p className="text-xs text-slate-400">Devices Protected</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card style={{ background: "#0a0f1e", border: "1px solid rgba(59,130,246,0.3)" }}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-black text-white">{totalPackages.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">Packages Monitored</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card style={{ background: "#0a0f1e", border: "1px solid rgba(239,68,68,0.3)" }}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-8 h-8 text-red-400" />
                <div>
                  <p className="text-2xl font-black text-white">{totalBlocked}</p>
                  <p className="text-xs text-slate-400">Threats Blocked</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Devices Table */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : devices.length === 0 ? (
          <Card style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
            <CardContent className="py-12 text-center">
              <Laptop className="w-12 h-12 mx-auto text-slate-700 mb-4" />
              <h3 className="text-white font-semibold mb-2">No devices protected</h3>
              <p className="text-slate-500 text-sm mb-4">Install the agent on your first developer machine</p>
              <Button onClick={() => setShowModal(true)} className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 font-semibold">
                Add Your First Device
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
            <CardHeader>
              <CardTitle className="text-white">Protected Devices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {devices.map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-2xl">{OS_ICONS[device.os]?.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-white">{device.device_name}</h4>
                          <Badge className={device.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : device.status === "blocked" ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-slate-500/10 text-slate-400 border-slate-500/30"}>
                            {device.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400">{device.username} · v{device.agent_version}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Packages</p>
                        <p className="text-sm font-semibold text-white">{device.packages_monitored || 0}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Blocked</p>
                        <p className="text-sm font-semibold text-red-400">{device.blocked_packages || 0}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Risky</p>
                        <p className="text-sm font-semibold text-amber-400">{device.risky_packages || 0}</p>
                      </div>
                      <div className="w-24">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-400">Risk</span>
                          <span className={`text-xs font-bold ${device.risk_score >= 50 ? "text-red-400" : device.risk_score >= 20 ? "text-amber-400" : "text-emerald-400"}`}>{device.risk_score}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${device.risk_score >= 50 ? "bg-red-500" : device.risk_score >= 20 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${device.risk_score}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manual Package Check */}
        <Card style={{ background: "#0a0f1e", border: "1px solid rgba(139,92,246,0.3)" }}>
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              Check a Package
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-12 gap-3">
              <Input
                value={checkPkg.name}
                onChange={e => setCheckPkg({...checkPkg, name: e.target.value})}
                placeholder="lodash"
                className="col-span-5 bg-slate-800 border-slate-700 text-white font-mono"
              />
              <Input
                value={checkPkg.version}
                onChange={e => setCheckPkg({...checkPkg, version: e.target.value})}
                placeholder="latest"
                className="col-span-3 bg-slate-800 border-slate-700 text-white font-mono"
              />
              <Select value={checkPkg.ecosystem} onValueChange={v => setCheckPkg({...checkPkg, ecosystem: v})}>
                <SelectTrigger className="col-span-2 bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {ECOSYSTEMS.map(eco => <SelectItem key={eco} value={eco}>{eco}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={() => checkMutation.mutate()} disabled={!checkPkg.name || checkMutation.isPending}
                className="col-span-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 font-semibold">
                {checkMutation.isPending ? "Checking..." : "Check"}
              </Button>
            </div>

            {checkResult && (
              <div className={`p-4 rounded-lg border ${checkResult.verdict?.includes("BLOCKED") ? "bg-red-500/10 border-red-500/30" : checkResult.verdict?.includes("SAFE") ? "bg-emerald-500/10 border-emerald-500/30" : "bg-amber-500/10 border-amber-500/30"}`}>
                <div className="flex items-center justify-between mb-3">
                  <code className="text-lg font-bold text-white">{checkResult.package_name}@{checkResult.version}</code>
                  <Badge className={`text-lg font-bold ${checkResult.verdict?.includes("BLOCKED") ? "bg-red-500/10 text-red-400 border-red-500/30" : checkResult.verdict?.includes("SAFE") ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30"}`}>
                    {checkResult.verdict}
                  </Badge>
                </div>
                {checkResult.issues?.length > 0 && (
                  <div className="space-y-2">
                    {checkResult.issues.map((issue, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-300">{issue.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Policy Panel */}
        <Card style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" />
              Protection Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <span className="text-sm text-slate-300">Block Malicious</span>
                <Switch defaultChecked={policy?.settings?.block_malicious_packages} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <span className="text-sm text-slate-300">Block Typosquatting</span>
                <Switch defaultChecked={policy?.settings?.block_typosquatting} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <span className="text-sm text-slate-300">Block Install Scripts</span>
                <Switch defaultChecked={policy?.settings?.block_install_scripts} />
              </div>
            </div>
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <p className="text-xs text-slate-400 mb-2">Ecosystems Monitored:</p>
              <div className="flex gap-2 flex-wrap">
                {["npm", "PyPI", "VS Code", "Chrome", "Firefox", "Maven", "NuGet", "Go", "Ruby"].map(eco => (
                  <Badge key={eco} variant="outline" className="text-[10px]">{eco}</Badge>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-3">Scan Interval: <span className="text-white font-semibold">every 60 minutes</span></p>
            </div>
          </CardContent>
        </Card>

        {/* What Gets Monitored */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { icon: Package, label: "npm global packages" },
            { icon: Package, label: "pip/PyPI packages" },
            { icon: Code2, label: "VS Code extensions" },
            { icon: Globe, label: "Chrome/Firefox extensions" },
            { icon: Laptop, label: "IDE plugins" },
          ].map((item) => (
            <Card key={item.label} style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <item.icon className="w-8 h-8 text-blue-400 mb-2" />
                  <p className="text-xs text-slate-400">{item.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}