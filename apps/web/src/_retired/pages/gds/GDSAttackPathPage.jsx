import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, ChevronRight, Zap, Shield } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  SevBadge, Breadcrumb, Card, PAGE_BG
} from "@/components/gds/GDSOSShared";

// Static attack chain for the known critical path
const ATTACK_CHAIN = [
  {
    id: "entry",
    type: "Entry Point",
    label: "axios SSRF",
    detail: "CVE-2025-62718 — NO_PROXY bypass allows Server-Side Request Forgery",
    severity: "critical",
    color: DANGER,
    icon: "🌐",
  },
  {
    id: "pivot",
    type: "Pivot",
    label: "AWS Metadata Service",
    detail: "169.254.169.254 — IMDSv1 endpoint accessible via SSRF",
    severity: "critical",
    color: DANGER,
    icon: "☁️",
  },
  {
    id: "harvest",
    type: "Credential Harvest",
    label: "AWS IAM Keys Stolen",
    detail: "Access key + secret key exfiltrated from instance metadata",
    severity: "critical",
    color: "#ff6b00",
    icon: "🔑",
  },
  {
    id: "lateral",
    type: "Lateral Movement",
    label: "S3 Buckets / EC2 Instances",
    detail: "Full read/write access to all S3 buckets and EC2 describe permissions",
    severity: "high",
    color: HIGH,
    icon: "↔️",
  },
  {
    id: "impact",
    type: "Impact",
    label: "Data Exfiltration / Ransomware",
    detail: "Complete AWS account compromise — data theft or ransomware deployment",
    severity: "critical",
    color: DANGER,
    icon: "💀",
  },
];

function AttackNode({ node, isLast }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="flex flex-col items-center w-full">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full max-w-sm rounded-2xl p-4 text-left transition-all hover:scale-[1.01]"
        style={{ background: `${node.color}12`, border: `1px solid ${node.color}50`, boxShadow: `0 0 16px ${node.color}20` }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl flex-shrink-0">{node.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                style={{ color: node.color, background: `${node.color}20` }}>{node.type}</span>
              <SevBadge sev={node.severity} />
            </div>
            <p className="text-sm font-black text-white mt-1">{node.label}</p>
          </div>
          <ChevronRight className="w-4 h-4 flex-shrink-0 transition-transform" style={{ color: node.color, transform: expanded ? "rotate(90deg)" : "none" }} />
        </div>
        {expanded && (
          <p className="text-xs mt-3 pt-3 border-t" style={{ color: MUTED, borderColor: `${node.color}25` }}>{node.detail}</p>
        )}
      </button>

      {!isLast && (
        <div className="flex flex-col items-center my-1">
          <div className="w-0.5 h-6" style={{ background: `linear-gradient(to bottom, ${node.color}, ${ATTACK_CHAIN[ATTACK_CHAIN.findIndex(n => n.id === node.id) + 1]?.color || node.color})` }} />
          <Zap className="w-3.5 h-3.5 -mt-0.5" style={{ color: DANGER }} />
          <div className="w-0.5 h-4" style={{ background: DANGER + "60" }} />
        </div>
      )}
    </div>
  );
}

export default function GDSAttackPathPage() {
  const { data: criticalFindings = [] } = useQuery({
    queryKey: ["ap-critical"],
    queryFn: () => base44.entities.TriagedFinding.filter({ normalized_severity: "critical" }).catch(() => []),
  });
  const { data: cloudCritical = [] } = useQuery({
    queryKey: ["ap-cloud-critical"],
    queryFn: () => base44.entities.CloudFinding.filter({ severity: "critical" }).catch(() => []),
  });

  const totalCritical = criticalFindings.length + cloudCritical.length;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Attack Paths" }]} />

      <div>
        <h1 className="text-2xl font-black text-white">Attack Path Analysis</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Visual exploit chains from entry point to full impact</p>
      </div>

      {/* Critical Path Banner */}
      <div className="flex items-center gap-4 p-4 rounded-2xl"
        style={{ background: `${DANGER}12`, border: `1px solid ${DANGER}50`, boxShadow: `0 0 24px ${DANGER}18` }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 animate-pulse"
          style={{ background: `${DANGER}25` }}>
          <AlertTriangle className="w-5 h-5" style={{ color: DANGER }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-black" style={{ color: DANGER }}>CRITICAL PATH IDENTIFIED</p>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>
            1 exploitable attack chain leads to <strong className="text-white">full AWS account compromise</strong>
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{totalCritical}</p>
          <p className="text-[10px]" style={{ color: MUTED }}>critical findings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attack Chain Visualisation */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h3 className="text-sm font-bold text-white mb-6">Exploit Chain — AWS Account Compromise</h3>
            <div className="flex flex-col items-center">
              {ATTACK_CHAIN.map((node, i) => (
                <AttackNode key={node.id} node={node} isLast={i === ATTACK_CHAIN.length - 1} />
              ))}
            </div>
            <p className="text-[10px] mt-6 text-center" style={{ color: MUTED }}>
              Click any node to expand technical detail · Chain confidence: <span style={{ color: DANGER }}>HIGH</span>
            </p>
          </Card>
        </div>

        {/* Sidebar: affected assets + mitigations */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-white mb-3">Chain Summary</h3>
            <div className="space-y-2">
              {[
                { label: "Steps to Compromise", value: "5", color: DANGER },
                { label: "Entry CVE", value: "CVE-2025-62718", color: HIGH },
                { label: "Exploit Complexity", value: "LOW", color: DANGER },
                { label: "Auth Required", value: "NONE", color: DANGER },
                { label: "CVSS Score", value: "9.1", color: DANGER },
                { label: "KEV Listed", value: "YES", color: DANGER },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: BORDER + "40" }}>
                  <span className="text-xs" style={{ color: MUTED }}>{label}</span>
                  <span className="text-xs font-black font-mono" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-bold text-white mb-3">Immediate Mitigations</h3>
            <div className="space-y-2">
              {[
                { action: "Upgrade axios to ≥1.8.4", priority: "P0", color: DANGER },
                { action: "Enable IMDSv2 on all EC2", priority: "P0", color: DANGER },
                { action: "Enable GuardDuty", priority: "P1", color: HIGH },
                { action: "Enable CloudTrail logging", priority: "P1", color: HIGH },
                { action: "Restrict IAM instance profile", priority: "P1", color: HIGH },
              ].map(({ action, priority, color }, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: `${color}08` }}>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
                    style={{ color, background: `${color}20` }}>{priority}</span>
                  <span className="text-xs" style={{ color: "#e2e8f0" }}>{action}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-bold text-white mb-3">Other Critical Findings ({criticalFindings.length})</h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
              {criticalFindings.slice(0, 6).map((f, i) => (
                <div key={f.id || i} className="flex items-center gap-2 py-1">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: DANGER }} />
                  <span className="text-xs truncate" style={{ color: MUTED }}>{f.title || "Untitled"}</span>
                </div>
              ))}
              {criticalFindings.length === 0 && (
                <p className="text-xs" style={{ color: MUTED }}>Loading findings…</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}