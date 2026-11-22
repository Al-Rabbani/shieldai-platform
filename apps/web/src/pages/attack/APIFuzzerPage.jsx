import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Zap, Search, Shield, AlertTriangle, FileJson, Loader2, ExternalLink, Target, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const METHOD_COLORS = {
  GET: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  POST: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  PUT: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  DELETE: "bg-red-500/10 text-red-400 border-red-500/30",
  PATCH: "bg-purple-500/10 text-purple-400 border-purple-500/30",
};

const ISSUE_ICONS = {
  sqli: "🔴",
  xss: "🟠",
  idor: "🔴",
  mass_assignment: "🟠",
  broken_auth: "🔴",
  graphql: "🟣",
  ssrf: "🔴",
  rce: "🔴",
  path_traversal: "🟠",
};

export default function APIFuzzerPage() {
  const [showModal, setShowModal] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [form, setForm] = useState({
    target_url: "",
    action: "discover",
    fuzz_depth: "standard",
    auth_type: "none",
    auth_config: {}
  });

  const qc = useQueryClient();

  const { data: scans = [] } = useQuery({
    queryKey: ["api-fuzz-scans"],
    queryFn: () => base44.entities.APIFuzzJob.list("-created_at", 50).catch(() => []),
    initialData: [],
  });

  const { data: findings = [] } = useQuery({
    queryKey: ["api-fuzz-findings"],
    queryFn: () => base44.entities.APIFuzzFinding.list("-detected_at", 200).catch(() => []),
    initialData: [],
  });

  const runAPIFuzzer = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/functions/shieldAPIFuzzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setScanResult(data);
      toast.success(`API Fuzz complete: ${data.endpoints_discovered} endpoints, ${data.findings?.length || 0} findings`);
      qc.invalidateQueries({ queryKey: ["api-fuzz-scans"] });
      setShowModal(false);
    } catch (error) {
      toast.error(`Scan failed: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] p-6">
      {showModal && (
        <Dialog open onOpenChange={setShowModal}>
          <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                New API Fuzz Scan
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Configure API discovery and fuzzing parameters
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-slate-300">Target URL</Label>
                <Input
                  value={form.target_url}
                  onChange={e => setForm({ ...form, target_url: e.target.value })}
                  placeholder="https://api.example.com"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Action</Label>
                <Select value={form.action} onValueChange={v => setForm({ ...form, action: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="discover">Discover Only</SelectItem>
                    <SelectItem value="full">Full Scan (Discover + Fuzz)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Fuzz Depth</Label>
                <Select value={form.fuzz_depth} onValueChange={v => setForm({ ...form, fuzz_depth: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="quick">Quick</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="deep">Deep</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Authentication</Label>
                <Select value={form.auth_type} onValueChange={v => setForm({ ...form, auth_type: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                    <SelectItem value="api_key">API Key</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowModal(false)} className="border-slate-700">
                Cancel
              </Button>
              <Button onClick={runAPIFuzzer} disabled={!form.target_url || isScanning}
                className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 font-semibold gap-2">
                {isScanning ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</> : <><Zap className="w-4 h-4" /> Start Scan</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">API Security Fuzzer</h1>
            <p className="text-slate-400 mt-2">OpenAPI discovery · Active fuzzing · IDOR detection · Mass assignment testing</p>
          </div>
          <Button onClick={() => setShowModal(true)}
            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 font-semibold gap-2">
            <Zap className="w-4 h-4" /> New API Scan
          </Button>
        </div>

        {/* Scan Results */}
        {scanResult && (
          <>
            {/* Discovery Card */}
            <Card style={{ background: "#0a0f1e", border: scanResult.spec_found ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(249,115,22,0.3)" }}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  {scanResult.spec_found ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">✅ OpenAPI spec found</p>
                        <p className="text-xs text-slate-400 font-mono">{scanResult.spec_url}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">⚠️ No spec — crawl discovery used</p>
                        <p className="text-xs text-slate-400">Endpoints discovered via HTTP crawling</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card style={{ background: "#0a0f1e", border: "1px solid rgba(59,130,246,0.3)" }}>
                <CardContent className="pt-6">
                  <p className="text-xs text-slate-400 uppercase font-semibold">Endpoints Discovered</p>
                  <p className="text-3xl font-black text-blue-400 mt-1">{scanResult.endpoints_discovered || 0}</p>
                </CardContent>
              </Card>
              <Card style={{ background: "#0a0f1e", border: "1px solid rgba(139,92,246,0.3)" }}>
                <CardContent className="pt-6">
                  <p className="text-xs text-slate-400 uppercase font-semibold">Endpoints Fuzzed</p>
                  <p className="text-3xl font-black text-purple-400 mt-1">{scanResult.endpoints_fuzzed || 0}</p>
                </CardContent>
              </Card>
              <Card style={{ background: "#0a0f1e", border: "1px solid rgba(239,68,68,0.3)" }}>
                <CardContent className="pt-6">
                  <p className="text-xs text-slate-400 uppercase font-semibold">Findings</p>
                  <p className="text-3xl font-black text-red-400 mt-1">{scanResult.findings?.length || 0}</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Endpoints Table */}
        {scanResult?.endpoints && scanResult.endpoints.length > 0 && (
          <Card style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
            <CardHeader>
              <CardTitle className="text-white text-base">Discovered Endpoints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {scanResult.endpoints.slice(0, 20).map((ep, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 border border-slate-700">
                    <Badge className={`text-[10px] font-bold ${METHOD_COLORS[ep.method] || "bg-slate-500/10 text-slate-400"}`}>
                      {ep.method}
                    </Badge>
                    <code className="text-sm text-slate-300 font-mono flex-1">{ep.path}</code>
                    {ep.parameters?.length > 0 && (
                      <span className="text-xs text-slate-500">{ep.parameters.length} params</span>
                    )}
                    {ep.auth_required && (
                      <Badge className="text-[10px]" variant="outline">🔒 Auth</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Findings */}
        {findings.length > 0 && (
          <Card style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
            <CardHeader>
              <CardTitle className="text-white text-base">Security Findings</CardTitle>
              <p className="text-xs text-slate-500 mt-1">Data sources: OpenAPI Discovery · Active HTTP Fuzzing · IDOR Detection · Mass Assignment Testing</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {findings.slice(0, 20).map((f) => (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 border border-slate-700">
                    <span className="text-lg">{ISSUE_ICONS[f.type] || "⚪"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{f.title}</p>
                      <p className="text-xs text-slate-500 font-mono">{f.endpoint} · {f.parameter}</p>
                    </div>
                    <Badge className={`text-[10px] font-bold ${
                      f.severity === "critical" ? "bg-red-500/10 text-red-400" :
                      f.severity === "high" ? "bg-orange-500/10 text-orange-400" :
                      "bg-yellow-500/10 text-yellow-400"
                    }`}>
                      {f.severity.toUpperCase()}
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