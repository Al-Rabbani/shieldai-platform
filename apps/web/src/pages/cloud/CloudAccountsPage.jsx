import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Plus, RefreshCw, ArrowRight, Cloud, AlertTriangle, Flame } from "lucide-react";
import { toast } from "sonner";
import ProviderBadge from "@/components/cloud/ProviderBadge";
import ConnectCloudModal from "@/components/cloud/ConnectCloudModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PROV_COLORS = { aws: "#FF9900", gcp: "#4285F4", azure: "#0078D4", oci: "#F97316" };

function RiskBadge({ score }) {
  const color = score >= 70 ? "#ef4444" : score >= 40 ? "#f97316" : "#10b981";
  return (
    <span className="text-sm font-black font-mono px-2 py-1 rounded-lg"
      style={{ color, background: `${color}15`, border: `1px solid ${color}40` }}>
      {score}/100
    </span>
  );
}

function AccountCard({ account, onRescan }) {
  const provColor = PROV_COLORS[account.provider] || "#94a3b8";
  const statusColor = account.status === "connected" ? "#10b981" : account.status === "scanning" ? "#3b82f6" : account.status === "error" ? "#ef4444" : "#475569";
  return (
    <div className="rounded-xl p-5 card-hover" style={{ background: "#0d1117", border: "1px solid rgba(30,58,95,0.4)" }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${provColor}18`, border: `1px solid ${provColor}40` }}>
            <Cloud className="w-5 h-5" style={{ color: provColor }} />
          </div>
          <div>
            <p className="text-sm font-bold text-white">{account.nickname}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <ProviderBadge provider={account.provider} />
              {account.account_id && <span className="text-[10px] text-slate-500 font-mono">···{account.account_id}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
          <span className="text-[10px] font-mono capitalize" style={{ color: statusColor }}>{account.status}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center p-2 rounded-lg" style={{ background: "#161b22" }}>
          <p className="text-lg font-black font-mono text-red-400">{account.critical_count || 0}</p>
          <p className="text-[9px] text-slate-600 uppercase font-mono">CRIT</p>
        </div>
        <div className="text-center p-2 rounded-lg" style={{ background: "#161b22" }}>
          <p className="text-lg font-black font-mono text-orange-400">{account.high_count || 0}</p>
          <p className="text-[9px] text-slate-600 uppercase font-mono">HIGH</p>
        </div>
        <div className="text-center p-2 rounded-lg" style={{ background: "#161b22" }}>
          <p className="text-lg font-black font-mono text-yellow-400">{account.medium_count || 0}</p>
          <p className="text-[9px] text-slate-600 uppercase font-mono">MED</p>
        </div>
        <div className="text-center p-2 rounded-lg" style={{ background: "#161b22" }}>
          <RiskBadge score={account.risk_score || 0} />
          <p className="text-[9px] text-slate-600 uppercase font-mono mt-1">RISK</p>
        </div>
      </div>

      {account.last_scanned && (
        <p className="text-[10px] text-slate-500 font-mono mb-4">
          Last scanned: {new Date(account.last_scanned).toLocaleString()}
          {account.regions_scanned && ` · ${account.regions_scanned}`}
        </p>
      )}

      <div className="flex gap-2">
        <button onClick={() => onRescan(account)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-all"
          style={{ background: "#161b22", border: "1px solid rgba(30,58,95,0.4)" }}>
          <RefreshCw className="w-3 h-3" /> Re-scan
        </button>
        <Link to={`/cloud/findings?account=${account.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-blue-400 hover:text-blue-300 transition-all"
          style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)" }}>
          View Findings <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

export default function CloudAccountsPage() {
  const [showModal, setShowModal] = useState(false);
  const [showOCI, setShowOCI] = useState(false);
  const [ociForm, setOciForm] = useState({ tenancy_ocid: "", user_ocid: "", private_key: "", fingerprint: "", region: "" });
  const qc = useQueryClient();

  const { data: accounts = [] } = useQuery({
    queryKey: ["cloud-accounts"],
    queryFn: () => base44.entities.CloudAccount.list("-created_date", 50),
    initialData: [],
  });

  const { data: findings = [] } = useQuery({
    queryKey: ["cloud-findings-stats"],
    queryFn: () => base44.entities.CloudFinding.list("-detected_at", 500),
    initialData: [],
  });

  const totalCritical = findings.filter(f => f.severity === "critical" && f.status === "open").length;
  const totalHigh = findings.filter(f => f.severity === "high" && f.status === "open").length;
  const avgRisk = accounts.length > 0
    ? Math.round(accounts.reduce((s, a) => s + (a.risk_score || 0), 0) / accounts.length)
    : 0;

  const onRescan = async (account) => {
    toast.info(`Re-scanning ${account.nickname}…`);
    await base44.entities.CloudAccount.update(account.id, { status: "scanning" });
    qc.invalidateQueries({ queryKey: ["cloud-accounts"] });
  };

  const stats = [
    { label: "Cloud Accounts", value: accounts.length, color: "#3b82f6", icon: "☁️" },
    { label: "Critical Findings", value: totalCritical, color: "#ef4444", icon: "🔴" },
    { label: "High Findings", value: totalHigh, color: "#f97316", icon: "🟠" },
    { label: "Avg Risk Score", value: `${avgRisk}/100`, color: avgRisk >= 70 ? "#ef4444" : avgRisk >= 40 ? "#f97316" : "#10b981", icon: "📊" },
  ];

  return (
    <div className="space-y-6">
      {showModal && <ConnectCloudModal onClose={() => setShowModal(false)} onSuccess={() => qc.invalidateQueries()} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Cloud Security</h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">AWS · GCP · Azure — real-time misconfiguration scanning</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", boxShadow: "0 0 20px rgba(59,130,246,0.3)" }}>
          <Plus className="w-4 h-4" /> Connect Cloud Account
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "#0d1117", border: "1px solid rgba(30,58,95,0.4)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{s.icon}</span>
            </div>
            <p className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-mono mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Accounts grid */}
      {/* Oracle Cloud Modal */}
      <Dialog open={showOCI} onOpenChange={setShowOCI}>
        <DialogContent className="bg-[#0d1117] border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Flame className="w-5 h-5" style={{ color: "#F97316" }} />
              Connect Oracle Cloud (OCI)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label className="text-slate-300 text-xs">Tenancy OCID</Label>
              <Input value={ociForm.tenancy_ocid} onChange={(e) => setOciForm({...ociForm, tenancy_ocid: e.target.value})}
                className="bg-[#161b22] border-slate-700 text-white text-sm" placeholder="ocid1.tenancy.oc1..." />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">User OCID</Label>
              <Input value={ociForm.user_ocid} onChange={(e) => setOciForm({...ociForm, user_ocid: e.target.value})}
                className="bg-[#161b22] border-slate-700 text-white text-sm" placeholder="ocid1.user.oc1..." />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Private Key</Label>
              <Input value={ociForm.private_key} onChange={(e) => setOciForm({...ociForm, private_key: e.target.value})}
                className="bg-[#161b22] border-slate-700 text-white text-sm" placeholder="-----BEGIN PRIVATE KEY-----" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-300 text-xs">Fingerprint</Label>
                <Input value={ociForm.fingerprint} onChange={(e) => setOciForm({...ociForm, fingerprint: e.target.value})}
                  className="bg-[#161b22] border-slate-700 text-white text-sm" placeholder="aa:bb:cc:..." />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Region</Label>
                <Input value={ociForm.region} onChange={(e) => setOciForm({...ociForm, region: e.target.value})}
                  className="bg-[#161b22] border-slate-700 text-white text-sm" placeholder="us-phoenix-1" />
              </div>
            </div>
            <Button onClick={() => {
              // In production: create CloudAccount with provider="oci"
              setShowOCI(false);
              setOciForm({ tenancy_ocid: "", user_ocid: "", private_key: "", fingerprint: "", region: "" });
            }} className="w-full" style={{ background: "#F97316" }}>
              <Flame className="w-4 h-4 mr-2" /> Connect Oracle Cloud
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {accounts.length === 0 ? (
        <div className="rounded-2xl p-16 text-center" style={{ background: "#0d1117", border: "1px dashed rgba(30,58,95,0.5)" }}>
          <Cloud className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-400 mb-2">No cloud accounts connected</p>
          <p className="text-xs text-slate-600 mb-6">Connect AWS, GCP, Azure, or Oracle Cloud (OCI) to start scanning for misconfigurations</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setShowModal(true)}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)" }}>
              <Plus className="w-4 h-4 inline mr-2" /> Connect AWS/GCP/Azure
            </button>
            <button onClick={() => setShowOCI(true)}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2"
              style={{ background: "linear-gradient(135deg,#F97316,#FB923C)" }}>
              <Flame className="w-4 h-4" /> Oracle Cloud (OCI)
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map(a => <AccountCard key={a.id} account={a} onRescan={onRescan} />)}
        </div>
      )}
    </div>
  );
}