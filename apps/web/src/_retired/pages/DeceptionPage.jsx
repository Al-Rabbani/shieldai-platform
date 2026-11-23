import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Target, Key, FileText, Database, Globe, AlertTriangle, Plus, Download, Trash2, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const GOLD = "#C9A84C";
const SEVERITY_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };

export default function DeceptionPage() {
  const [activeTab, setActiveTab] = useState("honeytokens");
  const queryClient = useQueryClient();

  const { data: honeytokens = [] } = useQuery({
    queryKey: ["honeytokens"],
    queryFn: () => base44.entities.ApiKey.list("-created_date", 50),
  });

  const { data: attackSurface = [] } = useQuery({
    queryKey: ["attack-surface"],
    queryFn: () => base44.entities.AttackSurface.list(),
  });

  const { data: runtimeThreats = [] } = useQuery({
    queryKey: ["runtime-threats"],
    queryFn: () => base44.entities.RuntimeThreat.list("-detected_at", 100),
  });

  const deceptionTriggers = runtimeThreats.filter(t => t.threat_type?.includes("honeypot") || t.threat_type?.includes("honeytoken"));

  const generateHoneytoken = useMutation({
    mutationFn: async () => {
      const key = `AKIA${Math.random().toString(36).substring(2, 18).toUpperCase()}`;
      return await base44.entities.ApiKey.create({
        name: `Honeytoken-${key.substring(0, 8)}`,
        key_prefix: key.substring(0, 8),
        key_hash: `honeytoken_${key}`,
        permissions: "read",
        description: "AWS honeytoken for deception technology",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["honeytokens"]);
      toast.success("Honeytoken generated");
    },
  });

  const deployHoneypotEndpoint = useMutation({
    mutationFn: async (endpoint) => {
      return await base44.entities.AttackSurface.create({
        name: endpoint,
        asset_type: "admin_panel",
        url: endpoint,
        risk_level: "critical",
        status: "open",
        is_internet_facing: true,
        finding_count: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["attack-surface"]);
      toast.success("Honeypot endpoint deployed");
    },
  });

  const stats = {
    activeDecoys: honeytokens.length + attackSurface.filter(a => a.name.includes("admin") || a.name.includes("backup")).length,
    triggersToday: deceptionTriggers.filter(t => {
      const today = new Date().toDateString();
      return new Date(t.detected_at).toDateString() === today;
    }).length,
    totalTriggers: deceptionTriggers.length,
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
            <Target className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Deception Technology</h1>
            <p className="text-slate-400 text-sm">Deploy decoy assets that attackers will touch. Zero false positives — any alert here is real.</p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-slate-400">Active Decoys</div>
              <div className="text-2xl font-bold text-white">{stats.activeDecoys}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Triggers (30 days)</div>
              <div className="text-2xl font-bold text-red-400">{stats.totalTriggers}</div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <Card className="bg-[#111827] border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Honeytokens Deployed</span>
                <Key className="w-4 h-4" style={{ color: GOLD }} />
              </div>
              <div className="text-3xl font-black text-white">{honeytokens.length}</div>
              <div className="text-xs text-slate-500 mt-1">Fake AWS keys planted</div>
            </CardContent>
          </Card>
          <Card className="bg-[#111827] border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Honeypot Endpoints</span>
                <Globe className="w-4 h-4 text-red-400" />
              </div>
              <div className="text-3xl font-black text-white">{attackSurface.filter(a => a.name.includes("admin") || a.name.includes("backup")).length}</div>
              <div className="text-xs text-slate-500 mt-1">Fake admin panels</div>
            </CardContent>
          </Card>
          <Card className="bg-[#111827] border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Triggers Today</span>
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <div className="text-3xl font-black text-red-400">{stats.triggersToday}</div>
              <div className="text-xs text-red-500/70 mt-1">Real attacker activity</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-700 pb-2">
        {[
          { id: "honeytokens", label: "Honeytokens (API Keys)", icon: Key },
          { id: "canary", label: "Canary Files", icon: FileText },
          { id: "credentials", label: "Decoy Credentials", icon: Database },
          { id: "endpoints", label: "Honeypot Endpoints", icon: Globe },
          { id: "alerts", label: "Deception Alerts", icon: AlertTriangle },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.id ? "text-white" : "text-slate-400 hover:text-white"}`}
            style={activeTab === tab.id ? { background: `${GOLD}20`, color: GOLD } : {}}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Honeytokens Tab */}
      {activeTab === "honeytokens" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Deployed Honeytokens</h3>
              <p className="text-sm text-slate-400">Fake AWS API keys that trigger alerts when used</p>
            </div>
            <Button onClick={() => generateHoneytoken.mutate()} className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black">
              <Plus className="w-4 h-4 mr-2" />
              Generate Honeytoken
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {honeytokens.slice(0, 10).map((token, idx) => (
              <Card key={idx} className="bg-[#111827] border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4" style={{ color: GOLD }} />
                      <span className="text-sm font-semibold text-white">{token.name}</span>
                    </div>
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                      Active
                    </Badge>
                  </div>
                  <code className="block text-xs text-emerald-400 bg-slate-950 p-2 rounded mb-3 font-mono">
                    {token.key_prefix}••••••••
                  </code>
                  <div className="text-xs text-slate-400 mb-3">
                    Created: {new Date(token.created_date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800 flex-1">
                      <Eye className="w-3 h-3 mr-1" />
                      Usage Log
                    </Button>
                    <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-[#111827] border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">Where to Plant Honeytokens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                <div className="text-sm font-semibold text-white mb-1">.env files (monitored)</div>
                <div className="text-xs text-slate-400">Plant in development .env files that are monitored by ShieldAI</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                <div className="text-sm font-semibold text-white mb-1">Git history (test commit)</div>
                <div className="text-xs text-slate-400">Commit to a test branch, then revert — attackers scrape git history</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                <div className="text-sm font-semibold text-white mb-1">Log files</div>
                <div className="text-xs text-slate-400">Add to application logs that might be exfiltrated</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Honeypot Endpoints Tab */}
      {activeTab === "endpoints" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Honeypot Endpoints</h3>
              <p className="text-sm text-slate-400">Fake admin/internal endpoints that trigger alerts</p>
            </div>
            <Button onClick={() => deployHoneypotEndpoint.mutate("/admin/backup.sql")} className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black">
              <Plus className="w-4 h-4 mr-2" />
              Deploy Honeypot
            </Button>
          </div>

          <div className="space-y-2">
            {attackSurface.filter(a => a.name.includes("admin") || a.name.includes("backup") || a.name.includes(".git")).map((endpoint, idx) => (
              <Card key={idx} className="bg-[#111827] border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-red-400" />
                      <div>
                        <div className="text-sm font-semibold text-white">{endpoint.name}</div>
                        <div className="text-xs text-slate-400">{endpoint.url || "N/A"} • Internet-facing</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        {endpoint.finding_count || 0} triggers
                      </Badge>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {attackSurface.filter(a => a.name.includes("admin") || a.name.includes("backup")).length === 0 && (
              <div className="text-center py-12">
                <Globe className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <div className="text-white font-medium mb-2">No honeypot endpoints deployed</div>
                <div className="text-slate-400 text-sm mb-4">Deploy fake admin endpoints to catch attackers</div>
                <Button onClick={() => deployHoneypotEndpoint.mutate("/admin/backup.sql")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Deploy First Honeypot
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-[#111827] border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-sm">Suggested Honeypot Endpoints</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {["/admin/backup.sql", "/internal/config.json", "/.git/config", "/wp-admin/", "/phpmyadmin/", "/.env"].map((endpoint, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-800/30 border border-slate-700">
                    <code className="text-xs text-slate-300">{endpoint}</code>
                    <Button size="sm" variant="ghost" onClick={() => deployHoneypotEndpoint.mutate(endpoint)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-[#111827] border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-sm">Intelligence Value</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-400">When a honeypot triggers, ShieldAI automatically:</p>
                <div className="space-y-2">
                  {[
                    "Creates RuntimeThreat (severity=critical)",
                    "Enriches attacker IP via IOC Radar",
                    "Checks threat actor match in ThreatIntelFeed",
                    "Creates AuditLog entry",
                    "Notifies via all configured channels"
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {item}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Deception Alerts Tab */}
      {activeTab === "alerts" && (
        <Card className="bg-[#111827] border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Deception Trigger Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deceptionTriggers.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <div className="text-white font-medium mb-2">No deception triggers yet</div>
                <div className="text-slate-400 text-sm">Your decoys haven't been touched — this is good!</div>
              </div>
            ) : (
              <div className="space-y-2">
                {deceptionTriggers.map((threat, idx) => (
                  <Card key={idx} className="bg-slate-800/30 border border-red-500/30">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse mt-1" />
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-semibold">{threat.rule_name || "Honeypot Triggered"}</span>
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                CRITICAL
                              </Badge>
                            </div>
                            <div className="text-xs text-slate-400">
                              {threat.device_name || "Unknown device"} • {new Date(threat.detected_at).toLocaleString()}
                            </div>
                            {threat.source_ip && (
                              <div className="text-xs text-slate-500 mt-1">
                                Source IP: {threat.source_ip}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                          Investigate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Placeholder tabs */}
      {(activeTab === "canary" || activeTab === "credentials") && (
        <div className="text-center py-20">
          <FileText className="w-24 h-24 text-slate-700 mx-auto mb-6" />
          <h3 className="text-xl font-bold text-white mb-2">Coming Soon</h3>
          <p className="text-slate-400 max-w-2xl">
            Canary files and decoy credentials will be available in the next release. 
            These will include tracked PDFs, DOCX files, and database credentials that alert when accessed.
          </p>
        </div>
      )}
    </div>
  );
}