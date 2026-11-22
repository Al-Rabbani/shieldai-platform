import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Database, Shield, AlertTriangle, Lock, Eye, Server } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb } from "@/components/gds/GDSOSShared";

function RiskGauge({ score, size = 50 }) {
  const r = size / 2 - 5;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score || 0, 100) / 100;
  const color = score >= 70 ? LOW : score >= 40 ? MEDIUM : DANGER;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy + 4} fill={color} fontSize={size * 0.28} textAnchor="middle" fontWeight="900" fontFamily="monospace">{score ?? "—"}</text>
    </svg>
  );
}

function ProviderBadge({ provider }) {
  const colors = { aws: "#ff9900", azure: "#0078d4", gcp: "#4285f4" };
  const labels = { aws: "AWS", azure: "Azure", gcp: "GCP" };
  const color = colors[provider?.toLowerCase()] || MUTED;
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {labels[provider?.toLowerCase()] || provider || "—"}
    </span>
  );
}

export default function GDSCloudInventoryPage() {
  const { data: inventory = [] } = useQuery({
    queryKey: ["cloud-inventory"],
    queryFn: () => base44.entities.CloudInventory?.list().catch(() => []),
  });

  const { data: resources = [] } = useQuery({
    queryKey: ["cloud-resources"],
    queryFn: () => base44.entities.CloudResource?.list().catch(() => []),
  });

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Cloud Security", path: "/cloud" }, { label: "Asset Inventory" }]} />

      <div>
        <h1 className="text-2xl font-black text-white">Cloud Asset Inventory</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Complete multi-cloud resource visibility</p>
      </div>

      {/* Inventory Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <h3 className="font-bold text-white">Cloud Accounts Overview</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                {["Account", "Provider", "Total Resources", "Public", "Unencrypted", "Admin Identities", "MFA Disabled", "Public S3", "Public DBs", "Risk Score", "Snapped At"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inventory.map((inv, i) => (
                <tr key={inv.id || i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                  <td className="px-4 py-3 text-xs font-bold text-white">{inv.account_name || inv.account || "—"}</td>
                  <td className="px-4 py-3"><ProviderBadge provider={inv.provider} /></td>
                  <td className="px-4 py-3 text-xs" style={{ color: TEXT }}>{inv.total_resources || 0}</td>
                  <td className="px-4 py-3">
                    {inv.public_resources > 0 ? (
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER }}>{inv.public_resources}</span>
                    ) : <span className="text-[10px]" style={{ color: MUTED }}>0</span>}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: TEXT }}>{inv.unencrypted_count || 0}</td>
                  <td className="px-4 py-3">
                    {inv.admin_identities > 0 ? (
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${HIGH}15`, color: HIGH }}>{inv.admin_identities}</span>
                    ) : <span className="text-[10px]" style={{ color: MUTED }}>0</span>}
                  </td>
                  <td className="px-4 py-3">
                    {inv.mfa_disabled > 0 ? (
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER }}>{inv.mfa_disabled}</span>
                    ) : <span className="text-[10px]" style={{ color: MUTED }}>0</span>}
                  </td>
                  <td className="px-4 py-3">
                    {inv.public_s3_buckets > 0 ? (
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER }}>{inv.public_s3_buckets}</span>
                    ) : <span className="text-[10px]" style={{ color: MUTED }}>0</span>}
                  </td>
                  <td className="px-4 py-3">
                    {inv.public_databases > 0 ? (
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER }}>{inv.public_databases}</span>
                    ) : <span className="text-[10px]" style={{ color: MUTED }}>0</span>}
                  </td>
                  <td className="px-4 py-3"><RiskGauge score={inv.risk_score} size={40} /></td>
                  <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{inv.snapped_at ? new Date(inv.snapped_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Resources Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <h3 className="font-bold text-white">Cloud Resources</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                {["Resource Type", "Service", "Region", "Public", "Encrypted", "Criticality", "Risk Score"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resources.slice(0, 100).map((res, i) => (
                <tr key={res.id || i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: CYAN }}>{res.resource_type || "—"}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: TEXT }}>{res.service || "—"}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{res.region || "—"}</td>
                  <td className="px-4 py-3">
                    {res.is_public ? (
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${DANGER}15`, color: DANGER }}>PUBLIC</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${LOW}15`, color: LOW }}>Private</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {res.encryption_enabled ? (
                      <Lock className="w-3.5 h-3.5" style={{ color: LOW }} />
                    ) : (
                      <Lock className="w-3.5 h-3.5" style={{ color: DANGER }} />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded ${
                      res.business_criticality === "critical" ? `bg-[${DANGER}15] text-[${DANGER}]` :
                      res.business_criticality === "high" ? `bg-[${HIGH}15] text-[${HIGH}]` :
                      "bg-gray-700 text-gray-300"
                    }`} style={{ 
                      background: res.business_criticality === "critical" ? `${DANGER}15` : 
                                 res.business_criticality === "high" ? `${HIGH}15` : "rgba(100,116,139,0.15)",
                      color: res.business_criticality === "critical" ? DANGER : 
                             res.business_criticality === "high" ? HIGH : MUTED 
                    }}>
                      {res.business_criticality || "medium"}
                    </span>
                  </td>
                  <td className="px-4 py-3"><RiskGauge score={res.risk_score} size={32} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}