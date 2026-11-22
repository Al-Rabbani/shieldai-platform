import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Target, Shield, AlertTriangle, Search, FileText, Clock, TrendingUp, Play, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const GOLD = "#C9A84C";
const SEVERITY_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };

const GUIDED_HUNTS = [
  { id: 1, name: "Credential Dumping Hunt", severity: "critical", mitre: "T1003", description: "Search for LSASS access, /etc/shadow reads, credential tool execution", color: "red" },
  { id: 2, name: "Lateral Movement Hunt", severity: "critical", mitre: "T1021", description: "Search for SMB connections between internal hosts, new admin account creation", color: "red" },
  { id: 3, name: "C2 Beacon Hunt", severity: "high", mitre: "T1071", description: "Search for regular outbound connections at fixed intervals (beacon pattern)", color: "orange" },
  { id: 4, name: "Living-off-the-Land Hunt", severity: "high", mitre: "T1218", description: "Search for abused built-in tools (certutil, regsvr32, mshta, wscript)", color: "orange" },
  { id: 5, name: "Data Exfiltration Hunt", severity: "high", mitre: "T1041", description: "Search for large outbound transfers, archive creation, cloud upload processes", color: "orange" },
  { id: 6, name: "Persistence Mechanism Hunt", severity: "medium", mitre: "T1547", description: "Search for new scheduled tasks, registry run keys, startup items", color: "yellow" },
  { id: 7, name: "Privilege Escalation Hunt", severity: "medium", mitre: "T1068", description: "Search for sudo abuse, setuid binaries, token manipulation", color: "yellow" },
  { id: 8, name: "Container Escape Hunt", severity: "medium", mitre: "T1611", description: "Search for privileged container access, nsenter, /proc/1/ns access", color: "yellow" },
];

const MITRE_TACTICS = [
  "Reconnaissance", "Initial Access", "Execution", "Persistence", "Privilege Escalation",
  "Defense Evasion", "Credential Access", "Discovery", "Lateral Movement",
  "Collection", "Command and Control", "Exfiltration", "Impact"
];

