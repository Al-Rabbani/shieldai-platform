import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Package, Search, Shield, AlertTriangle, Zap, TrendingUp, FileJson, Download, Copy, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const ECOSYSTEMS = ["npm", "PyPI", "Go", "Maven", "RubyGems", "Cargo", "NuGet"];

function RiskGauge({ score, size = 100 }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score || 0));
  const dash = (pct / 100) * circ;
  const color = pct >= 70 ? "#ef4444" : pct >= 40 ? "#f97316" : pct >= 20 ? "#eab308" : "#10b981";
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={size*0.08} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={size*0.08}
        strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ * 0.25} strokeLinecap="round" />
      <text x={size/2} y={size/2 + 3} textAnchor="middle" fill={color} fontSize={size * 0.25} fontWeight="700" fontFamily="JetBrains Mono">{pct}</text>
    </svg>
  );
}

function IssueBadge({ type }) {
  const icons = { malware: "🔴", typosquat: "🔴", install_script: "🟠", cve: "🟡", newly_published: "🔵" };
  const labels = { malware: "MALWARE", typosquat: "TYPOSQUAT", install_script: "INSTALL SCRIPT", cve: "CVE", newly_published: "NEW" };
  const colors = { malware: "bg-red-500/10 text-red-400 border-red-500/30", typosquat: "bg-red-500/10 text-red-400 border-red-500/30", install_script: "bg-orange-500/10 text-orange-400 border-orange-500/30", cve: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", newly_published: "bg-blue-500/10 text-blue-400 border-blue-500/30" };
  
  return (
    <Badge className={`text-[10px] font-bold ${colors[type] || "bg-slate-500/10 text-slate-400"}`}>
      {icons[type]} {labels[type]}
    </Badge>
  );
}

export default function SupplyChainScannerPage() {
  const [singlePackage, setSinglePackage] = useState({ name: "", ecosystem: "npm" });
  const [batchList, setBatchList] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState("single"); // single | batch | events

  const qc = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ["supply-chain-events"],
    queryFn: () => base44.entities.SupplyChainEvent.list("-detected_at", 100).catch(() => []),
    initialData: [],
  });

  const scanPackage = async () => {
    if (!singlePackage.name.trim()) return;
    setIsScanning(true);
    try {
      const res = await fetch('/api/functions/shieldAgentWorker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "scan_package",
          package_name: singlePackage.name,
          ecosystem: singlePackage.ecosystem
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setScanResult(result);
      toast.success("Package scan complete");
    } catch (error) {
      toast.error(`Scan failed: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const scanBatch = async () => {
    if (!batchList.trim()) return;
    setIsScanning(true);
    try {
      const packages = batchList.split('\n').filter(l => l.trim()).map(line => {
        const [name, version] = line.split('@');
        return { name: name.trim(), version: version?.trim() || 'latest' };
      });

      const res = await fetch('/api/functions/shieldAgentWorker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "scan_supply_chain",
          packages
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success(`Batch scan complete: ${result.packages_scanned || 0} packages`);
      qc.invalidateQueries({ queryKey: ["supply-chain-events"] });
    } catch (error) {
      toast.error(`Batch scan failed: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Supply Chain Security</h1>
            <p className="text-slate-400 mt-2">Socket.dev · OSV.dev · npm Registry · Real-time malware detection</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-700">
          {[
            { id: "single", label: "Single Package", icon: Package },
            { id: "batch", label: "Batch Scanner", icon: FileJson },
            { id: "events", label: "Live Event Feed", icon: Zap },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Single Package Scanner */}
        {activeTab === "single" && (
          <div className="space-y-6">
            <Card style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Search className="w-5 h-5 text-blue-400" />
                  Scan Single Package
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Input
                    value={singlePackage.name}
                    onChange={e => setSinglePackage({ ...singlePackage, name: e.target.value })}
                    placeholder="package-name"
                    className="bg-slate-800 border-slate-700 text-white flex-1"
                  />
                  <select
                    value={singlePackage.ecosystem}
                    onChange={e => setSinglePackage({ ...singlePackage, ecosystem: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
                  >
                    {ECOSYSTEMS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                  <Button onClick={scanPackage} disabled={isScanning || !singlePackage.name.trim()}
                    className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 font-semibold gap-2">
                    {isScanning ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</> : <><Search className="w-4 h-4" /> Scan</>}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Scan Result */}
            {scanResult && (
              <Card style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
                <CardHeader>
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-400" />
                    Scan Results: {scanResult.package_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-6">
                    <RiskGauge score={scanResult.risk_score || 0} size={100} />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400">Version:</span>
                        <span className="text-sm font-mono text-white">{scanResult.version}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400">Registry:</span>
                        <span className="text-sm font-mono text-white">{scanResult.ecosystem}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400">Issues:</span>
                        <div className="flex gap-1">
                          {scanResult.issues?.map((issue, i) => <IssueBadge key={i} type={issue.type} />)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
                    <p className="text-xs text-slate-400 mb-2">Data Sources:</p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">Socket.dev</Badge>
                      <Badge variant="outline" className="text-[10px]">OSV.dev</Badge>
                      <Badge variant="outline" className="text-[10px]">npm Registry</Badge>
                      <Badge variant="outline" className="text-[10px]">PyPI</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Batch Scanner */}
        {activeTab === "batch" && (
          <Card style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <FileJson className="w-5 h-5 text-blue-400" />
                Batch Package Scanner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={batchList}
                onChange={e => setBatchList(e.target.value)}
                placeholder="lodash@4.17.21&#10;express@4.18.2&#10;react@18.2.0"
                className="bg-slate-800 border-slate-700 text-white font-mono text-xs h-48"
              />
              <p className="text-xs text-slate-500">Format: package@version (one per line)</p>
              <Button onClick={scanBatch} disabled={isScanning || !batchList.trim()}
                className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 font-semibold gap-2">
                {isScanning ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</> : <><CheckCircle2 className="w-4 h-4" /> Scan All</>}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Live Event Feed */}
        {activeTab === "events" && (
          <Card style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-400" />
                Live Supply Chain Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {events.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">No events yet</div>
                ) : (
                  events.map((event) => (
                    <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 border border-slate-700">
                      <div className={`w-2 h-2 rounded-full ${event.severity === "critical" ? "bg-red-500 animate-pulse" : "bg-orange-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{event.package_name}@{event.version}</p>
                        <p className="text-[10px] text-slate-500">{event.event_type} · {event.registry}</p>
                      </div>
                      <IssueBadge type={event.event_type} />
                      <span className="text-[10px] text-slate-500 font-mono">{new Date(event.detected_at).toLocaleDateString()}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}