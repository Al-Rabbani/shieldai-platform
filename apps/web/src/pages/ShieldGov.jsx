import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Zap, AlertTriangle, CheckCircle, Lock, Network, Server, Activity } from "lucide-react";

const GOLD = "#C9A84C";

const sectors = [
  { id: 1, icon: "⚡", name: "Energy & Power Grid", facilities: 47, threatLevel: "ELEVATED", incidents: 2 },
  { id: 2, icon: "💧", name: "Water & Utilities", facilities: 23, threatLevel: "NORMAL", incidents: 0 },
  { id: 3, icon: "🏥", name: "Healthcare & Hospitals", facilities: 156, threatLevel: "HIGH", incidents: 5 },
  { id: 4, icon: "🏦", name: "Financial Systems", facilities: 34, threatLevel: "ELEVATED", incidents: 1 },
  { id: 5, icon: "🚆", name: "Transport & Rail", facilities: 12, threatLevel: "NORMAL", incidents: 0 },
  { id: 6, icon: "📡", name: "Telecoms & ISPs", facilities: 8, threatLevel: "ELEVATED", incidents: 1 },
  { id: 7, icon: "🏛️", name: "Government IT", facilities: 67, threatLevel: "NORMAL", incidents: 0 },
  { id: 8, icon: "🔒", name: "Defence & Military", facilities: "RESTRICTED", threatLevel: "CLASSIFIED", incidents: "ACCESS CONTROLLED" },
];

const otAssets = [
  { type: "PLCs (Programmable Logic Controllers)", protocol: "Modbus", count: 234, vulnerable: 12, scanned: "6h ago" },
  { type: "RTUs (Remote Terminal Units)", protocol: "DNP3", count: 87, vulnerable: 3, scanned: "6h ago" },
  { type: "HMI Systems", protocol: "Proprietary", count: 45, vulnerable: 8, scanned: "12h ago" },
  { type: "Engineering Workstations", protocol: "IEC 61850", count: 23, vulnerable: 2, scanned: "6h ago" },
  { type: "Historian Servers", protocol: "OPC-UA", count: 12, vulnerable: 0, scanned: "6h ago" },
  { type: "SCADA Masters", protocol: "PROFINET", count: 8, vulnerable: 1, scanned: "12h ago" },
];

const threatActors = [
  { name: "Sandworm (Russia/GRU)", targeting: "Energy, Water", ttps: "T1486, T1498, T1561", active: "Jan 2026", confidence: "HIGH", note: "2 of your sectors match their target profile" },
  { name: "APT40 (China/MSS)", targeting: "Telecoms, Government", ttps: "T1190, T1133", active: "Mar 2026", confidence: "MEDIUM", note: null },
  { name: "Lazarus Group (DPRK)", targeting: "Financial, Crypto", ttps: "T1078, T1021", active: "Nov 2025", confidence: "HIGH", note: "Your financial sector clients are at risk" },
];

const complianceFrameworks = [
  { name: "NIST SP 800-53", progress: 78 },
  { name: "NIST SP 800-82 (OT)", progress: 64 },
  { name: "FedRAMP", progress: 61 },
  { name: "IEC 62443", progress: 71 },
  { name: "NIS2 (OES)", progress: 83 },
  { name: "DORA", progress: 76 },
];

