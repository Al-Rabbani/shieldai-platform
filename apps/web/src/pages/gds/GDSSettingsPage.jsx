import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Settings, Save, CheckCircle, Bell, RefreshCw } from "lucide-react";
import {
  CARD, BORDER, CYAN, LOW, MUTED, TEXT,
  Skeleton, Breadcrumb, Card, PAGE_BG
} from "@/components/gds/GDSOSShared";

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)}
      className="relative inline-flex items-center w-10 h-5 rounded-full transition-colors flex-shrink-0"
      style={{ background: value ? CYAN : "rgba(255,255,255,0.1)" }}>
      <span className="inline-block w-4 h-4 rounded-full bg-white transition-transform shadow"
        style={{ transform: value ? "translateX(22px)" : "translateX(2px)" }} />
    </button>
  );
}

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white mb-1">{label}</label>
      {children}
      {hint && <p className="text-[10px] mt-1" style={{ color: MUTED }}>{hint}</p>}
    </div>
  );
}

export default function GDSSettingsPage() {
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [digestSending, setDigestSending] = useState(false);
  const [digestResult, setDigestResult] = useState(null);

  const sendDigest = async () => {
    setDigestSending(true); setDigestResult(null);
    try {
      const r = await base44.functions.invoke("gdsNotificationEngine", { action: "digest" });
      setDigestResult(r.data?.summary || r.data?.result || "Daily digest sent!");
      setTimeout(() => setDigestResult(null), 5000);
    } catch (e) { setDigestResult(`Error: ${e.message}`); }
    finally { setDigestSending(false); }
  };
  const [form, setForm] = useState({
    organization_name: "", domain: "", industry: "",
    sla_critical_hours: 4, sla_high_hours: 24, sla_medium_hours: 72, sla_low_hours: 168,
    auto_triage_enabled: true, auto_fix_enabled: false, ci_gate_enabled: false,
    ci_gate_block_severity: "critical", data_residency: "us", retention_days: 90,
  });

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["gds-org-settings"],
    queryFn: () => base44.entities.OrgSettings.list().catch(() => []),
  });

  const record = settings[0];

  useEffect(() => {
    if (record) {
      setForm(prev => ({ ...prev, ...record }));
    }
  }, [record]);

  const saveMutation = useMutation({
    mutationFn: () => record
      ? base44.entities.OrgSettings.update(record.id, form)
      : base44.entities.OrgSettings.create(form),
    onSuccess: () => {
      qc.invalidateQueries(["gds-org-settings"]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const inputClass = "w-full px-3 py-2 rounded-xl text-sm outline-none transition-all";
  const inputStyle = { background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT };

  if (isLoading) return <div className="p-6"><Skeleton lines={8} /></div>;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Settings" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Settings</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Organisation configuration, SLA policies, and platform automation</p>
        </div>
        <button onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60"
          style={{ background: saved ? `${LOW}20` : `${CYAN}15`, border: `1px solid ${saved ? LOW : CYAN}40`, color: saved ? LOW : CYAN }}>
          {saved ? <><CheckCircle className="w-4 h-4" />Saved!</> : <><Save className="w-4 h-4" />Save Changes</>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organisation */}
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><Settings className="w-4 h-4" style={{ color: CYAN }} />Organisation</h3>
          <Field label="Organisation Name">
            <input value={form.organization_name} onChange={e => set("organization_name", e.target.value)}
              className={inputClass} style={inputStyle} placeholder="Acme Corp" />
          </Field>
          <Field label="Domain">
            <input value={form.domain} onChange={e => set("domain", e.target.value)}
              className={inputClass} style={inputStyle} placeholder="acme.com" />
          </Field>
          <Field label="Industry">
            <input value={form.industry} onChange={e => set("industry", e.target.value)}
              className={inputClass} style={inputStyle} placeholder="Technology, Finance, Healthcare..." />
          </Field>
          <Field label="Data Residency">
            <select value={form.data_residency} onChange={e => set("data_residency", e.target.value)}
              className={inputClass + " cursor-pointer"} style={inputStyle}>
              {["us","eu","uk","global"].map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
            </select>
          </Field>
          <Field label="Data Retention (days)">
            <input type="number" value={form.retention_days} onChange={e => set("retention_days", parseInt(e.target.value))}
              className={inputClass} style={inputStyle} min={30} max={365} />
          </Field>
        </Card>

        {/* SLA Thresholds */}
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">SLA Thresholds</h3>
          <Field label="Critical (hours)" hint="Max hours to remediate a critical finding">
            <input type="number" value={form.sla_critical_hours} onChange={e => set("sla_critical_hours", parseInt(e.target.value))}
              className={inputClass} style={inputStyle} min={1} />
          </Field>
          <Field label="High (hours)">
            <input type="number" value={form.sla_high_hours} onChange={e => set("sla_high_hours", parseInt(e.target.value))}
              className={inputClass} style={inputStyle} min={1} />
          </Field>
          <Field label="Medium (hours)">
            <input type="number" value={form.sla_medium_hours} onChange={e => set("sla_medium_hours", parseInt(e.target.value))}
              className={inputClass} style={inputStyle} min={1} />
          </Field>
          <Field label="Low (hours)">
            <input type="number" value={form.sla_low_hours} onChange={e => set("sla_low_hours", parseInt(e.target.value))}
              className={inputClass} style={inputStyle} min={1} />
          </Field>
        </Card>

        {/* Automation */}
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Automation</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Auto Triage</p>
              <p className="text-[10px]" style={{ color: MUTED }}>Automatically prioritise and label incoming findings</p>
            </div>
            <Toggle value={form.auto_triage_enabled} onChange={v => set("auto_triage_enabled", v)} />
          </div>
          <div className="h-px" style={{ background: BORDER }} />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Auto Fix PRs</p>
              <p className="text-[10px]" style={{ color: MUTED }}>Automatically open fix PRs for known-fixable findings</p>
            </div>
            <Toggle value={form.auto_fix_enabled} onChange={v => set("auto_fix_enabled", v)} />
          </div>
          <div className="h-px" style={{ background: BORDER }} />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">CI Gate</p>
              <p className="text-[10px]" style={{ color: MUTED }}>Block CI/CD pipelines when threshold is exceeded</p>
            </div>
            <Toggle value={form.ci_gate_enabled} onChange={v => set("ci_gate_enabled", v)} />
          </div>
          {form.ci_gate_enabled && (
            <Field label="Block severity threshold">
              <select value={form.ci_gate_block_severity} onChange={e => set("ci_gate_block_severity", e.target.value)}
                className={inputClass + " cursor-pointer"} style={inputStyle}>
                {["critical","high","medium","low"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          )}
        </Card>

        {/* Notifications */}
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><Bell className="w-4 h-4" style={{ color: CYAN }} />Notifications</h3>
          <p className="text-xs" style={{ color: MUTED }}>Send the daily security digest to all configured channels (email, Slack).</p>
          <button onClick={sendDigest} disabled={digestSending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            {digestSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            {digestSending ? "Sending…" : "Send Daily Digest Now"}
          </button>
          {digestResult && (
            <div className="p-3 rounded-xl text-xs" style={{ background: `rgba(0,255,136,0.08)`, border: `1px solid rgba(0,255,136,0.3)`, color: LOW }}>
              {digestResult}
            </div>
          )}
        </Card>

        {/* Platform Info */}
        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-bold text-white">Platform</h3>
          <div className="space-y-2 text-xs" style={{ color: MUTED }}>
            <div className="flex justify-between"><span>Version</span><span className="font-mono text-white">GDS OS v3.0.0</span></div>
            <div className="flex justify-between"><span>Build</span><span className="font-mono text-white">2026.06.21</span></div>
            <div className="flex justify-between"><span>Global Digital Security</span><span className="font-mono" style={{ color: CYAN }}>Active</span></div>
          </div>
          <div className="mt-4 p-3 rounded-xl" style={{ background: "rgba(0,212,255,0.05)", border: `1px solid ${CYAN}20` }}>
            <p className="text-xs" style={{ color: CYAN }}>GDS OS is a fully autonomous security operations platform. All findings, scans, and intelligence are stored in your entities database.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}