import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const AWS_SERVICES = ["S3", "IAM", "EC2", "CloudTrail", "RDS", "VPC"];
const GCP_SERVICES = ["IAM", "Storage", "Compute", "Logging"];
const AZURE_SERVICES = ["IAM", "Storage", "Network", "SecurityCenter"];

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none" onClick={() => onChange(!checked)}>
      <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
        style={{ background: checked ? "#3b82f6" : "transparent", border: `1px solid ${checked ? "#3b82f6" : "rgba(30,58,95,0.6)"}` }}>
        {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <span className="text-xs text-slate-300 font-mono">{label}</span>
    </label>
  );
}

function Field({ label, type = "text", value, onChange, placeholder, textarea }) {
  const base = "w-full px-3 py-2 rounded-lg text-sm text-white placeholder-slate-600 outline-none focus:ring-1 focus:ring-blue-500 transition-all";
  const style = { background: "#0f172a", border: "1px solid rgba(30,58,95,0.6)" };
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1 font-mono">{label}</label>
      {textarea
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={4}
            className={`${base} font-mono text-xs resize-none`} style={style} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className={base} style={style} />}
    </div>
  );
}

export default function ConnectCloudModal({ onClose, onSuccess }) {
  const [tab, setTab] = useState("aws");
  const [loading, setLoading] = useState(false);

  const [aws, setAws] = useState({ nickname: "Production AWS", key_id: "", secret: "", region: "us-east-1", services: ["S3","IAM","EC2","CloudTrail"] });
  const [gcp, setGcp] = useState({ nickname: "Production GCP", project_id: "", sa_json: "", services: ["IAM","Storage","Compute","Logging"] });
  const [azure, setAzure] = useState({ nickname: "Production Azure", sub_id: "", tenant_id: "", client_id: "", client_secret: "", services: ["IAM","Storage","Network","SecurityCenter"] });

  const toggleSvc = (state, setState, svc) => {
    setState(s => ({ ...s, services: s.services.includes(svc) ? s.services.filter(x => x !== svc) : [...s.services, svc] }));
  };

  const submit = async () => {
    setLoading(true);
    try {
      let accountData, payload, fn;

      if (tab === "aws") {
        if (!aws.key_id || !aws.secret) { toast.error("Access Key ID and Secret are required"); return; }
        accountData = { provider: "aws", nickname: aws.nickname, account_id: aws.key_id.slice(-8), regions_scanned: aws.region, scan_services: aws.services.join(","), status: "scanning" };
        payload = { aws_access_key_id: aws.key_id, aws_secret_access_key: aws.secret, aws_region: aws.region, scan_services: aws.services };
        fn = "shieldScanAWS";
      } else if (tab === "gcp") {
        if (!gcp.project_id || !gcp.sa_json) { toast.error("Project ID and Service Account JSON are required"); return; }
        accountData = { provider: "gcp", nickname: gcp.nickname, project_id: gcp.project_id, scan_services: gcp.services.join(","), status: "scanning" };
        payload = { service_account_json: gcp.sa_json, project_id: gcp.project_id, scan_services: gcp.services };
        fn = "shieldScanGCP";
      } else {
        if (!azure.sub_id || !azure.tenant_id || !azure.client_id || !azure.client_secret) { toast.error("All Azure fields are required"); return; }
        accountData = { provider: "azure", nickname: azure.nickname, subscription_id: azure.sub_id, azure_tenant_id: azure.tenant_id, azure_client_id: azure.client_id, scan_services: azure.services.join(","), status: "scanning" };
        payload = { client_id: azure.client_id, client_secret: azure.client_secret, tenant_id: azure.tenant_id, subscription_id: azure.sub_id, scan_services: azure.services };
        fn = "shieldScanAzure";
      }

      const account = await base44.entities.CloudAccount.create(accountData);
      toast.info(`Scanning ${accountData.nickname}…`);

      const res = await base44.functions.invoke(fn, payload);
      const { findings, summary } = res.data;

      if (findings?.length > 0) {
        await base44.entities.CloudFinding.bulkCreate(findings.map(f => ({ ...f, cloud_account_id: account.id, status: "open" })));
      }

      await base44.entities.CloudAccount.update(account.id, {
        status: "connected",
        last_scanned: new Date().toISOString(),
        total_findings: summary.total,
        critical_count: summary.critical,
        high_count: summary.high,
        medium_count: summary.medium,
        risk_score: summary.risk_score,
      });

      toast.success(`Done! Found ${summary.total} findings (${summary.critical} critical)`);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(`Scan failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const TABS = [
    { id: "aws", label: "AWS", color: "#FF9900" },
    { id: "gcp", label: "GCP", color: "#4285F4" },
    { id: "azure", label: "Azure", color: "#0078D4" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(3,7,18,0.85)", backdropFilter: "blur(8px)" }}>
      <div className="rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: "#0f172a", border: "1px solid rgba(30,58,95,0.5)", boxShadow: "0 0 60px rgba(0,0,0,0.6)" }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid rgba(30,58,95,0.4)" }}>
          <div>
            <h2 className="text-base font-bold text-white">Connect Cloud Account</h2>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">Scan AWS, GCP, or Azure for misconfigurations</p>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex p-4 gap-2" style={{ borderBottom: "1px solid rgba(30,58,95,0.3)" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 py-2 rounded-lg text-sm font-bold transition-all font-mono"
              style={tab === t.id
                ? { color: t.color, background: `${t.color}18`, border: `1px solid ${t.color}55` }
                : { color: "#475569", background: "transparent", border: "1px solid rgba(30,58,95,0.4)" }}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {tab === "aws" && (
            <>
              <Field label="Account Nickname" value={aws.nickname} onChange={v => setAws(s=>({...s,nickname:v}))} placeholder="Production AWS" />
              <Field label="Access Key ID" type="password" value={aws.key_id} onChange={v => setAws(s=>({...s,key_id:v}))} placeholder="AKIAIOSFODNN7EXAMPLE" />
              <Field label="Secret Access Key" type="password" value={aws.secret} onChange={v => setAws(s=>({...s,secret:v}))} placeholder="wJalrXUtnFEMI/K7MDENG..." />
              <Field label="Primary Region" value={aws.region} onChange={v => setAws(s=>({...s,region:v}))} placeholder="us-east-1" />
              <div>
                <label className="block text-xs text-slate-400 mb-2 font-mono">Services to Scan</label>
                <div className="grid grid-cols-3 gap-2">{AWS_SERVICES.map(s => <Checkbox key={s} label={s} checked={aws.services.includes(s)} onChange={() => toggleSvc(aws, setAws, s)} />)}</div>
              </div>
            </>
          )}
          {tab === "gcp" && (
            <>
              <Field label="Account Nickname" value={gcp.nickname} onChange={v => setGcp(s=>({...s,nickname:v}))} placeholder="Production GCP" />
              <Field label="Project ID" value={gcp.project_id} onChange={v => setGcp(s=>({...s,project_id:v}))} placeholder="my-project-123456" />
              <Field label="Service Account JSON" textarea value={gcp.sa_json} onChange={v => setGcp(s=>({...s,sa_json:v}))} placeholder='{"type":"service_account",...}' />
              <div>
                <label className="block text-xs text-slate-400 mb-2 font-mono">Services to Scan</label>
                <div className="grid grid-cols-2 gap-2">{GCP_SERVICES.map(s => <Checkbox key={s} label={s} checked={gcp.services.includes(s)} onChange={() => toggleSvc(gcp, setGcp, s)} />)}</div>
              </div>
            </>
          )}
          {tab === "azure" && (
            <>
              <Field label="Account Nickname" value={azure.nickname} onChange={v => setAzure(s=>({...s,nickname:v}))} placeholder="Production Azure" />
              <Field label="Subscription ID" value={azure.sub_id} onChange={v => setAzure(s=>({...s,sub_id:v}))} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
              <Field label="Tenant ID" value={azure.tenant_id} onChange={v => setAzure(s=>({...s,tenant_id:v}))} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
              <Field label="Client ID (App Registration)" value={azure.client_id} onChange={v => setAzure(s=>({...s,client_id:v}))} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
              <Field label="Client Secret" type="password" value={azure.client_secret} onChange={v => setAzure(s=>({...s,client_secret:v}))} placeholder="your-client-secret" />
              <div>
                <label className="block text-xs text-slate-400 mb-2 font-mono">Services to Scan</label>
                <div className="grid grid-cols-2 gap-2">{AZURE_SERVICES.map(s => <Checkbox key={s} label={s} checked={azure.services.includes(s)} onChange={() => toggleSvc(azure, setAzure, s)} />)}</div>
              </div>
            </>
          )}

          <button onClick={submit} disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: tab === "aws" ? "linear-gradient(135deg,#b45309,#FF9900)" : tab === "gcp" ? "linear-gradient(135deg,#1d4ed8,#4285F4)" : "linear-gradient(135deg,#0369a1,#0078D4)" }}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Scanning…</> : `Connect & Scan ${tab.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}