export default function ShieldGov() {
  return (
    <div className="min-h-screen bg-[#0A0E1A] p-6 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8" style={{ color: GOLD }} />
          <div>
            <h1 className="text-2xl font-bold text-white">ShieldAI Sovereign</h1>
            <p className="text-slate-400">National-grade cybersecurity for critical infrastructure, government agencies, and essential services</p>
          </div>
        </div>
        <div className="px-4 py-2 bg-gray-800 text-center text-xs font-mono text-white">
          ⚪ UNCLASSIFIED // FOR OFFICIAL USE ONLY
        </div>
        <div className="flex gap-2 flex-wrap">
          {["NIST SP 800-53", "FedRAMP Ready", "ISO 27001", "IEC 62443", "NCSC Cyber Essentials+", "NIS2"].map((badge, idx) => (
            <Badge key={idx} className="bg-green-500/10 text-green-400 border-green-500/30 text-xs">
              {badge} ✓
            </Badge>
          ))}
        </div>
      </div>

      {/* Threat Level Banner */}
      <Card className="p-4 bg-orange-500/10 border border-orange-500/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-orange-400 font-semibold">Current National Threat Level</div>
            <div className="text-2xl font-bold text-orange-400">ELEVATED</div>
            <div className="text-xs text-slate-400 mt-1">Based on current geopolitical context and active threat actor campaigns targeting critical infrastructure</div>
            <div className="text-xs text-orange-400 mt-2">3 active APT campaigns targeting energy and financial sectors in your region</div>
          </div>
          <AlertTriangle className="w-16 h-16 text-orange-400" />
        </div>
      </Card>

      {/* Sector Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sectors.map((sector) => (
          <Card key={sector.id} className="p-4 bg-[#111827] border border-gray-800 hover:border-yellow-600/50 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{sector.icon}</span>
              <div className="font-semibold text-white text-sm">{sector.name}</div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Facilities</span>
                <span className="text-white font-semibold">{sector.facilities}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Threat Level</span>
                <Badge className={
                  sector.threatLevel === "HIGH" ? "bg-red-500/10 text-red-400 border-red-500/30" :
                  sector.threatLevel === "ELEVATED" ? "bg-orange-500/10 text-orange-400 border-orange-500/30" :
                  "bg-green-500/10 text-green-400 border-green-500/30"
                }>{sector.threatLevel}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Active Incidents</span>
                <span className={sector.incidents === 0 ? "text-green-400" : "text-red-400"}>{sector.incidents}</span>
              </div>
            </div>
            <Button className="w-full mt-3 bg-yellow-600 hover:bg-yellow-500 text-black text-xs" size="sm">
              View Sector
            </Button>
          </Card>
        ))}
      </div>

      {/* OT/ICS Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 bg-[#111827] border border-gray-800">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Server className="w-5 h-5" style={{ color: GOLD }} />
            OT/ICS/SCADA Asset Inventory
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-slate-400">
                  <th className="text-left py-2">Asset Type</th>
                  <th className="text-left py-2">Protocol</th>
                  <th className="text-right py-2">Count</th>
                  <th className="text-right py-2">Vulnerable</th>
                  <th className="text-right py-2">Last Scanned</th>
                </tr>
              </thead>
              <tbody>
                {otAssets.map((asset, idx) => (
                  <tr key={idx} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2 text-slate-300">{asset.type}</td>
                    <td className="py-2 text-slate-400 font-mono">{asset.protocol}</td>
                    <td className="py-2 text-right text-white">{asset.count}</td>
                    <td className="py-2 text-right">{asset.vulnerable > 0 ? <span className="text-red-400">{asset.vulnerable}</span> : <span className="text-green-400">0</span>}</td>
                    <td className="py-2 text-right text-slate-500">{asset.scanned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5 bg-[#111827] border border-gray-800">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Network className="w-5 h-5" style={{ color: GOLD }} />
            Purdue Model Architecture
          </h3>
          <div className="space-y-2">
            {[
              { level: "Level 4", name: "Enterprise Network (IT)", color: "bg-blue-500/20", border: "border-blue-500/30", assets: "67 assets" },
              { level: "Level 3", name: "Operations/SCADA", color: "bg-purple-500/20", border: "border-purple-500/30", assets: "23 assets" },
              { level: "IT/OT Boundary", name: "", color: "bg-red-500/30", border: "border-red-500", assets: "⚠️ CRITICAL" },
              { level: "Level 2", name: "Control Systems", color: "bg-orange-500/20", border: "border-orange-500/30", assets: "45 assets" },
              { level: "Level 1", name: "Field Devices", color: "bg-amber-500/20", border: "border-amber-500/30", assets: "234 assets" },
              { level: "Level 0", name: "Physical Process", color: "bg-green-500/20", border: "border-green-500/30", assets: "12 processes" },
            ].map((layer, idx) => (
              <div key={idx} className={`p-3 rounded-lg border ${layer.color} ${layer.border}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white">{layer.level}</div>
                    <div className="text-[10px] text-slate-400">{layer.name}</div>
                  </div>
                  <div className="text-xs text-slate-300">{layer.assets}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Threat Actors */}
      <Card className="p-5 bg-[#111827] border border-gray-800">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" style={{ color: GOLD }} />
          Active Campaigns Targeting Critical Infrastructure
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {threatActors.map((actor, idx) => (
            <Card key={idx} className={`p-4 border ${actor.confidence === "HIGH" ? "border-red-500/30 bg-red-500/5" : "border-orange-500/30 bg-orange-500/5"}`}>
              <div className="font-semibold text-white mb-2">{actor.name}</div>
              <div className="text-xs space-y-1 text-slate-400">
                <div>Targeting: <span className="text-white">{actor.targeting}</span></div>
                <div>TTPs: <span className="font-mono text-white">{actor.ttps}</span></div>
                <div>Active: <span className="text-white">{actor.active}</span></div>
                <div>Confidence: <span className={actor.confidence === "HIGH" ? "text-red-400" : "text-orange-400"}>{actor.confidence}</span></div>
                {actor.note && <div className="text-red-400 mt-2 font-semibold">{actor.note}</div>}
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Incident Command */}
      <Card className="p-5 bg-[#111827] border border-gray-800">
        <h3 className="font-semibold text-white mb-4">Incident Command Center</h3>
        <div className="flex gap-4 flex-wrap">
          <Button className="bg-red-600 hover:bg-red-500 text-white">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Activate Emergency Response Protocol
          </Button>
          <Button className="bg-yellow-600 hover:bg-yellow-500 text-black">
            Draft CISA 72h Notification
          </Button>
          <Button className="border border-gray-700 hover:border-gray-500 text-white" variant="outline">
            Activate Crisis Comms
          </Button>
          <Button className="border border-gray-700 hover:border-gray-500 text-white" variant="outline">
            Brief Executives
          </Button>
          <Button className="border border-gray-700 hover:border-gray-500 text-white" variant="outline">
            Engage ISAC
          </Button>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs text-blue-400">
          Active exercises: Cyber Resilience Exercise — Q3 2026 — Scheduled: Aug 15
        </div>
      </Card>

      {/* Compliance */}
      <Card className="p-5 bg-[#111827] border border-gray-800">
        <h3 className="font-semibold text-white mb-4">Compliance & Accreditation Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {complianceFrameworks.map((fw, idx) => (
            <div key={idx} className="p-4 rounded-lg bg-gray-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white font-semibold">{fw.name}</span>
                <span className="text-sm" style={{ color: GOLD }}>{fw.progress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="h-2 rounded-full transition-all" style={{ width: `${fw.progress}%`, background: GOLD }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="text-xs text-slate-600 text-center">Last updated: {new Date().toLocaleString()} | Classification: UNCLASSIFIED // FOUO</div>
    </div>
  );
}