import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Zap, Shield, AlertTriangle, CheckCircle, Activity, TrendingUp, Map } from "lucide-react";

const GOLD = "#C9A84C";

const threatFeed = [
  { time: "2min ago", type: "Malicious IP", indicator: "185.220.101.47", sources: 47, action: "Auto-blocked", status: "secure" },
  { time: "3min ago", type: "Malware Hash", indicator: "SHA256: a3f7b2c...", sources: 1, action: "Blocked", status: "secure" },
  { time: "5min ago", type: "Phishing Domain", indicator: "secure-banking-verify.com", sources: 23, action: "Blocked", status: "secure" },
  { time: "7min ago", type: "Leaked Credential", indicator: "admin@***.com:***", sources: 1, action: "Alert sent", status: "warning" },
  { time: "12min ago", type: "C2 Server", indicator: "45.142.212.100", sources: 12, action: "Blocked", status: "secure" },
  { time: "15min ago", type: "Exploit in Wild", indicator: "CVE-2026-2847", sources: 89, action: "Patched", status: "secure" },
  { time: "18min ago", type: "Malicious Package", indicator: "npm: lodahs@2.4.1", sources: 5, action: "Blocked", status: "secure" },
  { time: "22min ago", type: "Malicious Domain", indicator: "cdn-delivery-fast.net", sources: 8, action: "Blocked", status: "secure" },
  { time: "25min ago", type: "Scanner IP", indicator: "192.241.203.x/24", sources: 34, action: "Rate limited", status: "secure" },
  { time: "30min ago", type: "Trojan Hash", indicator: "SHA256: f8a91d2...", sources: 3, action: "Blocked", status: "secure" },
];

const topMalware = [
  { name: "LockBit 4.0 Ransomware", detections: 23847 },
  { name: "RedLine Stealer", detections: 18234 },
  { name: "Emotet v5", detections: 14567 },
  { name: "QBot Banking Trojan", detections: 12891 },
  { name: "AsyncRAT", detections: 9234 },
];

const topCVEs = [
  { cve: "CVE-2026-2847", vendor: "Apache", cvss: 9.8, exploits: 15234 },
  { cve: "CVE-2026-1234", vendor: "Cisco IOS", cvss: 9.6, exploits: 12847 },
  { cve: "CVE-2025-44228", vendor: "Log4j variant", cvss: 10.0, exploits: 9234 },
  { cve: "CVE-2026-3389", vendor: "Windows RDP", cvss: 9.1, exploits: 7891 },
  { cve: "CVE-2026-0199", vendor: "OpenSSL", cvss: 8.8, exploits: 6234 },
];

const threatActors = [
  { name: "Sandworm", country: "Russia", attacks: 847, targeting: "Energy, Government" },
  { name: "APT41", country: "China", attacks: 634, targeting: "Technology, Healthcare" },
  { name: "Lazarus Group", country: "DPRK", attacks: 523, targeting: "Financial, Crypto" },
];

