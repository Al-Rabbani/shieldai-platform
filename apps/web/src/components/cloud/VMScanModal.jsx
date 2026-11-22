import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Monitor, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const OS_OPTIONS = [
  { value: "ubuntu", label: "Ubuntu" },
  { value: "debian", label: "Debian" },
  { value: "rhel", label: "RHEL" },
  { value: "amazon_linux", label: "Amazon Linux" },
  { value: "alpine", label: "Alpine" },
];

export default function VMScanModal({ onClose }) {
  const [form, setForm] = useState({
    os: "ubuntu",
    instance_id: "",
    nickname: "",
    package_manifest: ""
  });
  const [isScanning, setIsScanning] = useState(false);
  const qc = useQueryClient();

  const scanVM = async () => {
    setIsScanning(true);
    try {
      // Parse package manifest
      const packages = form.package_manifest.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [name, version] = line.split('@');
          return { name: name.trim(), version: version?.trim() || 'unknown' };
        });

      const res = await fetch('/api/functions/shieldAgentWorker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scan_vm',
          vm_data: {
            os: form.os,
            instance_id: form.instance_id,
            packages
          }
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      // Create VMScan entity
      const scanEntity = await base44.entities.VMScan.create({
        nickname: form.nickname || form.instance_id,
        instance_id: form.instance_id,
        provider: "aws",
        os_name: form.os,
        status: "completed",
        scanned_at: new Date().toISOString(),
        total_findings: result.total_findings || 0,
        critical_count: result.critical || 0,
        high_count: result.high || 0,
        medium_count: result.medium || 0,
        low_count: result.low || 0,
        risk_score: result.risk_score || 0,
        packages_scanned: packages.length
      });

      // Create VMFinding entities
      if (result.findings) {
        for (const finding of result.findings) {
          await base44.entities.VMFinding.create({
            scan_id: scanEntity.id,
            ...finding
          }).catch(() => {});
        }
      }

      toast.success(`VM scan complete: ${result.total_findings || 0} CVEs found`);
      qc.invalidateQueries({ queryKey: ["vm-scans"] });
      onClose();
    } catch (error) {
      toast.error(`Scan failed: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Monitor className="w-5 h-5 text-sky-400" />
            Scan Virtual Machine
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Paste package manifest from your VM to detect CVEs
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block uppercase">Operating System</label>
              <select
                value={form.os}
                onChange={e => setForm({ ...form, os: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
              >
                {OS_OPTIONS.map(os => (
                  <option key={os.value} value={os.value}>{os.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block uppercase">Instance ID</label>
              <Input
                value={form.instance_id}
                onChange={e => setForm({ ...form, instance_id: e.target.value })}
                placeholder="i-0abc123def456"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block uppercase">Nickname (optional)</label>
            <Input
              value={form.nickname}
              onChange={e => setForm({ ...form, nickname: e.target.value })}
              placeholder="Production Web Server"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block uppercase">
              Package Manifest
              <span className="text-[10px] text-slate-500 ml-2">
                Run: dpkg -l {"|"} grep -v '^rc' {"|"} awk {'{print $2"@"$3}'}
              </span>
            </label>
            <Textarea
              value={form.package_manifest}
              onChange={e => setForm({ ...form, package_manifest: e.target.value })}
              placeholder="bash@5.0-1&#10;curl@7.68.0-1&#10;openssl@1.1.1-1"
              className="bg-slate-800 border-slate-700 text-white font-mono text-xs h-48"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Paste output from package manager. One package@version per line.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300">
            Cancel
          </Button>
          <Button
            onClick={scanVM}
            disabled={!form.instance_id || !form.package_manifest.trim() || isScanning}
            className="bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-500/30 font-semibold gap-2"
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