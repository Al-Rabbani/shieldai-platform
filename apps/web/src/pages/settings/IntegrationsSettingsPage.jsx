import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import AvailableConnectorsGrid from "@/components/settings/AvailableConnectorsGrid";

/* Every card here is rendered from a measured answer. The previous version hardcoded "AWS connected", "Azure connected
 * (0 findings)" and "3 secrets configured: OPENAI_PROJECT_KEY_2 ..." - three claims nothing on the platform could
 * support, on the page a customer would open first to see what is wired up. There are also no dead buttons: a control
 * appears only where an action exists behind it. */
function Card({ icon, name, connected, statusLabel, children }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-bold text-white">{icon} {name}</p>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${connected ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700/40 text-slate-400"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-slate-500"}`} /> {statusLabel}
        </span>
      </div>
      <div className="text-xs text-slate-400 mt-2 space-y-0.5">{children}</div>
    </div>
  );
}

export default function IntegrationsSettingsPage() {
  const [status, setStatus] = useState(null);
  const [ticketing, setTicketing] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.integrations.status().catch(e => { setError(e.message || "could not read integration status"); return null; }),
      base44.integrations.linearStatus().catch(() => null),
    ]).then(([s, t]) => { setStatus(s); setTicketing(t); }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen p-4" style={{ background: "#050b14" }}>
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      </div>
    );
  }

  const linear = status?.linear;
  const envs = status?.cloud?.environments || [];
  const stores = status?.stores || {};
  const notes = status?.notifications || {};
  const absentStores = Object.entries(stores).filter(([, exists]) => !exists).map(([name]) => name);

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#050b14" }}>
      <h1 className="text-xl font-bold text-white">🔗 INTEGRATIONS &amp; CONNECTORS</h1>
      <p className="text-[11px] text-slate-500">
        Measured from the platform at {status?.measured_at ? new Date(status.measured_at).toLocaleString() : "unknown time"}.
        {error ? ` Part of this page could not be read: ${error}.` : ""}
      </p>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Connected Integrations</p>
        <div className="grid grid-cols-2 gap-4">
          <Card
            icon="📐" name="Linear" connected={!!linear?.reachable}
            statusLabel={linear?.reachable ? "reachable" : linear?.configured ? "key rejected" : "no key"}
          >
            {linear?.reachable ? (
              <>
                <p>Workspace: {linear.viewer?.name} ({linear.viewer?.email})</p>
                <p>Teams: {(linear.teams || []).map(t => t.key).join(", ") || "none visible to this key"}</p>
                {ticketing && (
                  <p>
                    Ticketing: {ticketing.ticketed_findings} of {ticketing.open_findings} open findings filed
                    {" "}({ticketing.unticketed_open} unfiled)
                  </p>
                )}
              </>
            ) : (
              <p>{linear?.reason || "Linear has not been reached from this platform."}</p>
            )}
          </Card>

          {envs.map(env => (
            <Card
              key={env.native_id}
              icon={env.provider === "aws" ? "☁️" : "🔷"}
              name={env.provider.toUpperCase()}
              connected={!!env.enabled && env.discovery_status === "completed"}
              statusLabel={env.discovery_status || env.status}
            >
              <p>{env.name}</p>
              <p>Account: {env.native_id}</p>
              <p>
                {env.asset_count} assets discovered
                {env.last_discovered_at ? ` · last discovery ${new Date(env.last_discovered_at).toLocaleString()}` : " · never discovered"}
              </p>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Notification Channels</p>
        <div className="grid grid-cols-2 gap-4">
          <Card icon="💬" name="Slack webhook" connected={!!notes.slack_webhook_present}
            statusLabel={notes.slack_webhook_present ? "credential present" : "no webhook"}>
            <p>
              {notes.slack_webhook_present
                ? "A webhook is configured on the host. Presence is not delivery: nothing on this page sends a message."
                : "No Slack webhook is configured, so no alert can be posted to Slack."}
            </p>
            <p><Link to="/settings/escalation" className="text-blue-400 hover:text-blue-300">Alert settings →</Link></p>
          </Card>
          <Card icon="✉️" name="Email (Resend)" connected={!!notes.resend_key_present}
            statusLabel={notes.resend_key_present ? "key present" : "no key"}>
            <p>
              {notes.resend_key_present ? "A Resend key is present." : "No Resend key is present."}
              {" "}Sender address configured: {notes.email_sender_configured ? "yes" : "no (EMAIL_FROM is unset)"}.
            </p>
          </Card>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Available to Connect</p>
        <AvailableConnectorsGrid />
      </div>

      <div className="rounded-xl p-4 space-y-1" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-sm font-semibold text-white">What this platform cannot show here</p>
        <p className="text-[11px] text-slate-500">
          {absentStores.length > 0
            ? `No store exists for: ${absentStores.join(", ")}. Integrations added by hand therefore have nowhere to be recorded, which is why none are listed.`
            : "Every connector store this page reads exists."}
        </p>
        <p className="text-[11px] text-slate-500">{status?.secrets?.reason}</p>
      </div>
    </div>
  );
}