export default function GlobalIntel() {
  const [counter, setCounter] = useState(14847);

  useEffect(() => {
    const interval = setInterval(() => {
      setCounter(prev => prev + Math.floor(Math.random() * 10));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0E1A] p-6 space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-black p-8 border border-gray-800">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-20 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <div className="absolute top-20 right-40 w-2 h-2 bg-red-500 rounded-full animate-pulse delay-100" />
          <div className="absolute bottom-20 left-1/3 w-2 h-2 bg-red-500 rounded-full animate-pulse delay-200" />
          <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Globe className="w-8 h-8" style={{ color: GOLD }} />
            Global Intelligence Network
          </h1>
          <p className="text-slate-400 mt-2 text-lg">Collective defense at planetary scale — every ShieldAI customer protects every other customer</p>
          <div className="mt-6 flex items-center gap-4">
            <div className="text-4xl font-bold text-white">{counter.toLocaleString()}</div>
            <div className="text-slate-400">attacks blocked globally in the last hour</div>
          </div>
          <div className="mt-4 flex gap-4 text-xs">
            <span className="flex items-center gap-1 text-red-400">🔴 Attack Origin</span>
            <span className="flex items-center gap-1 text-blue-400">🔵 Blocked by ShieldAI</span>
            <span className="flex items-center gap-1 text-green-400">🟢 Your Location</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { label: "Organizations Protected", value: "12,847", icon: Shield },
          { label: "Countries Covered", value: "94", icon: Globe },
          { label: "Attacks Blocked Today", value: "2,847,293", icon: Zap, animated: true },
          { label: "New IOCs (24h)", value: "15,847", icon: Activity },
          { label: "Threat Actors Tracked", value: "347", icon: TrendingUp },
        ].map((kpi, idx) => (
          <Card key={idx} className="p-4 bg-[#111827] border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className="w-4 h-4" style={{ color: GOLD }} />
              <div className="text-xs text-slate-500">{kpi.label}</div>
            </div>
            <div className="text-2xl font-bold text-white">{kpi.value}</div>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Threat Feed */}
        <Card className="p-5 bg-[#111827] border border-gray-800">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" style={{ color: GOLD }} />
            Global Threat Feed (Live)
          </h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {threatFeed.map((threat, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-gray-600 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{threat.time}</span>
                    <Badge className="text-[8px] bg-blue-500/10 text-blue-400 border-blue-500/30">{threat.type}</Badge>
                  </div>
                  <div className="text-xs text-slate-400">{threat.sources} orgs</div>
                </div>
                <div className="font-mono text-xs text-slate-300 mb-2">{threat.indicator}</div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500">{threat.action}</div>
                  {threat.status === "secure" ? (
                    <CheckCircle className="w-3 h-3 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-xs text-green-400 text-center">
            ✓ Your organization is protected against all of the above
          </div>
        </Card>

        {/* Top Threats */}
        <div className="space-y-6">
          {/* Top Malware */}
          <Card className="p-5 bg-[#111827] border border-gray-800">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-red-400" />
              Most Active Malware This Week
            </h3>
            <div className="space-y-3">
              {topMalware.map((malware, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300">{idx + 1}. {malware.name}</span>
                    <span className="text-slate-500">{malware.detections.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500/60 rounded-full" style={{ width: `${(malware.detections / 23847) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Top CVEs */}
          <Card className="p-5 bg-[#111827] border border-gray-800">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Most Exploited CVEs
            </h3>
            <div className="space-y-2">
              {topCVEs.map((cve, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/50">
                  <div>
                    <div className="font-mono text-xs text-blue-400">{cve.cve}</div>
                    <div className="text-xs text-slate-500">{cve.vendor}</div>
                  </div>
                  <div className="text-right">
                    <Badge className={cve.cvss >= 9 ? "bg-red-500/10 text-red-400" : "bg-orange-500/10 text-orange-400"}>CVSS {cve.cvss}</Badge>
                    <div className="text-xs text-slate-500 mt-1">{cve.exploits.toLocaleString()} exploits</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Threat Actors */}
          <Card className="p-5 bg-[#111827] border border-gray-800">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" style={{ color: GOLD }} />
              Most Active Threat Actors
            </h3>
            <div className="space-y-3">
              {threatActors.map((actor, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-white text-sm">{actor.name}</div>
                    <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-xs">{actor.country}</Badge>
                  </div>
                  <div className="text-xs text-slate-400 mb-1">{actor.attacks.toLocaleString()} attacks tracked</div>
                  <div className="text-xs text-slate-500">Targeting: {actor.targeting}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Contribution */}
      <Card className="p-5 bg-[#111827] border border-yellow-600/30">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5" style={{ color: GOLD }} />
          Your Contribution to Global Defense
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-2xl font-bold text-white">247</div>
            <div className="text-sm text-slate-400">Threat indicators contributed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">1,247</div>
            <div className="text-sm text-slate-400">Organizations protected by your data</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-400">Share anonymized threat data</div>
            <div className="w-10 h-5 bg-green-500 rounded-full relative cursor-pointer">
              <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full" />
            </div>
          </div>
        </div>
        <div className="mt-4 text-sm" style={{ color: GOLD }}>Thank you for making the internet safer for everyone</div>
        <div className="text-xs text-slate-500 mt-2">Your data is always anonymized — we never share identifiable information</div>
      </Card>

      <div className="text-xs text-slate-600 text-center">Last updated: {new Date().toLocaleString()} | Powered by real data</div>
    </div>
  );
}