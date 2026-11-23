import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { DashboardPage, StatTile, SectionCard, LoadingSpinner, Tag } from "@/components/dashboards/DashboardShared";
import { KeyRound, FileLock, AlertTriangle, ShieldAlert, RefreshCw, Clock } from "lucide-react";

/* Item 34. This page used to read SecretReference, CertificateRecord, SecretLeakageAlert and SecretAccessPolicy. None of
 * the four has a table, so every read returned an empty list and the page printed "No secrets registered", "No
 * certificates tracked", "No leakage alerts" and "No access policies configured" under four zero tiles. That reads as a
 * clean bill of health; what it actually meant was that nothing had been measured.
 *
 * It now reads one route that measures: a live TLS handshake per hostname, the credential NAMES configured in the API
 * process environment, and the api_keys table. The panels this platform genuinely cannot fill (leakage scanning, secret
 * access policies, credential rotation) say so, with the measurement behind the refusal printed on the page. */

const TONE = {
  ok: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10",
  warn: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  bad: "text-red-300 border-red-500/40 bg-red-500/10",
  flat: "text-slate-300 border-slate-600 bg-slate-700/20",
};

function expiryTone(days) {
  if (days == null) return TONE.flat;
  if (days < 0) return TONE.bad;
  if (days < 30) return TONE.bad;
  if (days < 60) return TONE.warn;
  return TONE.ok;
}

