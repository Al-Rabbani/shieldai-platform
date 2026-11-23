import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Zap, AlertTriangle, CheckCircle, Network, Server, Cpu } from "lucide-react";

const GOLD = "#C9A84C";

const sites = [
  { id: 1, name: "Manufacturing Plant A", assets: 487, risk: "HIGH", color: "red" },
  { id: 2, name: "Warehouse B", assets: 234, risk: "MEDIUM", color: "amber" },
  { id: 3, name: "Data Centre C", assets: 526, risk: "LOW", color: "green" },
];

const otInventory = [
  { id: 1, name: "Siemens S7-1500 PLC", category: "PLC", icon: "🔧", protocol: "Profinet", vendor: "Siemens", firmware: "v2.9.2 (outdated)", vulns: 3, lastSeen: "2min ago", risk: "HIGH" },
  { id: 2, name: "ABB RTU560", category: "RTU", icon: "📡", protocol: "DNP3", vendor: "ABB", firmware: "v3.1 (current)", vulns: 0, lastSeen: "5min ago", risk: "LOW" },
  { id: 3, name: "Rockwell PanelView", category: "HMI", icon: "🖥️", protocol: "EtherNet/IP", vendor: "Rockwell", firmware: "v6.0 (outdated)", vulns: 2, lastSeen: "8min ago", risk: "MEDIUM" },
  { id: 4, name: "Schneider M340 PLC", category: "PLC", icon: "🔧", protocol: "Modbus", vendor: "Schneider", firmware: "v3.2 (current)", vulns: 1, lastSeen: "3min ago", risk: "MEDIUM" },
  { id: 5, name: "Honeywell RTU", category: "RTU", icon: "📡", protocol: "IEC 61850", vendor: "Honeywell", firmware: "v4.1 (current)", vulns: 0, lastSeen: "10min ago", risk: "LOW" },
  { id: 6, name: "GE Mark VIe", category: "HMI", icon: "🖥️", protocol: "OPC-UA", vendor: "GE", firmware: "v2.8 (outdated)", vulns: 5, lastSeen: "15min ago", risk: "CRITICAL" },
  { id: 7, name: "Axis IP Camera", category: "Camera", icon: "📷", protocol: "ONVIF", vendor: "Axis", firmware: "v10.11 (current)", vulns: 0, lastSeen: "1min ago", risk: "LOW" },
  { id: 8, name: "Bosch Access Reader", category: "Badge", icon: "🔐", protocol: "OSDP", vendor: "Bosch", firmware: "v3.0 (outdated)", vulns: 1, lastSeen: "20min ago", risk: "LOW" },
  { id: 9, name: "Emerson DeltaV", category: "PLC", icon: "🔧", protocol: "Foundation Fieldbus", vendor: "Emerson", firmware: "v14.3 (current)", vulns: 0, lastSeen: "7min ago", risk: "LOW" },
  { id: 10, name: "Mitsubishi Q-Series", category: "PLC", icon: "🔧", protocol: "CC-Link", vendor: "Mitsubishi", firmware: "v2.1 (outdated)", vulns: 4, lastSeen: "12min ago", risk: "HIGH" },
  { id: 11, name: "Raspberry Pi Gateway", category: "Gateway", icon: "🌐", protocol: "MQTT", vendor: "Custom", firmware: "v5.10 kernel", vulns: 6, lastSeen: "4min ago", risk: "CRITICAL" },
  { id: 12, name: "Siemens RUGGEDCOM", category: "Network", icon: "🌐", protocol: "IEC 62351", vendor: "Siemens", firmware: "v5.3 (current)", vulns: 0, lastSeen: "2min ago", risk: "LOW" },
];

