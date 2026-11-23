import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Cloud, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import {
  BORDER, CYAN, DANGER, LOW, MEDIUM, MUTED, TEXT, PAGE_BG, Card
} from "@/components/gds/GDSOSShared";

const PROVIDERS = [
  { key: "aws",   label: "Amazon Web Services",  color: "#ff9900", fields: [{ key: "access_key_id", label: "Access Key ID", type: "text" }, { key: "secret_access_key", label: "Secret Access Key", type: "password" }] },
  { key: "azure", label: "Microsoft Azure",       color: "#0078d4", fields: [{ key: "subscription_id", label: "Subscription ID", type: "text" }, { key: "bearer_token", label: "Bearer Token", type: "password" }] },
  { key: "gcp",   label: "Google Cloud Platform", color: "#4285f4", fields: [{ key: "project_id", label: "Project ID", type: "text" }, { key: "bearer_token", label: "Bearer Token", type: "password" }] },
];

function ProviderCard({ provider, existing }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const isConnected = existing?.status === "connected";

  const handleConnect = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await base44.functions.invoke("gdsCloudConnect", { provider: provider.key, ...form });
      setMsg({ type: "success", text: res.data?.message || "Connected successfully!" });
      qc.invalidateQueries(["cloud-accounts"]);
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Connection failed." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm"
          style={{ background: `${provider.color}20`, border: `1px solid ${provider.color}40`, color: provider.color }}>
          {provider.key.toUpperCase().slice(0, 3)}
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">{provider.label}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isConnected
              ? <><CheckCircle className="w-3 h-3" style={{ color: LOW }} /><span className="text-[10px] font-bold" style={{ color: LOW }}>Connected</span></>
              : <><AlertCircle className="w-3 h-3" style={{ color: MUTED }} /><span className="text-[10px] font-bold" style={{ color: MUTED }}>Not connected</span></>
            }
          </div>
        </div>
      </div>

      {/* Connected details */}
      {isConnected && existing && (
        <div className="mb-4 p-3 rounded-xl space-y-1.5" style={{ background: `${LOW}08`, border: `1px solid ${LOW}25` }}>
          {existing.account_id && <div className="flex justify-between text-[11px]"><span style={{ color: MUTED }}>Account ID</span><span className="font-mono" style={{ color: TEXT }}>{existing.account_id}</span></div>}
          {existing.account_name && <div className="flex justify-between text-[11px]"><span style={{ color: MUTED }}>Name</span><span style={{ color: TEXT }}>{existing.account_name}</span></div>}
          {existing.last_synced && <div className="flex justify-between text-[11px]"><span style={{ color: MUTED }}>Last validated</span><span style={{ color: MUTED }}>{new Date(existing.last_synced).toLocaleString()}</span></div>}
        </div>
      )}

      {/* Form */}
      <div className="space-y-3">
        {provider.fields.map(field => (
          <div key={field.key}>
            <label className="text-[10px] uppercase tracking-widest font-semibold block mb-1" style={{ color: MUTED }}>{field.label}</label>
            <input
              type={field.type}
              value={form[field.key] || ""}
              onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none font-mono"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
              placeholder={field.type === "password" ? "••••••••••••" : `Enter ${field.label}`}
            />
          </div>
        ))}
        <button onClick={handleConnect} disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50 mt-1"
          style={{ background: `${provider.color}18`, border: `1px solid ${provider.color}40`, color: provider.color }}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Connecting..." : `Connect ${provider.key.toUpperCase()}`}
        </button>
        {msg && (
          <p className="text-[11px] text-center font-medium" style={{ color: msg.type === "success" ? LOW : DANGER }}>{msg.text}</p>
        )}
      </div>
    </Card>
  );
}

export default function GDSCloudConnectPage() {
  const { data: accounts = [] } = useQuery({
    queryKey: ["cloud-accounts"],
    queryFn: () => base44.entities.CloudAccount.list().catch(() => []),
  });

  return (
    <div className="space-y-6" style={PAGE_BG}>
      <div>
        <h1 className="text-2xl font-black tracking-widest" style={{ color: CYAN }}>CLOUD CONNECT</h1>
        <p className="text-[10px] font-bold tracking-[0.2em] mt-0.5 uppercase" style={{ color: MUTED }}>GDS OS · Connect your cloud providers for security scanning</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {PROVIDERS.map(p => {
          const existing = accounts.find(a => a.provider === p.key);
          return <ProviderCard key={p.key} provider={p} existing={existing} />;
        })}
      </div>

      {accounts.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-3">Connected Accounts</h3>
          <div className="space-y-2">
            {accounts.map((a, i) => {
              const prov = PROVIDERS.find(p => p.key === a.provider);
              return (
                <div key={a.id || i} className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: "rgba(0,212,255,0.03)", border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black px-2 py-0.5 rounded"
                      style={{ color: prov?.color || MUTED, background: `${prov?.color || MUTED}18` }}>
                      {(a.provider || "?").toUpperCase()}
                    </span>
                    <span className="text-sm font-semibold text-white">{a.account_name || a.account_id || "Unnamed"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" style={{ color: LOW }} />
                    <span className="text-xs font-bold" style={{ color: LOW }}>Connected</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}