function fmtDate(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(value) {
  if (!value) return "never";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("en-GB");
}

/* An absence the route reports (measurable:false) is rendered as a stated gap, never as a zero. */
function AbsentPanel({ title, payload, icon: Icon = AlertTriangle }) {
  return (
    <SectionCard title={title}>
      <div className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
          <Icon size={12} /> NOT MEASURED
        </p>
        <p className="text-[11px] text-slate-400 mt-1">{payload?.reason || "The route did not state a reason."}</p>
      </div>
    </SectionCard>
  );
}

export default function SecretsKeyManagementPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const payload = await base44.platform.secretsPosture();
      setData(payload);
      setError(null);
    } catch (err) {
      /* An error is not an empty estate: the tiles are withheld rather than drawn at zero. */
      setError(err?.message || "The secrets posture route did not answer.");
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <DashboardPage title="Secrets & Key Management" badge="EDP-016"><LoadingSpinner /></DashboardPage>;

  if (error) {
    return (
      <DashboardPage title="Secrets & Key Management" badge="EDP-016" subtitle="Certificates served, credentials present, API keys issued">
        <div className="rounded-lg px-3 py-2 text-[11px] border bg-red-500/10 border-red-500/40 text-red-300">
          Could not read the secrets posture: {error}
        </div>
      </DashboardPage>
    );
  }

  const certs = data?.certificates || {};
  const endpoints = certs.endpoints || [];
  const credentials = data?.credentials || { items: [], integrations: [], total: 0, configured: 0, empty: 0 };
  const keys = data?.api_keys || { total: 0, active: 0, revoked: 0, items: [] };
  const fullyConfigured = (credentials.integrations || []).filter((entry) => entry.state === "configured");
  const partial = (credentials.integrations || []).filter((entry) => entry.state === "partial");
  const missing = (credentials.integrations || []).filter((entry) => entry.state === "absent");

  return (
    <DashboardPage
      title="Secrets & Key Management"
      badge="EDP-016"
      subtitle="Certificates served, credentials present, API keys issued"
    >
      <div className="flex flex-wrap items-center gap-2 -mt-2">
        <p className="text-[10px] text-slate-500 flex-1">
          Read {fmtDateTime(data?.measured_at)} · {certs.basis}
        </p>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 transition disabled:opacity-40"
        >
          <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} /> {refreshing ? "Re-reading…" : "Re-read now"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          icon={FileLock}
          label="Certificates Served"
          value={`${certs.endpoints_serving ?? 0}/${certs.endpoints_probed ?? 0}`}
          sublabel={`${certs.endpoints_unverified ?? 0} not verified by the trust store`}
          accent="#f59e0b"
        />
        <StatTile
          icon={Clock}
          label="Soonest Expiry"
          value={certs.soonest_expiry_days == null ? "—" : `${certs.soonest_expiry_days}d`}
          sublabel={certs.soonest_expiry_host ? `on ${certs.soonest_expiry_host}` : "no certificate read"}
          accent="#ef4444"
        />
        <StatTile
          icon={KeyRound}
          label="Credentials Configured"
          value={credentials.configured ?? 0}
          sublabel={`${credentials.total ?? 0} credential names in the environment${credentials.empty ? `, ${credentials.empty} empty` : ""}`}
          accent="#3b82f6"
        />
        <StatTile
          icon={ShieldAlert}
          label="API Keys Issued"
          value={keys.active ?? 0}
          sublabel={`${keys.total ?? 0} total${keys.revoked ? `, ${keys.revoked} revoked` : ""}`}
          accent="#10b981"
        />
      </div>

      <SectionCard title="Certificates actually served">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700">
                <th className="text-left py-2 px-3">Host</th>
                <th className="text-left py-2 px-3">Common name</th>
                <th className="text-left py-2 px-3">Issuer</th>
                <th className="text-left py-2 px-3">Expires</th>
                <th className="text-left py-2 px-3">Days</th>
                <th className="text-left py-2 px-3">TLS</th>
                <th className="text-left py-2 px-3">Trust store</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((endpoint) => (
                <tr key={`${endpoint.host}:${endpoint.port}`} className="border-b border-slate-800">
                  <td className="py-2 px-3 text-white font-medium">
                    {endpoint.host}
                    {endpoint.served ? null : <span className="text-red-300 text-[10px] block">not served: {endpoint.reason}</span>}
                  </td>
                  <td className="py-2 px-3 text-slate-400">{endpoint.common_name || "—"}</td>
                  <td className="py-2 px-3 text-slate-400">{endpoint.issuer || "—"}</td>
                  <td className="py-2 px-3 text-slate-400">{fmtDate(endpoint.not_after)}</td>
                  <td className="py-2 px-3">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${expiryTone(endpoint.days_until_expiry)}`}>
                      {endpoint.days_until_expiry == null ? "not read" : `${endpoint.days_until_expiry}d`}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-400">{endpoint.tls_version || "—"}</td>
                  <td className="py-2 px-3">
                    {endpoint.chain_verified ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border text-emerald-300 border-emerald-500/40 bg-emerald-500/10">verified</span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border text-red-300 border-red-500/40 bg-red-500/10">
                        {endpoint.served ? endpoint.verify_reason || "not verified" : "no handshake"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {endpoints.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-3 px-3 text-[11px] text-amber-300">
                    No hostname was probed: APP_DOMAIN is not set in this environment, so there is no endpoint to measure.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-slate-500 mt-2">
          {(certs.renewal || {}).renewal_cron_present
            ? "Renewal is configured: a certbot cron entry is present and the certbot binary is installed. This page does not run a renewal, so it cannot prove one will succeed."
            : "No renewal mechanism was found on this host, so the expiry date above is the only warning you will get."}
        </p>
      </SectionCard>

      <SectionCard title="Credentials in the environment (names only)">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {credentials.integrations.map((entry) => (
            <div key={entry.integration} className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-sm font-semibold text-white flex-1">{entry.display_name || entry.integration}</p>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    entry.state === "configured" ? TONE.ok : entry.state === "partial" ? TONE.warn : TONE.flat
                  }`}
                >
                  {entry.state === "configured" ? "CONFIGURED" : entry.state === "partial" ? "PARTIAL" : "NO CREDENTIAL"}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mb-1.5">
                {entry.configured_vars}/{entry.required_vars} variables present
              </p>
              <div className="flex flex-wrap gap-1">
                {entry.required.map((variable) => (
                  <span
                    key={variable.name}
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                      variable.configured ? "text-slate-300 border-slate-600 bg-slate-700/20" : "text-red-300 border-red-500/30 bg-red-500/5"
                    }`}
                    title={variable.configured ? "present in the API process environment" : "not set in the API process environment"}
                  >
                    {variable.configured ? variable.name : `${variable.name} missing`}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 mt-2">{credentials.value_policy}</p>
        <p className="text-[10px] text-slate-500 mt-1">
          {fullyConfigured.length} integration(s) fully configured, {partial.length} partial, {missing.length} with no
          credential at all. A name being present says a value is set; it does not say the service accepts it.
        </p>
      </SectionCard>

      <SectionCard title="API keys issued by this platform">
        {keys.items.length === 0 ? (
          <p className="text-[11px] text-slate-400">
            No API key has been issued for this tenant. The store exists and holds no key, so this is a measured zero
            rather than an unread store.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-700">
                  <th className="text-left py-2 px-3">Name</th>
                  <th className="text-left py-2 px-3">Prefix</th>
                  <th className="text-left py-2 px-3">Scopes</th>
                  <th className="text-left py-2 px-3">Created</th>
                  <th className="text-left py-2 px-3">Last used</th>
                  <th className="text-left py-2 px-3">State</th>
                </tr>
              </thead>
              <tbody>
                {keys.items.map((key) => (
                  <tr key={key.id} className="border-b border-slate-800">
                    <td className="py-2 px-3 text-white font-medium">{key.name}</td>
                    <td className="py-2 px-3 text-slate-500 font-mono">{key.key_prefix}…</td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-1">
                        {(key.scopes || []).length === 0 ? <span className="text-slate-600">none</span> : key.scopes.map((scope) => <Tag key={scope}>{scope}</Tag>)}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-400">{fmtDateTime(key.created_at)}</td>
                    <td className="py-2 px-3 text-slate-400">{fmtDateTime(key.last_used_at)}</td>
                    <td className="py-2 px-3">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${key.active ? TONE.ok : TONE.flat}`}>
                        {key.active ? "active" : "revoked"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AbsentPanel title="Leakage alerts" payload={data?.leakage_scanning} icon={AlertTriangle} />
        <AbsentPanel title="Secret access policies" payload={data?.access_policies} icon={ShieldAlert} />
      </div>

      <SectionCard title="Rotation">
        <div className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
          <p className="text-[11px] text-slate-300 font-semibold">Certificates</p>
          <p className="text-[11px] text-slate-400">
            {(data?.rotation?.certificates || {}).certbot_installed ? "certbot installed" : "certbot not installed"} ·{" "}
            {(data?.rotation?.certificates || {}).renewal_cron_present ? "renewal cron present" : "no renewal cron"} ·{" "}
            {(data?.rotation?.certificates || {}).renewal_proven_by_this_route ? "renewal proven" : "renewal not proven here"}
          </p>
          <p className="text-[11px] text-slate-300 font-semibold mt-3">Environment credentials</p>
          <p className="text-[11px] text-amber-300/90">{data?.rotation?.credentials?.reason || "The route did not state a reason."}</p>
        </div>
      </SectionCard>
    </DashboardPage>
  );
}
