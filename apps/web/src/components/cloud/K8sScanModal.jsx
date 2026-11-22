import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Shield, CheckCircle2, Copy, Terminal } from "lucide-react";
import { toast } from "sonner";

const SCAN_MODES = [
  { value: "manifest", label: "Manifest Upload", icon: Terminal },
  { value: "api", label: "Live API Server", icon: Shield },
];

export default function K8sScanModal({ onClose }) {
  const [mode, setMode] = useState("manifest");
  const [form, setForm] = useState({
    nickname: "",
    namespace: "default",
    manifest: "",
    api_url: "",
    bearer_token: "",
  });
  const [isScanning, setIsScanning] = useState(false);
  const qc = useQueryClient();

  const scanK8s = async () => {
    setIsScanning(true);
    try {
      const payload = {
        action: "scan_k8s",
        mode,
        cluster_nickname: form.nickname || "kubernetes-cluster",
        namespace: form.namespace,
      };

      if (mode === "manifest") {
        payload.manifest_json = form.manifest;
      } else {
        payload.api_url = form.api_url;
        payload.bearer_token = form.bearer_token;
      }

      const res = await fetch('/api/functions/shieldScanK8s', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      // Create K8sScan entity
      const scan = await base44.entities.K8sScan.create({
        nickname: form.nickname || "kubernetes-cluster",
        provider: "kubernetes",
        namespace: form.namespace,
        scan_mode: mode,
        status: "completed",
        scanned_at: new Date().toISOString(),
        critical_count: result.critical || 0,
        high_count: result.high || 0,
        medium_count: result.medium || 0,
        low_count: result.low || 0,
        risk_score: result.risk_score || 0,
        resources_scanned: result.resources_scanned || 0,
      }).catch(() => {});

      // Create K8sFinding entities
      if (result.findings && scan) {
        for (const finding of result.findings) {
          await base44.entities.K8sFinding.create({
            scan_id: scan.id,
            ...finding
          }).catch(() => {});
        }
      }

      toast.success(`K8s scan complete: ${result.resources_scanned || 0} resources, ${result.total_findings || 0} findings`);
      qc.invalidateQueries({ queryKey: ["k8s-scans"] });
      onClose();
    } catch (error) {
      toast.error(`Scan failed: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const copyKubectlCommand = () => {
    const cmd = `kubectl get all,configmap,secret,networkpolicy,ingress -n ${form.namespace} -o json`;
    navigator.clipboard.writeText(cmd);
    toast.success("kubectl command copied!");
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            Scan Kubernetes Cluster
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Detect misconfigurations, RBAC issues, and security vulnerabilities
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Mode Selection */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block uppercase">Scan Mode</label>
            <div className="grid grid-cols-2 gap-3">
              {SCAN_MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={`p-3 rounded-lg border flex items-center gap-3 transition-all ${
                    mode === m.value
                      ? "bg-blue-500/10 border-blue-500/30"
                      : "bg-slate-800 border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <m.icon className={`w-5 h-5 ${mode === m.value ? "text-blue-400" : "text-slate-500"}`} />
                  <span className={`text-sm font-semibold ${mode === m.value ? "text-blue-400" : "text-slate-300"}`}>
                    {m.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {mode === "manifest" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block uppercase">Cluster Nickname</label>
                  <Input
                    value={form.nickname}
                    onChange={e => setForm({ ...form, nickname: e.target.value })}
                    placeholder="production-cluster"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block uppercase">Namespace</label>
                  <Input
                    value={form.namespace}
                    onChange={e => setForm({ ...form, namespace: e.target.value })}
                    placeholder="default"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-slate-400 uppercase">Manifest JSON</label>
                  <button
                    onClick={copyKubectlCommand}
                    className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy kubectl command
                  </button>
                </div>
                <Textarea
                  value={form.manifest}
                  onChange={e => setForm({ ...form, manifest: e.target.value })}
                  placeholder='{"kind": "List", "items": [...]}'
                  className="bg-slate-800 border-slate-700 text-white font-mono text-xs h-48"
                />
                <div className="mt-2 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-[10px] text-slate-500 font-mono mb-1">Run this to export:</p>
                  <code className="text-[10px] text-blue-400 font-mono break-all">
                    kubectl get all,configmap,secret,networkpolicy,ingress -n {form.namespace} -o json
                  </code>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block uppercase">Cluster API URL</label>
                  <Input
                    value={form.api_url}
                    onChange={e => setForm({ ...form, api_url: e.target.value })}
                    placeholder="https://my-cluster:6443"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block uppercase">Namespace</label>
                  <Input
                    value={form.namespace}
                    onChange={e => setForm({ ...form, namespace: e.target.value })}
                    placeholder="default"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block uppercase">Bearer Token</label>
                <Input
                  type="password"
                  value={form.bearer_token}
                  onChange={e => setForm({ ...form, bearer_token: e.target.value })}
                  placeholder="Service account token"
                  className="bg-slate-800 border-slate-700 text-white"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Create a service account with read-only cluster access
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300">
            Cancel
          </Button>
          <Button
            onClick={scanK8s}
            disabled={(mode === "manifest" && !form.manifest.trim()) || (mode === "api" && !form.api_url) || isScanning}
            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 font-semibold gap-2"
          >
            {isScanning ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> Start Scan</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}