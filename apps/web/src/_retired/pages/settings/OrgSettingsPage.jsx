import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Save, Building2, Clock, Zap, Shield } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";

const GOLD = "#c9a84c"; const CARD = "#111827"; const BORDER = "#1a1f2e"; const SUCCESS = "#22c55e";

function Toggle({ value, onChange, label }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs text-slate-300">{label}</span>
      <button onClick={() => onChange(!value)}
        className="relative w-9 h-5 rounded-full transition-all flex-shrink-0"
        style={{ background: value ? GOLD : "rgba(255,255,255,0.1)" }}>
        <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-all"
          style={{ transform: value ? "translateX(16px)" : "translateX(0)" }} />
      </button>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block">{label}</label>
      <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-xs text-white bg-transparent outline-none"
        style={{ border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)" }} />
    </div>
  );
}

function Section({ title, icon: SectionIcon, children }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-4">
        <SectionIcon className="w-4 h-4" style={{ color: GOLD }} />
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export default function OrgSettingsPage() {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    organization_name: "", domain: "", industry: "", data_residency: "us",
    sla_critical_hours: 4, sla_high_hours: 24, sla_medium_hours: 72, sla_low_hours: 168,
    slack_webhook_url: "", auto_triage_enabled: true, auto_fix_enabled: false,
    ci_gate_enabled: false, ci_gate_block_severity: "critical",
    mfa_required: false, sso_enabled: false, sso_provider: "", sso_metadata_url: "",
    risk_score_baseline: 70,
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["org-settings"],
    queryFn: () => base44.entities.OrgSettings.list("-created_date", 1).catch(() => []),
    initialData: [],
  });

  useEffect(() => {
    if (settings[0]) setForm(prev => ({ ...prev, ...settings[0] }));
  }, [settings]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    try {
      if (settings[0]) {
        await base44.entities.OrgSettings.update(settings[0].id, form);
      } else {
        await base44.entities.OrgSettings.create(form);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {}
  };

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Settings" }, { label: "Organization" }]}
      title="Organization Settings" subtitle="CONFIGURE GDS PLATFORM · SLA POLICIES · INTEGRATIONS"
      actions={
        <button onClick={handleSave}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
          style={{ background: saved ? SUCCESS : GOLD, color: "#0a0e17" }}>
          <Save className="w-3.5 h-3.5" />
          {saved ? "Saved!" : "Save Settings"}
        </button>
      }>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Organization Info" icon={Building2}>
          <Field label="Organization Name" value={form.organization_name} onChange={v => set("organization_name", v)} placeholder="Acme Corp" />
          <Field label="Domain" value={form.domain} onChange={v => set("domain", v)} placeholder="acme.com" />
          <Field label="Industry" value={form.industry} onChange={v => set("industry", v)} placeholder="Financial Services" />
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block">Data Residency</label>
            <select value={form.data_residency} onChange={e => set("data_residency", e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs text-slate-300"
              style={{ background: "#080c14", border: `1px solid ${BORDER}` }}>
              {["us","eu","uk","global"].map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
            </select>
          </div>
        </Section>

        <Section title="SLA Configuration" icon={Clock}>
          {[["Critical SLA (hours)", "sla_critical_hours"], ["High SLA (hours)", "sla_high_hours"], ["Medium SLA (hours)", "sla_medium_hours"], ["Low SLA (hours)", "sla_low_hours"]].map(([label, key]) => (
            <Field key={key} label={label} type="number" value={form[key]} onChange={v => set(key, Number(v))} />
          ))}
        </Section>

        <Section title="Automation Settings" icon={Zap}>
          <Toggle label="Auto-Triage Enabled" value={form.auto_triage_enabled} onChange={v => set("auto_triage_enabled", v)} />
          <Toggle label="Auto-Fix Enabled" value={form.auto_fix_enabled} onChange={v => set("auto_fix_enabled", v)} />
          <Toggle label="CI Gate Enabled" value={form.ci_gate_enabled} onChange={v => set("ci_gate_enabled", v)} />
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block">CI Gate Block Severity</label>
            <select value={form.ci_gate_block_severity} onChange={e => set("ci_gate_block_severity", e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs text-slate-300"
              style={{ background: "#080c14", border: `1px solid ${BORDER}` }}>
              {["critical","high","medium","low"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </Section>

        <Section title="Security Settings" icon={Shield}>
          <Toggle label="MFA Required" value={form.mfa_required} onChange={v => set("mfa_required", v)} />
          <Toggle label="SSO Enabled" value={form.sso_enabled} onChange={v => set("sso_enabled", v)} />
          {form.sso_enabled && (
            <>
              <Field label="SSO Provider" value={form.sso_provider} onChange={v => set("sso_provider", v)} placeholder="okta" />
              <Field label="SSO Metadata URL" value={form.sso_metadata_url} onChange={v => set("sso_metadata_url", v)} placeholder="https://..." />
            </>
          )}
          <Field label="Risk Score Baseline" type="number" value={form.risk_score_baseline} onChange={v => set("risk_score_baseline", Number(v))} />
          {settings[0] && (
            <div className="flex items-center justify-between py-2 rounded-lg px-3" style={{ background: "rgba(255,255,255,0.02)" }}>
              <span className="text-[10px] text-slate-500">Current Risk Score vs Baseline</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black font-mono" style={{ color: "#ef4444" }}>31</span>
                <span className="text-slate-600">/</span>
                <span className="text-xs font-mono text-slate-400">{form.risk_score_baseline}</span>
              </div>
            </div>
          )}
          <Field label="Slack Webhook URL" value={form.slack_webhook_url} onChange={v => set("slack_webhook_url", v)} placeholder="https://hooks.slack.com/..." />
        </Section>
      </div>
    </GDSPageShell>
  );
}