const otVulns = [
  { cve: "CVE-2025-44228", asset: "Siemens S7-1500 PLC", description: "Authentication bypass in PLC firmware", cvss: 9.8, impact: "Remote code execution on controller", patch: true, status: "OPEN" },
  { cve: "CVE-2026-1234", asset: "GE Mark VIe HMI", description: "Buffer overflow in OPC-UA stack", cvss: 9.6, impact: "Complete system compromise", patch: true, status: "OPEN" },
  { cve: "CVE-2024-9876", asset: "Raspberry Pi Gateway", description: "Kernel privilege escalation", cvss: 8.8, impact: "Root access to gateway", patch: true, status: "IN_REMEDIATION" },
  { cve: "CVE-2026-3389", asset: "Rockwell PanelView", description: "Unauthenticated Modbus write", cvss: 9.1, impact: "Unauthorized control commands", patch: false, status: "ACCEPTED_RISK" },
  { cve: "CVE-2025-7788", asset: "Mitsubishi Q-Series", description: "Hardcoded credentials in firmware", cvss: 8.5, impact: "Unauthorized PLC access", patch: true, status: "OPEN" },
  { cve: "CVE-2026-0199", asset: "ABB RTU560", description: "DNP3 protocol vulnerability", cvss: 7.8, impact: "Data manipulation", patch: true, status: "OPEN" },
  { cve: "CVE-2025-5544", asset: "Schneider M340", description: "Information disclosure via Modbus", cvss: 6.5, impact: "Configuration exposure", patch: true, status: "OPEN" },
  { cve: "CVE-2024-3321", asset: "Bosch Access Reader", description: "OSDP communication interception", cvss: 5.9, impact: "Badge data exposure", patch: false, status: "ACCEPTED_RISK" },
];

const anomalies = [
  { time: "14 min ago", text: "PLC-007 sending commands outside normal operating range — possible firmware tampering", severity: "critical" },
  { time: "32 min ago", text: "Unexpected Modbus write command to register 4001 — not in baseline", severity: "high" },
  { time: "2h ago", text: "Engineering workstation connected outside maintenance window — 2:47 AM", severity: "medium" },
  { time: "4h ago", text: "RTU-012 communicating with unknown IP address", severity: "high" },
  { time: "6h ago", text: "HMI-003 firmware hash mismatch detected", severity: "critical" },
];

