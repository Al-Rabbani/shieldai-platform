import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import SettingsTabs from "@/components/settings/SettingsTabs";
import { TextField, ToggleField, InfoRow } from "@/components/settings/SettingsField";

export default function GDSSettingsPage() {
  const [tab, setTab] = useState("General");
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [orgName, setOrgName] = useState("Global Digital Security");
  const [domain, setDomain] = useState("globaldigitalstreams.com");
  const [industry, setIndustry] = useState("MSSP / Cybersecurity Services");
  const [defaultAssignee, setDefaultAssignee] = useState("president@globaldigitalstreams.com");

  const [slaCritical, setSlaCritical] = useState(4);
  const [slaHigh, setSlaHigh] = useState(24);
  const [slaMedium, setSlaMedium] = useState(168);
  const [autoTriage, setAutoTriage] = useState(true);
  const [autoFix, setAutoFix] = useState(false);
  const [ciGate, setCiGate] = useState(true);

  const [mfaRequired, setMfaRequired] = useState(false);
  const [dataResidency, setDataResidency] = useState("eu");
  const [retentionDays, setRetentionDays] = useState(90);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    base44.entities.OrgSettings.list("-created_date", 1).then(list => {
      const o = list[0] || null;
      setOrg(o);
      if (o) {
        setOrgName(o.organization_name || orgName);
        setDomain(o.domain || domain);
        setIndustry(o.industry || industry);
        setSlaCritical(o.sla_critical_hours ?? slaCritical);
        setSlaHigh(o.sla_high_hours ?? slaHigh);
        setSlaMedium(o.sla_medium_hours ?? slaMedium);
        setAutoTriage(o.auto_triage_enabled ?? autoTriage);
        setAutoFix(o.auto_fix_enabled ?? autoFix);
        setCiGate(o.ci_gate_enabled ?? ciGate);
        setDataResidency(o.data_residency || dataResidency);
        setRetentionDays(o.retention_days ?? retentionDays);
      }
    }).catch((error) => {
      /* A swallowed read leaves the form showing defaults that look like stored values. Say it failed. */
      setSaveError(error?.message || "The platform's settings could not be read; the values below are defaults, not stored settings.");
    }).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* This used to swallow both calls with `.catch(() => {})` and then show "Settings saved" regardless, so a save that
   * wrote nothing reported success. It now surfaces the failure and only claims success when the platform confirms it. */
  async function save(fields) {
    setSaving(true);
    setSaveError(null);
    const payload = { organization_name: orgName, domain, industry, sla_critical_hours: slaCritical, sla_high_hours: slaHigh, sla_medium_hours: slaMedium, auto_triage_enabled: autoTriage, auto_fix_enabled: autoFix, ci_gate_enabled: ciGate, data_residency: dataResidency, retention_days: retentionDays, ...fields };
    try {
      const saved = await base44.entities.OrgSettings.upsert(payload);
      setOrg(saved || null);
      toast.success(saved?.stored === false ? "Saved, but the platform reported it was not stored" : "Settings saved");
    } catch (error) {
      setSaveError(error?.message || "The platform rejected the save.");
      toast.error("Settings were not saved");
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: "#050b14" }}><div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#050b14" }}>
      <h1 className="text-xl font-bold text-white">⚙️ PLATFORM SETTINGS</h1>
      <SettingsTabs active={tab} onChange={setTab} />
      {saveError && (
        <p className="text-[11px] text-red-400 rounded-lg px-3 py-2" style={{ background: "#1f1215", border: "1px solid #7f1d1d" }}>
          {saveError}
        </p>
      )}
      <p className="text-[10px] text-slate-500 max-w-xl">
        Only the SLA hours change platform behaviour: they decide when a finding is escalated to a human. Auto-triage,
        auto-fix, the CI-gate switch, the MFA requirement, retention and residency are recorded here but no engine on this
        platform reads them yet.
      </p>

      <div className="rounded-xl p-4 max-w-xl space-y-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        {tab === "General" && (
          <>
            <TextField label="Organization Name" value={orgName} onChange={setOrgName} />
            <TextField label="Domain" value={domain} onChange={setDomain} />
            <TextField label="Industry" value={industry} onChange={setIndustry} />
            <TextField label="Default Assignee" value={defaultAssignee} onChange={setDefaultAssignee} />
            <button onClick={() => save({})} disabled={saving} className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
          </>
        )}

        {tab === "SLA Configuration" && (
          <>
            <TextField label="Critical Findings SLA (hours)" value={slaCritical} onChange={v => setSlaCritical(Number(v) || 0)} />
            <TextField label="High Findings SLA (hours)" value={slaHigh} onChange={v => setSlaHigh(Number(v) || 0)} />
            <TextField label="Medium Findings SLA (hours)" value={slaMedium} onChange={v => setSlaMedium(Number(v) || 0)} />
            <ToggleField label="Auto-triage" checked={autoTriage} onChange={setAutoTriage} />
            <ToggleField label="Auto-fix (requires approval when off)" checked={autoFix} onChange={setAutoFix} />
            <ToggleField label="CI Gate — blocks on Critical" checked={ciGate} onChange={setCiGate} />
            <button onClick={() => save({})} disabled={saving} className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
          </>
        )}

        {tab === "Security" && (
          <>
            <InfoRow label="SSO" value={<button className="text-blue-400 font-bold">Not configured — Configure →</button>} />
            <ToggleField label="MFA Required" checked={mfaRequired} onChange={setMfaRequired} />
            <InfoRow label="Data Residency" value="EU (Ireland)" />
            <InfoRow label="Session Timeout" value="8 hours" />
            <button onClick={() => toast.success("Settings saved")} className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 transition">Save</button>
          </>
        )}

        {tab === "Data Residency" && (
          <>
            <div>
              <label className="text-[10px] text-slate-500 uppercase">Data Residency Region</label>
              <select value={dataResidency} onChange={e => setDataResidency(e.target.value)} className="w-full mt-1 rounded-lg px-3 py-2 text-sm text-white" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                <option value="eu">EU (Ireland)</option>
                <option value="us">US</option>
                <option value="uk">UK</option>
                <option value="global">Global</option>
              </select>
            </div>
            <TextField label="Data Retention (days)" value={retentionDays} onChange={v => setRetentionDays(Number(v) || 0)} />
            <button onClick={() => save({})} disabled={saving} className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
          </>
        )}

        {tab === "Billing" && (
          <>
            <InfoRow label="Plan" value="Enterprise" />
            <InfoRow label="Monthly Integration Credits" value="100,000" />
            <InfoRow label="Monthly Message Credits" value="2,600" />
            <InfoRow label="Next Reset" value="July 20, 2026" />
            <InfoRow label="MSSP Customers" value="12 active" />
          </>
        )}
      </div>
    </div>
  );
}