import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import IntegrationCard from "@/components/settings/IntegrationCard";
import AvailableConnectorsGrid from "@/components/settings/AvailableConnectorsGrid";

export default function IntegrationsSettingsPage() {
  const [integrations, setIntegrations] = useState([]);
  const [cloudFindings, setCloudFindings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.IntegrationConfig.list("-last_synced", 20).catch(() => []),
      base44.entities.CloudFinding.list("-detected_at", 200).catch(() => []),
    ]).then(([i, c]) => { setIntegrations(i); setCloudFindings(c); }).finally(() => setLoading(false));
  }, []);

  const openFindings = cloudFindings.filter(f => f.status === "open");
  const criticalFindings = openFindings.filter(f => f.severity === "critical").length;

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#050b14" }}>
      <h1 className="text-xl font-bold text-white">🔗 INTEGRATIONS & CONNECTORS</h1>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Connected Integrations</p>
            <div className="grid grid-cols-2 gap-4">
              <IntegrationCard
                icon="☁️" name="AWS" connected statusLabel="Connected"
                details={<>
                  <p>Account: 696616821372 | IAM: gds-security-scanner</p>
                  <p>Policies: SecurityAudit, ReadOnlyAccess</p>
                  <p>Findings: {openFindings.length} open ({criticalFindings} critical)</p>
                </>}
                secondaryAction="Rescan Now"
              />
              <IntegrationCard
                icon="🔷" name="Azure" connected statusLabel="Connected (0 findings)"
                details={<p>Status: Connected, no findings yet — schedule a scan</p>}
                secondaryAction="Run Scan"
              />
            </div>

            {integrations.length > 0 && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                {integrations.map(i => (
                  <IntegrationCard
                    key={i.id} icon="🔌" name={i.config_name} connected={i.status === "connected"}
                    statusLabel={i.status}
                    details={<p>Type: {i.integration_type} {i.last_synced ? `· Last synced: ${new Date(i.last_synced).toLocaleString()}` : ""}</p>}
                    secondaryAction="Sync Now"
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Available to Connect</p>
            <AvailableConnectorsGrid />
          </div>

          <div className="rounded-xl p-4 flex flex-wrap items-center gap-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <span className="text-lg">🔔</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Slack alert filter</p>
              <p className="text-[11px] text-slate-500">Choose the minimum severity that pings your channel — high and critical by default.</p>
            </div>
            <Link to="/settings/escalation" className="ml-auto text-[11px] font-bold text-blue-400 hover:text-blue-300">Open alert settings →</Link>
          </div>

          <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <p className="text-sm text-slate-300">🔐 3 secrets configured: OPENAI_PROJECT_KEY_2, AWS credentials (gds-security-scanner), GDS production DB connection. All secrets encrypted at rest.</p>
          </div>
        </>
      )}
    </div>
  );
}