export default function ShieldEdge() {
  return (
    <div className="min-h-screen bg-[#0A0E1A] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-6 h-6" style={{ color: GOLD }} />
            ShieldAI Edge
          </h1>
          <p className="text-slate-400 mt-1">Operational Technology & Industrial IoT security — protecting the physical world from cyber threats</p>
        </div>
        <div className="flex gap-3">
          <Card className="px-4 py-2 bg-[#111827] border border-gray-800">
            <div className="text-xs text-slate-500">OT Assets Monitored</div>
            <div className="text-xl font-bold text-white">1,247</div>
          </Card>
          <Card className="px-4 py-2 bg-[#111827] border border-gray-800">
            <div className="text-xs text-slate-500">IoT Devices</div>
            <div className="text-xl font-bold text-white">3,891</div>
          </Card>
          <Card className="px-4 py-2 bg-[#111827] border border-gray-800">
            <div className="text-xs text-slate-500">OT Vulnerabilities</div>
            <div className="text-xl font-bold text-red-400">234</div>
          </Card>
          <Card className="px-4 py-2 bg-[#111827] border border-gray-800">
            <div className="text-xs text-slate-500">Edge Risk Score</div>
            <div className="text-xl font-bold text-amber-400">67/100</div>
          </Card>
        </div>
      </div>

      {/* Site Map */}
      <Card className="p-5 bg-[#111827] border border-gray-800">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Network className="w-5 h-5" style={{ color: GOLD }} />
          Asset Discovery Map
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sites.map((site) => (
            <div key={site.id} className={`p-4 rounded-xl border-2 ${site.color === "red" ? "border-red-500/50 bg-red-500/5" : site.color === "amber" ? "border-orange-500/50 bg-orange-500/5" : "border-green-500/50 bg-green-500/5"}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-white">{site.name}</div>
                <Badge className={site.color === "red" ? "bg-red-500/10 text-red-400" : site.color === "amber" ? "bg-orange-500/10 text-orange-400" : "bg-green-500/10 text-green-400"}>
                  {site.risk}
                </Badge>
              </div>
              <div className="text-sm text-slate-400">{site.assets} OT assets</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-gray-800/50">Production Floor</div>
                <div className="p-2 rounded bg-gray-800/50">Control Room</div>
                <div className="p-2 rounded bg-gray-800/50">Server Room</div>
                <div className="p-2 rounded bg-gray-800/50">Network Room</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* OT Inventory */}
      <Card className="p-5 bg-[#111827] border border-gray-800">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Server className="w-5 h-5" style={{ color: GOLD }} />
          OT Asset Inventory
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-slate-400">
                <th className="text-left py-2">Asset Name</th>
                <th className="text-left py-2">Category</th>
                <th className="text-left py-2">Protocol</th>
                <th className="text-left py-2">Vendor</th>
                <th className="text-left py-2">Firmware</th>
                <th className="text-right py-2">Vulns</th>
                <th className="text-right py-2">Last Seen</th>
                <th className="text-right py-2">Risk</th>
                <th className="text-right py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {otInventory.map((asset) => (
                <tr key={asset.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2 text-slate-300">{asset.icon} {asset.name}</td>
                  <td className="py-2 text-slate-400">{asset.category}</td>
                  <td className="py-2 text-slate-400 font-mono">{asset.protocol}</td>
                  <td className="py-2 text-slate-400">{asset.vendor}</td>
                  <td className="py-2 text-slate-400">{asset.firmware}</td>
                  <td className="py-2 text-right">{asset.vulns > 0 ? <span className="text-red-400">{asset.vulns} CVEs</span> : <span className="text-green-400">0</span>}</td>
                  <td className="py-2 text-right text-slate-500">{asset.lastSeen}</td>
                  <td className="py-2 text-right">
                    <Badge className={
                      asset.risk === "CRITICAL" ? "bg-red-500/10 text-red-400" :
                      asset.risk === "HIGH" ? "bg-orange-500/10 text-orange-400" :
                      asset.risk === "MEDIUM" ? "bg-yellow-500/10 text-yellow-400" :
                      "bg-green-500/10 text-green-400"
                    }>{asset.risk}</Badge>
                  </td>
                  <td className="py-2 text-right">
                    {asset.vulns > 0 ? (
                      <Button size="sm" className="bg-yellow-600 hover:bg-yellow-500 text-black text-xs h-7">Update</Button>
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-400 inline" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Vulnerabilities & Anomalies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 bg-[#111827] border border-gray-800">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            OT Vulnerability Findings
          </h3>
          <div className="space-y-2">
            {otVulns.map((vuln, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-mono text-xs text-blue-400">{vuln.cve}</div>
                  <Badge className={vuln.cvss >= 9 ? "bg-red-500/10 text-red-400" : "bg-orange-500/10 text-orange-400"}>
                    CVSS {vuln.cvss}
                  </Badge>
                </div>
                <div className="text-xs text-slate-300 mb-1">{vuln.description}</div>
                <div className="text-xs text-slate-500">Asset: {vuln.asset}</div>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs text-slate-400">Impact: {vuln.impact}</div>
                  <Badge className={vuln.status === "OPEN" ? "bg-red-500/10 text-red-400" : vuln.status === "IN_REMEDIATION" ? "bg-amber-500/10 text-amber-400" : "bg-green-500/10 text-green-400"}>
                    {vuln.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 bg-[#111827] border border-gray-800">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" style={{ color: GOLD }} />
            Anomaly Detection Feed
          </h3>
          <div className="space-y-2">
            {anomalies.map((anomaly, idx) => (
              <div key={idx} className={`p-3 rounded-lg border ${anomaly.severity === "critical" ? "bg-red-500/5 border-red-500/30" : anomaly.severity === "high" ? "bg-orange-500/5 border-orange-500/30" : "bg-yellow-500/5 border-yellow-500/30"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${anomaly.severity === "critical" ? "bg-red-400" : anomaly.severity === "high" ? "bg-orange-400" : "bg-yellow-400"}`} />
                  <span className="text-xs text-slate-500">{anomaly.time}</span>
                </div>
                <div className="text-sm text-slate-300">{anomaly.text}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <h4 className="text-sm font-semibold text-white mb-2">Network Segmentation Analysis</h4>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
              <div className="px-3 py-1 rounded bg-blue-500/20 text-blue-400">IT Network</div>
              <div className="text-slate-500">→</div>
              <div className="px-3 py-1 rounded bg-gray-700 text-white">Firewall</div>
              <div className="text-slate-500">→</div>
              <div className="px-3 py-1 rounded bg-amber-500/20 text-amber-400">DMZ</div>
              <div className="text-slate-500">→</div>
              <div className="px-3 py-1 rounded bg-red-500/20 text-red-400">OT Network</div>
            </div>
            <div className="text-xs text-red-400 font-semibold">⚠️ 2 unexpected connections detected between IT and OT zones — CRITICAL</div>
          </div>
        </Card>
      </div>

      <div className="text-xs text-slate-600 text-center">Last updated: {new Date().toLocaleString()} | Powered by real data</div>
    </div>
  );
}