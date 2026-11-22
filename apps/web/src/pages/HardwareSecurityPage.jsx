import React from "react";
import { Cpu, Shield, AlertTriangle, Package, Network } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const GOLD = "#C9A84C";

export default function HardwareSecurityPage() {
  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
            <Cpu className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Hardware & Firmware Security</h1>
            <p className="text-slate-400 text-sm">Scan IoT devices, embedded systems, and firmware for vulnerabilities. The attack surface nobody else is scanning.</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mt-6">
          {[
            { label: "Devices Scanned", value: "47", icon: Cpu },
            { label: "Critical Firmware CVEs", value: "12", icon: AlertTriangle },
            { label: "EOL Firmware", value: "8", icon: Package },
            { label: "Unencrypted Communications", value: "3", icon: Network },
          ].map((kpi, i) => (
            <Card key={i} className="bg-[#111827] border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">{kpi.label}</span>
                  <kpi.icon className="w-4 h-4" style={{ color: kpi.label.includes("Critical") ? "#ef4444" : GOLD }} />
                </div>
                <div className="text-2xl font-black text-white">{kpi.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-[#111827] border-slate-700">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Firmware Analysis</h3>
            <p className="text-slate-400 text-sm mb-4">Upload firmware binaries for CVE scanning and credential detection.</p>
            <Button className="w-full bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black">Upload Firmware</Button>
          </CardContent>
        </Card>
        <Card className="bg-[#111827] border-slate-700">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Network IoT Discovery</h3>
            <p className="text-slate-400 text-sm mb-4">Scan network subnets to discover IoT and embedded devices.</p>
            <Button className="w-full bg-slate-700 hover:bg-slate-600 text-white">Scan Network</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}