export default function ThreatHuntingPage() {
  const [activeTab, setActiveTab] = useState("guided");
  const [selectedHunt, setSelectedHunt] = useState(null);
  const [huntResults, setHuntResults] = useState(null);
  const [customQuery, setCustomQuery] = useState({ entity: "RuntimeThreat", field: "severity", operator: "equals", value: "critical", timeframe: "24h" });

  const { data: threats = [] } = useQuery({
    queryKey: ["runtime-threats"],
    queryFn: () => base44.entities.RuntimeThreat.list("-detected_at", 100),
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => base44.entities.AuditLog.list("-timestamp", 100),
  });

  const runHunt = (hunt) => {
    setSelectedHunt(hunt);
    // Simulate hunt execution
    setTimeout(() => {
      setHuntResults({
        huntName: hunt.name,
        findingsCount: threats.slice(0, 5).length,
        findings: threats.slice(0, 5).map(t => ({
          ...t,
          matchedRule: hunt.name,
          confidence: null
        }))
      });
    }, 1500);
  };

  const runCustomHunt = () => {
    setHuntResults({
      huntName: "Custom Query",
      findingsCount: threats.length,
      findings: threats.map(t => ({ ...t, confidence: null }))
    });
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
            <h1 className="text-2xl font-black text-white">Threat Hunting Console</h1>
            <p className="text-slate-400 text-sm">Proactively search for threats hiding in your environment. Ask questions, run hunts, build hypotheses.</p>
          </div>
          <div className="ml-auto">
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              Active Hunts: {threats.length}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-700 pb-2">
        {[
          { id: "guided", label: "Guided Hunts", icon: Play },
          { id: "custom", label: "Custom Hunt Query", icon: Search },
          { id: "mitre", label: "MITRE ATT&CK Coverage", icon: FileText },
          { id: "history", label: "Hunt History", icon: Clock },
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

      {/* Guided Hunts */}
      {activeTab === "guided" && (
        <div className="grid grid-cols-2 gap-4">
          {GUIDED_HUNTS.map(hunt => (
            <Card key={hunt.id} className="bg-[#111827] border-slate-700 hover:border-slate-600 transition-all cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      hunt.severity === "critical" ? "bg-red-500" :
                      hunt.severity === "high" ? "bg-orange-500" :
                      "bg-yellow-500"
                    }`} />
                    <h3 className="text-white font-semibold">{hunt.name}</h3>
                  </div>
                  <Badge className="bg-slate-700 text-slate-300 text-xs">{hunt.mitre}</Badge>
                </div>
                <p className="text-sm text-slate-400 mb-3">{hunt.description}</p>
                <div className="flex items-center justify-between">
                  <Badge style={{ 
                    background: `${SEVERITY_COLORS[hunt.severity]}20`,
                    color: SEVERITY_COLORS[hunt.severity],
                    border: `1px solid ${SEVERITY_COLORS[hunt.severity]}40`
                  }}>
                    {hunt.severity}
                  </Badge>
                  <Button 
                    size="sm" 
                    onClick={() => runHunt(hunt)}
                    className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Run Hunt
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Custom Hunt Query */}
      {activeTab === "custom" && (
        <div className="space-y-6">
          <Card className="bg-[#111827] border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Build Custom Hunt Query</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Show me</label>
                  <Select value={customQuery.entity} onValueChange={(v) => setCustomQuery({...customQuery, entity: v})}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RuntimeThreat">Runtime Threats</SelectItem>
                      <SelectItem value="AuditLog">Audit Logs</SelectItem>
                      <SelectItem value="BotEvent">Bot Events</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Where</label>
                  <Select value={customQuery.field} onValueChange={(v) => setCustomQuery({...customQuery, field: v})}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="severity">Severity</SelectItem>
                      <SelectItem value="threat_type">Threat Type</SelectItem>
                      <SelectItem value="device_name">Device Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Operator</label>
                  <Select value={customQuery.operator} onValueChange={(v) => setCustomQuery({...customQuery, operator: v})}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">Equals</SelectItem>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="greater_than">Greater Than</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Value</label>
                  <Input 
                    value={customQuery.value}
                    onChange={(e) => setCustomQuery({...customQuery, value: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Timeframe</label>
                  <Select value={customQuery.timeframe} onValueChange={(v) => setCustomQuery({...customQuery, timeframe: v})}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">Last 1 hour</SelectItem>
                      <SelectItem value="24h">Last 24 hours</SelectItem>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Sort by</label>
                  <Select defaultValue="detected_at">
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="detected_at">Detection Time</SelectItem>
                      <SelectItem value="severity">Severity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={runCustomHunt} className="w-full bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black">
                    <Search className="w-4 h-4 mr-2" />
                    Run Hunt
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                  <Save className="w-4 h-4 mr-2" />
                  Save as Hunt
                </Button>
                <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Set as Alert
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {huntResults && (
            <Card className="bg-[#111827] border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Hunt Results: {huntResults.huntName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-slate-400 mb-4">{huntResults.findingsCount} findings detected</div>
                <div className="space-y-2">
                  {huntResults.findings.map((finding, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                      <div>
                        <div className="text-sm font-semibold text-white">{finding.rule_name || finding.action}</div>
                        <div className="text-xs text-slate-400">{finding.device_name} • {new Date(finding.detected_at || finding.timestamp).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge style={{ 
                          background: `${SEVERITY_COLORS[finding.severity || "medium"]}20`,
                          color: SEVERITY_COLORS[finding.severity || "medium"]
                        }}>
                          {finding.severity || "medium"}
                        </Badge>
                        <div className="text-right">
                          <div className="text-xs text-slate-400">Confidence</div>
                          <div className="text-sm font-bold text-white">{finding.confidence != null ? `${finding.confidence}%` : "—"}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* MITRE ATT&CK Coverage */}
      {activeTab === "mitre" && (
        <Card className="bg-[#111827] border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">MITRE ATT&CK Coverage Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-13 gap-2">
              {MITRE_TACTICS.map((tactic, idx) => (
                <div key={idx} className="text-center">
                  <div className={`w-16 h-16 rounded-lg flex items-center justify-center mb-2 ${
                    idx % 3 === 0 ? "bg-green-500/20 border-2 border-green-500/50" :
                    idx % 3 === 1 ? "bg-amber-500/20 border-2 border-amber-500/50" :
                    "bg-red-500/20 border-2 border-red-500/50"
                  }`}>
                    <Shield className="w-6 h-6" style={{ color: idx % 3 === 0 ? "#22c55e" : idx % 3 === 1 ? "#eab308" : "#ef4444" }} />
                  </div>
                  <div className="text-[9px] text-slate-400 leading-tight">{tactic}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/50" />
                Detection coverage
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/50" />
                Partial coverage
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/50" />
                No detection
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hunt History */}
      {activeTab === "history" && (
        <Card className="bg-[#111827] border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Hunt History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                  <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="text-sm font-semibold text-white">Credential Dumping Hunt</div>
                      <div className="text-xs text-slate-400">Run by admin@shieldai.dev • 2 hours ago</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      3 findings
                    </Badge>
                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                      <TrendingUp className="w-4 h-4" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}